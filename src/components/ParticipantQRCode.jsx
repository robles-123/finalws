import React from 'react';

// Usage: <ParticipantQRCode seminarId="123" email="a@b.com" />
// This component generates a QR code that links to the QR redirect page
// When scanned on a phone, it automatically processes attendance (check in/out)
export default function ParticipantQRCode({ seminarId, email, size = 200 }) {
  // Encode the payload as JSON
  const payload = JSON.stringify({ seminar_id: seminarId, participant_email: email });
  
  // Get the base URL for the QR redirect page
  // The QR code will link to: /qr?data=<encoded_payload>
  const baseUrl = window.location.origin || 'http://localhost:5173';
  const qrUrl = `${baseUrl}/qr?data=${encodeURIComponent(payload)}`;
  
  // Generate QR code using the API service
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}`;
  
  return (
    <div style={{ textAlign: "center" }}>
      <img 
        src={src} 
        alt="participant-qr" 
        width={size} 
        height={size} 
        style={{ borderRadius: 8, border: '1px solid #eee', cursor: 'pointer' }} 
        title="Scan with phone to mark attendance"
      />
      <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
        Scan to mark attendance
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: '#999' }}>{email}</div>
    </div>
  );
}
