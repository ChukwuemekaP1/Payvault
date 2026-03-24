# PayVault Backend

Rust-based banking API server using Axum framework.

## Requirements

- Rust 1.75+
- PostgreSQL 15+
- Redis 7+

## Quick Start

```bash
# Install dependencies
cargo build

# Copy environment file
cp .env.example .env

# Edit .env with your configuration:
# DATABASE_URL=postgresql://postgres:password@localhost/payvault
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-secret-key-here
# ADMIN_EMAIL=admin@payvault.com
# ADMIN_PASSWORD=Admin123!

# Run migrations
sqlx migrate run

# Start server
cargo run
```

Server runs on http://localhost:8000

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for JWT signing | Required |
| `ADMIN_EMAIL` | Initial admin account email | `admin@payvault.com` |
| `ADMIN_PASSWORD` | Initial admin account password | `Admin123!` |
| `PORT` | Server port | `8000` |

## API Documentation

Once running, visit http://localhost:8000/docs for interactive Swagger UI.

## Project Structure

```
src/
├── middleware/
│   ├── auth.rs          # JWT authentication
│   ├── rate_limit.rs    # Rate limiting
│   └── idempotency.rs   # Idempotency for transfers
├── modules/
│   ├── admin.rs         # Admin endpoints
│   ├── auth.rs          # Authentication endpoints
│   ├── transaction.rs   # Transaction queries
│   ├── wallet.rs        # Wallet operations
│   └── webhook.rs       # Webhook handlers
├── utils/
│   ├── account_number.rs # Account number generation
│   ├── email.rs         # Email utilities
│   ├── hash.rs          # Password hashing
│   └── jwt.rs           # JWT utilities
├── config.rs            # Configuration
├── error.rs             # Error types
├── router.rs            # Route definitions
└── main.rs              # Entry point
```

## Key Features

### Authentication
- JWT-based auth with refresh tokens
- Password reset via email
- Email verification with OTP

### Wallet Management
- Balance enquiry
- Real-time SSE updates
- Account number generation

### Transfers
- Peer-to-peer transfers
- Idempotency protection
- Atomic transactions with row locking

### Admin Panel
- User management
- Manual wallet credits (double-entry)
- Freeze/unfreeze wallets
- Audit trail viewer

## Testing

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture
```

## Database Migrations

```bash
# Create new migration
sqlx migrate add migration_name

# Run all pending migrations
sqlx migrate run

# Revert last migration
sqlx migrate revert
```

## Development Tips

### Debugging
- Use `tracing` crate for structured logging
- Enable SQLX query logging in debug mode
- Use `tokio-console` for async debugging

### Performance
- Connection pooling via SQLX
- Redis caching for frequently accessed data
- Row-level locking for concurrent transfers

### Security Best Practices
- Never commit `.env` files
- Use strong JWT secrets (32+ chars)
- Rotate secrets regularly
- Enable SSL in production
- Use environment-specific databases

## Common Issues

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
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
# Reset database (DANGER: deletes all data!)
sqlx database drop
sqlx database create
sqlx migrate run
```

## Deployment

See root [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for production deployment guide.

## License

MIT License
