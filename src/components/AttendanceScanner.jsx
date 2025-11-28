// src/pages/AttendanceScanner.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { recordTimeIn, recordTimeOut } from '../lib/db';
import { useLocation } from 'react-router-dom';

export default function AttendanceScanner({ seminarId: propSeminarId = null, participantEmail: propParticipantEmail = null, onSuccess = null, autoStart = false }) {
  // camera scanner state
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("Ready to scan or enter details below.");
  const [manualEmail, setManualEmail] = useState(propParticipantEmail || "");
  const [manualSeminarId, setManualSeminarId] = useState(propSeminarId || "");
  const qrRegionId = "html5qr-code-full-region";
  const qrRef = useRef(null);

  useEffect(() => {
    // cleanup on unmount
    return () => {
      // attempt to stop and clear the scanner safely
      const safeCleanup = async () => {
        if (!qrRef.current) return;
        try {
          await qrRef.current.stop();
        } catch (e) {
          // ignore stop errors
        }
        // do not call clear() here to avoid React DOM removal races; stop() is sufficient
        qrRef.current = null;
      };
      // call but don't await in cleanup
      safeCleanup();
    };
  }, []);

const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sem = params.get('seminar');
    if (sem && !propSeminarId) setManualSeminarId(sem);
    // if autoStart requested, start scanner
    if (autoStart) {
      // slight delay to let component mount
      setTimeout(() => startScanner().catch(() => {}), 200);
    }
}, [location]);

  // parse QR payload: we expect JSON like { seminar_id: "123", participant_email: "a@b.com" }
  const parsePayload = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.seminar_id && parsed.participant_email) return parsed;
      // if text is "seminarId|email" fallback
      if (text.includes("|")) {
        const [seminar_id, participant_email] = text.split("|");
        return { seminar_id, participant_email };
      }
      return null;
    } catch (err) {
      // not JSON; maybe "seminarId|email"
      if (text.includes("|")) {
        const [seminar_id, participant_email] = text.split("|");
        return { seminar_id, participant_email };
      }
      return null;
    }
  };

  const onScanSuccess = async (decodedText) => {
    // stop scanning briefly to avoid duplicate scans
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch (e) { /* ignore */ }
      // avoid clear() to prevent removeChild race with React
      qrRef.current = null;
      setScanning(false);
    }

    const payload = parsePayload(decodedText);
    if (!payload) {
      setMessage("Invalid QR — expected { seminar_id, participant_email } or seminarId|email");
      return;
    }

    setMessage(`Scanned for ${payload.participant_email} (seminar ${payload.seminar_id}) — checking...`);

    // Decide IN vs OUT based on DB row
    // We'll try to fetch the attendance row indirectly by calling recordTimeIn first then recordTimeOut if needed.
    // Safer flow: fetch record then check fields, but helpers combine logic so we use a small strategy:
    // 1) Try recordTimeIn -> if it created a row or updated time_in but time_out is null => that's IN
    // 2) Otherwise, try recordTimeOut -> if it updates time_out => OUT
    const inRes = await recordTimeIn(payload.seminar_id, payload.participant_email);
    if (inRes.error) {
      console.error(inRes.error);
      setMessage("Error recording attendance IN.");
      return;
    }

    const hasTimeOut = Array.isArray(inRes.data) ? !!inRes.data[0]?.time_out : !!inRes.data?.time_out;
    const hasTimeIn = Array.isArray(inRes.data) ? !!inRes.data[0]?.time_in : !!inRes.data?.time_in;

    if (hasTimeIn && !hasTimeOut) {
      setMessage(`✅ ${payload.participant_email} checked IN at ${new Date().toLocaleTimeString()}`);
      // notify parent that attendance was marked
      if (typeof onSuccess === 'function') {
        try { onSuccess({ seminarId: payload.seminar_id, participantEmail: payload.participant_email }); } catch (e) {}
      }
      return;
    }

    // If recordTimeIn returned an existing row with both fields or only time_out, attempt time_out
    const outRes = await recordTimeOut(payload.seminar_id, payload.participant_email);
    if (outRes.error) {
      console.error(outRes.error);
      setMessage("Error recording attendance OUT.");
      return;
    }
    setMessage(`✅ ${payload.participant_email} checked OUT at ${new Date().toLocaleTimeString()}`);
    if (typeof onSuccess === 'function') {
      try { onSuccess({ seminarId: payload.seminar_id, participantEmail: payload.participant_email, out: true }); } catch (e) {}
    }
  };

  const startScanner = async () => {
    setMessage("Starting camera...");
    setScanning(true);

    const config = { fps: 10, qrbox: { width: 300, height: 200 } };
    const html5QrCode = new Html5Qrcode(qrRegionId);
    qrRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => onScanSuccess(decodedText),
        (errorMessage) => {
          // scanning failure per frame, ignore
        }
      );
      setMessage("Scanning... point the camera to the QR code.");
    } catch (err) {
      console.error(err);
      // common errors include NotAllowedError / NotReadableError
      if (err && err.name === 'NotReadableError') {
        setMessage("Camera in use or not available. Use manual entry below.");
      } else if (err && err.name === 'NotAllowedError') {
        setMessage("Camera permission denied. Use manual entry below.");
      } else {
        setMessage("Camera access denied or not available. Use manual entry below.");
      }
      setScanning(false);
      // ensure we stop any partial instance; avoid clear()
      try { await html5QrCode.stop(); } catch (e) { /* ignore */ }
      qrRef.current = null;
    }
  };

  const stopScanner = async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch (e) { /* ignore */ }
      // avoid calling clear() to prevent DOM removal errors
      qrRef.current = null;
    }
    setScanning(false);
    setMessage("Scanner stopped.");
  };

  // Manual fallback: will perform IN then OUT same logic as scan flow
  const manualCheckInOut = async () => {
    if (!manualSeminarId || !manualEmail) {
      setMessage("Enter seminar id and participant email.");
      return;
    }
    setMessage("Processing manual entry...");
    // same logic: try IN first, if already in, then OUT
    const inRes = await recordTimeIn(manualSeminarId, manualEmail);
    if (inRes.error) {
      setMessage("Error recording IN (manual).");
      return;
    }
    const hasTimeOut = Array.isArray(inRes.data) ? !!inRes.data[0]?.time_out : !!inRes.data?.time_out;
    const hasTimeIn = Array.isArray(inRes.data) ? !!inRes.data[0]?.time_in : !!inRes.data?.time_in;

    if (hasTimeIn && !hasTimeOut) {
      setMessage(`✅ ${manualEmail} checked IN (manual).`);
      if (typeof onSuccess === 'function') {
        try { onSuccess({ seminarId: manualSeminarId, participantEmail: manualEmail }); } catch (e) {}
      }
      return;
    }
    const outRes = await recordTimeOut(manualSeminarId, manualEmail);
    if (outRes.error) {
      setMessage("Error recording OUT (manual).");
      return;
    }
    setMessage(`✅ ${manualEmail} checked OUT (manual).`);
    if (typeof onSuccess === 'function') {
      try { onSuccess({ seminarId: manualSeminarId, participantEmail: manualEmail, out: true }); } catch (e) {}
    }
  };

  return (
    <div style={{ padding: 20, color: '#223' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1a3a52' }}>Attendance Scanner</h2>
        <div style={{ fontSize: '0.95rem', color: '#666' }}>{message}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div id={qrRegionId} style={{ width: '100%', maxWidth: 560, height: 360, borderRadius: 12, overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!scanning && (
            <div style={{ color: '#fff', opacity: 0.85, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Camera Preview</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Click Start Camera and point at the participant QR code</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
        {!scanning ? (
          <button onClick={startScanner} style={{ padding: '0.6rem 1.2rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Start Camera</button>
        ) : (
          <button onClick={stopScanner} style={{ padding: '0.6rem 1.2rem', background: '#c41e3a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Stop Camera</button>
        )}
          <button onClick={async () => { if (qrRef.current) { try { await qrRef.current.stop(); } catch (e) {} qrRef.current = null; } setMessage('Ready to scan or enter details below.'); setScanning(false); }} style={{ padding: '0.6rem 1.2rem', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>Reset</button>
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
        <h3 style={{ marginTop: 0, color: '#1a3a52' }}>Manual Entry</h3>
        <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
          <input placeholder="seminar id" value={manualSeminarId} onChange={(e) => setManualSeminarId(e.target.value)} style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd' }} />
          <input placeholder="participant email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={manualCheckInOut} style={{ padding: '0.6rem 1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Check In / Out</button>
            <button onClick={() => { setManualSeminarId(propSeminarId || ''); setManualEmail(propParticipantEmail || ''); }} style={{ padding: '0.6rem 1rem', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>Fill From Context</button>
          </div>
        </div>
      </div>
    </div>
  );
}
