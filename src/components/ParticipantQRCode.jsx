import React from 'react';

// Usage: <ParticipantQRCode seminarId="123" email="a@b.com" />
// This component uses a public QR image API to avoid bundler ESM/default-export issues.
export default function ParticipantQRCode({ seminarId, email, size = 200 }) {
  const payload = JSON.stringify({ seminar_id: seminarId, participant_email: email });
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
  return (
    <div style={{ textAlign: "center" }}>
      <img src={src} alt="participant-qr" width={size} height={size} style={{ borderRadius: 8, border: '1px solid #eee' }} />
      <div style={{ marginTop: 6, fontSize: 12 }}>{email}</div>
    </div>
  );
}
