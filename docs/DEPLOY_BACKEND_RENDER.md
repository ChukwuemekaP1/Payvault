# 🚀 Render.com Backend Deployment Guide

## 📋 Overview

Complete guide to deploying PayVault backend to Render.com with managed PostgreSQL.

**Deployment Target:** https://payvault-backend.onrender.com  
**Database:** Render Managed PostgreSQL (~$7/month)  
**Redis:** Render Redis (free tier) or Upstash (free tier)  
**Email:** Gmail SMTP (production credentials)

---

## ⚡ Quick Deploy (15 minutes)

### Prerequisites

Before starting:

- [ ] GitHub account connected to Render
- [ ] Backend code pushed to GitHub
- [ ] Gmail app password ready: `tpvm ptum qolq mdcr`
- [ ] ~$10-15/month budget for hosting

---

### Step 1: Create Render Account

1. Visit: https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended) or email
4. Complete account setup

---

### Step 2: Create Managed PostgreSQL Database

#### 2.1 Create Database

1. In Render Dashboard, click **"New +"** → **"Database"**
2. Configure database:

```
Name: payvault-db
Region: Select closest to you (e.g., Oregon, Frankfurt)
Database Size: Basic (Free for 30 days, then $7/month)
PostgreSQL Version: 15 (or latest)
```

3. Click **"Create Database"**

Wait 2-3 minutes for provisioning.

#### 2.2 Get Connection String

Once database is ready:

1. Click on your database
2. Copy **"Internal Database URL"**

Format:
```
postgresql://user:password@hostname:5432/payvault?sslmode=require
```

**Save this!** You'll need it in Step 4.

---

### Step 3: Create Redis Instance

#### Option A: Render Redis (Recommended)

1. Dashboard → **"New +"** → **"Redis"**
2. Configure:

```
Name: payvault-redis
Region: Same as database
Plan: Free (1MB - enough for OTPs and sessions)
```

3. Click **"Create Redis"**

Copy **Redis Connection URL** when ready.

#### Option B: Upstash Redis (Alternative)

If you prefer Upstash:

1. Visit https://upstash.com
2. Create free account
3. Create Redis database
4. Copy REST API URL or password

---

### Step 4: Create Web Service

#### 4.1 Connect Repository

1. Dashboard → **"New +"** → **"Web Service"**
2. Choose **"Connect a repository"**
3. Select from GitHub: `ChukwuemekaP1/Payvault`
4. Click **"Connect selected repository"**

#### 4.2 Configure Service

**Settings:**

```
Name: payvault-backend
Region: Same as database
Branch: main
Root Directory: backend
Runtime: Docker
Dockerfile Path: Dockerfile
```

**Build & Start:**

```
Build Command: (leave empty - uses Docker)
Start Command: ./target/release/payvault
```

#### 4.3 Choose Instance Type

Select:

```
Instance Type: Basic
Size: Standard (CPU: 0.5, Memory: 512MB)
```

**Cost:** ~$7/month

For higher traffic, upgrade to:
- Standard 2 (1 CPU, 1GB RAM) - $14/month
- Standard 4 (2 CPU, 2GB RAM) - $28/month

#### 4.4 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add ALL of these:

```env
# Application
APP_ENV=production
APP_PORT=10000

# Database (from Step 2.2)
DATABASE_URL=postgresql://user:pass@host:5432/payvault?sslmode=require

# Redis (from Step 3)
REDIS_URL=redis://default:pass@host:6379

# JWT Security
JWT_SECRET=generate-random-64-char-string-here-min-32-chars
JWT_ACCESS_TTL=15
JWT_REFRESH_TTL=10080

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=nwokolopaul274@gmail.com
SMTP_PASSWORD=tpvm ptum qolq mdcr
SMTP_FROM=noreply@payvault.com

# Admin Account
ADMIN_EMAIL=admin@payvault.com
ADMIN_PASSWORD=Admin123!

# Optional: Paystack (for payment integration)
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

**Important Notes:**

- `JWT_SECRET`: Generate secure random string (see below)
- Use YOUR actual Gmail app password
- Keep all values exactly as shown

#### Generate JWT Secret

Run locally:
```bash
# Linux/Mac
openssl rand -base64 48

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output: 7d8f9a3b2c1e5f6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

#### 4.5 Auto-Deploy

Ensure **"Auto-Deploy"** is enabled (default).

This means:
- Every push to `main` triggers rebuild
- Automatic deployments
- Zero downtime updates

#### 4.6 Create Service

Click **"Create Web Service"**

Render will now:
1. Build Docker image (~5-10 minutes)
2. Push to registry
3. Deploy to servers
4. Run migrations

Watch build logs in real-time!

---

### Step 5: Run Database Migrations

After deployment completes:

#### 5.1 Access Render Shell

1. Click on your service
2. Click **"Shell"** tab
3. Click **"Connect"**

#### 5.2 Run Migrations

In shell:

```bash
cd /app
sqlx migrate run
```

Expected output:
```
Applied 1 migration: 001_users
Applied 2 migration: 002_wallets
Applied 3 migration: 003_transactions
Applied 4 migration: 004_audit_log
Applied 5 migration: 005_indexes
```

✅ Migrations complete!

---

### Step 6: Verify Deployment

#### 6.1 Get Service URL

From service page, copy URL:
```
https://payvault-backend.onrender.com
```

#### 6.2 Test Health Endpoint

```bash
curl https://payvault-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

#### 6.3 Test Registration

```bash
curl -X POST https://payvault-backend.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

Expected:
```json
{
  "message": "User registered successfully. Please verify your email."
}
```

Check email inbox for OTP!

---

## 🔧 Dockerfile Optimization

Your current Dockerfile is good, but here's an optimized version:

```dockerfile
# backend/Dockerfile

# ── Builder Stage ─────────────────────────────────────────────────────────────
FROM rust:1.75-slim-bullseye AS builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    cmake \
    clang \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy manifests first (better caching)
COPY Cargo.toml Cargo.lock ./

# Create dummy src for dependency caching
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies only (cached layer)
RUN cargo build --release
RUN rm -rf src

# Copy actual source code
COPY src ./src
COPY db ./db

# Rebuild with actual code (faster due to cached deps)
RUN cargo build --release --bin payvault

# ── Runtime Stage ────────────────────────────────────────────────────────────
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -u 1000 -g root appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/payvault .

# Change ownership
RUN chown -R appuser:root /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:10000/health || exit 1

# Start application
CMD ["./payvault"]
```

---

## 🌐 CORS Configuration

Update backend to allow Vercel frontend:

Edit `backend/src/main.rs`:

```rust
// Add Vercel domains to CORS
let cors = CorsLayer::new()
    .allow_origin([
        "http://localhost:5173".parse::<HeaderValue>().unwrap(),
        "https://payvault-frontend.vercel.app".parse::<HeaderValue>().unwrap(),
        // Add your custom domain when ready
        // "https://payvault.ng".parse::<HeaderValue>().unwrap(),
    ])
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers([
        header::CONTENT_TYPE,
        header::AUTHORIZATION,
        header::IDEMPOTENCY_KEY,
    ]);
```

---

## 📊 Monitoring Setup

### Render Dashboard Metrics

View in real-time:
- CPU usage
- Memory usage
- Request count
- Error rate
- Response times

### Logs

View live logs:
1. Service page → **"Logs"** tab
2. See all requests in real-time
3. Filter by level (ERROR, WARN, INFO)

### Uptime Monitoring

Set up external monitoring:

#### UptimeRobot (Free)

1. Visit https://uptimerobot.com
2. Create free account
3. Add new monitor:

```
Monitor Type: HTTP(s)
Friendly Name: PayVault Backend Health
URL: https://payvault-backend.onrender.com/health
Monitoring Interval: 5 minutes
```

4. Get email alerts if down!

---

## 💰 Cost Breakdown

### Monthly Costs

| Service | Plan | Cost |
|---------|------|------|
| Render Web Service | Basic | $7 |
| Render PostgreSQL | Basic | $7 (after 30-day free trial) |
| Render Redis | Free | $0 |
| **Total** | | **~$14/month** |

### First Month: FREE!

- All services have 30-day free trial
- Total first month: $0
- After trial: ~$14/month

### Cost Optimization Tips

1. **Use Supabase for Database** (Free tier)
   - 500MB free
   - Saves $7/month
   - Same features

2. **Use Upstash Redis** (Free tier)
   - 10,000 commands/day free
   - More than enough for OTPs

3. **Optimize Instance Size**
   - Start with Basic ($7)
   - Upgrade only if needed

**Minimum possible:** ~$7/month (with free DB + Redis)

---

## 🧪 Post-Deployment Testing

### Full Integration Test

1. **Visit Vercel Frontend**
   ```
   https://payvault-frontend.vercel.app
   ```

2. **Register with Real Email**
   - Use: YOUR_REAL_EMAIL@gmail.com
   - Complete form
   - Submit

3. **Check Email**
   - Should receive OTP within 30 seconds
   - Open email, copy 6-digit code

4. **Verify Email**
   - Enter OTP on verification page
   - Should succeed

5. **Login**
   - Use credentials
   - Should access dashboard

6. **Fund Wallet** (via admin panel)
   - Login as admin
   - Credit user wallet with test amount

7. **Make Transfer**
   - Transfer small amount
   - Check transaction receipt email

8. **Verify Admin Panel**
   - Access admin features
   - View users, wallets, transactions

**All work?** ✅ Production ready!

---

## 🔐 Security Hardening

### Environment Variables

✅ Already secured via Render env vars  
✅ Never committed to Git  
✅ Encrypted at rest  

### Database

✅ SSL required (`sslmode=require`)  
✅ Not publicly accessible  
✅ Only Render service can connect  

### Network

✅ HTTPS enforced by Render  
✅ DDoS protection included  
✅ Firewall rules managed by Render  

### Additional Recommendations

1. **Rotate Secrets Regularly**
   - Change JWT_SECRET every 90 days
   - Update Gmail password quarterly
   - Regenerate admin password monthly

2. **Enable 2FA on Render**
   - Account Settings → Security
   - Enable Two-Factor Auth

3. **Set Up Alerts**
   - Monitor CPU/memory usage
   - Alert on high error rates
   - Track daily request count

---

## 🆘 Troubleshooting

### Issue: Build Fails

**Common causes:**
- Missing dependencies in Cargo.toml
- Compilation errors
- Dockerfile syntax errors

**Solution:**
```bash
# Test build locally
cd backend
docker build -t payvault-test .
docker run payvault-test

# Fix any errors shown
```

### Issue: Service Won't Start

**Check logs:**
1. Service → Logs tab
2. Look for startup errors
3. Common issues:
   - DATABASE_URL incorrect
   - Port not matching APP_PORT
   - Migration failures

### Issue: Database Connection Failed

**Verify:**
1. DATABASE_URL is correct
2. SSL mode set to `require`
3. Database is running (check Render dashboard)
4. Network allows connections

### Issue: Emails Not Sending

**Check:**
1. SMTP credentials correct
2. Gmail app password valid
3. 2FA enabled on Google account
4. No typos in password
5. Check backend logs for "Failed to send email"

---

## 📈 Scaling Strategy

### When to Scale

Upgrade when:
- >1000 requests/minute
- Response time >500ms
- CPU consistently >80%
- Memory >80% used

### How to Scale

1. **Vertical Scaling** (Easy)
   - Upgrade instance type in Render
   - Standard 2 (1 CPU, 1GB) - $14/month
   - Standard 4 (2 CPU, 2GB) - $28/month

2. **Horizontal Scaling** (Advanced)
   - Multiple instances behind load balancer
   - Requires stateless design
   - Use Redis for session sharing

3. **Database Scaling**
   - Upgrade to larger DB plan
   - Add read replicas
   - Implement connection pooling

---

## ✅ Success Checklist

Deployment successful when:

- [ ] Service shows "Running" status
- [ ] Health endpoint responds
- [ ] Database connected
- [ ] Redis connected
- [ ] Can register user
- [ ] OTP email sent
- [ ] Email verification works
- [ ] Login works
- [ ] Transfers process
- [ ] Transaction emails sent
- [ ] Admin panel functional
- [ ] No errors in logs
- [ ] Response time <200ms
- [ ] Uptime monitoring active

---

## 🎉 Next Steps

After successful deployment:

1. ✅ Update Vercel `VITE_API_URL` to Render URL
2. ✅ Test full flow from frontend
3. ✅ Set up monitoring alerts
4. ✅ Document all credentials securely
5. ✅ Share live URL with stakeholders
6. ✅ Celebrate! 🎉

---

**Status:** Ready to deploy  
**Estimated Time:** 15-20 minutes  
**Monthly Cost:** ~$14 (first month FREE)  
**Difficulty:** Intermediate  

**Let's deploy!** 🚀
