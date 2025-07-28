#!/usr/bin/env node

/**
 * Manual Transfer Script for Missing Additional Hours Payment
 *
 * Payment Details:
 * - Payment Intent: pi_3RpXNiD5Lvjon30a0YfqIl58
 * - Total Amount: €3,421.00
 * - Transfer Amount: €3,267.05 (companyReceives)
 * - Connect Account: acct_1RoSL4DlTKEWRrRh
 * - Order ID: 4bMTQQzVWsHyKhkbkRRu
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Initialize Stripe
console.log('🔍 DEBUG: Checking environment variables...');
console.log('STRIPE_SECRET_KEY available:', !!process.env.STRIPE_SECRET_KEY);
console.log(
  'Environment keys containing STRIPE:',
  Object.keys(process.env).filter(key => key.includes('STRIPE'))
);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables!');
  console.log('Available environment variables:');
  console.log(Object.keys(process.env).sort());
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function manualTransfer() {
  const paymentIntentId = 'pi_3RpXNiD5Lvjon30a0YfqIl58';
  const orderId = '4bMTQQzVWsHyKhkbkRRu';
  const transferAmount = 326705; // €3,267.05 in cents
  const connectAccountId = 'acct_1RoSL4DlTKEWRrRh';
  const entryIds =
    '1753523589663lkqom0166,1753534030125mlw9ike5x,1753542218196he8wuwgs9,17535514465883vdf9d2v8,17535516502776y139k7dj,1753551828361x893anh6j,1753589834860th4gmulv2,1753590469417o4w5hma31,1753594883399rkc5l1mke,1753594955490lwp68v8ir';

  console.log('🚀 Starting manual transfer for missing additional hours payment...');
  console.log(`📋 Payment Intent: ${paymentIntentId}`);
  console.log(`💰 Transfer Amount: €${(transferAmount / 100).toFixed(2)}`);
  console.log(`🏢 Connect Account: ${connectAccountId}`);
  console.log(`📦 Order ID: ${orderId}`);

  try {
    // Step 1: Create the Transfer
    console.log('\n📤 Creating transfer to Connect account...');

    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'eur',
      destination: connectAccountId,
      description: `MANUAL: Zusätzliche Arbeitsstunden für Auftrag ${orderId}`,
      metadata: {
        type: 'additional_hours_platform_hold_manual',
        orderId: orderId,
        paymentIntentId: paymentIntentId,
        entryIds: entryIds,
        manualTransfer: 'true',
        transferDate: new Date().toISOString(),
      },
    });

    console.log(`✅ Transfer successful!`);
    console.log(`🆔 Transfer ID: ${transfer.id}`);
    console.log(`💸 Amount: €${(transfer.amount / 100).toFixed(2)}`);
    console.log(`🎯 Destination: ${transfer.destination}`);

    // Step 2: Update Company Document with Transfer Info
    console.log('\n📝 Updating company document...');

    const companyRef = db
      .collection('companies')
      .where('stripeAccountId', '==', connectAccountId)
      .limit(1);

    const companySnapshot = await companyRef.get();

    if (!companySnapshot.empty) {
      const companyDoc = companySnapshot.docs[0];

      await companyDoc.ref.update({
        lastTransferId: transfer.id,
        lastTransferAt: admin.firestore.FieldValue.serverTimestamp(),
        manualTransferNote: `Manual transfer for PI ${paymentIntentId} - ${new Date().toISOString()}`,
      });

      console.log(`✅ Company document updated: ${companyDoc.id}`);

      // Step 3: Add to Balance History for Audit Trail
      const auditRef = companyDoc.ref.collection('balanceHistory').doc();
      await auditRef.set({
        type: 'additional_hours_payment_manual_transfer',
        amount: transferAmount,
        paymentIntentId: paymentIntentId,
        transferId: transfer.id,
        orderId: orderId,
        entryIds: entryIds.split(','),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'platform_held',
        note: 'Manual transfer executed to fix missing automatic transfer',
      });

      console.log(`✅ Audit trail created in balanceHistory`);
    } else {
      console.log(`⚠️  Warning: Company with stripeAccountId ${connectAccountId} not found`);
    }

    // Step 4: Summary
    console.log('\n🎉 MANUAL TRANSFER COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(50));
    console.log(`💳 Payment Intent: ${paymentIntentId}`);
    console.log(`🔄 Transfer ID: ${transfer.id}`);
    console.log(`💰 Amount Transferred: €${(transferAmount / 100).toFixed(2)}`);
    console.log(`🏢 To Connect Account: ${connectAccountId}`);
    console.log(`📦 For Order: ${orderId}`);
    console.log(`⏰ Transfer Date: ${new Date().toLocaleString('de-DE')}`);
    console.log('═'.repeat(50));
    console.log('✅ The missing transfer has been completed!');
    console.log('✅ Future payments will be handled automatically by the webhook.');
  } catch (error) {
    console.error('\n❌ ERROR during manual transfer:');
    console.error('═'.repeat(50));

    if (error.code) {
      console.error(`🔸 Stripe Error Code: ${error.code}`);
    }

    if (error.message) {
      console.error(`🔸 Error Message: ${error.message}`);
    }

    if (error.type) {
      console.error(`🔸 Error Type: ${error.type}`);
    }

    console.error('🔸 Full Error:', error);
    console.error('═'.repeat(50));

    // Specific error handling
    if (error.code === 'insufficient_funds') {
      console.error('💡 SOLUTION: Your Stripe account has insufficient funds for this transfer.');
      console.error(
        '   Please ensure your Stripe balance covers €' + (transferAmount / 100).toFixed(2)
      );
    } else if (error.code === 'account_invalid') {
      console.error('💡 SOLUTION: The Connect account may be invalid or not properly set up.');
      console.error('   Please verify the Connect account: ' + connectAccountId);
    } else if (error.code === 'transfer_failed') {
      console.error('💡 SOLUTION: Transfer failed. This could be due to:');
      console.error('   - Insufficient funds in platform account');
      console.error('   - Connect account issues');
      console.error('   - Currency or amount restrictions');
    }

    process.exit(1);
  }
}

// Self-executing function with proper error handling
(async () => {
  try {
    await manualTransfer();
    process.exit(0);
  } catch (error) {
    console.error('🚨 Unexpected error:', error);
    process.exit(1);
  }
})();
