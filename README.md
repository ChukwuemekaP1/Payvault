# PayVault - Modern Digital Banking Platform

![PayVault Banner](https://img.shields.io/badge/PayVault-Digital%20Banking-FF5C2B?style=for-the-badge)

A full-stack banking application built with Rust (Axum) and React, featuring real-time transactions, admin panel, and double-entry bookkeeping principles used by real banks.

## ✨ Features

### For Users
- 🔐 **Secure Authentication** - JWT-based login/registration
- 💰 **Real-time Balance** - Instant balance updates with SSE streaming
- 💸 **Peer-to-Peer Transfers** - Send money to any account instantly
- 📊 **Transaction History** - Complete payment history with search & filters
- 📱 **Mobile-Responsive** - Beautiful UI that works on all devices
- 🔔 **Transaction Notifications** - Real-time toast notifications
- 📄 **PDF Export** - Download transaction statements as PDF

### For Admins
- 👥 **User Management** - View all users and their wallets
- 💵 **Manual Credits** - Credit user accounts (simulates bank deposits)
- ❄️ **Freeze/Unfreeze** - Control wallet access
- 📋 **Audit Trail** - Complete log of all admin actions
- 🏦 **Double-Entry Bookkeeping** - Real banking accounting principles

## 🛠️ Tech Stack

### Backend
- **Rust** - Systems programming language for performance & safety
- **Axum 0.8** - Ergonomic web framework
- **PostgreSQL** - Primary database via SQLX
- **Redis** - Rate limiting & session management
- **JWT** - Secure authentication
- **utoipa** - OpenAPI/Swagger documentation

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful components
- **React Query** - Data fetching & caching
- **Zustand** - State management
- **Sonner** - Toast notifications

## 🚀 Quick Start

### Prerequisites
- Rust 1.75+ ([Install](https://www.rust-lang.org/tools/install))
- Node.js 20+ ([Install](https://nodejs.org/))
- PostgreSQL 15+ ([Install](https://www.postgresql.org/download/))
- Redis 7+ ([Install](https://redis.io/download/))

### Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL=postgresql://user:pass@localhost/payvault
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-secret-key

# Run database migrations
sqlx migrate run

# Start development server
cargo run
```

Backend will start on `http://localhost:8000`
API docs available at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Set API URL
# VITE_API_URL=http://localhost:8000

# Start development server
npm run dev
```

Frontend will start on `http://localhost:5174`

## 📚 Documentation

### API Endpoints

#### Public Routes
- `POST /auth/register` - Create new account
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/verify-email` - Verify email with OTP
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

#### Protected Routes (Require Auth)
- `GET /wallet/balance` - Get wallet balance
- `GET /wallet/balance-stream` - SSE balance updates
- `GET /wallet/lookup/{account_number}` - Lookup account holder
- `POST /wallet/transfer` - Transfer money
- `GET /transactions` - List transactions
- `GET /transactions/{id}` - Transaction details

#### Admin Routes (Require Admin Role)
- `GET /admin/users` - List all users
- `GET /admin/users/{id}` - Get user details
- `POST /admin/wallets/{id}/credit` - Credit user wallet
- `POST /admin/wallets/{id}/freeze` - Freeze/unfreeze wallet
- `GET /admin/audit-logs` - View audit trail

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

-- Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    balance_kobo BIGINT NOT NULL CHECK (balance_kobo >= 0),
    account_number VARCHAR(10) UNIQUE NOT NULL,
    is_frozen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    reference VARCHAR UNIQUE NOT NULL,
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    amount_kobo BIGINT NOT NULL,
    type VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP
);

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    action VARCHAR NOT NULL,
    target_type VARCHAR NOT NULL,
    target_id UUID,
    details JSONB,
    created_at TIMESTAMP
);
```

## 🎯 Demo Credentials

### Admin Panel
Access at: http://localhost:5174/admin/login

**Email:** admin@payvault.com  
**Password:** Admin123!

### User Accounts
Register new accounts at: http://localhost:5174/auth/register

Or use demo accounts (if pre-created):
- demo1@payvault.com / Demo123!
- demo2@payvault.com / Demo123!

## 🧪 Testing

### Backend Tests
```bash
cd backend
cargo test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📁 Project Structure

```
Rust_Bank/
├── backend/
│   ├── src/
│   │   ├── middleware/      # Auth, rate limiting, idempotency
│   │   ├── modules/         # Feature modules (auth, wallet, etc.)
│   │   ├── utils/           # Helper functions
│   │   ├── config.rs        # Configuration
│   │   ├── error.rs         # Error handling
│   │   ├── router.rs        # Route definitions
│   │   └── main.rs          # Entry point
│   ├── tests/
│   ├── db/migrations/       # SQL migrations
│   └── Cargo.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities & API client
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   ├── public/
│   └── package.json
│
└── README.md
```

## 🔒 Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on sensitive endpoints
- ✅ Idempotency keys for transfers
- ✅ Input validation with validator crate
- ✅ SQL injection prevention via SQLX
- ✅ XSS protection via React escaping
- ✅ CORS configuration
- ✅ Audit logging for admin actions

## 🏦 Banking Principles Implemented

This isn't just another demo app - it implements **real banking principles**:

### 1. Double-Entry Bookkeeping
Every transaction affects at least 2 accounts:
```
User A sends ₦5,000 to User B:
DEBIT:  User A Wallet (₦5,000)
CREDIT: User B Wallet (₦5,000)
```

### 2. Ledger System
- **Assets**: Bank's reserves (operations account)
- **Liabilities**: Customer deposits (user wallets)
- **Equity**: Bank's capital

### 3. Audit Trail
Every admin action is logged:
- Who performed the action
- What action was taken
- Which entity was affected
- Details of the change

### 4. ACID Transactions
All money movements use database transactions:
- Atomicity: All or nothing
- Consistency: Database stays valid
- Isolation: Concurrent operations don't interfere
- Durability: Committed data persists

## 🌍 Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment guides:

- VPS deployment (DigitalOcean, Linode)
- PaaS deployment (Railway, Render)
- Docker deployment
- Frontend deployment (Vercel, Netlify)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 👨‍💻 Author Chukwuemeka Paul Nwokolo

Built with ❤️ using Rust and React

---

**PayVault** - Banking infrastructure for the modern web.
