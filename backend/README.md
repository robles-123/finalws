# VPAA Seminar Management System - Django Backend

A minimal Django backend for the VPAA seminar management system that interfaces with Supabase using the service-role key.

## Overview

This backend provides REST API endpoints for:
- **Seminars**: Create, list, update, delete seminars
- **Attendance**: Record participant check-in/out times
- **Participants**: Register and manage seminar participants
- **Evaluations**: Collect and retrieve participant feedback

## Architecture

- **Framework**: Django + Django REST Framework
- **Database**: Supabase (PostgreSQL) via Python client
- **Authentication**: Supabase service-role key (server-side only)
- **CORS**: Enabled for development

## Prerequisites

- Python 3.10+
- Supabase project with service-role key (keep secret)

## Quick Start

### 1. Setup Environment

```powershell
# Navigate to backend folder
cd backend

# Create and activate virtual environment
python -m venv .venv
. .\.venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` folder:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DJANGO_DEBUG=1
DJANGO_SECRET_KEY=your-secret-key-here
```

**Important**: Never commit `.env` or share your service-role key!

### 3. Run Migrations

```powershell
python manage.py migrate
```

### 4. Start Development Server

```powershell
python manage.py runserver 127.0.0.1:8000
```

Server runs at `http://127.0.0.1:8000`

## API Endpoints

### Seminars

#### List Seminars
```
GET /api/seminars/
```
Returns all seminars ordered by date.

#### Get Seminar Details
```
GET /api/seminars/{seminar_id}/
```
Returns a specific seminar by ID.

#### Create Seminar
```
POST /api/seminars/
Content-Type: application/json

{
  "title": "Seminar Title",
  "duration": 60,
  "speaker": "Speaker Name",
  "participants": 100,
  "date": "2025-12-10",
  "start_datetime": "2025-12-10T10:00:00Z",
  "end_datetime": "2025-12-10T11:00:00Z",
  "start_time": "10:00 AM",
  "end_time": "11:00 AM",
  "questions": [...],
  "certificate_template_url": "https://..."
}
```

#### Update Seminar
```
PUT /api/seminars/{seminar_id}/
Content-Type: application/json

{
  "title": "Updated Title",
  "duration": 90,
  ...
}
```

#### Delete Seminar
```
DELETE /api/seminars/{seminar_id}/
```

### Attendance Management

#### List Attendance Records
```
GET /api/seminars/{seminar_id}/attendance/
```
Returns all attendance records for a seminar.

#### Record Time-In
```
POST /api/seminars/{seminar_id}/attendance/time_in/
Content-Type: application/json

{
  "participant_email": "participant@example.com"
}
```

#### Record Time-Out
```
POST /api/seminars/{seminar_id}/attendance/time_out/
Content-Type: application/json

{
  "participant_email": "participant@example.com"
}
```

### Participant Management

#### List Participants
```
GET /api/seminars/{seminar_id}/participants/
```
Returns all participants registered for a seminar.

#### Register Participant
```
POST /api/seminars/{seminar_id}/participants/join/
Content-Type: application/json

{
  "participant_email": "participant@example.com",
  "participant_name": "John Doe",
  "metadata": {...}
}
```

#### Check-In Participant
```
POST /api/seminars/{seminar_id}/participants/check_in/
Content-Type: application/json

{
  "participant_email": "participant@example.com"
}
```

#### Check-Out Participant
```
POST /api/seminars/{seminar_id}/participants/check_out/
Content-Type: application/json

{
  "participant_email": "participant@example.com"
}
```

### Evaluations

#### Fetch Evaluations
```
GET /api/seminars/{seminar_id}/evaluations/?participant_email=optional
```
Get evaluations for a seminar (optionally filtered by participant).

#### Check if Evaluated
```
GET /api/seminars/{seminar_id}/evaluations/check/?participant_email=user@example.com
```
Returns `{"evaluated": true/false}`.

#### Submit Evaluation
```
POST /api/seminars/{seminar_id}/evaluations/submit/
Content-Type: application/json

{
  "participant_email": "participant@example.com",
  "answers": {
    "question_1": "answer_value",
    "question_2": "rating"
  }
}
```

## Testing Endpoints (PowerShell Examples)

### Get All Seminars
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/seminars/" -Method Get
```

### Create a Seminar
```powershell
$body = @{
    title = "Leadership Workshop"
    duration = 120
    speaker = "Jane Smith"
    participants = 50
    date = "2025-12-15"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/seminars/" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Record Time-In
```powershell
$body = @{ participant_email = "test@example.com" } | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/seminars/<seminar_id>/attendance/time_in/" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Register Participant
```powershell
$body = @{
    participant_email = "participant@example.com"
    participant_name = "Alice Johnson"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/seminars/<seminar_id>/participants/join/" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Submit Evaluation
```powershell
$body = @{
    participant_email = "participant@example.com"
    answers = @{
        "How was the content?" = "Excellent"
        "Speaker clarity (1-5)" = 5
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/seminars/<seminar_id>/evaluations/submit/" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

## Common Issues

### ModuleNotFoundError: No module named 'supabase'
- Ensure virtualenv is activated
- Re-run `pip install -r requirements.txt`

### Supabase authentication error
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure the service role key has appropriate permissions in Supabase
- Check that your Supabase project has the required tables created (see `../scripts/create_tables.sql`)

### Port 8000 already in use
```powershell
python manage.py runserver 127.0.0.1:8001  # Use a different port
```

## Frontend Integration

Update your React app (`src/lib/db.js`) to call these backend endpoints instead of using the Supabase anon key directly for sensitive operations.

### Example: Replace direct Supabase call with backend API

**Before** (direct Supabase from browser):
```javascript
export async function fetchSeminars() {
  const { data, error } = await supabase
    .from('seminars')
    .select('*');
  return { data, error };
}
```

**After** (use backend API):
```javascript
export async function fetchSeminars() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/seminars/');
    const json = await response.json();
    return { data: json.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

## Production Deployment

For production:

1. Set `DJANGO_DEBUG=0`
2. Use a strong `DJANGO_SECRET_KEY`
3. Configure `ALLOWED_HOSTS` with your domain
4. Use a production WSGI server (Gunicorn, uWSGI)
5. Set up HTTPS/SSL
6. Store secrets in environment variables or a secure vault
7. Configure stricter CORS settings
8. Set up proper logging and monitoring

Example production run with Gunicorn:
```powershell
pip install gunicorn
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

## Documentation References

- [Django Documentation](https://docs.djangoproject.com/)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [REST API Best Practices](https://restfulapi.net/)

