# Why Your Vercel Deployment Shows 404

## The Problem

Your app on Vercel (`finalws.vercel.app`) is showing **404: NOT_FOUND** because:

1. **Frontend deployed to Vercel** ✅ (working)
2. **Backend still running only locally** ❌ (not accessible from Vercel)
3. **Frontend trying to call `http://127.0.0.1:8000/api`** ❌ (This is your laptop, not the cloud)

When someone opens your Vercel link, the frontend loads in their browser, but then tries to call your local backend—which they can't reach because it's on your machine.

---

## What I Fixed

✅ **Updated `src/lib/db.js`** to use environment variables:

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
```

Now it will:
- Use `VITE_API_URL` environment variable if set (Vercel)
- Fall back to `http://127.0.0.1:8000/api` for local development

---

## What You Need to Do

### Step 1: Deploy Your Django Backend

Choose one of these platforms (Railway is easiest):

#### **Option A: Railway (Recommended)**

```bash
npm install -g @railway/cli
cd backend
railway login
railway init
railway up
```

Note the URL it gives you, e.g., `https://your-app.railway.app`

#### **Option B: Heroku**

```bash
heroku login
cd backend
heroku create your-app-name
heroku config:set SUPABASE_URL=https://aravvafcgwnjfjiiheta.supabase.co
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
heroku config:set DJANGO_DEBUG=0
heroku config:set DJANGO_SECRET_KEY=change-me-to-random-string
git push heroku main
```

Note the URL it gives you, e.g., `https://your-app-name.herokuapp.com`

---

### Step 2: Set Environment Variable in Vercel

1. Go to **Vercel Dashboard** → Your project (`finalws`)
2. Click **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.railway.app/api` (or `.herokuapp.com`)
4. Click **Add**
5. Go to **Deployments** and redeploy by clicking the latest deployment → **Redeploy**

---

### Step 3: Test Your App

After Vercel redeploys:
- Open `https://finalws.vercel.app`
- Check browser console (F12) for errors
- Your app should now be able to call the backend

---

## Local Development

For local testing, you already have `.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Just make sure Django backend is running:

```bash
cd backend
. .\.venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8000
```

Then in another terminal:

```bash
npm run dev
```

---

## Quick Reference

| Environment | API URL |
|-------------|---------|
| **Local dev** | `http://127.0.0.1:8000/api` (`.env.local`) |
| **Vercel production** | `https://your-backend.railway.app/api` (set in Vercel dashboard) |

---

## Files Updated

- `src/lib/db.js` - Now uses `import.meta.env.VITE_API_URL`
- `.env.local` - Created for local development
- `vercel.json` - Added Vercel configuration
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions

---

## Need Help?

Check these files in your repo:
- `backend/README.md` - Backend API documentation
- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `backend/ERROR_ANALYSIS.md` - Common issues and fixes
