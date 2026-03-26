#!/bin/bash
# PayVault Email Flow Test Script
# This script helps you test the complete registration → OTP → verification flow

set -e

echo "============================================"
echo "  PayVault Email Flow Test"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Starting Backend Server...${NC}"
echo ""

# Start backend in background
cd backend
cargo run > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Wait for backend to be ready
echo -e "${BLUE}Waiting for backend to be ready...${NC}"
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy and running${NC}"
else
    echo -e "${YELLOW}⚠ Backend may still be starting up, continuing...${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Starting Frontend Development Server...${NC}"
echo ""

# Start frontend in background
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

# Wait for frontend to be ready
echo -e "${BLUE}Waiting for frontend to be ready...${NC}"
sleep 3

echo ""
echo "============================================"
echo -e "${GREEN}  ✅ Test Environment Ready!${NC}"
echo "============================================"
echo ""
echo -e "${BLUE}Backend URL:${NC} http://localhost:8000"
echo -e "${BLUE}Frontend URL:${NC} http://localhost:5173"
echo ""
echo -e "${YELLOW}📧 TESTING INSTRUCTIONS:${NC}"
echo ""
echo "1. Open your browser and go to:"
echo -e "   ${BLUE}http://localhost:5173/auth/register${NC}"
echo ""
echo "2. Fill in the registration form with a REAL email address:"
echo "   - Full Name: Test User"
echo "   - Email: YOUR_REAL_EMAIL@gmail.com"
echo "   - Password: TestPass123!"
echo ""
echo "3. Click 'Create Account'"
echo ""
echo "4. Check your email inbox within 30 seconds"
echo "   - Subject: 'Your PayVault Verification Code'"
echo "   - You should receive a 6-digit OTP code"
echo ""
echo "5. Enter the OTP on the verification page"
echo "   - The page should auto-redirect after successful verification"
echo ""
echo "6. Login with your credentials"
echo "   - Verify you can access the dashboard"
echo ""
echo -e "${YELLOW}📝 WHAT TO CHECK:${NC}"
echo ""
echo "✅ Does the OTP email arrive within 30 seconds?"
echo "✅ Is the email properly formatted (HTML with PayVault branding)?"
echo "✅ Does entering the correct OTP succeed?"
echo "✅ Can you login after verification?"
echo "✅ Are there any console errors in the browser?"
echo ""
echo -e "${YELLOW}⚠️  TROUBLESHOOTING:${NC}"
echo ""
echo "If email doesn't arrive:"
echo "  1. Check spam folder"
echo "  2. Verify Gmail app password is correct in backend/.env"
echo "  3. Check backend logs: tail -f backend.log"
echo ""
echo "If you encounter errors:"
echo "  - Backend logs: tail -f backend.log"
echo "  - Frontend logs: tail -f frontend.log"
echo ""
echo "============================================"
echo -e "${BLUE}Press Ctrl+C when done testing to stop servers${NC}"
echo "============================================"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${BLUE}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Servers stopped${NC}"
    echo -e "${GREEN}✓ Test logs saved to: backend.log and frontend.log${NC}"
    exit 0
}

# Set up cleanup trap
trap cleanup INT TERM

# Keep script running
wait
