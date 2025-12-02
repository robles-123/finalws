# Backend Deployment Guide

Your frontend is deployed to Vercel, but your Django backend is still running only on your local machine.

## What you need to do:

### Option 1: Deploy to Vercel (Recommended for simplicity)

Vercel doesn't support Python/Django natively, but you can use their serverless functions or deploy to another platform.

### Option 2: Deploy to Railway (Easy with Django support)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Initialize Railway project:**
   ```bash
   cd backend
   railway login
   railway init
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

4. **Get your backend URL:** Railway will provide a public URL (e.g., `https://your-app.railway.app`)

5. **Update Vercel environment variable:**
   - Go to your Vercel dashboard → Settings → Environment Variables
   - Add: `VITE_API_URL=https://your-app.railway.app/api`
   - Redeploy frontend

### Option 3: Deploy to Heroku

1. **Install Heroku CLI and login:**
   ```bash
   heroku login
   ```

2. **Create app:**
   ```bash
   cd backend
   heroku create your-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set SUPABASE_URL=https://aravvafcgwnjfjiiheta.supabase.co
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-key-here
   heroku config:set DJANGO_DEBUG=0
   heroku config:set DJANGO_SECRET_KEY=your-random-secret-key
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

5. **Get your URL:** `https://your-app-name.herokuapp.com`

## What changed in frontend:

Your `src/lib/db.js` now uses:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
```

This means:
- **Local development**: Uses `http://127.0.0.1:8000/api` (set in `.env.local`)
- **Production on Vercel**: Uses environment variable set in Vercel dashboard

## Next steps:

1. Choose a deployment platform (Railway is easiest)
2. Deploy your Django backend
3. Get the backend URL
4. Add `VITE_API_URL` environment variable to Vercel
5. Redeploy your Vercel frontend
6. Test your app!
