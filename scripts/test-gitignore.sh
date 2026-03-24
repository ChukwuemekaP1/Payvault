#!/bin/bash

# PayVault Git Ignore Verification Script
# This script tests that critical files are properly ignored

echo "🔍 Testing PayVault Git Ignore Configuration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASSED=0
FAILED=0

# Function to test if file is ignored
test_ignored() {
    local path=$1
    local description=$2
    
    if git check-ignore -q "$path" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description (NOT ignored)"
        ((FAILED++))
    fi
}

# Function to test if file should be tracked
test_tracked() {
    local path=$1
    local description=$2
    
    if ! git check-ignore -q "$path" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $description (incorrectly ignored)"
        ((FAILED++))
    fi
}

echo "=== BACKEND FILES ==="
test_ignored "backend/target" "Backend build output (target/)"
test_ignored "backend/.env" "Backend environment (.env)"
test_ignored "backend/Cargo.lock" "Cargo lock file"
test_ignored "backend/*.log" "Log files"
test_tracked "backend/src/main.rs" "Backend source code"
test_tracked "backend/Cargo.toml" "Cargo configuration"
test_tracked "backend/.env.example" "Environment template"
echo ""

echo "=== FRONTEND FILES ==="
test_ignored "frontend/node_modules" "Node modules"
test_ignored "frontend/dist" "Frontend build output (dist/)"
test_ignored "frontend/.env" "Frontend environment (.env)"
test_ignored "frontend/.vscode" "VS Code settings"
test_ignored "frontend/.eslintcache" "ESLint cache"
test_tracked "frontend/src/App.tsx" "Frontend source code"
test_tracked "frontend/package.json" "Package configuration"
test_tracked "frontend/.env.example" "Environment template"
echo ""

echo "=== ROOT FILES ==="
test_ignored ".DS_Store" "macOS metadata"
test_ignored "Thumbs.db" "Windows thumbnails"
test_ignored "*.log" "Root log files"
test_ignored ".idea" "IntelliJ IDEA settings"
test_ignored ".vscode" "VS Code settings"
test_tracked "README.md" "Main README"
test_tracked ".gitignore" "Root .gitignore"
echo ""

echo "=== ENVIRONMENT FILES ==="
test_ignored ".env" "Root .env"
test_ignored "backend/.env" "Backend .env"
test_ignored "frontend/.env" "Frontend .env"
test_ignored "backend/.env.local" "Backend local env"
test_ignored "frontend/.env.local" "Frontend local env"
test_ignored "frontend/.env.production" "Frontend production env"
test_tracked ".env.example" "Root env example (if exists)"
echo ""

echo "=== BUILD ARTIFACTS ==="
test_ignored "backend/target/debug" "Debug build"
test_ignored "backend/target/release" "Release build"
test_ignored "frontend/dist/assets" "Frontend assets"
test_ignored "*.so" "Shared objects"
test_ignored "*.dylib" "Dynamic libraries"
test_ignored "*.dll" "DLL files"
echo ""

echo "=== CACHES ==="
test_ignored "frontend/.cache" "Frontend cache"
test_ignored "frontend/.vite" "Vite cache"
test_ignored "frontend/.jest-cache" "Jest cache"
test_ignored "coverage" "Coverage reports"
echo ""

echo "=== SUMMARY ==="
TOTAL=$((PASSED + FAILED))
echo -e "Total Tests: ${YELLOW}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Git ignore is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check your .gitignore configuration.${NC}"
    exit 1
fi
