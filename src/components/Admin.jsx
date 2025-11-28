  import React, { useState, useEffect } from "react";
  import Calendar from "react-calendar";
  import "react-calendar/dist/Calendar.css";
  import "../App.css";
  import { fetchSeminars, createSeminar as dbCreateSeminar, upsertSeminar as dbUpsertSeminar, deleteSeminar as dbDeleteSeminar, fetchJoinedParticipants, saveJoinedParticipant, saveEvaluation, saveAllSeminars } from "../lib/db";
  import HamburgerToggle from './HamburgerToggle';
  import { useNavigate } from "react-router-dom";


  function Admin({ onLogout }) {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [seminars, setSeminars] = useState([]);
    const [showSidebar, setShowSidebar] = useState(false);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [title, setTitle] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [duration, setDuration] = useState("");
    const [speaker, setSpeaker] = useState("");
    const [participants, setParticipants] = useState("");
    const [date, setDate] = useState("");
    const navigate = useNavigate();


    // Load seminars from Supabase on mount, fall back to localStorage if unavailable
    useEffect(() => {
      let mounted = true;

      async function load() {
        try {
          const { data, error } = await fetchSeminars();
          if (error || !data) {
            // fallback
            const storedSeminars = JSON.parse(localStorage.getItem("seminars")) || [];
            if (mounted) setSeminars(storedSeminars);
          } else {
            if (mounted) {
              setSeminars(data);
              // keep localStorage in sync for offline use
              localStorage.setItem("seminars", JSON.stringify(data));
            }
          }
        } catch (err) {
          const storedSeminars = JSON.parse(localStorage.getItem("seminars")) || [];
          if (mounted) setSeminars(storedSeminars);
        }
      }

      load();

      const handleStorageChange = () => {
        setSeminars(JSON.parse(localStorage.getItem("seminars")) || []);
      };
      window.addEventListener("storage", handleStorageChange);
      return () => {
        mounted = false;
        window.removeEventListener("storage", handleStorageChange);
      };
    }, []);

    const toISO = (localDatetime) => {
      if (!localDatetime) return null;
      try {
        const d = new Date(localDatetime);
        return d.toISOString();
      } catch (err) {
        return null;
      }
    };

    const humanTime = (localDatetime) => {
      if (!localDatetime) return null;
      try {
        const d = new Date(localDatetime);
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
      } catch (err) {
        return null;
      }
    };

    const handleCreateSeminar = async (e) => {
      e.preventDefault();
      if (!title || !duration || !speaker || !participants || !date) {
        window.dispatchEvent(new CustomEvent('app-banner', { detail: "Please fill out all fields." }));
        return;
      }

      const newSeminar = {
        title,
        duration,
        speaker,
        participants,
        date,
        start_datetime: toISO(startTime),
        end_datetime: toISO(endTime),
        start_time: humanTime(startTime),
        end_time: humanTime(endTime),
        joinedParticipants: [], // Track who joined
        questions: [   
          {
            id: "q1",
            question: "Rate the speaker's clarity",
            type: "select",
            options: ["Excellent", "Good", "Average", "Poor"] 
          }, 
          {
            id: "q2",
            question: "How relevant was the seminar content?",
            type: "select",
            options: ["Very Relevant", "Somewhat Relevant", "Not Relevant"]
          },
          {
            id: "q3",
            question: "Any suggestions?",
            type: "text", 
          } // Default evaluation questions
        ]
      };
        // Try to persist to Supabase first
        try {
          if (isEditing && editingId) {
            const payload = { ...newSeminar, id: editingId };
            const { data, error } = await dbUpsertSeminar(payload);
            if (error) {
              const updated = seminars.map(s => s.id === editingId ? payload : s);
              setSeminars(updated);
              localStorage.setItem("seminars", JSON.stringify(updated));
              window.dispatchEvent(new CustomEvent('app-banner', { detail: "Seminar updated locally (supabase error)." }));
            } else {
              const updatedRow = data && data[0] ? data[0] : payload;
              const updated = seminars.map(s => s.id === editingId ? updatedRow : s);
              setSeminars(updated);
              localStorage.setItem("seminars", JSON.stringify(updated));
              setTitle(""); setDuration(""); setSpeaker(""); setParticipants(""); setDate("");
              setStartTime(""); setEndTime("");
              setIsEditing(false); setEditingId(null);
              setActiveTab('list');
              window.dispatchEvent(new CustomEvent('app-banner', { detail: "Seminar updated successfully!" }));
            }
          } else {
            const { data, error } = await dbCreateSeminar(newSeminar);
            if (error) {
              // fallback to local storage
              const updated = [...seminars, newSeminar];
              setSeminars(updated);
              localStorage.setItem("seminars", JSON.stringify(updated));
              window.dispatchEvent(new CustomEvent('app-banner', { detail: "Seminar saved locally (supabase error)." }));
            } else {
              // data is an array with inserted row
              const created = data && data[0] ? data[0] : newSeminar;
              const updated = [...seminars, created];
              setSeminars(updated);
              localStorage.setItem("seminars", JSON.stringify(updated));
              setTitle("");
              setDuration("");
              setSpeaker("");
              setParticipants("");
              setStartTime(""); setEndTime("");
              setDate("");
              window.dispatchEvent(new CustomEvent('app-banner', { detail: "Seminar created successfully!" }));
            }
          }
        } catch (err) {
          const updated = [...seminars, newSeminar];
          setSeminars(updated);
          localStorage.setItem("seminars", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('app-banner', { detail: "Seminar saved locally (unexpected error)." }));
        }
    };

      const handleEdit = (seminar) => {
        setIsEditing(true);
        setEditingId(seminar.id || null);
        setTitle(seminar.title || "");
        setDuration(seminar.duration || "");
        setSpeaker(seminar.speaker || "");
        setParticipants(seminar.participants || "");
        setDate(seminar.date ? (typeof seminar.date === 'string' && seminar.date.includes('T') ? seminar.date.split('T')[0] : seminar.date) : "");
        // populate datetime-local controls from existing values if present
        try {
          if (seminar.start_datetime) {
            setStartTime(new Date(seminar.start_datetime).toISOString().slice(0,16));
          } else if (seminar.start_time && seminar.date) {
            // combine date + time (assumes start_time like '09:00 AM')
            const parsed = new Date(`${seminar.date} ${seminar.start_time}`);
            if (!isNaN(parsed)) setStartTime(parsed.toISOString().slice(0,16));
            else setStartTime("");
          } else {
            setStartTime("");
          }
        } catch (err) {
          setStartTime("");
        }
        try {
          if (seminar.end_datetime) {
            setEndTime(new Date(seminar.end_datetime).toISOString().slice(0,16));
          } else if (seminar.end_time && seminar.date) {
            const parsed = new Date(`${seminar.date} ${seminar.end_time}`);
            if (!isNaN(parsed)) setEndTime(parsed.toISOString().slice(0,16));
            else setEndTime("");
          } else {
            setEndTime("");
          }
        } catch (err) {
          setEndTime("");
        }
        setActiveTab('create');
      };

    const handleDelete = async (index) => {
      const sem = seminars[index];
      // remove locally first to keep UI snappy
      const updated = seminars.filter((_, i) => i !== index);
      setSeminars(updated);
      localStorage.setItem("seminars", JSON.stringify(updated));

      // if seminar has an id, attempt to remove from Supabase
      if (sem && sem.id) {
        try {
          const { data, error } = await dbDeleteSeminar(sem.id);
          if (error) {
            console.warn('Error deleting seminar from Supabase:', error);
          }
        } catch (err) {
          console.warn('Unexpected delete error:', err);
        }
      }
    };

    const [joinCounts, setJoinCounts] = React.useState({});

    // Get joined participants from DB if possible, fallback to localStorage
    const getJoinedCount = (seminar) => {
      if (!seminar) return 0;
      if (seminar.id && joinCounts[seminar.id] != null) return joinCounts[seminar.id];
      // fallback by title
      const joined = JSON.parse(localStorage.getItem("joinedSeminars")) || [];
      return joined.filter(s => s.title === (seminar.title || '')).length;
    };

    // Load counts whenever seminars change
    useEffect(() => {
      let mounted = true;
      async function loadCounts() {
        const map = {};
        for (const s of seminars) {
          if (s && s.id) {
            try {
              const { data, error } = await fetchJoinedParticipants(s.id);
              if (!error && data) {
                map[s.id] = data.length;
              } else {
                map[s.id] = 0;
              }
            } catch (err) {
              console.warn('Error fetching joined participants for', s.id, err);
              map[s.id] = 0;
            }
          } else {
            map[s.id] = 0;
          }
        }
        if (mounted) setJoinCounts(map);
      }
      if (seminars && seminars.length) loadCounts();
      return () => { mounted = false; };
    }, [seminars]);

    return (
      <div className="admin-dashboard">
        {/* Hamburger toggle button */}
        {/* Hamburger toggle component */}
        <HamburgerToggle isOpen={showSidebar} onToggle={() => setShowSidebar(s => !s)} controlsId="admin-sidebar" />

        {/* Sidebar (collapsible) */}
        {/* overlay (dim background) */}
        {showSidebar && (
          <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} aria-hidden="true"></div>
        )}

        <aside id="admin-sidebar" className={`sidebar ${showSidebar ? 'sidebar--open' : ''}`} role="navigation" aria-label="Admin sidebar">
          <div style={{ textAlign: "center", marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "2px solid rgba(255, 255, 255, 0.2)" }}>
            {showSidebar && (
              <button onClick={() => setShowSidebar(false)} style={{ position: 'absolute', right: 12, top: 12, border: 'none', background: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
            )}
            <img src="/logo.png" alt="Logo" style={{ width: "60px", height: "60px", marginBottom: "0.8rem" }} />
            <h2 className="logo" style={{ margin: 0, fontSize: "1.3rem", color: "#ffffff", fontWeight: "700" }}>VPAA System</h2>
          </div>
          <ul>
            <li className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")} style={{ cursor: "pointer" }}>Dashboard</li>
            <li className={activeTab === "create" ? "active" : ""} onClick={() => setActiveTab("create")} style={{ cursor: "pointer" }}>Create Seminar</li>
            <li className={activeTab === "list" ? "active" : ""} onClick={() => setActiveTab("list")} style={{ cursor: "pointer" }}>Seminar List</li>
          </ul>
          <button className="logout" onClick={onLogout}>Logout</button>
        </aside>

        {/* Main Content */}
        <main className="content">
          <header className="content-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h1 style={{ margin: 0 }}>
                {activeTab === "dashboard" && "Admin Dashboard"}
                {activeTab === "create" && "Create New Seminar"}
                {activeTab === "list" && "Manage Seminars"}
              </h1>
              <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.95rem" }}>
                {activeTab === "dashboard" && "Welcome back! Here's your seminar overview"}
                {activeTab === "create" && "Create a new seminar and add it to the system"}
                {activeTab === "list" && "View and manage all seminars"}
              </p>
            </div>
          </header>

          {/* sync button removed */}

          {/* Dashboard Overview */}
          {activeTab === "dashboard" && (
            <div className="dashboard-overview">
              <div className="card stats" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "2px solid #e0e0e0",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "100px",
                  height: "100px",
                  background: "radial-gradient(circle, rgba(196, 30, 58, 0.1), transparent)",
                  borderRadius: "50%"
                }}></div>
                <h3 style={{ color: "#1a3a52", position: "relative" }}>Total Seminars</h3>
                <p style={{ fontSize: "3rem", margin: "0.5rem 0", position: "relative" }}>{seminars.length}</p>
                <p style={{ fontSize: "0.85rem", color: "#666", margin: 0, position: "relative" }}>
                  {seminars.length === 1 ? "1 seminar" : `${seminars.length} seminars`}
                </p>
              </div>

              <div className="card stats" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "2px solid #e0e0e0",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "100px",
                  height: "100px",
                  background: "radial-gradient(circle, rgba(26, 58, 82, 0.1), transparent)",
                  borderRadius: "50%"
                }}></div>
                <h3 style={{ color: "#1a3a52", position: "relative" }}>Total Participants</h3>
                <p style={{ fontSize: "3rem", margin: "0.5rem 0", position: "relative", color: "#1a3a52" }}>
                  {seminars.reduce((total, s) => total + (parseInt(s.participants) || 0), 0)}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#666", margin: 0, position: "relative" }}>
                  across all seminars
                </p>
              </div>

              <div className="card stats" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "2px solid #e0e0e0",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "100px",
                  height: "100px",
                  background: "radial-gradient(circle, rgba(196, 30, 58, 0.1), transparent)",
                  borderRadius: "50%"
                }}></div>
                <h3 style={{ color: "#1a3a52", position: "relative" }}>Joined</h3>
                <p style={{ fontSize: "3rem", margin: "0.5rem 0", position: "relative", color: "#c41e3a" }}>
                  {seminars.reduce((total, s) => total + getJoinedCount(s), 0)}
                </p>
                <p style={{ fontSize: "0.85rem", color: "#666", margin: 0, position: "relative" }}>
                  total participants
                </p>
              </div>
            </div>
          )}

          {/* Create Seminar Section */}
          {activeTab === "create" && (
            <div className="card form-card" style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
            }}>
              <form onSubmit={handleCreateSeminar} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <label style={{ fontWeight: "600", color: "#1a3a52", display: "block", marginBottom: "0.5rem" }}>
                    Seminar Title
                  </label>
                  <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g., Advanced React Development" 
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div>
                    <label style={{ fontWeight: "600", color: "#1a3a52", display: "block", marginBottom: "0.5rem" }}>
                      Duration (hours)
                    </label>
                    <input 
                      type="number" 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value)} 
                      placeholder="2" 
                      style={{
                        width: "100%",
                        padding: "0.95rem",
                        border: "2px solid #e0e0e0",
                        borderRadius: "10px",
                        fontSize: "1rem",
                        transition: "all 0.3s",
                        boxSizing: "border-box"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                      onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: "600", color: "#1a3a52", display: "block", marginBottom: "0.5rem" }}>
                      Seminar Date
                    </label>
                    <input 
                      type="date" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      style={{
                        width: "100%",
                        padding: "0.95rem",
                        border: "2px solid #e0e0e0",
                        borderRadius: "10px",
                        fontSize: "1rem",
                        transition: "all 0.3s",
                        boxSizing: "border-box"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                      onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: "600", color: "#1a3a52", display: "block", marginBottom: "0.5rem" }}>
                    Speaker / Trainer
                  </label>
                  <input 
                    value={speaker} 
                    onChange={(e) => setSpeaker(e.target.value)} 
                    placeholder="Speaker Name" 
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: "600", color: "#1a3a52", display: "block", marginBottom: "0.5rem" }}>
                    Max Participants
                  </label>
                  <input 
                    type="number" 
                    value={participants} 
                    onChange={(e) => setParticipants(e.target.value)} 
                    placeholder="50" 
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>
                <label>Seminar Start</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />

                <label>Seminar End</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />

                <button 
                  type="submit" 
                  className="primary-btn"
                  style={{
                    background: "linear-gradient(135deg, #c41e3a, #a01831)",
                    color: "white",
                    padding: "1rem",
                    borderRadius: "10px",
                    border: "none",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    marginTop: "1rem",
                    transition: "all 0.3s",
                    boxShadow: "0 4px 15px rgba(196, 30, 58, 0.2)"
                  }}
                  onMouseOver={(e) => e.target.style.boxShadow = "0 6px 20px rgba(196, 30, 58, 0.3)"}
                  onMouseOut={(e) => e.target.style.boxShadow = "0 4px 15px rgba(196, 30, 58, 0.2)"}
                >
                  Create Seminar
                </button>
              </form>
            </div>
          )}

          {/* Seminar List Section */}
          {activeTab === "list" && (
            <div className="seminar-list-container">
              {seminars.length === 0 ? (
                <div style={{
                  background: "#f8fafc",
                  padding: "3rem",
                  borderRadius: "16px",
                  textAlign: "center",
                  border: "2px dashed #e0e0e0"
                }}>
                  <p style={{ fontSize: "1.1rem", color: "#666", margin: 0 }}>No seminars created yet.</p>
                  <p style={{ color: "#999", fontSize: "0.95rem", margin: "0.5rem 0 0 0" }}>
                    Create your first seminar to get started!
                  </p>
                </div>
              ) : (
                <div className="seminar-grid">
                  {seminars.map((s, i) => (
                    <div 
                      key={i}
                      style={{
                        background: "#ffffff",
                        borderRadius: "16px",
                        padding: "1.5rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        transition: "all 0.3s",
                        border: "2px solid #f0f0f0",
                        cursor: "pointer",
                        position: "relative"
                      }}
                                                
                      onMouseOver={(e) => {
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(196, 30, 58, 0.15)";
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.borderColor = "#c41e3a";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = "#f0f0f0";
                      }}
                    >
                      <div style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        background: "#c41e3a",
                        color: "white",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: "600"
                      }}>
                        {getJoinedCount(s)}/{s.participants} joined

                      </div>

                      <h3 style={{
                        fontSize: "1.3rem",
                        fontWeight: "600",
                        color: "#1a3a52",
                        marginBottom: "1rem",
                        marginTop: 0,
                        paddingRight: "100px"
                      }}>
                        {s.title}
                      </h3>

                      <div style={{ display: "grid", gap: "0.8rem", marginBottom: "1.5rem" }}>
                        <p style={{ margin: 0, color: "#666", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ color: "#1a3a52", width: "80px" }}>Date:</strong>
                          {new Date(s.date).toLocaleDateString()}
                        </p>
                        <p style={{ margin: 0, color: "#666", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ color: "#1a3a52", width: "80px" }}>Duration:</strong>
                          {s.duration} hours
                        </p>
                        <p style={{ margin: 0, color: "#666", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ color: "#1a3a52", width: "80px" }}>Speaker:</strong>
                          {s.speaker}
                        </p>
                        <p style={{ margin: 0, color: "#666", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ color: "#1a3a52", width: "80px" }}>Capacity:</strong>
                          {s.participants} max
                        </p>
                      </div>

                      <button 
                        onClick={() => handleEdit(s)}
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          background: "#ffffff",
                          border: "2px solid #e0e0e0",
                          borderRadius: "10px",
                          color: "#1a3a52",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s",
                          marginBottom: "0.5rem"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#1a3a52";
                          e.currentTarget.style.color = "white";
                          e.currentTarget.style.borderColor = "#1a3a52";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#ffffff";
                          e.currentTarget.style.color = "#1a3a52";
                          e.currentTarget.style.borderColor = "#e0e0e0";
                        }}
                      >
                        Edit Seminar
                      </button>

                      <button 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${s.title}"?`)) {
                            handleDelete(i);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          background: "#f5f5f5",
                          border: "2px solid #e0e0e0",
                          borderRadius: "10px",
                          color: "#c41e3a",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#c41e3a";
                          e.currentTarget.style.color = "white";
                          e.currentTarget.style.borderColor = "#c41e3a";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#f5f5f5";
                          e.currentTarget.style.color = "#c41e3a";
                          e.currentTarget.style.borderColor = "#e0e0e0";
                        }}
                      >
                        Delete Seminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  export default Admin;
