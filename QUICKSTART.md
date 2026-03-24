# 🚀 Quick Start Guide - PayVault

Get up and running in 5 minutes!

## Prerequisites

- Rust 1.75+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Backend (5 minutes)

```bash
# Navigate to backend
cd backend

# Copy environment file
cp .env.example .env

# Edit .env (use nano or your editor)
nano .env

# Add these lines:
DATABASE_URL=postgresql://postgres:password@localhost/payvault
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here-change-this
ADMIN_EMAIL=admin@payvault.com
ADMIN_PASSWORD=Admin123!

# Run migrations
sqlx migrate run

# Start server
cargo run
```

✅ Backend running on http://localhost:8000  
✅ API docs: http://localhost:8000/docs

## Frontend (2 minutes)

```bash
# Navigate to frontend (new terminal)
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env
nano .env

# Add this line:
VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

✅ Frontend running on http://localhost:5174

## Test Everything (1 minute)

### 1. Register User
```
Go to: http://localhost:5174/auth/register
Email: test@example.com
Password: Test123!
```

### 2. Fund Account via Admin
```
Go to: http://localhost:5174/admin/login
Email: admin@payvault.com
Password: Admin123!

1. Select "test@example.com" from list
2. Enter amount: 10000 (for ₦10,000)
3. Reason: "Initial funding"
4. Click "Credit Wallet"
```

### 3. Test Transfer
```
1. Logout from admin
2. Login as test@example.com
3. Go to "Transfer"
4. Create another account to send money to
5. Or use demo account numbers
```

### 4. Test PDF Export
```
1. Go to "Transactions"
2. Click "Export PDF" button
3. Save as PDF
```

## Common Issues

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 5174
lsof -ti:5174 | xargs kill -9
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL (Linux)
sudo systemctl restart postgresql
```

### Migration Errors
```bash
# Drop and recreate database
sqlx database drop
sqlx database create
sqlx migrate run
```

## Next Steps

### Deploy to Production
See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for:
- Railway + Vercel deployment (easiest)
- VPS deployment (DigitalOcean)
- Docker deployment

### Prepare for Keto
1. Push to GitHub
2. Deploy to production
3. Take screenshots
4. Record demo video
5. Submit application!

## Support

**Documentation:**
- Main README: [README.md](./README.md)
- Backend docs: [backend/README.md](./backend/README.md)
- Frontend docs: [frontend/README.md](./frontend/README.md)
- Deployment: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

**API Documentation:**
http://localhost:8000/docs (when backend running)

---

**That's it!** You're ready to go! 🎉
