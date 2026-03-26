#!/bin/bash

# Quick email test with direct environment variable loading
# This bypasses dotenv issues and loads variables directly

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     PayVault Email - Quick Test                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Load .env file manually
ENV_FILE="/home/chukwuemekadr/Documents/Projects/Rust_Bank/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

echo "📄 Loading environment from: $ENV_FILE"
echo ""

# Export all variables from .env (excluding comments)
export $(grep -v '^#' "$ENV_FILE" | xargs)

echo "✓ Environment variables loaded"
echo ""

# Display current SMTP config (mask password)
echo "📧 SMTP Configuration:"
echo "   Host: $SMTP_HOST"
echo "   Port: $SMTP_PORT"
echo "   Username: $SMTP_USERNAME"
echo "   Password: ${SMTP_PASSWORD:0:4}****${SMTP_PASSWORD: -4}"
echo "   From: $SMTP_FROM"
echo ""

# Run the test
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

echo "🚀 Running email test..."
echo ""

cargo run --bin test_email "${1:-nwokolopaul274@gmail.com}"
