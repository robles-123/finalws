#!/usr/bin/env pwsh
# Quick Railway Deployment Script for Django Backend

Write-Host "🚀 VPAA Backend Deployment to Railway" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @railway/cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Railway CLI" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Railway CLI found" -ForegroundColor Green
Write-Host ""

# Navigate to backend
cd backend
Write-Host "📁 In backend directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Login to Railway
Write-Host "🔐 Logging in to Railway..." -ForegroundColor Cyan
railway login

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Railway login failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Railway login successful" -ForegroundColor Green
Write-Host ""

# Initialize Railway project
Write-Host "📦 Initializing Railway project..." -ForegroundColor Cyan
railway init

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Railway init failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Railway project initialized" -ForegroundColor Green
Write-Host ""

# Set environment variables
Write-Host "🔑 Setting Supabase environment variables..." -ForegroundColor Cyan
Write-Host ""

# Read from environment
$supabaseUrl = $env:SUPABASE_URL
if (-not $supabaseUrl) {
    $supabaseUrl = "https://aravvafcgwnjfjiiheta.supabase.co"
}

$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $serviceRoleKey) {
    Write-Host "⚠️  SUPABASE_SERVICE_ROLE_KEY not set in environment" -ForegroundColor Yellow
    Write-Host "   You'll need to set this in Railway dashboard manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Variable name: SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Cyan
    Write-Host "   Variable value: [your-service-role-key]" -ForegroundColor Cyan
}

railway variable set SUPABASE_URL=$supabaseUrl
railway variable set DJANGO_DEBUG=0
railway variable set DJANGO_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"

if ($serviceRoleKey) {
    railway variable set SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey
}

Write-Host "✓ Environment variables set" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Cyan
railway up

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Go to Railway dashboard to find your public URL" -ForegroundColor White
    Write-Host "  2. Copy your backend URL (e.g., https://your-app.railway.app)" -ForegroundColor White
    Write-Host "  3. In Vercel dashboard:" -ForegroundColor White
    Write-Host "     - Settings → Environment Variables" -ForegroundColor White
    Write-Host "     - Add: VITE_API_URL=https://your-app.railway.app/api" -ForegroundColor White
    Write-Host "     - Redeploy your frontend" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
