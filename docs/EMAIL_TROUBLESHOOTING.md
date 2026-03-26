# 🔐 Email Authentication Troubleshooting Guide

## Issue: Gmail SMTP Authentication Failed

**Error:** `5.7.8 Username and Password not accepted`

---

## 🧪 Diagnosis

Your SMTP connection is working, but Gmail is rejecting the app password. This can happen for several reasons:

### Possible Causes:
1. ❌ App password is incorrect or has spaces in wrong format
2. ❌ App password was revoked/expired
3. ❌ Two-Factor Authentication (2FA) is not enabled
4. ❌ Less secure apps setting issue
5. ❌ Account security settings blocking access

---

## ✅ Solution Steps

### Step 1: Verify 2FA is Enabled

**CRITICAL:** Gmail App Passwords ONLY work if 2FA is enabled.

1. Go to: https://myaccount.google.com/security
2. Look for "2-Step Verification"
3. If it says "Off", click and enable it
4. Follow the setup process (phone number verification)

---

### Step 2: Generate NEW App Password

1. **Visit App Passwords Page:**
   - Go to: https://myaccount.google.com/apppasswords
   - You MUST be signed into nwokolopaul274@gmail.com

2. **Create New App Password:**
   - Select app: **"Mail"**
   - Select device: **"Other (Custom name)"**
   - Enter name: `"PayVault Development"`
   - Click **"Generate"**

3. **Copy the Password:**
   - Google will show a 16-character password
   - Format: `xxxxxxxx xxxxxxxx` (with a space in middle)
   - Example: `abcd efgh ijkl mnop`
   - **COPY IT IMMEDIATELY** - you can't see it again!

---

### Step 3: Update .env File

```bash
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

# Edit the .env file
nano .env
```

Update these lines:
```env
SMTP_USERNAME=nwokolopaul274@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Paste the NEW 16-char password here
```

**IMPORTANT:** 
- Include the space in the password if Google showed it with a space
- Password is CASE-SENSITIVE
- Don't add extra quotes around the password

---

### Step 4: Test Again

```bash
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

# Export environment and run test
export $(grep -v '^#' .env | xargs)
cargo run --bin test_email nwokolopaul274@gmail.com
```

---

## 🔍 Alternative Testing Methods

### Method 1: Direct Environment Variables

Skip the .env file entirely:

```bash
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

# Set variables directly (replace XXXX with actual password)
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=nwokolopaul274@gmail.com
export SMTP_PASSWORD="your-new-app-password-here"
export SMTP_FROM=noreply@payvault.com

# Run test
cargo run --bin test_email nwokolopaul274@gmail.com
```

---

### Method 2: Use dotenv Command

```bash
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

# Install dotenv-cli if you don't have it
npm install -g dotenv-cli

# Run with automatic .env loading
dotenv -- cargo run --bin test_email nwokolopaul274@gmail.com
```

---

### Method 3: Manual .env Loading in Code

The test binary now tries to load .env automatically, but you can also verify:

```bash
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

# Check if .env file is readable
cat .env | grep SMTP

# Should show:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=nwokolopaul274@gmail.com
# SMTP_PASSWORD=eaci ajuf tirj lyor
# SMTP_FROM=noreply@payvault.com
```

---

## 🛠️ Common Issues & Fixes

### Issue: "App Password option not available"

**Cause:** 2FA not enabled

**Fix:**
1. Enable 2-Step Verification first
2. Wait 5 minutes
3. Then try generating app password again

---

### Issue: "Password rejected" after entering correctly

**Possible causes:**
1. Extra spaces in password
2. Wrong character (0 vs O, 1 vs l)
3. Case sensitivity

**Fix:**
- Copy-paste directly from Google (don't type manually)
- If typing, be very careful about similar-looking characters
- Try regenerating the password

---

### Issue: "Less secure apps" error

Google no longer supports "less secure apps" method.

**Fix:**
- MUST use App Password method (not username/password login)
- Ensure you're using app password, not regular password

---

### Issue: Account recovery/verification needed

Sometimes Google requires additional verification.

**Fix:**
1. Check email inbox for security alerts from Google
2. Complete any required verification steps
3. Try again after 24 hours if blocked temporarily

---

## 📋 Quick Checklist

Before running the test, verify:

- [ ] 2FA is ENABLED on Google account
- [ ] Using APP PASSWORD (not regular password)
- [ ] App password is 16 characters (may include space)
- [ ] No typos in .env file
- [ ] SMTP_USERNAME is full email address
- [ ] Internet connection is working
- [ ] Firewall allows outbound port 587

---

## 🎯 Expected Output (Success)

When everything works, you should see:

```
╔═══════════════════════════════════════════════════════╗
║     PayVault Email Integration Test                  ║
╚═══════════════════════════════════════════════════════╝

📄 Loading environment from: ...
✓ Environment loaded successfully

📧 Configuration:
   From: noreply@payvault.com
   To: nwokolopaul274@gmail.com
   SMTP: smtp.gmail.com:587

🔌 Connecting to SMTP server...
✓ SMTP connection established

📝 Test 1: Sending plain text email...
✓ Plain text email sent successfully

📝 Test 2: Sending HTML email (OTP template)...
✓ HTML email (OTP template) sent successfully

📝 Test 3: Sending HTML email (Transaction Receipt)...
✓ HTML email (Transaction Receipt) sent successfully

╔═══════════════════════════════════════════════════════╗
║              ✅ ALL TESTS PASSED!                    ║
╚═══════════════════════════════════════════════════════╝

✨ Gmail SMTP integration is working perfectly!
```

---

## 🔐 Security Reminder

After successful testing:

1. **Keep your app password secret**
   - Never commit it to Git
   - Don't share it publicly
   - Store it securely

2. **Use different passwords per environment**
   - Development: One app password
   - Production: Different app password

3. **Rotate periodically**
   - Change every 90 days
   - Revoke old passwords after creating new ones

---

## 📞 Need More Help?

### Google Support Resources:
- [App Passwords FAQ](https://support.google.com/accounts/answer/185833)
- [2-Step Verification](https://support.google.com/accounts/answer/185839)
- [Troubleshoot App Passwords](https://support.google.com/mail/answer/7126229)

### Check Your Work:
```bash
# Verify .env contents (password will be masked in logs)
cd backend
grep SMTP_ .env

# Test SMTP connectivity
openssl s_client -connect smtp.gmail.com:587 -starttls smtp

# Check if variables are set
echo $SMTP_USERNAME
echo $SMTP_PASSWORD  # Will show **** or nothing (this is normal)
```

---

## 🎉 Success Criteria

Your email system is working when:

✅ All 3 test emails are sent successfully  
✅ No authentication errors in terminal  
✅ Emails arrive in inbox within 30 seconds  
✅ HTML renders correctly in Gmail  
✅ Plain text fallback is readable  

**If you see all of this, you're good to go!** 🚀
