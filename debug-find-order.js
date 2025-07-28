#!/usr/bin/env node

/**
 * Debug-Skript: Suche nach Order mit Payment Intent pi_3RpXEuD5Lvjon30a1xbmBjsl
 */

require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase initialisieren
const serviceAccount = require('./firebase_functions/service-account.json');
initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const db = getFirestore();

async function debugFindOrder() {
  try {
    console.log('🔍 Searching for Payment Intent: pi_3RpXEuD5Lvjon30a1xbmBjsl');
    console.log('');

    const ordersSnapshot = await db.collection('orders').get();
    console.log(`📊 Total orders in database: ${ordersSnapshot.size}`);
    console.log('');

    let found = false;
    let orderCount = 0;

    for (const doc of ordersSnapshot.docs) {
      orderCount++;
      const data = doc.data();
      const timeTracking = data.timeTracking;

      // Zeige Info über jeden Order
      console.log(`Order ${orderCount}: ${doc.id}`);
      console.log(`  - Title: ${data.projectTitle || 'No title'}`);
      console.log(`  - Status: ${data.status || 'No status'}`);
      console.log(`  - Customer: ${data.customerEmail || 'No email'}`);

      if (timeTracking && timeTracking.timeEntries) {
        console.log(`  - TimeEntries: ${timeTracking.timeEntries.length}`);

        // Suche nach dem spezifischen Payment Intent
        const hasTargetPaymentIntent = timeTracking.timeEntries.some(
          entry => entry.paymentIntentId === 'pi_3RpXEuD5Lvjon30a1xbmBjsl'
        );

        if (hasTargetPaymentIntent) {
          console.log('  🎯 FOUND TARGET PAYMENT INTENT!');
          found = true;

          const platformHeldEntries = timeTracking.timeEntries.filter(
            entry =>
              entry.paymentIntentId === 'pi_3RpXEuD5Lvjon30a1xbmBjsl' &&
              entry.billingStatus === 'platform_held'
          );

          console.log(`  💰 Platform held entries: ${platformHeldEntries.length}`);

          // Zeige alle Payment Intents in diesem Order
          const paymentIntents = [
            ...new Set(
              timeTracking.timeEntries.filter(e => e.paymentIntentId).map(e => e.paymentIntentId)
            ),
          ];

          console.log(`  💳 All Payment Intents in this order:`);
          paymentIntents.forEach(pi => console.log(`    - ${pi}`));

          break;
        } else {
          // Zeige vorhandene Payment Intents
          const paymentIntents = [
            ...new Set(
              timeTracking.timeEntries.filter(e => e.paymentIntentId).map(e => e.paymentIntentId)
            ),
          ];

          if (paymentIntents.length > 0) {
            console.log(`  💳 Payment Intents: ${paymentIntents.join(', ')}`);
          }
        }
      } else {
        console.log('  - TimeEntries: None');
      }

      console.log('');

      // Limit output to first 10 orders
      if (orderCount >= 10 && !found) {
        console.log('... (limiting output to first 10 orders)');
        break;
      }
    }

    if (!found) {
      console.log('❌ Payment Intent pi_3RpXEuD5Lvjon30a1xbmBjsl not found in any order');
      console.log('');
      console.log('💡 This could mean:');
      console.log('   1. The Order ID in Firestore is different from what we expected');
      console.log('   2. The TimeEntries are stored in a different structure');
      console.log('   3. The Payment Intent ID might be slightly different');
    } else {
      console.log('✅ Payment Intent found! See details above.');
    }
  } catch (error) {
    console.error('❌ Error during search:', error.message);
    console.error(error);
  }
}

debugFindOrder();
