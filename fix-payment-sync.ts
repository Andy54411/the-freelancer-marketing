/**
 * 🚨 SOFORTIGE REPARATUR FÜR AUFTRAG 4bMTQQzVWsHyKhkbkRRu
 *
 * PROBLEM: Stripe Payment succeeded, aber Firestore nicht aktualisiert
 * LÖSUNG: Manueller Update + Stripe Transfer
 */

import { db, admin } from '@/firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function fixPaymentSync() {
  const orderId = '4bMTQQzVWsHyKhkbkRRu';
  const entryId = '17536740766723z750hunp';
  const paymentIntentId = 'pi_3RpkMnD5Lvjon30a1QG9VffP';
  const companyReceives = 31324; // €313.24
  const providerStripeAccountId = 'acct_1RoSL4DlTKEWRrRh';

  console.log('🔧 Starting manual payment sync...');

  try {
    // 1. Update Firestore TimeEntry
    const orderRef = db.collection('auftraege').doc(orderId);

    await db.runTransaction(async transaction => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error(`Order ${orderId} not found`);
      }

      const orderData = orderDoc.data()!;
      const timeTracking = orderData.timeTracking;

      if (!timeTracking?.timeEntries) {
        throw new Error('No timeEntries found');
      }

      // Update the specific timeEntry
      const updatedTimeEntries = timeTracking.timeEntries.map((entry: any) => {
        if (entry.id === entryId) {
          console.log(`✅ Updating TimeEntry ${entryId} to transferred`);
          return {
            ...entry,
            status: 'transferred',
            billingStatus: 'transferred',
            paidAt: new Date('2025-07-28T04:17:05.000Z'),
            paymentIntentId: paymentIntentId,
            transferredAt: new Date('2025-07-28T04:17:05.000Z'),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          };
        }
        return entry;
      });

      // Update billingData
      const updatedBillingData = {
        ...timeTracking.billingData,
        status: 'completed',
        completedAt: new Date('2025-07-28T04:17:05.000Z'),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Apply updates
      transaction.update(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.billingData': updatedBillingData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Firestore updated successfully');
    });

    // 2. Create Stripe Transfer to Connected Account
    console.log(`💰 Creating transfer: ${companyReceives} cents → ${providerStripeAccountId}`);

    const transfer = await stripe.transfers.create({
      amount: companyReceives,
      currency: 'eur',
      destination: providerStripeAccountId,
      description: `Zusätzliche Arbeitsstunden für Auftrag ${orderId} (Manual Fix)`,
      metadata: {
        type: 'additional_hours_manual_fix',
        orderId: orderId,
        paymentIntentId: paymentIntentId,
        entryId: entryId,
        fixedAt: new Date().toISOString(),
      },
    });

    console.log(`✅ Transfer created: ${transfer.id}`);
    console.log(`💸 Amount transferred: €${(companyReceives / 100).toFixed(2)}`);

    // 3. Update company balance (if needed)
    const companyQuery = db
      .collection('companies')
      .where('anbieterStripeAccountId', '==', providerStripeAccountId)
      .limit(1);

    const companySnapshot = await companyQuery.get();

    if (!companySnapshot.empty) {
      const companyDoc = companySnapshot.docs[0];
      await companyDoc.ref.update({
        lastTransferId: transfer.id,
        lastTransferAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ Company record updated');
    }

    return {
      success: true,
      message: `Payment sync completed for order ${orderId}`,
      transfer: {
        id: transfer.id,
        amount: companyReceives,
        destination: providerStripeAccountId,
      },
    };
  } catch (error) {
    console.error('❌ Payment sync failed:', error);
    throw error;
  }
}

// Execute the fix
fixPaymentSync()
  .then(result => {
    console.log('🎉 PAYMENT SYNC SUCCESSFUL:', result);
  })
  .catch(error => {
    console.error('💥 PAYMENT SYNC FAILED:', error);
  });
