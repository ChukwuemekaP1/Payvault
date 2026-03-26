#!/bin/bash

# Production-ready email test with proper environment export
# This ensures SMTP credentials are correctly passed to the application

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     PayVault Email Test - Production Ready           ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Load and export all variables from .env
ENV_FILE="/home/chukwuemekadr/Documents/Projects/Rust_Bank/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

echo "📄 Loading configuration..."

# Read each line and export individually (handles spaces in passwords)
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    
    # Extract variable name and value
    var_name="${line%%=*}"
    var_value="${line#*=}"
    
    # Export the variable
    export "$var_name=$var_value"
done < "$ENV_FILE"

echo "✓ Configuration loaded and exported"
echo ""

# Display configuration (masked password)
echo "📧 SMTP Settings:"
echo "   Host: $SMTP_HOST"
echo "   Port: $SMTP_PORT"
echo "   Username: $SMTP_USERNAME"
echo "   Password: ${SMTP_PASSWORD:0:4}****${SMTP_PASSWORD: -4}"
echo "   From: $SMTP_FROM"
echo ""

# Run the test
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

echo "🚀 Running email integration test..."
echo ""

cargo run --bin test_email "${1:-nwokolopaul274@gmail.com}"
