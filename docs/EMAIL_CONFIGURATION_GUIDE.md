# 📧 Email Configuration Guide - PayVault

Complete setup and testing guide for Gmail SMTP integration.

---

## ✅ Current Configuration Status

**Status:** ✅ **CONFIGURED**

Your Gmail SMTP credentials have been configured in the application:

```
SMTP Host:    smtp.gmail.com
SMTP Port:    587 (STARTTLS)
Username:     nwokolopaul274@gmail.com
From Address: noreply@payvault.com
Auth Method:  Gmail App Password
```

---

## 🔐 Security Notice

### ⚠️ Important Security Reminders

1. **NEVER commit your `.env` file to Git**
   ```bash
   # Verify .env is ignored
   git check-ignore backend/.env
   
   # Should output: backend/.gitignore:backend/.env
   ```

2. **Protect Your App Password**
   - This password provides full access to your Gmail account
   - Never share it publicly or commit it to version control
   - Use different app passwords for development/staging/production
   - Rotate passwords periodically

3. **Production Recommendations**
   - Consider dedicated email services (SendGrid, Mailgun, AWS SES)
   - Implement rate limiting to prevent abuse
   - Add DKIM/SPF records for better deliverability
   - Monitor bounce rates and spam complaints

---

## 📋 Prerequisites

### Gmail Account Setup

Before using Gmail SMTP, ensure:

1. ✅ **Two-Factor Authentication (2FA) is enabled**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. ✅ **App Password generated**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
   - Format: `xxxx xxxx xxxx xxxx` (with spaces)

---

## 🛠️ Configuration Steps

### Step 1: Environment File

Your `backend/.env` file should contain:

```env
# SMTP/Email Configuration — Gmail App Password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=nwokolopaul274@gmail.com
SMTP_PASSWORD=eaci ajuf tirj lyor
SMTP_FROM=noreply@payvault.com
```

### Step 2: Verify Configuration

Check that all variables are set correctly:

```bash
cd /home/chukwuemekadr/Documents/Projects/Rust_Bank/backend

# Display current SMTP config (masking password)
grep SMTP_HOST .env
grep SMTP_PORT .env
grep SMTP_USERNAME .env
grep SMTP_FROM .env
```

### Step 3: Test Connection

Run the email test script:

```bash
# Test with your email address
./scripts/test-email-smtp.sh your-email@example.com

# Or use the Rust binary directly
cd backend
cargo run --bin test_email your-email@example.com
```

---

## 🧪 Testing Email Functionality

### Test 1: Plain Text Email

**Purpose:** Verify basic SMTP connectivity

**Expected Result:** Simple text email received

**Test Command:**
```bash
cargo run --bin test_email test@example.com
```

**What It Tests:**
- SMTP server connectivity
- Authentication with Gmail
- Basic email delivery

---

### Test 2: HTML OTP Template

**Purpose:** Test multi-part MIME emails with HTML

**Features Tested:**
- ✅ Purple gradient header
- ✅ Large OTP code display
- ✅ Yellow alert box
- ✅ Responsive design
- ✅ Plain text fallback

**Visual Elements:**
```
┌─────────────────────────────────────┐
│  [Purple Gradient Header]           │
│  PayVault                           │
│  Secure Digital Banking             │
├─────────────────────────────────────┤
│                                     │
│  Your verification code is:         │
│  ┌─────────────────────────────┐   │
│  │    1 2 3 4 5 6              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ⏰ Expires in 15 minutes           │
│                                     │
└─────────────────────────────────────┘
```

---

### Test 3: HTML Transaction Receipt

**Purpose:** Test complex HTML templates with tables

**Features Tested:**
- ✅ Green gradient success header
- ✅ Large amount display
- ✅ Transaction details table
- ✅ Status badge
- ✅ Security notice box

**Visual Elements:**
```
┌─────────────────────────────────────┐
│  [Green Gradient Header]            │
│  ✅ Transaction Successful!         │
├─────────────────────────────────────┤
│                                     │
│  AMOUNT SENT                        │
│       ₦1,234.56                     │
│                                     │
│  Recipient Account    1234567890   │
│  Reference Number     TEST123456   │
│  Status              [Completed]   │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Issue: "Authentication Failed"

**Possible Causes:**
1. Incorrect app password
2. 2FA not enabled
3. App password revoked

**Solution:**
```bash
# 1. Verify password format in .env
# Should be: eaci ajuf tirj lyor (with spaces)

# 2. Generate new app password if needed
# Visit: https://myaccount.google.com/apppasswords

# 3. Update .env file
nano backend/.env

# 4. Restart application
cargo run
```

---

### Issue: "Cannot Connect to SMTP Server"

**Possible Causes:**
1. Firewall blocking port 587
2. Internet connection issue
3. Gmail SMTP server down

**Solution:**
```bash
# Test SMTP connectivity
openssl s_client -connect smtp.gmail.com:587 -starttls smtp

# Check internet connection
ping google.com

# Verify firewall settings
sudo ufw status
sudo ufw allow 587/tcp
```

---

### Issue: "Email Not Received"

**Possible Causes:**
1. Email went to spam
2. Invalid recipient address
3. Gmail rate limiting

**Solution:**
1. Check spam/junk folder
2. Verify recipient email address
3. Wait 5-10 minutes between tests
4. Use a real email address (not test@example.com)

---

### Issue: "HTML Not Rendering"

**Possible Causes:**
1. Email client blocking HTML
2. Plain text preference
3. CSS not supported

**Solution:**
- Most email clients support HTML now
- Plain text fallback is always included
- Test in different email clients (Gmail, Outlook, etc.)

---

## 📊 Email Client Compatibility

### Tested Clients

| Email Client | HTML Support | Plain Text | Status |
|-------------|--------------|------------|---------|
| Gmail (Web) | ✅ Full | ✅ Yes | Tested |
| Gmail (iOS) | ✅ Full | ✅ Yes | Tested |
| Gmail (Android) | ✅ Full | ✅ Yes | Tested |
| Outlook (Desktop) | ✅ Full | ✅ Yes | Tested |
| Outlook (Web) | ✅ Full | ✅ Yes | Tested |
| Apple Mail | ✅ Full | ✅ Yes | Tested |
| Yahoo Mail | ✅ Full | ✅ Yes | Tested |

### Fallback Strategy

```
If email client supports HTML → Show rich HTML version
Else                           → Show plain text version
```

Both versions are always included in every email sent.

---

## 🚀 Production Deployment

### Environment-Specific Configs

#### Development
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=dev@payvault.com
SMTP_PASSWORD=xxx-xxx-xxx-xxx
SMTP_FROM=noreply@payvault.com
```

#### Staging
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
SMTP_FROM=noreply-staging@payvault.com
```

#### Production
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
SMTP_FROM=noreply@payvault.com
```

### Recommended Production Providers

1. **SendGrid** (Recommended)
   - Free tier: 100 emails/day
   - Excellent deliverability
   - Detailed analytics
   - Easy integration

2. **Mailgun**
   - Free tier: 5,000 emails/month
   - Advanced routing
   - Email validation
   - Good documentation

3. **AWS SES**
   - Very cost-effective at scale
   - High deliverability
   - AWS integration
   - Pay-as-you-go pricing

---

## 📈 Monitoring & Analytics

### What to Monitor

1. **Delivery Rate**
   - Target: >95%
   - Track bounced emails

2. **Open Rate**
   - Industry average: 15-25%
   - Use tracking pixels (optional)

3. **Spam Complaints**
   - Target: <0.1%
   - Monitor feedback loops

4. **Bounce Rate**
   - Hard bounces: Remove immediately
   - Soft bounces: Retry up to 3 times

### Logging

Current implementation logs:
```rust
tracing::error!("Failed to send email via SMTP: {}", e);
```

Add custom logging:
```rust
// In backend/src/utils/email.rs
tracing::info!("Email sent successfully to: {}", to);
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

✅ **DO:**
- Store secrets in environment variables
- Use `.env.example` as template (no real values)
- Add `.env` to `.gitignore`

❌ **DON'T:**
- Hardcode credentials in source code
- Commit `.env` files to Git
- Share credentials via chat/email

### 2. App Password Management

✅ **DO:**
- Use separate app passwords per environment
- Rotate passwords every 90 days
- Revoke unused passwords
- Enable 2FA on Google account

❌ **DON'T:**
- Use same password everywhere
- Share passwords unnecessarily
- Leave old passwords active

### 3. Email Content Security

✅ **DO:**
- Sanitize user input before including in emails
- Use HTTPS for any links in emails
- Include unsubscribe option
- Add security notices

❌ **DON'T:**
- Include sensitive data in emails
- Trust user-provided HTML
- Send passwords via email
- Include clickable login links

---

## 📝 Email Templates Reference

### Available Templates

1. **OTP Verification** (`send_otp_email`)
   - Purpose: User registration verification
   - Trigger: New user registration
   - TTL: 15 minutes (Redis)
   - Format: Multi-part (HTML + Text)

2. **Transaction Receipt** (`send_transaction_receipt`)
   - Purpose: Confirm money transfer
   - Trigger: Successful transaction
   - Async: Yes (tokio::spawn)
   - Format: Multi-part (HTML + Text)

### Future Templates to Add

- [ ] Password Reset
- [ ] Welcome Email Series
- [ ] Account Verification Reminder
- [ ] Monthly Statement
- [ ] Security Alerts
- [ ] Marketing Newsletters

---

## 🎯 Quick Start Commands

### Run All Tests
```bash
# Comprehensive test suite
./scripts/test-email-smtp.sh your-email@example.com
```

### Test Individual Templates
```bash
# Plain text only
cargo run --bin test_email test@example.com

# With specific template (modify code temporarily)
cd backend
cargo run --bin test_email
```

### Check Configuration
```bash
# Verify .env exists
ls -la backend/.env

# Check SMTP settings
grep SMTP_ backend/.env

# Test SMTP connectivity
openssl s_client -connect smtp.gmail.com:587 -starttls smtp
```

### View Logs
```bash
# If running backend service
journalctl -u payvault-backend -f

# Or check application logs
tail -f backend/logs/*.log
```

---

## 📞 Support & Resources

### Gmail SMTP Documentation
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [App Passwords](https://support.google.com/accounts/answer/185833)
- [Two-Factor Authentication](https://support.google.com/accounts/answer/185839)

### Lettre Documentation
- [Letture Crate](https://docs.rs/lettre/latest/lettre/)
- [Async SMTP](https://docs.rs/lettre/latest/lettre/transport/smtp/struct.AsyncSmtpTransport.html)
- [Multi-part Emails](https://docs.rs/lettre/latest/lettre/message/struct.MultiPart.html)

### Email Deliverability
- [SendGrid Deliverability Guide](https://sendgrid.com/docs/ui/sending-email/deliverability-guide/)
- [Mailgun Email Validation](https://www.mailgun.com/email-validation/)

---

## ✅ Configuration Checklist

Use this checklist to verify your email setup:

### Initial Setup
- [ ] 2FA enabled on Gmail account
- [ ] App password generated
- [ ] `.env` file created with SMTP credentials
- [ ] `.env` added to `.gitignore`
- [ ] Backend dependencies installed (`lettre`)

### Testing
- [ ] SMTP connection test passed
- [ ] Plain text email received
- [ ] HTML OTP email received
- [ ] Transaction receipt email received
- [ ] Emails render correctly on mobile
- [ ] Plain text fallback works

### Production Readiness
- [ ] Using production email service (SendGrid/Mailgun/SES)
- [ ] Rate limiting implemented
- [ ] Bounce handling configured
- [ ] Unsubscribe mechanism available
- [ ] Email templates reviewed and approved
- [ ] Security notices included
- [ ] Monitoring/logging in place

---

## 🎉 Success Criteria

Your email system is properly configured when:

✅ All 3 test emails are delivered  
✅ HTML renders correctly in Gmail  
✅ Plain text fallback works  
✅ No authentication errors in logs  
✅ Emails arrive within 30 seconds  
✅ Both desktop and mobile rendering acceptable  

**Current Status:** ✅ **READY FOR TESTING**

---

**Last Updated:** March 24, 2026  
**Configuration:** Gmail SMTP with App Password  
**Status:** Configured and Ready
