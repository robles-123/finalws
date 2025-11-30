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
    const [showCertDesignModal, setShowCertDesignModal] = useState(false);
    const [certDesign, setCertDesign] = useState({
      backgroundType: 'gradient', // 'gradient', 'color', 'image'
      backgroundColor: '#ffffff',
      gradientStart: '#ffffff',
      gradientEnd: '#f5f7fa',
      backgroundImage: '',
      watermarkType: 'none', // 'none', 'logo', 'text'
      watermarkText: 'Masking Unsa.',
      watermarkOpacity: 0.08,
      watermarkSize: 500,
      accentColor: '#c41e3a',
      // New fields for signatures/seal
      authorizedSignatureName: '',
      authorizedSignatureImage: '', // can be URL or dataURL
      sealImage: '' // URL or dataURL
    });
    const navigate = useNavigate();


    // Load seminars from Supabase on mount, fall back to localStorage if unavailable
    useEffect(() => {
      let mounted = true;

      // Load saved certificate design
      const savedDesign = localStorage.getItem('certificateDesign');
      if (savedDesign) {
        try {
          setCertDesign(JSON.parse(savedDesign));
        } catch (err) {
          console.error('Failed to load certificate design:', err);
        }
      }

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

    // Save certificate design to localStorage
    const saveCertificateDesign = () => {
      localStorage.setItem('certificateDesign', JSON.stringify(certDesign));
      window.dispatchEvent(new CustomEvent('app-banner', { detail: 'Certificate design saved successfully!' }));
      setShowCertDesignModal(false);
    };

    // Reset design to defaults
    const resetCertificateDesign = () => {
      const defaultDesign = {
        backgroundType: 'gradient',
        backgroundColor: '#ffffff',
        gradientStart: '#ffffff',
        gradientEnd: '#f5f7fa',
        backgroundImage: '',
        watermarkType: 'none',
        watermarkText: 'Masking Unsa.',
        watermarkOpacity: 0.08,
        watermarkSize: 500,
        accentColor: '#c41e3a',
        authorizedSignatureName: '',
        authorizedSignatureImage: '',
        sealImage: ''
      };
      setCertDesign(defaultDesign);
    };

    // Render Certificate Design Customization Modal
    const renderCertDesignModal = () => {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1a3a52' }}>Certificate Design</h2>
              <button 
                onClick={() => setShowCertDesignModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✕
              </button>
            </div>

            {/* Background Type Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1a3a52' }}>
                Background Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {['gradient', 'color', 'image'].map(type => (
                  <button
                    key={type}
                    onClick={() => setCertDesign({ ...certDesign, backgroundType: type })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: certDesign.backgroundType === type ? '2px solid #c41e3a' : '1px solid #e0e0e0',
                      backgroundColor: certDesign.backgroundType === type ? '#fff8f9' : '#f9f9f9',
                      cursor: 'pointer',
                      fontWeight: '500',
                      color: certDesign.backgroundType === type ? '#c41e3a' : '#666',
                      transition: 'all 0.3s'
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Gradient Options */}
            {certDesign.backgroundType === 'gradient' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                    Start Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={certDesign.gradientStart}
                      onChange={(e) => setCertDesign({ ...certDesign, gradientStart: e.target.value })}
                      style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={certDesign.gradientStart}
                      onChange={(e) => setCertDesign({ ...certDesign, gradientStart: e.target.value })}
                      style={{ flex: 1, padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                    End Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={certDesign.gradientEnd}
                      onChange={(e) => setCertDesign({ ...certDesign, gradientEnd: e.target.value })}
                      style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={certDesign.gradientEnd}
                      onChange={(e) => setCertDesign({ ...certDesign, gradientEnd: e.target.value })}
                      style={{ flex: 1, padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Solid Color Option */}
            {certDesign.backgroundType === 'color' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                  Background Color
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="color"
                    value={certDesign.backgroundColor}
                    onChange={(e) => setCertDesign({ ...certDesign, backgroundColor: e.target.value })}
                    style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={certDesign.backgroundColor}
                    onChange={(e) => setCertDesign({ ...certDesign, backgroundColor: e.target.value })}
                    style={{ flex: 1, padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            )}

            {/* Image URL Option */}
            {certDesign.backgroundType === 'image' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                  Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={certDesign.backgroundImage}
                  onChange={(e) => setCertDesign({ ...certDesign, backgroundImage: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Watermark Type Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1a3a52' }}>
                Watermark
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {['none', 'logo', 'text'].map(type => (
                  <button
                    key={type}
                    onClick={() => setCertDesign({ ...certDesign, watermarkType: type })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: certDesign.watermarkType === type ? '2px solid #c41e3a' : '1px solid #e0e0e0',
                      backgroundColor: certDesign.watermarkType === type ? '#fff8f9' : '#f9f9f9',
                      cursor: 'pointer',
                      fontWeight: '500',
                      color: certDesign.watermarkType === type ? '#c41e3a' : '#666',
                      transition: 'all 0.3s'
                    }}
                  >
                    {type === 'none' ? 'None' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Watermark Text Option */}
            {certDesign.watermarkType === 'text' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={certDesign.watermarkText}
                  onChange={(e) => setCertDesign({ ...certDesign, watermarkText: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '12px' }}
                />
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#666' }}>
                    Opacity: {(certDesign.watermarkOpacity * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={certDesign.watermarkOpacity}
                    onChange={(e) => setCertDesign({ ...certDesign, watermarkOpacity: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Watermark Logo Size */}
            {certDesign.watermarkType === 'logo' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#666' }}>
                    Logo Size: {certDesign.watermarkSize}px
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="800"
                    step="10"
                    value={certDesign.watermarkSize}
                    onChange={(e) => setCertDesign({ ...certDesign, watermarkSize: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#666' }}>
                    Opacity: {(certDesign.watermarkOpacity * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={certDesign.watermarkOpacity}
                    onChange={(e) => setCertDesign({ ...certDesign, watermarkOpacity: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {/* Accent Color */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                Accent Color
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="color"
                  value={certDesign.accentColor}
                  onChange={(e) => setCertDesign({ ...certDesign, accentColor: e.target.value })}
                  style={{ width: '50px', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={certDesign.accentColor}
                  onChange={(e) => setCertDesign({ ...certDesign, accentColor: e.target.value })}
                  style={{ flex: 1, padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Signature / Seal Inputs */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                Authorized Signature (name and image)
              </label>
              <input
                type="text"
                placeholder="Name to show under signature"
                value={certDesign.authorizedSignatureName || ''}
                onChange={(e) => setCertDesign({ ...certDesign, authorizedSignatureName: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '8px' }}
              />
              <input
                type="text"
                placeholder="Signature image URL (https://...) or leave empty to upload"
                value={certDesign.authorizedSignatureImage || ''}
                onChange={(e) => setCertDesign({ ...certDesign, authorizedSignatureImage: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCertDesign({ ...certDesign, authorizedSignatureImage: reader.result });
                    };
                    reader.readAsDataURL(f);
                  }}
                />
                {certDesign.authorizedSignatureImage && (
                  <img src={certDesign.authorizedSignatureImage} alt="signature preview" style={{ height: 48, borderRadius: 4, border: '1px solid #eee' }} />
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#1a3a52', fontWeight: '500' }}>
                Seal / Stamp Image
              </label>
              <input
                type="text"
                placeholder="Seal image URL (https://...) or upload"
                value={certDesign.sealImage || ''}
                onChange={(e) => setCertDesign({ ...certDesign, sealImage: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #e0e0e0', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setCertDesign({ ...certDesign, sealImage: reader.result });
                    };
                    reader.readAsDataURL(f);
                  }}
                />
                {certDesign.sealImage && (
                  <img src={certDesign.sealImage} alt="seal preview" style={{ height: 48, borderRadius: 4, border: '1px solid #eee' }} />
                )}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              background: certDesign.backgroundType === 'gradient' 
                ? `linear-gradient(135deg, ${certDesign.gradientStart} 0%, ${certDesign.gradientEnd} 100%)`
                : certDesign.backgroundType === 'color'
                ? certDesign.backgroundColor
                : '#f5f5f5',
              minHeight: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: certDesign.accentColor,
              fontSize: '18px',
              fontWeight: 'bold',
              borderColor: certDesign.accentColor,
              position: 'relative'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>Certificate Preview</div>
              {/* lower-right watermark preview using logo.png */}
              <img src="/logo.png" alt="watermark" style={{ position: 'absolute', right: 12, bottom: 8, width: 100, opacity: 0.06, pointerEvents: 'none', zIndex: 0 }} />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <button
                onClick={resetCertificateDesign}
                style={{
                  padding: '10px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  color: '#666',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#efefef';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
              >
                Reset
              </button>
              <button
                onClick={() => setShowCertDesignModal(false)}
                style={{
                  padding: '10px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  color: '#666',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#efefef';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveCertificateDesign}
                style={{
                  padding: '10px',
                  backgroundColor: '#c41e3a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#a01831';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#c41e3a';
                }}
              >
                Save Design
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="admin-dashboard">
        {/* Hamburger toggle is rendered in the header so it flows with the title */}

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
            <img src="/logo.png" alt="Logo" style={{ width: "150px", height: "150px", marginBottom: "0.8rem" }} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <HamburgerToggle isOpen={showSidebar} onToggle={() => setShowSidebar(s => !s)} controlsId="admin-sidebar" />
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
            </div>
            {activeTab === "dashboard" && (
              <button
                onClick={() => setShowCertDesignModal(true)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#2e5266",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  whiteSpace: "nowrap"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a3a52";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(30,82,102,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#2e5266";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                🎨 Customize Certificate Design
              </button>
            )}
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
        {showCertDesignModal && renderCertDesignModal()}
      </div>
    );
  }

  export default Admin;
