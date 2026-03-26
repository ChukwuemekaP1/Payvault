# Vercel Deployment Guide - PayVault Frontend

## 📋 Overview

This guide walks you through deploying the PayVault frontend to Vercel.

**Deployment Target:** https://payvault-frontend.vercel.app  
**Backend:** Will be deployed to Render.com  
**Email:** Gmail SMTP (production-ready)

---

## ⚡ Quick Deploy (5 minutes)

### Option 1: Vercel CLI (Recommended)

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

Choose your preferred method:
- GitHub (recommended)
- GitLab
- Bitbucket
- Email

#### Step 3: Navigate to Frontend Directory

```bash
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/frontend
```

#### Step 4: Deploy

```bash
vercel
```

**First time deployment prompts:**

```
? Set up and deploy "~/Documents/Projects/Rust_Bank/frontend"? [Y/n] → Y
? Which scope do you want to deploy to? → Select your account
? Link to existing project? [y/N] → N (for first time)
? What's your project's name? → payvault-frontend
? In which directory is your code located? → ./
? Want to override the settings? [y/N] → N
```

#### Step 5: Set Environment Variables

After first deployment, set environment variables:

```bash
vercel env add VITE_API_URL production
```

When prompted, enter your backend URL:
```
https://your-backend.onrender.com
```

(You'll get this URL after deploying backend to Render in Phase 4)

#### Step 6: Redeploy with Environment Variables

```bash
vercel --prod
```

**Done!** Your frontend is now live at:
```
https://payvault-frontend.vercel.app
```

---

### Option 2: Vercel Dashboard (Alternative)

#### Step 1: Import Project on GitHub

1. Go to https://github.com/new
2. Make sure your PayVault repo is public or grant Vercel access
3. Note your repo URL: `https://github.com/ChukwuemekaP1/Payvault`

#### Step 2: Connect Vercel to GitHub

1. Visit https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Under **"Import Git Repository"**, find and select `Payvault`
4. Click **"Import"**

#### Step 3: Configure Project

**Framework Preset:** Vite (should auto-detect)  
**Root Directory:** `./frontend`  
**Build Command:** `npm run build`  
**Output Directory:** `dist`  
**Install Command:** `npm install`

#### Step 4: Add Environment Variables

Click **"Environment Variables"** → **"Add Variable"**

```
Key: VITE_API_URL
Value: https://your-backend.onrender.com
Environment: Production
```

#### Step 5: Deploy

Click **"Deploy"**

Wait 2-3 minutes for build to complete.

**Done!** Live at: `https://payvault-frontend.vercel.app`

---

## 🔧 Configuration Files

### vercel.json (Already Created)

Located at: `frontend/vercel.json`

**Features:**
- Auto-builds with Vite
- Sets proper caching headers
- Handles SPA routing
- Configures environment variables

### .env.example (Create This)

Create `frontend/.env.example`:

```env
# API Configuration
VITE_API_URL=http://localhost:8000

# Optional: Analytics, Sentry, etc.
# VITE_SENTRY_DSN=
# VITE_ANALYTICS_ID=
```

**Important:** Never commit actual `.env` file!

---

## 🌐 Custom Domain (Optional)

### Step 1: Buy Domain

Purchase from:
- Namecheap (~$10/year)
- Google Domains (~$12/year)
- GoDaddy (various TLDs)

### Step 2: Add Domain to Vercel

1. Go to Vercel Dashboard → Your Project
2. Click **"Domains"** tab
3. Click **"Add"**
4. Enter your domain: `payvault.ng` (example)
5. Click **"Add"**

### Step 3: Configure DNS

Vercel will show DNS configuration:

**Option A: Automatic (Recommended)**
- Nameservers: Point to Vercel's nameservers
- Copy the 4 nameserver addresses
- Add them at your domain registrar

**Option B: Manual DNS Records**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Add these records at your domain registrar.

### Step 4: Wait for Propagation

DNS changes take 5 min - 48 hours to propagate.

Check status:
```bash
nslookup payvault.ng
```

### Step 5: HTTPS Automatic

Vercel automatically provisions SSL certificate via Let's Encrypt.

Your site will be available at:
- `https://payvault.ng`
- `https://www.payvault.ng`

---

## 🧪 Post-Deployment Testing

### Checklist

Visit your live site: `https://payvault-frontend.vercel.app`

- [ ] Homepage loads (< 3 seconds)
- [ ] Registration page accessible
- [ ] Can register with real email
- [ ] OTP email received
- [ ] Can verify email
- [ ] Can login
- [ ] Dashboard loads
- [ ] Balance displays correctly
- [ ] Transfer form works
- [ ] Transaction history visible
- [ ] Admin panel accessible (if admin user)
- [ ] Mobile responsive
- [ ] No console errors

### Test Real Email Flow

1. Register with YOUR_REAL_EMAIL@gmail.com
2. Check email for OTP
3. Verify email
4. Login
5. Make small transfer
6. Check email for receipt

**If all works:** ✅ Production ready!

---

## 🔍 Monitoring & Logs

### View Deployment Logs

```bash
vercel logs payvault-frontend
```

### View Build Output

In Vercel Dashboard:
1. Click your project
2. Click **"Deployments"** tab
3. Click latest deployment
4. View build logs

### Debug Issues

Common issues and fixes:

**Issue:** Blank page  
**Fix:** Check browser console for errors, verify `VITE_API_URL` is correct

**Issue:** CORS errors  
**Fix:** Update backend CORS settings (see Phase 4)

**Issue:** API calls failing  
**Fix:** Ensure backend is deployed and running

**Issue:** Build fails  
**Fix:** Run `npm run build` locally first to catch errors

---

## 🚀 Continuous Deployment

Vercel automatically deploys on every push to main branch!

### Setup Auto-Deploy

1. In Vercel Dashboard → Project → Settings → Git
2. Ensure **"Production"** branch is set to `main`
3. Enable **"Automatically Expose Pull Request Previews"**

Now every push to `main` will:
1. Trigger Vercel build
2. Deploy to production
3. Update live site

### Preview Deployments

For pull requests:
1. Create PR branch
2. Push to GitHub
3. Vercel creates preview URL
4. Comment on PR with preview link

Perfect for testing before production!

---

## 💰 Cost Estimate

### Free Tier (Perfect for Testing)

✅ Unlimited deployments  
✅ 100GB bandwidth/month  
✅ Automatic SSL  
✅ Custom domains  
✅ Serverless functions  

**Cost:** $0/month

### Pro Tier (When You Scale)

Needed when:
- >100GB bandwidth/month
- Need analytics
- Priority support

**Cost:** $20/month

---

## 🎯 Environment Variables Reference

### Required Variables

```env
# Backend API URL (production)
VITE_API_URL=https://your-backend.onrender.com

# Backend API URL (local development)
VITE_API_URL=http://localhost:8000
```

### Optional Variables

```env
# Analytics (if using)
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Error monitoring (Sentry)
VITE_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzzzzzzzz

# Feature flags
VITE_ENABLE_ANALYTICS=true
```

---

## 📊 Performance Optimization

### Already Configured

✅ Asset caching (1 year for static assets)  
✅ Gzip compression  
✅ CDN distribution  
✅ Tree shaking  
✅ Code splitting  

### Additional Optimizations

#### 1. Image Optimization

Add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['./src/components/ui'],
        },
      },
    },
  },
})
```

#### 2. Lazy Loading Routes

Already implemented in App.tsx with React.lazy()

#### 3. Prefetch Critical Routes

Add to index.html:

```html
<link rel="prefetch" href="/auth/login">
<link rel="prefetch" href="/dashboard">
```

---

## 🆘 Troubleshooting

### Issue: "Failed to compile"

**Solution:**
```bash
cd frontend
npm run build
# Fix any TypeScript errors shown
```

### Issue: "Environment variables not working"

**Solution:**
1. Redeploy after setting env vars
2. Verify in Vercel dashboard they're set
3. Use `VITE_` prefix for client-side vars

### Issue: "API calls returning 404"

**Solution:**
1. Check `VITE_API_URL` is correct
2. Ensure backend is deployed
3. Verify CORS configured on backend

### Issue: "White screen after deploy"

**Solution:**
```bash
# Check browser console
# Look for failed resource loads
# Verify base path is correct

# Try adding to vite.config.ts:
base: '/'
```

---

## ✅ Success Criteria

Deployment successful when:

✅ Site loads at vercel.app domain  
✅ All pages accessible  
✅ API calls work  
✅ Registration sends real emails  
✅ No console errors  
✅ Mobile responsive  
✅ Lighthouse score >90  

---

## 🎉 Next Steps

After successful deployment:

1. ✅ Test with real email registration
2. ✅ Verify OTP emails received
3. ✅ Test transaction emails
4. ✅ Proceed to backend deployment (Phase 4)
5. ✅ Update `VITE_API_URL` to production backend
6. ✅ Test full flow end-to-end

---

**Status:** Ready to deploy  
**Estimated Time:** 5-10 minutes  
**Difficulty:** Easy  

**Good luck!** 🚀
