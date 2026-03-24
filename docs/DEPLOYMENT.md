# PayVault Deployment Guide

Complete guide for deploying PayVault to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option 1: VPS Deployment (DigitalOcean/Linode)](#option-1-vps-deployment)
3. [Option 2: PaaS Deployment (Railway + Vercel)](#option-2-paas-deployment)
4. [Option 3: Docker Deployment](#option-3-docker-deployment)
5. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

### For All Deployments

**Backend Requirements:**
- Rust 1.75+ installed
- PostgreSQL 15+ database
- Redis 7+ instance
- Environment variables configured

**Frontend Requirements:**
- Node.js 20+ installed
- Backend API URL configured

---

## Option 1: VPS Deployment (DigitalOcean/Linode)

### Step 1: Provision Server

**Recommended Specs:**
- Ubuntu 22.04 LTS
- 2GB RAM (4GB recommended)
- 25GB+ SSD storage
- Root access via SSH

### Step 2: Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install SSL tools
sudo apt install -y certbot python3-certbot-nginx
```

### Step 3: Configure Database

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE payvault;
CREATE USER payvault_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE payvault TO payvault_user;
EOF
```

### Step 4: Clone and Setup Application

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/Rust_Bank.git payvault
sudo chown -R $USER:$USER payvault
cd payvault

# Setup backend
cd backend
cp .env.example .env
nano .env  # Edit with production values

# Build backend
cargo build --release

# Setup frontend
cd ../frontend
npm install
cp .env.example .env
nano .env  # Set VITE_API_URL to your domain

# Build frontend
npm run build
```

### Step 5: Create Systemd Services

**Backend Service:**
```bash
sudo nano /etc/systemd/system/payvault-backend.service
```

```ini
[Unit]
Description=PayVault Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/payvault/backend
ExecStart=/var/www/payvault/backend/target/release/payvault
Restart=always
RestartSec=10
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
```

**Enable service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable payvault-backend
sudo systemctl start payvault-backend
sudo systemctl status payvault-backend
```

### Step 6: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/payvault
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend static files
    location / {
        root /var/www/payvault/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/payvault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Setup SSL

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Step 8: Firewall Configuration

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Option 2: PaaS Deployment (Railway + Vercel)

### Backend on Railway

1. **Create Railway Account**: https://railway.app

2. **Deploy Backend:**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Login
   railway login

   # Initialize project
   cd backend
   railway init

   # Link to project
   railway link
   ```

3. **Add Services:**
   ```bash
   # Add PostgreSQL
   railway add postgresql

   # Add Redis
   railway add redis
   ```

4. **Set Environment Variables:**
   ```bash
   railway variables set \
     JWT_SECRET=your-secret-key \
     ADMIN_EMAIL=admin@payvault.com \
     ADMIN_PASSWORD=Admin123!
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

6. **Get Public URL:**
   ```bash
   railway domain
   # Note the URL (e.g., payvault-backend.railway.app)
   ```

### Frontend on Vercel

1. **Create Vercel Account**: https://vercel.com

2. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

3. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

4. **Set Environment Variable:**
   ```bash
   vercel env add VITE_API_URL
   # Enter your Railway backend URL
   ```

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Automatic Deploys

- Connect GitHub repo to Railway & Vercel
- Push to `main` branch → auto-deploy
- Pull requests get preview deployments

---

## Option 3: Docker Deployment

### Create Docker Compose File

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: payvault
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres/payvault
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
    command: cargo run --release

  frontend:
    build:
      context: ./frontend
      args:
        - VITE_API_URL=http://localhost:8000
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Run with Docker

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Production Docker

For production, use separate docker-compose.prod.yml with:
- Proper resource limits
- Health checks
- Logging configuration
- SSL termination (Traefik/Nginx Proxy Manager)

---

## Post-Deployment Checklist

### Backend Checks

- [ ] Backend is running and accessible
- [ ] Database migrations ran successfully
- [ ] Redis connection working
- [ ] Health check endpoint responds: `GET /health`
- [ ] API docs accessible: `/docs`
- [ ] Admin account created
- [ ] CORS configured correctly

### Frontend Checks

- [ ] Frontend loads without errors
- [ ] Can connect to backend API
- [ ] Login/register works
- [ ] Protected routes redirect properly
- [ ] No console errors
- [ ] Mobile responsive

### Security Checks

- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Database not exposed to public internet
- [ ] Strong passwords used
- [ ] JWT secret is secure
- [ ] Rate limiting enabled

### Monitoring Setup

**Recommended Tools:**

1. **Application Monitoring:**
   - Sentry (error tracking)
   - LogRocket (session replay)

2. **Infrastructure Monitoring:**
   - Uptime monitoring (UptimeRobot, Pingdom)
   - Server monitoring (New Relic, Datadog)

3. **Logging:**
   - Centralized logging (Papertrail, Loggly)
   - Log aggregation (ELK Stack)

### Backup Strategy

**Database Backups:**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M-%S)
pg_dump -U payvault_user payvault > /backups/payvault_$DATE.sql

# Keep last 7 days
find /backups -name "payvault_*.sql" -mtime +7 -delete
```

**Cron Job:**
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup_script.sh
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
journalctl -u payvault-backend -f

# Common issues:
# - Port already in use
# - Database connection failed
# - Missing environment variables
```

### Frontend Shows Blank Page

```bash
# Check browser console for errors
# Verify VITE_API_URL is correct
# Check network tab for failed API calls
```

### Database Migration Failed

```bash
# Reset database (WARNING: deletes all data!)
sqlx database drop
sqlx database create
sqlx migrate run
```

---

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Review firewall rules
5. Check SSL certificate status

---

**Good luck with your deployment!** 🚀
