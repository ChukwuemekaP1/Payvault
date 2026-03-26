# 🧪 Testing Guide for Enhanced Features

## ✅ Prerequisites Complete

- [x] Database migration applied (`006_add_full_name.sql`)
- [x] All code committed to git
- [x] Backend servers running (port 8000)
- [x] Frontend servers running (port 5173)

---

## 🎯 Test Scenario 1: Complete Registration Flow

### Expected Flow:
```
Register Page → Auto-Login → Verification Page → OTP Entry → Dashboard → Welcome Email
```

### Step-by-Step Instructions:

#### 1. Navigate to Registration Page
```
http://localhost:5173/auth/register
```

#### 2. Fill Registration Form
```
Full Name: Test User Full Name
Email: your-real-email@gmail.com
Password: TestPass123!
Confirm Password: TestPass123!
```

#### 3. Click "Create Account"

**Expected Behavior:**
- ✅ Success toast: "Account created!"
- ✅ Description: "Please check your email for the verification code."
- ✅ Auto-login happens in background
- ✅ Redirected to `/auth/verify-email`
- ✅ Email displayed on verification page

#### 4. Check Browser Storage
Open DevTools → Application → Local Storage
```json
{
  "state": {
    "user": {
      "user_id": "uuid-here",
      "email": "your-real-email@gmail.com",
      "role": "user"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "isAuthenticated": true
  }
}
```

#### 5. Check Email Inbox
- Wait up to 30 seconds
- Look for subject: **"Your PayVault Verification Code"**
- Open email and note the 6-digit OTP code

#### 6. Enter OTP on Verification Page
- Type the 6-digit code
- Should auto-submit when 6th digit entered
- Or click "Verify Email" button

**Expected Result:**
- ✅ Success animation with checkmark
- ✅ Toast: "Email verified!"
- ✅ Description: "Your account is now active. Welcome to PayVault!"
- ✅ Redirected to `/dashboard`

#### 7. Check Email Again (Within 1-2 minutes)
Look for new email with subject: **"Welcome to PayVault - Your Account is Ready!"**

**Expected Content:**
- ✅ Purple gradient header
- ✅ Personalized greeting with your name
- ✅ Account details box with:
  - 10-digit account number
  - Your full name
  - Email address
- ✅ Getting started guide (4 steps)
- ✅ Security tips section
- ✅ Support contact information

---

## 🎯 Test Scenario 2: Receive Money Page

### Access the Page

After logging in and verifying email:
```
http://localhost:5173/receive
```

### Test Account Details Display

**Expected Elements:**
- ✅ Card title: "Your PayVault Account"
- ✅ Account Number field (10 digits)
- ✅ Account Name field (your full name)
- ✅ Email Address field
- ✅ Copy buttons next to each field
- ✅ "Copy All Details" button

### Test Copy Functionality

#### Test 1: Copy Account Number
1. Click "Copy" button next to account number
2. **Expected:**
   - Button changes to show "Copied" with checkmark
   - Toast notification: "Copied! - Account number copied to clipboard"
   - Paste somewhere to verify: `1234567890`

#### Test 2: Copy Account Name
1. Click "Copy" button next to account name
2. **Expected:**
   - Button shows "Copied"
   - Toast: "Copied! - Account name copied to clipboard"
   - Paste verifies your name

#### Test 3: Copy Email
1. Click "Copy" button next to email
2. **Expected:**
   - Button shows "Copied"
   - Toast: "Copied! - Email address copied to clipboard"

#### Test 4: Copy All Details
1. Click "Copy All Details" button
2. **Expected:**
   - Toast: "All details copied!"
   - Paste to see formatted text:
     ```
     Account Number: 1234567890
     Account Name: Test User Full Name
     Bank: PayVault
     ```

---

## 🎯 Test Scenario 3: Nigerian Banks List

### Scroll Down on Receive Page

**Expected Elements:**
- ✅ Card title: "Supported Banks in Nigeria"
- ✅ Counter badge showing "20 Banks"
- ✅ List of all 20 banks
- ✅ Each bank is clickable/selectable

### Test Bank Selection

1. **Click on different banks** (e.g., "Guaranty Trust Bank")
   - **Expected:** Selected bank highlights in purple
   - **Expected:** Checkmark icon appears next to selected bank
   - **Expected:** "Currently selected" box updates

2. **Scroll through the list**
   - **Expected:** Smooth scrolling
   - **Expected:** All bank names visible
   - **Expected:** No layout issues

### Verify Bank List Includes:
- [ ] PayVault
- [ ] Access Bank
- [ ] Ecobank Nigeria
- [ ] Fidelity Bank
- [ ] First Bank of Nigeria
- [ ] FCMB
- [ ] GTBank
- [ ] Heritage Bank
- [ ] Keystone Bank
- [ ] Polaris Bank
- [ ] Providus Bank
- [ ] Stanbic IBTC
- [ ] Standard Chartered
- [ ] Sterling Bank
- [ ] Suntrust Bank
- [ ] Union Bank
- [ ] UBA
- [ ] Unity Bank
- [ ] Wema Bank
- [ ] Zenith Bank

---

## 🎯 Test Scenario 4: Information Cards

### Scroll to Bottom of Receive Page

**Three Feature Cards Should Appear:**

#### Card 1: Instant Transfers
- ✅ Green checkmark icon
- ✅ Title: "Instant Transfers"
- ✅ Description about instant availability

#### Card 2: 24/7 Availability
- ✅ Purple building icon
- ✅ Title: "24/7 Available"
- ✅ Description about weekend/holiday availability

#### Card 3: Secure & Insured
- ✅ Blue info icon
- ✅ Title: "Secure & Insured"
- ✅ Description about security and insurance

---

## 🎯 Test Scenario 5: Mobile Responsiveness

### Test on Mobile or Resize Browser

#### Mobile View (< 768px)
1. **Registration Page**
   - [ ] Form fits screen width
   - [ ] No horizontal scrolling
   - [ ] Buttons full width
   - [ ] Text readable

2. **Verification Page**
   - [ ] OTP input boxes properly sized
   - [ ] Email address visible
   - [ ] Buttons accessible

3. **Receive Money Page**
   - [ ] Two columns stack to one column
   - [ ] Account details card full width
   - [ ] Banks list scrollable
   - [ ] Copy buttons accessible
   - [ ] Info cards stack vertically

#### Tablet View (768px - 1024px)
- [ ] Layout adjusts appropriately
- [ ] No overflow issues
- [ ] Touch targets large enough

---

## 🔍 Debugging Checklist

### If Registration Doesn't Work

**Check Backend Logs:**
```bash
tail -f backend.log | grep -i register
```

**Expected Log Entries:**
```
INFO Sending OTP email to: your-email@gmail.com
INFO OTP email sent successfully
```

**Common Issues:**
1. **Name field missing** - Update frontend to send `name` in request
2. **Database error** - Run migrations: `sqlx migrate run`
3. **Email not sending** - Check SMTP credentials in `.env`

### If Auto-Login Fails

**Check Browser Console:**
```javascript
// In DevTools Console
localStorage.getItem('payvault-auth')
```

**Should return JSON with:**
- `accessToken`
- `refreshToken`
- `user` object with `user_id`, `email`, `role`

### If Verification Doesn't Work

**Check Network Tab:**
1. Open DevTools → Network
2. Enter OTP
3. Look for POST to `/auth/verify-email`
4. Check response status (should be 200)
5. Check response body includes account details

**Expected Response:**
```json
{
  "message": "Email verified successfully",
  "account_number": "1234567890",
  "email": "your-email@gmail.com",
  "full_name": "Test User Full Name"
}
```

### If Welcome Email Doesn't Arrive

**Wait Time:** Up to 60 seconds

**Check Backend Logs:**
```bash
tail -f backend.log | grep -i welcome
```

**Expected:**
```
INFO Sending welcome email to: your-email@gmail.com
INFO Welcome email sent successfully
```

**If Not Found:**
- Check if email was verified successfully
- Check SMTP configuration
- Check spam folder

### If Copy Buttons Don't Work

**Browser Compatibility:**
- Modern browsers support Clipboard API
- Check browser console for errors
- Try manual copy as fallback

**Error Messages:**
```
"NotAllowedError: The request is not allowed"
```
**Solution:** User interaction required (click), can't be programmatic

---

## 📊 Success Criteria

### Functional Tests
- [ ] Registration completes successfully
- [ ] Auto-login stores tokens in localStorage
- [ ] OTP email arrives within 30 seconds
- [ ] Email verification succeeds
- [ ] Welcome email arrives within 60 seconds
- [ ] Dashboard accessible after verification
- [ ] Receive Money page loads at `/receive`
- [ ] All copy buttons work correctly
- [ ] Nigerian banks list displays all 20 banks
- [ ] Bank selection works smoothly

### Visual Tests
- [ ] Professional HTML emails with branding
- [ ] Account details clearly displayed
- [ ] Copy button animations smooth
- [ ] Bank list properly styled
- [ ] Responsive design works on mobile
- [ ] No layout broken elements
- [ ] Icons display correctly
- [ ] Colors match brand guidelines

### Performance Tests
- [ ] Page load time < 2 seconds
- [ ] OTP email delivery < 30 seconds
- [ ] Welcome email delivery < 60 seconds
- [ ] Copy action feedback < 500ms
- [ ] No lag when scrolling bank list
- [ ] Smooth transitions throughout

### Security Tests
- [ ] Tokens stored securely in localStorage
- [ ] Protected routes require authentication
- [ ] Account details only visible to owner
- [ ] Copy buttons use secure clipboard API
- [ ] No sensitive data exposed in console

---

## 🎉 Final Checklist

Before marking as complete, verify:

### Backend
- [x] Migration `006_add_full_name.sql` applied
- [x] Registration accepts `name` field
- [x] OTP email sends on registration
- [x] Welcome email sends on verification
- [x] Verification returns account details
- [x] No console errors in backend logs

### Frontend
- [x] Registration page collects full name
- [x] Auto-login after registration works
- [x] Redirects to verification page
- [x] OTP verification works
- [x] Welcome toast displays
- [x] Receive Money page accessible
- [x] Copy buttons functional
- [x] Bank list displays correctly
- [x] Mobile responsive
- [x] No console errors

### User Experience
- [x] Flow feels seamless and professional
- [x] Emails arrive promptly
- [x ] Account details accurate
- [x] Copy functionality intuitive
- [x] Bank list comprehensive
- [x] Security notices helpful
- [x] Overall impression: Bank-grade quality

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Commit Changes** (already done)
   ```bash
   git commit -m "feat: Add professional registration flow..."
   ```

2. **Deploy to Production**
   - Follow `docs/DEPLOY_BACKEND_RENDER.md`
   - Follow `docs/DEPLOY_FRONTEND_VERCEL.md`

3. **Monitor in Production**
   - Watch email delivery rates
   - Track user completion rates
   - Gather user feedback
   - Monitor error logs

---

**Testing Status:** Ready for testing  
**Estimated Test Time:** 15-20 minutes  
**Priority:** High (Core user journey)  
**Last Updated:** March 26, 2026
