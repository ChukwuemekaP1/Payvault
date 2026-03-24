# PayVault Admin Panel - Complete Guide

## 🎯 Overview

You now have a fully functional admin panel that simulates how real banks manage user accounts through **double-entry bookkeeping**.

---

## 🔐 Access the Admin Panel

### Admin Login URL:
```
http://localhost:5174/admin/login
```

### Demo Credentials:
- **Email:** `admin@payvault.com`
- **Password:** `Admin123!`

### How to Get There:
1. Go to http://localhost:5174
2. Scroll to the footer
3. Click **"Admin"** link (bottom right)
4. Login with credentials above

---

## 💰 How to Credit User Accounts

### Step 1: Login as Admin
Navigate to `/admin/login` and sign in

### Step 2: Select a User
From the dashboard, click on any user in the left panel to select them

### Step 3: Enter Credit Details
Fill in the form:
- **Amount:** Amount in Naira (e.g., 5000 for ₦5,000)
- **Reason:** Why you're crediting (e.g., "Cash deposit at branch", "Promotional bonus")

### Step 4: Submit
Click **"Credit Wallet"** button

### What Happens Behind the Scenes:
```
Accounting Entry:
DEBIT:  Bank Operating Account (₦5,000)
CREDIT: User Wallet (₦5,000)

Database Changes:
1. User's wallet balance increases
2. Operations account balance decreases
3. Transaction record created
4. Audit log entry created
```

---

## 🏦 How Banks Actually Manage Accounts

### Real Banking System Explained:

#### 1. **Double-Entry Bookkeeping**
Every transaction affects at least TWO accounts:
- One account is DEBITED (money goes out)
- One account is CREDITED (money comes in)
- The books must ALWAYS balance

#### 2. **Bank's Balance Sheet**

```
ASSETS (What bank owns/controls)
├── Reserve Account @ Central Bank
├── Cash Vault (physical cash)
├── Interbank Settlement Account
└── Loans & Investments

LIABILITIES (What bank owes customers)
├── Customer Deposits (YOUR users' wallets!)
├── Savings Accounts
└── Time Deposits

EQUITY (Bank's own money)
├── Share Capital
└── Retained Earnings
```

#### 3. **How Money Enters Customer Accounts**

**Scenario A: Cash Deposit at Branch**
```
Customer gives ₦10,000 cash to teller

Bank's Books:
DEBIT:  Cash Vault (Asset)     +₦10,000
CREDIT: Customer Wallet (Liability) +₦10,000

Result:
- Physical cash stored in vault
- Customer sees ₦10,000 in their account
- Bank's books balance
```

**Scenario B: Wire Transfer from Another Bank**
```
Transfer from GTBank → PayVault

Bank's Books:
DEBIT:  Reserve @ Central Bank (Asset)  +₦50,000
CREDIT: Customer Wallet (Liability)     +₦50,000

Result:
- Bank's reserve increases
- Customer's balance increases
- Interbank settlement complete
```

**Scenario C: Admin Credit (What You Built)**
```
Admin credits user for testing

Bank's Books:
DEBIT:  Operating Account (Asset)   +₦20,000
CREDIT: Customer Wallet (Liability) +₦20,000

Result:
- Same accounting principle!
- Simulates bank using its reserves
- Fully auditable
```

---

## 🎓 Key Banking Concepts Implemented

### 1. **Suspense/Operating Account**
- Special account (`operations@payvault.com`) 
- Represents bank's own funds
- Used for admin operations
- Starts with ₦10,000,000 (₦10M) for testing

### 2. **Audit Trail**
Every admin credit creates:
- ✅ Transaction record in `transactions` table
- ✅ Audit log entry in `audit_log` table
- ✅ Metadata about who did what and why

### 3. **Segregation of Duties**
- Regular users can't credit themselves
- Only admin role can perform credits
- All admin actions logged

### 4. **Transaction Integrity**
- Uses database transactions (ACID compliance)
- Either both debit AND credit happen, or neither does
- Money can't be "created" or "destroyed"

---

## 🧪 Test Scenarios

### Scenario 1: New User Sign-up Bonus
```
1. User registers: demo_user@test.com
2. Admin credits ₦1,000 "Welcome bonus"
3. User receives money instantly
4. Transaction appears in user's history
```

### Scenario 2: Cash Deposit Simulation
```
1. User visits "branch" (you the admin)
2. Gives you ₦5,000 cash (pretend)
3. You credit their account via admin panel
4. Their balance increases by ₦5,000
5. Operations account decreases by ₦5,000
```

### Scenario 3: Refund Processing
```
1. User had failed transaction
2. Admin credits ₦10,000 "Refund for TXN-123"
3. User gets money back
4. Full audit trail maintained
```

---

## 📊 View Results

### As Admin:
- Dashboard shows all users
- Can see who has been credited
- Audit logs show all admin actions

### As User:
- Check wallet balance (increased)
- View transaction history
- See "credit" type transactions

---

## 🔒 Security Features

### Currently Implemented:
✅ Admin role required for credit operations  
✅ JWT authentication  
✅ Audit logging  
✅ Database transactions (atomicity)  
✅ Input validation  

### For Production (Add These):
- [ ] Two-factor authentication for admins
- [ ] IP whitelisting
- [ ] Approval workflow (maker-checker)
- [ ] Daily credit limits
- [ ] Real-time monitoring/alerts
- [ ] Session timeout
- [ ] Role-based access control (RBAC)

---

## 🛠️ Technical Implementation

### Backend Files Modified:
```
backend/src/modules/admin.rs
  └─ Added: credit_wallet() function
  └─ Added: CreditRequest DTO
  
backend/src/router.rs
  └─ Added: POST /admin/wallets/{id}/credit route
```

### Frontend Files Created:
```
frontend/src/pages/admin/AdminLogin.tsx
  └─ Admin login page
  
frontend/src/pages/admin/AdminDashboard.tsx
  └─ Dashboard with user list + credit form
  
frontend/src/App.tsx
  └─ Added admin routes
```

### API Endpoint:
```http
POST /admin/wallets/{wallet_id}/credit
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "amount_kobo": 500000,
  "reason": "Cash deposit at branch"
}
```

Response:
```json
{
  "id": "wallet-uuid",
  "user_id": "user-uuid",
  "balance_kobo": 1500000,
  "account_number": "1234567890",
  "is_frozen": false
}
```

---

## 🎯 Next Steps (Enhancements)

### Recommended Additions:

1. **Transaction List for Admin**
   - View all credits made
   - Filter by date/user/amount
   - Export to CSV

2. **User Detail Page**
   - See full user profile
   - Transaction history
   - Quick credit button

3. **Bulk Credits**
   - Upload CSV of users + amounts
   - Process multiple credits at once

4. **Reports**
   - Daily credit summary
   - Audit log viewer
   - Balance reconciliation

5. **Notifications**
   - Email user when credited
   - SMS alerts
   - Push notifications

---

## ❓ FAQ

**Q: Can I debit users?**  
A: Not yet. That would be a "debit" endpoint (for withdrawals/fees). Easy to add if needed.

**Q: What if operations account runs out of money?**  
A: It starts with ₦10M. If it goes negative, the credit will fail. In real banks, they maintain minimum reserves.

**Q: Can users see where the money came from?**  
A: Yes! They'll see "ADMIN-CREDIT-xxx" in their transaction history with your reason.

**Q: Is this how real banks work?**  
A: YES! Exactly the same principle. Real banks just have more layers (compliance, approvals, etc.)

---

## 🎉 Summary

You now have:
✅ Working admin panel  
✅ Double-entry bookkeeping  
✅ Full audit trail  
✅ Real banking simulation  
✅ Test environment for all scenarios  

**Access it at:** http://localhost:5174/admin/login  
**Credentials:** admin@payvault.com / Admin123!

Go ahead and test crediting money to user accounts! 🚀
