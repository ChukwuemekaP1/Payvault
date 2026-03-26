# 🧪 Phase 1: Email Testing Guide

## Your Task: Test Registration → OTP → Verification

Follow these exact steps to test that the email system is working perfectly with REAL emails.

---

## 📋 Pre-Test Checklist

Before starting, ensure:

- [ ] Backend is running on `http://localhost:8000`
- [ ] Frontend is running on `http://localhost:5173` (or your configured port)
- [ ] You have access to a REAL email address (not a test/fake one)
- [ ] Gmail SMTP credentials are updated in `backend/.env`:
  ```
  SMTP_USERNAME=nwokolopaul274@gmail.com
  SMTP_PASSWORD=tpvm ptum qolq mdcr
  ```

---

## 🎯 Test Scenario 1: New User Registration

### Step-by-Step Instructions

#### 1. Start Both Services

```bash
# Terminal 1 - Backend
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend
cargo run

# Expected output:
# "Listening on 127.0.0.1:8000"

# Terminal 2 - Frontend  
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/frontend
npm run dev

# Expected output:
# "Local: http://localhost:5173/"
```

#### 2. Navigate to Registration Page

Open browser: `http://localhost:5173/auth/register`

#### 3. Fill Registration Form

Use a **REAL email** you can access:

```
Full Name: Test User
Email: YOUR_REAL_EMAIL@gmail.com  (e.g., nwokolopaul979@gmail.com)
Password: TestPass123!
Confirm Password: TestPass123!
```

✅ **Requirements:**
- Password must have: 8+ chars, 1 uppercase, 1 number
- Email must be real and accessible
- All fields required

#### 4. Submit Form

Click **"Create Account"** button

**Expected Result:**
- ✅ Success toast: "Account created!"
- ✅ Description: "Please check your email for the verification code."
- ✅ Redirected to `/auth/verify-email` page
- ✅ Your email shown on screen

#### 5. Check Your Email Inbox

**Within 30 seconds**, you should receive an email:

**Subject:** `Your PayVault Verification Code`

**Content:**
- Purple gradient header with "PayVault"
- Large 6-digit code: e.g., `1 2 3 4 5 6`
- Yellow alert box: "Expires in 15 minutes"
- Plain text fallback if HTML not supported

**If email arrives:** ✅ PASS - Move to step 6  
**If no email after 1 min:** ❌ FAIL - See troubleshooting below

#### 6. Enter OTP on Verification Page

On `/auth/verify-email` page:

- You'll see 6 input boxes
- Enter the 6-digit code from email (no spaces needed)
- Should auto-submit when 6th digit entered

**Expected Result:**
- ✅ Success toast: "Email verified successfully!"
- ✅ Redirected to login page
- ✅ Can now login with credentials

#### 7. Login with Verified Account

Navigate to: `http://localhost:5173/auth/login`

Enter:
```
Email: YOUR_REAL_EMAIL@gmail.com
Password: TestPass123!
```

**Expected Result:**
- ✅ Successfully logged in
- ✅ Redirected to Dashboard
- ✅ Can see balance (₦0.00)
- ✅ Can see account number

---

## 🎯 Test Scenario 2: Transaction Email

After successfully registering and logging in:

### Prerequisites
- [ ] You have a verified account
- [ ] You're logged in
- [ ] You have funds in wallet (use admin panel to credit if needed)

### Steps

#### 1. Create Second Test Account (Optional)

Register another account with different email to receive transfers.

#### 2. Make a Transfer

From Dashboard:
1. Click **"Transfer"** or **"Send Money"**
2. Enter recipient account number
3. Enter amount: ₦100 (10000 kobo)
4. Add description (optional)
5. Click **"Send"**

#### 3. Check Email for Receipt

**Within 30 seconds**, check your email inbox again.

**Expected Email:**
- Subject: `Transaction Receipt - PayVault`
- Green gradient header with ✅
- Large amount display: ₦100.00
- Recipient account number
- Reference number
- Status badge: "Completed"
- Security notice at bottom

**If received:** ✅ PASS - Email system fully working!

---

## 🎯 Test Scenario 3: Edge Cases

### Test Wrong OTP

1. Register with email
2. On verification page, enter WRONG OTP (e.g., 000000)
3. Click Verify

**Expected:**
- ❌ Error message: "Invalid OTP" or similar
- ❌ Not verified
- ❌ Can try again

### Test Expired OTP

1. Register with email
2. Wait 16+ minutes (OTP expires after 15 min)
3. Try to enter correct OTP

**Expected:**
- ❌ Error: OTP expired or invalid
- ℹ️ Option to resend OTP (if implemented)

### Test Duplicate Email

1. Register with email: test@example.com
2. Try to register AGAIN with same email

**Expected:**
- ❌ Error: "Email already exists" or similar
- ❌ Cannot create duplicate account

---

## 📊 Test Results Template

Copy and fill this out after testing:

```
## Test Results - [DATE]

### Registration Flow
[ ] Backend started successfully
[ ] Frontend started successfully
[ ] Registration form submitted
[ ] OTP email received (time: __ seconds)
[ ] OTP entered correctly
[ ] Email verified successfully
[ ] Login worked
[ ] Dashboard accessible

### Transaction Email
[ ] Made transfer
[ ] Transaction receipt email received
[ ] HTML rendering correct
[ ] Details accurate

### Edge Cases
[ ] Wrong OTP rejected
[ ] Expired OTP handled
[ ] Duplicate email blocked

### Issues Found
[List any problems encountered]

### Screenshots
[Attach screenshots of emails received]
```

---

## 🔧 Troubleshooting

### Issue: No OTP Email Received

**Check:**
1. Backend logs for errors
   ```bash
   # Look for lines with "Failed to send email"
   tail -f backend/logs/*.log 2>/dev/null || cargo run 2>&1 | grep -i email
   ```

2. SMTP credentials correct
   ```bash
   cd backend
   grep SMTP_ .env
   ```

3. Internet connection working
   ```bash
   ping google.com
   ```

4. Firewall not blocking port 587
   ```bash
   sudo ufw status | grep 587
   ```

**Solutions:**
- Regenerate Gmail app password if needed
- Update `.env` with new password
- Restart backend after changes
- Check spam folder for test emails

---

### Issue: Wrong OTP Error

**This is expected behavior!** It means the system is working correctly.

**To fix:**
- Use the ACTUAL OTP from your email
- Don't make up a fake code
- Check email again if you lost the code

---

### Issue: OTP Expired

**Expected after 15 minutes.**

**Solution:**
- Register again with same email (new OTP sent)
- Or implement resend OTP feature

---

### Issue: "Email Already Exists"

**This means previous registration succeeded!**

**Solution:**
- Just login with that email
- Or use a different email for testing

---

## ✅ Success Criteria

All tests pass when:

✅ OTP email arrives within 30 seconds  
✅ Email has both HTML and plain text versions  
✅ OTP verification works with correct code  
✅ Wrong OTP is rejected  
✅ Login works after verification  
✅ Transaction email sent after transfer  
✅ All emails render correctly on desktop and mobile  

---

## 📞 Need Help?

If tests fail:

1. **Check backend logs** for error messages
2. **Verify .env file** has correct SMTP credentials
3. **Run email test script**:
   ```bash
   cd /home/chukwuemekadr/Documents/Projects/Rust_Bank
   ./scripts/test-email-production.sh YOUR_EMAIL@gmail.com
   ```
4. **Review troubleshooting guide**: `docs/EMAIL_TROUBLESHOOTING.md`

---

## 🎉 After Successful Tests

Once all tests pass:

1. ✅ Email system is PRODUCTION READY
2. ✅ Ready to deploy frontend to Vercel
3. ✅ Ready to deploy backend to Render
4. ✅ Real users will receive real emails

**Next Step:** Proceed to deployment phases (Phases 3-8)

---

**Good luck with testing!** 🚀

Take your time, test thoroughly, and report any issues found.
