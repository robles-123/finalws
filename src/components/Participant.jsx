import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../App.css";
import Evaluation from "./Evalution.jsx";
import AttendanceScanner from "./AttendanceScanner.jsx";
import ParticipantQRCode from "./ParticipantQRCode.jsx";
import { fetchSeminars as dbFetchSeminars, saveJoinedParticipant, checkInParticipant } from "../lib/db";
import HamburgerToggle from './HamburgerToggle';

function ParticipantDashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState("seminars");
  const [joinedSeminars, setJoinedSeminars] = useState([]);
  const [availableSeminars, setAvailableSeminars] = useState([]);
  const [completedEvaluations, setCompletedEvaluations] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);

  // 🧾 Load seminars and joined status (prefer Supabase, fallback to localStorage)
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data, error } = await dbFetchSeminars();
        if (!error && data) {
          if (mounted) {
            setAvailableSeminars(data);
            localStorage.setItem('seminars', JSON.stringify(data));
          }
        } else {
          const storedSeminars = JSON.parse(localStorage.getItem("seminars")) || [];
          if (mounted) setAvailableSeminars(storedSeminars);
        }
      } catch (err) {
        const storedSeminars = JSON.parse(localStorage.getItem("seminars")) || [];
        if (mounted) setAvailableSeminars(storedSeminars);
      }

      const storedJoined = JSON.parse(localStorage.getItem("joinedSeminars")) || [];
      const storedCompletedEvals = JSON.parse(localStorage.getItem("completedEvaluations")) || [];
      if (mounted) {
        setJoinedSeminars(storedJoined);
        setCompletedEvaluations(storedCompletedEvals);
      }
    }

    load();

    const handleStorageChange = () => {
      setAvailableSeminars(JSON.parse(localStorage.getItem("seminars")) || []);
      setJoinedSeminars(JSON.parse(localStorage.getItem("joinedSeminars")) || []);
      setCompletedEvaluations(JSON.parse(localStorage.getItem("completedEvaluations")) || []);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // 🧾 Check if certificate is eligible (both attendance marked AND evaluation completed)
  const isCertificateEligible = (seminar) => {
    const hasAttendance = seminar.completed === true;
    const hasEvaluation = completedEvaluations.includes(seminar.title);
    return hasAttendance && hasEvaluation;
  };

  // 📊 Get eligibility status for display
  const getCertificateStatus = (seminar) => {
    const hasAttendance = seminar.completed === true;
    const hasEvaluation = completedEvaluations.includes(seminar.title);
    
    if (!hasAttendance && !hasEvaluation) {
      return { status: "pending", message: "Attendance & Evaluation Pending", icon: "⏳" };
    } else if (!hasAttendance) {
      return { status: "pending", message: "Attendance Pending", icon: "📅" };
    } else if (!hasEvaluation) {
      return { status: "pending", message: "Evaluation Pending", icon: "📝" };
    }
    return { status: "ready", message: "Ready to Download", icon: "✅" };
  };

  const handleJoinSeminar = async (seminar) => {
    if (joinedSeminars.find((s) => s.title === seminar.title)) return;

    // Prepare participant identity (try stored participant info else fallback)
    const participant_email = localStorage.getItem('participantEmail') || 'participant@example.com';
    const participant_name = localStorage.getItem('participantName') || null;

    const entry = { ...seminar, completed: false };

    // Optimistic UI update
    const updated = [...joinedSeminars, entry];
    setJoinedSeminars(updated);
    localStorage.setItem("joinedSeminars", JSON.stringify(updated));

    // Try to persist to Supabase (log response so we can debug)
    try {
      const seminarId = seminar.id || null;
      const res = await saveJoinedParticipant(seminarId, { participant_email, participant_name });
      if (res.error) {
        console.warn('Failed to save joined participant to Supabase:', res.error);
        window.dispatchEvent(new CustomEvent('app-banner', { detail: 'Join saved locally but failed to persist to Supabase. Check console for details.' }));
      } else {
        console.log('Joined participant saved to Supabase:', res.data);
        window.dispatchEvent(new CustomEvent('app-banner', { detail: 'Joined and saved to Supabase.' }));
      }
    } catch (err) {
      console.warn('Unexpected error saving joined participant:', err);
      window.dispatchEvent(new CustomEvent('app-banner', { detail: 'Join saved locally but unexpected error when saving to Supabase. Check console.' }));
    }
  };

  const handleMarkAttendance = async (title) => {
    // legacy support: direct mark (not used when scanner flow is enforced)
    const updated = joinedSeminars.map((s) =>
      s.title === title ? { ...s, completed: true } : s
    );
    setJoinedSeminars(updated);
    localStorage.setItem("joinedSeminars", JSON.stringify(updated));

    try {
      const seminar = joinedSeminars.find((s) => s.title === title);
      if (!seminar) return;
      const seminarId = seminar.id || null;
      const participant_email = localStorage.getItem('participantEmail') || localStorage.getItem('userEmail') || 'participant@example.com';
      const res = await checkInParticipant(seminarId, participant_email);
      if (res.error) {
        console.warn('Failed to persist attendance to Supabase:', res.error);
        window.dispatchEvent(new CustomEvent('app-banner', { detail: 'Attendance marked locally but failed to persist to Supabase.' }));
      } else {
        console.log('Attendance persisted to Supabase:', res.data);
      }
    } catch (err) {
      console.warn('Unexpected error while persisting attendance:', err);
    }
  };

  // Scanner modal state
  const [scanningFor, setScanningFor] = useState(null); // seminar index
  const openScannerFor = (seminarIndex) => {
    setScanningFor(seminarIndex);
  };
  const closeScanner = () => setScanningFor(null);

  const handleScannerSuccess = async ({ seminarId, participantEmail }) => {
    // mark locally by seminarId (or fallback to index)
    const idx = scanningFor;
    let updated = joinedSeminars;
    if (typeof idx === 'number') {
      updated = joinedSeminars.map((s, i) => i === idx ? { ...s, completed: true } : s);
      setJoinedSeminars(updated);
      localStorage.setItem('joinedSeminars', JSON.stringify(updated));
    } else {
      updated = joinedSeminars.map((s) => s.id === seminarId ? { ...s, completed: true } : s);
      setJoinedSeminars(updated);
      localStorage.setItem('joinedSeminars', JSON.stringify(updated));
    }

    // persist
    try {
      const res = await checkInParticipant(seminarId, participantEmail);
      if (res.error) {
        console.warn('Failed to persist scanner attendance to Supabase:', res.error);
        window.dispatchEvent(new CustomEvent('app-banner', { detail: 'Attendance marked locally but failed to persist to Supabase.' }));
      } else {
        window.dispatchEvent(new CustomEvent('app-banner', { detail: 'Attendance recorded.' }));
      }
    } catch (err) {
      console.warn('Error persisting scanner attendance:', err);
    }

    // close scanner UI
    closeScanner();
  };

  const handleDeleteAttendance = (title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    const updated = joinedSeminars.filter((s) => s.title !== title);
    setJoinedSeminars(updated);
    localStorage.setItem("joinedSeminars", JSON.stringify(updated));
  };

  // Generate certificate with professional design using PNG images
  const generateCertificate = async (seminar) => {
    const certDiv = document.createElement("div");
    certDiv.style.width = "1200px";
    certDiv.style.height = "850px";
    certDiv.style.padding = "50px";
    certDiv.style.textAlign = "center";
    certDiv.style.position = "relative";
    certDiv.style.fontFamily = "'Georgia', 'Garamond', serif";
    certDiv.style.color = "#1a3a52";
    // Apply custom certificate background if participant set one (color or image URL)
    const certBg = localStorage.getItem(`certBg:${seminar.id}`) || localStorage.getItem('certificateBackground');
    if (certBg) {
      if (certBg.startsWith('#') || certBg.startsWith('rgb')) {
        certDiv.style.background = certBg;
      } else {
        certDiv.style.backgroundImage = `url('${certBg}')`;
        certDiv.style.backgroundSize = 'cover';
        certDiv.style.backgroundPosition = 'center';
      }
    } else {
      certDiv.style.background = "linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)";
    }
    certDiv.style.border = "4px solid #c41e3a";
    certDiv.style.borderRadius = "4px";
    certDiv.style.boxShadow = "0 10px 40px rgba(0,0,0,0.1)";
    
    const logoImg = new Image();
    logoImg.src = "/logo.png";
    
    const deptLogoImg = new Image();
    deptLogoImg.src = "/department_logo.png";
    
    certDiv.innerHTML = `
      <div style="position: relative; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        
        <!-- Top Section with Logos -->
        <div style="position: absolute; top: 30px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 40px;">
          <img src="/department_logo.png" alt="Department Logo" style="width: 100px; height: auto;" />
          <img src="/logo.png" alt="Organization Logo" style="width: 100px; height: auto;" />
        </div>

        <!-- Faint Watermark Background -->
        <img src="/logo.png" alt="Watermark"
          style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                 width: 500px; opacity: 0.08; z-index: 0;" />

        <!-- Certificate Content -->
        <div style="position: relative; z-index: 1;">
          <!-- Certificate Header -->
          <div style="margin-bottom: 20px;">
            <p style="font-size: 18px; font-weight: 600; letter-spacing: 2px; color: #c41e3a; margin: 0;">
              CERTIFICATE OF PARTICIPATION
            </p>
          </div>

          <!-- Decorative Line -->
          <div style="width: 300px; height: 2px; background: linear-gradient(90deg, transparent, #c41e3a, transparent); margin: 20px auto;"></div>

          <!-- Main Text -->
          <p style="font-size: 20px; margin: 30px 0 10px 0; color: #333;">This is to certify that</p>

          <!-- Participant Name -->
          <h2 style="font-size: 42px; margin: 20px 0; color: #1a3a52; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
            Participant
          </h2>

          <!-- Recognition Text -->
          <p style="font-size: 18px; margin: 30px 0;">has successfully completed and participated in</p>

          <!-- Seminar Title -->
          <h3 style="font-size: 28px; margin: 20px 0 30px 0; color: #c41e3a; font-style: italic; font-weight: 600;">
            ${seminar.title}
          </h3>

          <!-- Seminar Details -->
          <div style="margin: 30px 0; line-height: 1.8;">
            <p style="font-size: 16px; margin: 8px 0;">
              Date: <strong>${new Date(seminar.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</strong>
            </p>
            <p style="font-size: 16px; margin: 8px 0;">
              Conducted by: <strong>${seminar.speaker}</strong>
            </p>
          </div>

          <!-- Footer Message -->
          <p style="font-size: 14px; margin-top: 40px; color: #666; font-style: italic;">
            In recognition of participation and commitment to professional development
          </p>

          <!-- Signature Section -->
          <div style="display: flex; justify-content: center; gap: 100px; margin-top: 60px; padding-top: 40px; border-top: 2px solid #c41e3a;">
            <div style="text-align: center;">
              <div style="width: 180px; height: 80px; margin-bottom: 10px; display: flex; align-items: flex-end; justify-content: center; font-size: 48px; color: #c41e3a; font-weight: bold;">
                /
              </div>
              <p style="font-size: 14px; margin: 5px 0 0 0; color: #333;">Authorized Signature</p>
            </div>
            <div style="text-align: center;">
              <div style="width: 180px; height: 80px; margin-bottom: 10px; display: flex; align-items: flex-end; justify-content: center; font-size: 48px; color: #c41e3a; font-weight: bold;">
                /
              </div>
              <p style="font-size: 14px; margin: 5px 0 0 0; color: #333;">Seal or Stamp</p>
            </div>
          </div>

          <!-- Certificate Number -->
          <p style="font-size: 12px; color: #999; margin-top: 40px;">
            Certificate No: ${Date.now()}
          </p>
        </div>

        <!-- Decorative Corner Elements -->
        <div style="position: absolute; top: 15px; left: 15px; width: 30px; height: 30px; border-top: 3px solid #c41e3a; border-left: 3px solid #c41e3a;"></div>
        <div style="position: absolute; top: 15px; right: 15px; width: 30px; height: 30px; border-top: 3px solid #c41e3a; border-right: 3px solid #c41e3a;"></div>
        <div style="position: absolute; bottom: 15px; left: 15px; width: 30px; height: 30px; border-bottom: 3px solid #c41e3a; border-left: 3px solid #c41e3a;"></div>
        <div style="position: absolute; bottom: 15px; right: 15px; width: 30px; height: 30px; border-bottom: 3px solid #c41e3a; border-right: 3px solid #c41e3a;"></div>
        <!-- Bottom-right watermark text -->
        <div style="position: absolute; bottom: 24px; right: 24px; opacity: 0.12; color: #1a3a52; font-size: 18px; transform: rotate(-10deg);">
          Masking Unsa.
        </div>
      </div>
    `;

    document.body.appendChild(certDiv);

    const canvas = await html2canvas(certDiv, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "mm", "a4");
    const imgWidth = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(`${seminar.title}-certificate.pdf`);

    document.body.removeChild(certDiv);
  };

  // 🧩 Main content sections
  const renderContent = () => {
    switch (activeSection) {
      case "seminars":
        return (
          <div className="section-content">
            <div style={{ marginBottom: "2.5rem" }}>
              <h2 style={{ margin: "0 0 0.5rem 0", color: "#1a3a52", fontSize: "2rem", fontWeight: "700", letterSpacing: "-0.5px" }}>
                Available Seminars
              </h2>
              <p style={{ margin: 0, color: "#999", fontSize: "0.95rem", fontWeight: "500" }}>
                {availableSeminars.length} seminar{availableSeminars.length !== 1 ? 's' : ''} available • Browse and join to participate
              </p>
            </div>
            {availableSeminars.length === 0 ? (
              <div style={{
                padding: "3rem 2rem",
                textAlign: "center",
                backgroundColor: "#f8f9fa",
                borderRadius: "12px",
                border: "1px solid #e0e0e0"
              }}>
                <p style={{ fontSize: "1rem", color: "#666", margin: 0 }}>No seminars available at the moment.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1.25rem" }}>
                {availableSeminars.map((s, i) => (
                  <div 
                    key={i}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e0e0e0",
                      borderRadius: "10px",
                      padding: "1.5rem",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      cursor: "pointer"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#c41e3a";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(196,30,58,0.12)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "#e0e0e0";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                      <h3 style={{ margin: 0, color: "#1a3a52", fontSize: "1.2rem", fontWeight: "600" }}>
                        {s.title}
                      </h3>
                      <span style={{
                        backgroundColor: "#e8f4f8",
                        color: "#2e5266",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px"
                      }}>
                        Available
                      </span>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid #f0f0f0" }}>
                      <div>
                        <p style={{ margin: "0 0 0.3rem 0", color: "#999", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          Date
                        </p>
                        <p style={{ margin: 0, color: "#1a3a52", fontSize: "1rem", fontWeight: "500" }}>
                          {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 0.3rem 0", color: "#999", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          Duration
                        </p>
                        <p style={{ margin: 0, color: "#1a3a52", fontSize: "1rem", fontWeight: "500" }}>
                          {s.duration} hour{s.duration !== '1' ? 's' : ''}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 0.3rem 0", color: "#999", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          Capacity
                        </p>
                        <p style={{ margin: 0, color: "#1a3a52", fontSize: "1rem", fontWeight: "500" }}>
                          {s.participants} slots
                        </p>
                      </div>
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                      <p style={{ margin: "0 0 0.3rem 0", color: "#999", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                        Instructor
                      </p>
                      <p style={{ margin: 0, color: "#1a3a52", fontSize: "1rem", fontWeight: "500" }}>
                        {s.speaker}
                      </p>
                    </div>

                    {joinedSeminars.find((js) => js.title === s.title) ? (
                      <button 
                        disabled
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          backgroundColor: "#e8f4f8",
                          color: "#2e5266",
                          border: "1px solid #c0e0ec",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          cursor: "not-allowed",
                          transition: "all 0.3s"
                        }}
                      >
                        Already Joined
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleJoinSeminar(s)}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          backgroundColor: "#c41e3a",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = "#a01831";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(196,30,58,0.3)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "#c41e3a";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        Join Seminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "attendance":
        return (
          <div className="section-content">
            <div style={{ marginBottom: "2.5rem" }}>
              <h2 style={{ margin: "0 0 0.5rem 0", color: "#1a3a52", fontSize: "2rem", fontWeight: "700", letterSpacing: "-0.5px" }}>
                Attendance
              </h2>
              <p style={{ margin: 0, color: "#999", fontSize: "0.95rem", fontWeight: "500" }}>
                {joinedSeminars.length} seminar{joinedSeminars.length !== 1 ? 's' : ''} joined • Mark your attendance to progress
              </p>
            </div>
            {joinedSeminars.length === 0 ? (
              <div style={{
                padding: "3rem 2rem",
                textAlign: "center",
                backgroundColor: "#f8f9fa",
                borderRadius: "12px",
                border: "1px solid #e0e0e0"
              }}>
                <p style={{ fontSize: "1rem", color: "#666", margin: 0 }}>You haven't joined any seminars yet.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1.25rem" }}>
                {joinedSeminars.map((s, i) => (
                  <div 
                    key={i}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e0e0e0",
                      borderRadius: "10px",
                      padding: "1.5rem",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#c41e3a";
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(196,30,58,0.12)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "#e0e0e0";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                      <h3 style={{ margin: 0, color: "#1a3a52", fontSize: "1.2rem", fontWeight: "600" }}>
                        {s.title}
                      </h3>
                      <span style={{
                        backgroundColor: s.completed ? "#e8f5e9" : "#fff3e0",
                        color: s.completed ? "#27ae60" : "#f57c00",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px"
                      }}>
                        {s.completed ? "Present" : "Pending"}
                      </span>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid #f0f0f0" }}>
                      <div>
                        <p style={{ margin: "0 0 0.3rem 0", color: "#999", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          Date
                        </p>
                        <p style={{ margin: 0, color: "#1a3a52", fontSize: "1rem", fontWeight: "500" }}>
                          {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 0.3rem 0", color: "#999", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          Instructor
                        </p>
                        <p style={{ margin: 0, color: "#1a3a52", fontSize: "1rem", fontWeight: "500" }}>
                          {s.speaker}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                      {s.completed ? (
                        <div style={{
                          padding: "0.75rem",
                          backgroundColor: "#e8f5e9",
                          border: "1px solid #c8e6c9",
                          borderRadius: "8px",
                          textAlign: "center",
                          color: "#27ae60",
                          fontSize: "0.9rem",
                          fontWeight: "600"
                        }}>
                          Attendance Marked
                        </div>
                      ) : (
                        <>
                        <button 
                          onClick={() => openScannerFor(i)}
                          style={{
                            padding: "0.75rem",
                            backgroundColor: "#c41e3a",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.3s"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#a01831";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(196,30,58,0.3)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "#c41e3a";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          Mark as Present
                        </button>
                        {scanningFor === i && (
                          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
                            <div style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', maxHeight: '90vh', overflow: 'auto' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ margin: 0, color: '#1a3a52' }}>Scan QR to Mark Attendance</h3>
                                <button onClick={closeScanner} aria-label="Close scanner" style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
                              </div>
                              <div style={{ display: 'flex', gap: 16, flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: 14, color: '#555', marginBottom: 6, textAlign: 'center' }}>Show this QR code to the attendance scanner/staff. No camera needed on your device.</div>
                                <ParticipantQRCode seminarId={s.id} email={localStorage.getItem('participantEmail') || localStorage.getItem('userEmail') || ''} size={240} />
                                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                  <button onClick={async () => { const participantEmail = localStorage.getItem('participantEmail') || localStorage.getItem('userEmail') || ''; await handleScannerSuccess({ seminarId: s.id, participantEmail }); }} style={{ padding: '0.6rem 1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Mark Present</button>
                                  <button onClick={closeScanner} style={{ padding: '0.6rem 1rem', background: '#f5f5f5', color: '#333', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' }}>Close</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        </>
                      )}
                      <button 
                        onClick={() => handleDeleteAttendance(s.title)}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: "#f5f5f5",
                          color: "#c41e3a",
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = "#c41e3a";
                          e.currentTarget.style.color = "white";
                          e.currentTarget.style.borderColor = "#c41e3a";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "#f5f5f5";
                          e.currentTarget.style.color = "#c41e3a";
                          e.currentTarget.style.borderColor = "#e0e0e0";
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "certificates":
        return (
          <div className="section-content">
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ margin: "0 0 0.5rem 0", color: "#1a3a52", fontSize: "1.8rem", fontWeight: "700" }}>
                My Certificates
              </h2>
              <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
                Download your certificates after completing attendance and evaluation
              </p>
            </div>
            {joinedSeminars.length === 0 ? (
              <p>No seminars joined yet. Join seminars to be eligible for certificates.</p>
            ) : (
              <div className="card-list">
                {joinedSeminars.map((s, i) => {
                  const eligible = isCertificateEligible(s);
                  const hasAttendance = s.completed === true;
                  const hasEvaluation = completedEvaluations.includes(s.title);
                  
                  return (
                    <div className="certificate-card" key={i} style={{ position: "relative" }}>
                      <h4 style={{ margin: "0 0 1rem 0", color: "#1a3a52", fontSize: "1.1rem" }}>{s.title}</h4>
                      <p style={{ margin: "0.5rem 0", color: "#666" }}>
                        <strong style={{ color: "#1a3a52" }}>Date:</strong> {new Date(s.date).toLocaleDateString()}
                      </p>
                      <p style={{ margin: "0.5rem 0 1rem 0", color: "#666" }}>
                        <strong style={{ color: "#1a3a52" }}>Speaker:</strong> {s.speaker}
                      </p>

                      {/* Requirements Status */}
                      <div style={{
                        marginBottom: "1.5rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid #e0e0e0"
                      }}>
                        <p style={{ margin: "0.75rem 0 0.5rem 0", fontSize: "0.85rem", fontWeight: "700", color: "#1a3a52", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Requirements
                        </p>
                        <div style={{ display: "grid", gap: "0.5rem" }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            fontSize: "0.9rem",
                            color: hasAttendance ? "#27ae60" : "#e74c3c"
                          }}>
                            <span style={{ fontWeight: "700" }}>{hasAttendance ? "✓" : "○"}</span>
                            <span>Attendance Marked</span>
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            fontSize: "0.9rem",
                            color: hasEvaluation ? "#27ae60" : "#e74c3c"
                          }}>
                            <span style={{ fontWeight: "700" }}>{hasEvaluation ? "✓" : "○"}</span>
                            <span>Evaluation Completed</span>
                          </div>
                        </div>
                      </div>

                      {eligible ? (
                        <button
                          onClick={() => generateCertificate(s)}
                          className="primary-btn"
                          style={{ width: "100%" }}
                        >
                          Download Certificate
                        </button>
                      ) : (
                        <div style={{
                          padding: "0.75rem",
                          backgroundColor: "#f5f5f5",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          textAlign: "center",
                          color: "#999",
                          fontSize: "0.9rem",
                          fontWeight: "600"
                        }}>
                          {!hasAttendance && !hasEvaluation 
                            ? "Mark Attendance & Complete Evaluation" 
                            : !hasAttendance 
                            ? "Mark Attendance First"
                            : "Complete Evaluation First"
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "evaluation":
        return <Evaluation />;

      default:
        return null;
    }
  };

  return (
    <div className="participant-layout">
      <aside id="participant-sidebar" className={`participant-sidebar ${showSidebar ? 'sidebar--open' : ''}`} role="navigation" aria-label="Participant sidebar">
        <div className="sidebar-header" style={{ textAlign: "center", paddingBottom: "1.5rem", borderBottom: "2px solid rgba(255, 255, 255, 0.2)" }}>
          <img src="/logo.png" alt="Logo" style={{ width: "50px", height: "50px", marginBottom: "0.8rem" }} />
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700" }}>Participant</h2>
          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem", opacity: 0.9 }}>Seminar System</p>
        </div>
        <ul>
          <li className={activeSection === "seminars" ? "active" : ""} onClick={() => { setActiveSection("seminars"); setShowSidebar(false); }} style={{ cursor: "pointer" }}>Available Seminars</li>
          <li className={activeSection === "attendance" ? "active" : ""} onClick={() => { setActiveSection("attendance"); setShowSidebar(false); }} style={{ cursor: "pointer" }}>Attendance</li>
          <li className={activeSection === "certificates" ? "active" : ""} onClick={() => { setActiveSection("certificates"); setShowSidebar(false); }} style={{ cursor: "pointer" }}>Certificates</li>
          <li className={activeSection === "evaluation" ? "active" : ""} onClick={() => { setActiveSection("evaluation"); setShowSidebar(false); }} style={{ cursor: "pointer" }}>Evaluations</li>
        </ul>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </aside>
      <main className="participant-content">
        <HamburgerToggle isOpen={showSidebar} onToggle={() => setShowSidebar(s => !s)} controlsId="participant-sidebar" />
        {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} aria-hidden="true"></div>}
        {renderContent()}
      </main>
    </div>
  );
}

export default ParticipantDashboard;
