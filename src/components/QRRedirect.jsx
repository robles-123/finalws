import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { recordTimeIn, recordTimeOut, fetchSeminars } from '../lib/db';

export default function QRRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your attendance...');
  const [result, setResult] = useState(null);
  const [showTimeOutPrompt, setShowTimeOutPrompt] = useState(false);
  const [seminarEndTime, setSeminarEndTime] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [timeUntilTimeout, setTimeUntilTimeout] = useState(null);

  // Parse QR data
  const parseQRData = () => {
    const hash = location.hash.substring(1); // remove '#'
    const params = new URLSearchParams(location.search);
    let qrData = hash || params.get('data');
    
    if (!qrData) return null;

    try {
      return JSON.parse(decodeURIComponent(qrData));
    } catch (e) {
      if (qrData.includes('|')) {
        const [seminar_id, participant_email] = qrData.split('|');
        return { seminar_id, participant_email };
      }
    }
    return null;
  };

  // Get seminar end time
  const getSeminarEndTime = async (seminarId) => {
    try {
      const res = await fetchSeminars();
      if (res.error) return null;
      
      const seminars = Array.isArray(res.data) ? res.data : [res.data];
      const seminar = seminars.find(s => s.id === seminarId);
      
      if (!seminar) return null;
      
      // Use end_datetime or end_time
      if (seminar.end_datetime) {
        return new Date(seminar.end_datetime);
      }
      if (seminar.end_time) {
        const today = new Date();
        const [hours, minutes] = seminar.end_time.split(':').map(Number);
        const endDate = new Date(today);
        endDate.setHours(hours, minutes, 0);
        return endDate;
      }
    } catch (err) {
      console.error('Error fetching seminar:', err);
    }
    return null;
  };

  // Main QR processing
  useEffect(() => {
    const processQRData = async () => {
      try {
        const payload = parseQRData();
        
        if (!payload || !payload.seminar_id || !payload.participant_email) {
          setStatus('error');
          setMessage('❌ Invalid QR code data. Please try again.');
          return;
        }

        setMessage(`Processing attendance for ${payload.participant_email}...`);

        // Get seminar details to check end time
        const endTime = await getSeminarEndTime(payload.seminar_id);
        if (endTime) {
          setSeminarEndTime(endTime);
        }

        // Record time IN
        const inRes = await recordTimeIn(payload.seminar_id, payload.participant_email);
        
        if (inRes.error) {
          console.error('Time IN error:', inRes.error);
          setStatus('error');
          setMessage('❌ Error processing attendance. Please try again.');
          return;
        }

        const attendanceRecord = Array.isArray(inRes.data) ? inRes.data[0] : inRes.data;
        const hasTimeOut = !!attendanceRecord?.time_out;
        const hasTimeIn = !!attendanceRecord?.time_in;

        if (hasTimeIn && !hasTimeOut) {
          // Just checked in
          const checkInTime = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          setStatus('success');
          setMessage(`✅ Checked IN`);
          setResult({
            type: 'in',
            email: payload.participant_email,
            time: checkInTime,
            seminarId: payload.seminar_id
          });
          setAttendanceData({
            seminar_id: payload.seminar_id,
            participant_email: payload.participant_email
          });
          return;
        }

        // If already has time_in and no time_out, record time OUT
        const outRes = await recordTimeOut(payload.seminar_id, payload.participant_email);
        
        if (outRes.error) {
          console.error('Time OUT error:', outRes.error);
          setStatus('error');
          setMessage('❌ Error recording checkout. Please try again.');
          return;
        }

        const checkOutTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
        setStatus('success');
        setMessage(`✅ Checked OUT`);
        setResult({
          type: 'out',
          email: payload.participant_email,
          time: checkOutTime,
          seminarId: payload.seminar_id
        });
        setAttendanceData({
          seminar_id: payload.seminar_id,
          participant_email: payload.participant_email
        });

      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        setMessage('❌ Unexpected error. Please try again.');
      }
    };

    processQRData();
  }, [location]);

  // Timer for end-of-seminar time-out notification
  useEffect(() => {
    if (!seminarEndTime || !attendanceData || result?.type === 'out') return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = seminarEndTime - now;

      if (diff <= 0) {
        // Time to show time-out prompt
        setShowTimeOutPrompt(true);
        setTimeUntilTimeout(null);
      } else {
        // Update countdown
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeUntilTimeout(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [seminarEndTime, attendanceData, result]);

  // Handle time-out confirmation
  const handleTimeOutConfirm = async () => {
    if (!attendanceData) return;

    try {
      setShowTimeOutPrompt(false);
      setStatus('processing');
      setMessage('Recording your time-out...');

      const outRes = await recordTimeOut(attendanceData.seminar_id, attendanceData.participant_email);
      
      if (outRes.error) {
        setStatus('error');
        setMessage('❌ Error recording checkout. Please try again.');
        return;
      }

      const checkOutTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      setStatus('success');
      setMessage('✅ Checked OUT');
      setResult({
        type: 'out',
        email: attendanceData.participant_email,
        time: checkOutTime,
        seminarId: attendanceData.seminar_id
      });

      // Redirect to evaluation after 2 seconds
      setTimeout(() => {
        navigate(`/evaluation/${attendanceData.seminar_id}?email=${attendanceData.participant_email}`);
      }, 2000);
    } catch (err) {
      console.error('Error during time-out:', err);
      setStatus('error');
      setMessage('❌ Error recording checkout. Please try again.');
    }
  };

  // Auto-redirect after check-in (if manual time-out expected)
  useEffect(() => {
    if (status === 'success' && result?.type === 'in') {
      const timer = setTimeout(() => {
        navigate('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, result, navigate]);

  // Auto-redirect after check-out to evaluation
  useEffect(() => {
    if (status === 'success' && result?.type === 'out') {
      const timer = setTimeout(() => {
        navigate(`/evaluation/${result.seminarId}?email=${result.email}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, result, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      position: 'relative'
    }}>
      {/* Time-Out Prompt Modal */}
      {showTimeOutPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            textAlign: 'center',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px'
            }}>
              ⏰
            </div>
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#e74c3c',
              fontSize: '28px',
              fontWeight: '700'
            }}>
              Seminar Time to End!
            </h2>
            <p style={{
              margin: '10px 0 20px 0',
              color: '#666',
              fontSize: '16px'
            }}>
              It's time to check out. Please scan your QR code again or confirm below.
            </p>
            <button
              onClick={handleTimeOutConfirm}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: '#e74c3c',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#c0392b';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#e74c3c';
              }}
            >
              Confirm Check Out
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        {status === 'processing' && (
          <>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              animation: 'spin 1s linear infinite'
            }}>
              ⏳
            </div>
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#1a3a52',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              {message}
            </h2>
            <p style={{
              margin: 0,
              color: '#999',
              fontSize: '14px'
            }}>
              Please wait while we process your attendance...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px'
            }}>
              ✅
            </div>
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#27ae60',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              {message}
            </h2>
            {result && (
              <div style={{
                background: '#f0f9f7',
                border: '2px solid #27ae60',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '20px',
                textAlign: 'left'
              }}>
                <p style={{
                  margin: '8px 0',
                  color: '#1a3a52',
                  fontSize: '14px'
                }}>
                  <strong>Status:</strong> {result.type === 'in' ? 'Checked IN' : 'Checked OUT'}
                </p>
                <p style={{
                  margin: '8px 0',
                  color: '#1a3a52',
                  fontSize: '14px'
                }}>
                  <strong>Time:</strong> {result.time}
                </p>
                <p style={{
                  margin: '8px 0',
                  color: '#1a3a52',
                  fontSize: '14px'
                }}>
                  <strong>Email:</strong> {result.email}
                </p>
              </div>
            )}
            {result?.type === 'in' && timeUntilTimeout && (
              <div style={{
                background: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '16px',
                fontSize: '14px',
                color: '#856404'
              }}>
                <strong>⏱️ Time until checkout:</strong> {timeUntilTimeout}
              </div>
            )}
            <p style={{
              margin: '20px 0 0 0',
              color: '#999',
              fontSize: '14px'
            }}>
              {result?.type === 'out' ? 'Redirecting to evaluation...' : 'Redirecting in 3 seconds...'}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px'
            }}>
              ❌
            </div>
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#e74c3c',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              {message}
            </h2>
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: '#2e5266',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#1a3a52';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#2e5266';
              }}
            >
              Go Home
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from {
              transform: translateY(-50px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
