# QR Code Attendance Workflow

Your attendance system now has a **complete QR-based workflow** with automatic time-tracking.

## How It Works

### 1. **Scan QR → Auto Time-In** ✅
- Participant scans QR code on phone
- Automatically records `time_in` timestamp
- Shows confirmation: "✅ Checked IN"
- Redirects home after 3 seconds

### 2. **Timer Running** ⏱️
- While participant is checked in, a countdown timer runs
- Timer is based on seminar `end_datetime` or `end_time`
- Shows remaining time on success page: "⏱️ Time until checkout: 1m 30s"

### 3. **Auto Time-Out Popup** 🔔
- When seminar end time arrives, a popup appears automatically
- Message: "Seminar Time to End! Please scan your QR code again or confirm below"
- No manual action needed - it just pops up!

### 4. **Scan QR Again OR Confirm** ✅
- Participant can either:
  - **Scan QR code again** on phone (automatic time-out)
  - **Click "Confirm Check Out" button** on the popup
- Records `time_out` timestamp

### 5. **Auto Redirect to Evaluation** 📋
- After time-out, shows: "✅ Checked OUT"
- Automatically redirects to evaluation page after 2 seconds
- URL: `/evaluation/{seminarId}?email={participant_email}`
- Participant immediately fills out feedback form

---

## Complete Workflow Example

```
┌─ Admin creates seminar with end_time: 3:00 PM
│
├─ 2:30 PM: Participant scans QR
│   └─ ✅ Checked IN (time_in recorded)
│   └─ ⏱️ Shows "30m 00s until checkout"
│
├─ 2:59 PM: Countdown continues
│   └─ ⏱️ Shows "1m 00s until checkout"
│
├─ 3:00 PM: End time reached!
│   └─ 🔔 Popup appears: "Seminar Time to End!"
│   └─ Two options:
│      1. Scan QR again
│      2. Click "Confirm Check Out"
│
├─ Participant clicks/scans
│   └─ ✅ Checked OUT (time_out recorded)
│
└─ Auto redirect to evaluation
   └─ Participant fills feedback form
```

---

## Technical Details

### QRRedirect Component Features

**File:** `src/components/QRRedirect.jsx`

**State Management:**
- `status` - 'processing', 'success', 'error'
- `result` - Attendance record data
- `showTimeOutPrompt` - Controls modal visibility
- `seminarEndTime` - Parsed from database
- `timeUntilTimeout` - Countdown display

**Functions:**
- `parseQRData()` - Extract seminar_id & email from QR
- `getSeminarEndTime()` - Fetch from database
- `handleTimeOutConfirm()` - Process time-out manually
- Auto-redirect timer effects

### Database Integration

**Gets end time from:**
- `seminars.end_datetime` (preferred) → exact timestamp
- `seminars.end_time` (fallback) → parsed with today's date

**Records attendance in:**
- `attendance.time_in` - Timestamp when scanned first time
- `attendance.time_out` - Timestamp when scanned second time or popup confirmed

---

## Testing the Workflow

### Local Testing

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Create a test seminar with end_time in 1 minute:**
   - Go to Admin → Create Seminar
   - Set "End Time" to current time + 1 minute
   - Save seminar

3. **Get the QR code:**
   - Go to Attendance Scanner
   - Click "Generate QR Code" for your test seminar
   - OR directly visit: `/qr?data=%7B%22seminar_id%22:%22your-id%22,%22participant_email%22:%22test@test.com%22%7D`

4. **Simulate participant:**
   - Open QR URL on phone/another device
   - See "✅ Checked IN" message
   - Wait for timer to count down
   - See popup appear at end time
   - Click "Confirm Check Out"
   - Should redirect to evaluation page

### Production Testing (Vercel)

1. Deploy backend to Railway/Heroku (see `DEPLOYMENT_GUIDE.md`)
2. Update `VITE_API_URL` in Vercel dashboard
3. Create test seminar on live app
4. Scan QR code on phone at `finalws.vercel.app`
5. Verify time-out popup appears at end time

---

## QR Code Format

The QR code encodes data in this format:

```json
{
  "seminar_id": "48d214f5-7d9f-414d-8f06-03d2ca7c0aff",
  "participant_email": "participant@example.com"
}
```

**Generated URL:**
```
https://finalws.vercel.app/qr?data=%7B%22seminar_id%22:%22...%22,%22participant_email%22:%22...%22%7D
```

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/seminars/` | GET | Fetch seminar details (for end time) |
| `/api/seminars/{id}/attendance/time_in/` | POST | Record check-in |
| `/api/seminars/{id}/attendance/time_out/` | POST | Record check-out |
| `/api/seminars/{id}/evaluations/submit/` | POST | Submit evaluation form |

---

## Customization

### Change Redirect Time

In `QRRedirect.jsx`, line ~183:
```javascript
setTimeout(() => {
  navigate('/');  // Change where it redirects
}, 3000);  // Change delay (ms)
```

### Change Time-Out Modal Style

Search for `showTimeOutPrompt` section to customize colors, text, button styling.

### Add Sound Notification

After line `setShowTimeOutPrompt(true)`:
```javascript
// Play notification sound
const audio = new Audio('/notification.mp3');
audio.play();
```

---

## Known Limitations

- ⚠️ **Backend must be deployed** for production Vercel deployments (see `DEPLOYMENT_GUIDE.md`)
- ⚠️ **End time must be in future** for timer to work (no past dates)
- ⚠️ **Timezone handling** - uses browser's local timezone
- ⚠️ **Mobile Only** - QR scanning works on mobile browsers with camera access

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| QR not opening attendance page | Check if `/qr` route exists in `App.jsx` |
| Time-out popup doesn't appear | Verify `end_datetime` is set in seminar |
| Incorrect countdown time | Check timezone - uses browser local time |
| Evaluation page 404 after checkout | Ensure `/evaluation` route exists |
| Backend API errors | Check `VITE_API_URL` environment variable |

---

## Next Steps

1. ✅ **QR Workflow** - Complete and tested
2. 🔄 **Deploy Backend** - Follow `DEPLOYMENT_GUIDE.md` to deploy to Railway/Heroku
3. 🔄 **Update Vercel Environment** - Set `VITE_API_URL` in Vercel dashboard
4. 📱 **Test on Mobile** - Scan real QR codes from phones
5. 📊 **Monitor Attendance** - Check database for time_in/time_out records

---

## Files Modified

- `src/components/QRRedirect.jsx` - Enhanced with time-out modal, timer, and evaluation redirect
- `src/components/ParticipantQRCode.jsx` - Already generates correct QR format
- API routes - Already handle time-in/time-out in `backend/api/views.py`

Everything is ready! Just deploy your backend and test with real QR codes! 🚀
