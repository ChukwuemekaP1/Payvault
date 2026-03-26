# 📧 Quick Email Test Guide

## ⚡ Fastest Way to Test (Automated)

```bash
# From project root directory
./test_email_flow.sh
```

This will:
1. Start both backend and frontend servers
2. Show you exactly what to do
3. Provide troubleshooting tips
4. Save logs for debugging

---

## 🎯 Manual Testing Steps

### Step 1: Start Backend
```bash
cd backend
cargo run
```

Wait for: `Server listening on 127.0.0.1:8000`

### Step 2: Start Frontend (new terminal)
```bash
cd frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### Step 3: Test Registration Flow

1. **Open browser**: `http://localhost:5173/auth/register`

2. **Fill form with REAL email**:
   ```
   Full Name: Your Name
   Email: your-real-email@gmail.com
   Password: TestPass123!
   Confirm Password: TestPass123!
   ```

3. **Click "Create Account"**

4. **Check email inbox** (within 30 seconds)
   - Subject: `Your PayVault Verification Code`
   - Look for 6-digit OTP code
   - Check spam folder if not in inbox

5. **Enter OTP** on verification page
   - Should auto-submit when 6th digit entered
   - Should redirect to login page

6. **Login** with your credentials
   - Verify you can access dashboard

---

## ✅ Success Checklist

- [ ] OTP email arrives within 30 seconds
- [ ] Email has professional HTML design with PayVault branding
- [ ] OTP code is clearly visible in email
- [ ] Entering correct OTP succeeds
- [ ] User is redirected after verification
- [ ] Login works with registered credentials
- [ ] Dashboard is accessible after login
- [ ] No console errors in browser DevTools

---

## 🔍 Troubleshooting

### Email Not Arriving?

**Check 1: Gmail App Password**
```bash
# In backend/.env file, verify:
SMTP_PASSWORD=tpvm ptum qolq mdcr
```

**Check 2: Backend Logs**
```bash
tail -f backend.log | grep -i email
```

Look for:
- ✅ `Sending OTP email to: your@email.com`
- ❌ `Failed to send email: ...`

**Check 3: Spam Folder**
- Gmail sometimes marks automated emails as spam
- Search for "PayVault" in spam folder

**Check 4: Email Configuration**
```bash
# Verify these in backend/.env:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=nwokolopaul274@gmail.com
SMTP_FROM=noreply@payvault.com
```

### Wrong OTP Error?

**Possible causes:**
1. OTP expired (15-minute TTL)
2. Typo in entering code
3. Redis not running

**Solution:**
- Register again with different email
- Enter OTP immediately after receiving
- Check Redis is running: `redis-cli ping` → should return `PONG`

### Frontend Issues?

**Check Console:**
- Press F12 → Console tab
- Look for red errors
- Check Network tab for failed API calls

**Common fixes:**
```bash
# Clear cache and restart
cd frontend
rm -rf node_modules/.vite
npm run dev
```

---

## 📊 Expected Email Content

**Subject:** `Your PayVault Verification Code`

**From:** `PayVault <noreply@payvault.com>`

**Content:**
- Purple gradient header with "PayVault" logo
- Welcome message
- Large 6-digit code in dashed box
- 15-minute expiry warning
- Professional footer

---

## 🚀 Next Steps After Successful Test

Once you confirm the email flow works:

1. **Update CORS** for production domains
2. **Deploy Frontend** to Vercel
3. **Deploy Backend** to Render
4. **Test Production** flow

---

## 📝 Test Results Template

Copy this and fill in your results:

```
## Email Test Results

✅/❌ OTP Email Received: 
   - Time to arrive: ___ seconds
   - In inbox or spam: ___

✅/❌ Email Formatting Correct:
   - HTML renders properly: Yes/No
   - OTP code visible: Yes/No

✅/❌ Verification Flow Works:
   - OTP accepted: Yes/No
   - Redirected after verification: Yes/No

✅/❌ Login Works:
   - Can login: Yes/No
   - Dashboard accessible: Yes/No

Issues Found:
[List any problems encountered]

Questions:
[Any questions about next steps]
```

---

**Need Help?** 

Share your test results and any error messages from:
- `backend.log` - Backend errors
- `frontend.log` - Frontend errors  
- Browser console - JavaScript errors
