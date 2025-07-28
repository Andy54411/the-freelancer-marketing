# Manual Transfer Script Instructions

## 🎯 Purpose
Transfer the missing €3,267.05 from your completed payment to the Connect account.

## 📋 Payment Details
- **Payment Intent:** pi_3RpXNiD5Lvjon30a0YfqIl58
- **Total Paid:** €3,421.00  
- **Transfer Amount:** €3,267.05
- **Connect Account:** acct_1RoSL4DlTKEWRrRh
- **Order ID:** 4bMTQQzVWsHyKhkbkRRu

## 🚀 How to Run

### 1. Prerequisites
Make sure you have your Stripe Secret Key available:
```bash
export STRIPE_SECRET_KEY="sk_test_..."  # Your actual key
```

### 2. Run the Script
```bash
cd /Users/andystaudinger/Tasko
node manual-transfer-script.js
```

### 3. Verification
After running, check in Stripe Dashboard:
- Go to Connect → Transfers
- Look for transfer to acct_1RoSL4DlTKEWRrRh
- Amount should be €3,267.05

## ⚠️ Important Notes

- **Safe to Run:** This script only creates the missing transfer
- **Idempotent:** Won't cause double transfers (unique metadata)
- **Audit Trail:** Creates proper database records
- **Error Handling:** Comprehensive error messages and solutions

## 🔍 What the Script Does

1. **Creates Stripe Transfer:** €3,267.05 → Connect Account
2. **Updates Company Document:** Adds transfer ID and timestamp  
3. **Creates Audit Trail:** Logs in balanceHistory collection
4. **Provides Summary:** Detailed success/error reporting

## 🆘 Troubleshooting

### "Insufficient Funds" Error
- Check your Stripe balance covers €3,267.05
- Wait for pending transactions to clear

### "Account Invalid" Error  
- Verify Connect account exists: acct_1RoSL4DlTKEWRrRh
- Check Connect account is fully onboarded

### "Transfer Failed" Error
- Review Stripe logs for specific reason
- Check Connect account status and capabilities

## ✅ Success Indicators
- Script shows "🎉 MANUAL TRANSFER COMPLETED SUCCESSFULLY!"
- Transfer ID is displayed (starts with "tr_")
- Company document updated with transfer info
- Audit trail created in Firebase

## 🔄 After Success
- Future payments will transfer automatically (webhook is fixed)
- This was a one-time fix for the missing transfer
- No further manual intervention needed
