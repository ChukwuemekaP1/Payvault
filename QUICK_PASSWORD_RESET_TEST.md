# Quick Password Reset Testing Guide 🧪

## Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173`
- Redis connected and working
- Email SMTP configured (Gmail or other provider)

---

## Step-by-Step Test Flow

### 1️⃣ Request Password Reset

**Option A: Via UI**
1. Navigate to: `http://localhost:5173/auth/forgot-password`
2. Enter email address: `test@example.com`
3. Click "Send Reset Link"
4. You should see success message: "Check your email"

**Option B: Via API**
```bash
curl -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response:**
```json
{
  "message": "If an account exists, a password reset email will be sent"
}
```

---

### 2️⃣ Check Your Email

**What to look for:**
- **Sender**: noreply@payvault.com (or your configured from address)
- **Subject**: "Password Reset Request - PayVault"
- **Content**: Professional HTML email with:
  - Orange gradient header
  - Large 6-digit verification code in dashed box
  - Expiry notice (15 minutes)
  - Security tips

**Example Code:** `123456` (yours will be different)

---

### 3️⃣ Enter OTP and Reset Password

1. Click "Continue to Reset Password" button (or navigate manually)
2. URL: `http://localhost:5173/auth/reset-password`
3. **Enter Verification Code**: Type the 6-digit code from email
4. **New Password**: Enter password meeting requirements:
   - Minimum 8 characters
   - At least 1 uppercase letter (A-Z)
   - At least 1 number (0-9)
5. **Confirm Password**: Re-enter the same password
6. Click "Reset Password"

**Form Validation:**
- ✅ Code must be exactly 6 digits
- ✅ Password must meet all requirements
- ✅ Both passwords must match

---

### 4️⃣ Verify Success

**Success Indicators:**
1. Toast notification: "Password reset!"
2. Message: "Your password has been updated. Please log in with your new password."
3. Redirected to login page automatically
4. Can log in with new password

**Test Login:**
```
Email: test@example.com
Password: [your new password]
```

---

## 🐛 Troubleshooting

### Issue: Didn't receive email

**Check:**
1. Spam/Junk folder
2. Email address is correct in database
3. SMTP configuration in `.env`
4. Backend logs for email sending errors

**Backend Logs Should Show:**
```
INFO Sending password reset email to test@example.com
INFO Email sent successfully
```

---

### Issue: "Invalid or expired verification code"

**Possible Causes:**
1. Code expired (15 minute limit)
2. Wrong code entered
3. Code already used
4. Redis not connected

**Debug Steps:**
```bash
# Check Redis connection
redis-cli ping

# Check if OTP key exists (replace USER_ID with actual UUID)
redis-cli keys "password_reset:*"

# Check TTL (should be < 900 seconds)
redis-cli ttl "password_reset:USER_ID"
```

---

### Issue: "Passwords do not match"

**Solution:**
- Ensure both password fields are identical
- Check for trailing spaces
- Password is case-sensitive

---

### Issue: Form validation errors

**Common Errors:**
- "Verification code must be 6 digits" → Enter exactly 6 numbers
- "Password must be at least 8 characters" → Use longer password
- "Password must contain at least one uppercase letter" → Add capital letter
- "Password must contain at least one number" → Add digit

---

## 🔍 API Testing

### Test Forgot Password Endpoint

```bash
# Valid user
curl -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "existing@example.com"}'

# Non-existent user (should return same message for security)
curl -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com"}'
```

Both should return:
```json
{"message": "If an account exists, a password reset email will be sent"}
```

---

### Test Reset Password Endpoint

**Without Authentication (Should Fail):**
```bash
curl -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"otp": "123456", "new_password": "NewPass123"}'
```

Expected: `401 Unauthorized` or similar error

**With Authentication (Should Succeed):**
```bash
# First login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "CurrentPass123"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

# Then reset password
curl -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"otp": "123456", "new_password": "NewSecurePass123"}'
```

Expected: `{"message": "Password reset successfully"}`

---

## 📊 Expected Timings

| Action | Expected Time |
|--------|---------------|
| Email delivery | < 10 seconds |
| OTP generation | < 100ms |
| Password update | < 500ms |
| Total flow | < 30 seconds |

---

## ✅ Success Criteria

- [ ] Email received within 30 seconds
- [ ] Email displays 6-digit code clearly
- [ ] Code accepted by form
- [ ] Password updated successfully
- [ ] Can login with new password
- [ ] Old password no longer works
- [ ] OTP can only be used once
- [ ] Expired OTP rejected
- [ ] Invalid OTP rejected

---

## 🎯 Test Scenarios

### Scenario 1: Happy Path
✅ User requests reset → Receives email → Enters correct OTP → Sets new password → Success

### Scenario 2: Wrong OTP
✅ User enters wrong code → Error: "Invalid or expired verification code"

### Scenario 3: Expired OTP
✅ Wait 16 minutes → Try to use code → Error: "Invalid or expired verification code"

### Scenario 4: Already Used OTP
✅ Use OTP successfully → Try to use same OTP again → Error: "Invalid or expired verification code"

### Scenario 5: Weak New Password
✅ Enter password without uppercase → Error: "Password must contain at least one uppercase letter"

### Scenario 6: Mismatched Passwords
✅ Enter different passwords → Error: "Passwords do not match"

---

## 📝 Notes

- OTP expires after **15 minutes** (900 seconds)
- Each OTP can only be used **once**
- Maximum 6-digit numeric code (000000-999999)
- Email is sent asynchronously (non-blocking)
- Same success message shown regardless of email existence (security feature)

---

**Last Updated**: March 22, 2026  
**Status**: Ready for Testing ✅
