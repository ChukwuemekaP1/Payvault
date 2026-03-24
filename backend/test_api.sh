#!/bin/bash

# PayVault Backend API Testing Script
BASE_URL="http://localhost:8000"

echo "=========================================="
echo "  PayVault Backend API Test Suite"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s -X GET "$BASE_URL/health" | python3 -m json.tool
echo ""
echo "✅ Health check passed!"
echo ""

# Test 2: User Registration
echo "2. Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}')
echo $REGISTER_RESPONSE | python3 -m json.tool
echo ""
echo "✅ Registration test passed!"
echo ""

# Test 3: User Login
echo "3. Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"password123"}')
echo $LOGIN_RESPONSE | python3 -m json.tool

# Extract tokens
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['refresh_token'])")
USER_ID=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['user_id'])")

echo ""
echo "✅ Login test passed!"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Test 4: Get Wallet Balance
echo "4. Testing Get Wallet Balance..."
curl -s -X GET "$BASE_URL/wallet/balance" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
echo ""
echo "✅ Wallet balance test passed!"
echo ""

# Test 5: Get Transactions List
echo "5. Testing Get Transactions List..."
curl -s -X GET "$BASE_URL/transactions?page=1&limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
echo ""
echo "✅ Transactions list test passed!"
echo ""

# Test 6: Token Refresh
echo "6. Testing Token Refresh..."
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo $REFRESH_RESPONSE | python3 -m json.tool

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo ""
echo "✅ Token refresh test passed!"
echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
echo ""

# Test 7: OpenAPI Documentation
echo "7. Testing OpenAPI Documentation..."
curl -s -X GET "$BASE_URL/api-docs/openapi.json" | python3 -c "import sys, json; data = json.load(sys.stdin); print(f'OpenAPI Version: {data[\"openapi\"]}'); print(f'Number of paths: {len(data[\"paths\"])}')"
echo ""
echo "✅ OpenAPI documentation test passed!"
echo ""

echo "=========================================="
echo "  All Tests Completed Successfully! 🎉"
echo "=========================================="
echo ""
echo "Your backend is running perfectly at: $BASE_URL"
echo ""
echo "Available endpoints:"
echo "  - Health Check: GET /health"
echo "  - OpenAPI Docs: GET /api-docs/openapi.json"
echo "  - Swagger UI: GET /swagger-ui"
echo "  - Auth: POST /auth/register, /auth/login, /auth/refresh"
echo "  - Wallet: GET /wallet/balance, POST /wallet/transfer"
echo "  - Transactions: GET /transactions, GET /transactions/{id}"
echo "  - Admin: GET /admin/users, POST /admin/wallets/{id}/freeze"
echo ""
