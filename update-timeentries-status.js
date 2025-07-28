#!/usr/bin/env node

/**
 * Direkter Firestore Update für TimeEntries
 * Aktualisiert alle TimeEntries von "platform_held" zu "transferred"
 */

require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase initialisieren
let app;
try {
  const serviceAccount = require('./firebase_functions/service-account.json');
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'tilvo-f142f',
  });
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = getFirestore(app);

async function updateTimeEntriesToTransferred() {
  try {
    console.log('🚀 Direkte Firestore-Aktualisierung: TimeEntries Status Update');
    console.log('📦 Order ID: 4bMTQQzVWsHyKhkbkRRu');
    console.log('📋 Payment Intent: pi_3RpXEuD5Lvjon30a1xbmBjsl');
    console.log('');

    // Versuche Order-Dokument zu laden
    console.log('🔍 Loading order document...');
    const orderDocRef = db.collection('orders').doc('4bMTQQzVWsHyKhkbkRRu');
    const orderSnapshot = await orderDocRef.get();

    if (!orderSnapshot.exists) {
      console.log('❌ Order document not found!');

      // Liste alle Orders auf
      console.log('📋 Searching all orders for Payment Intent...');
      const allOrdersSnapshot = await db.collection('orders').get();

      let foundOrder = null;
      allOrdersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.timeTracking && data.timeTracking.timeEntries) {
          const hasPaymentIntent = data.timeTracking.timeEntries.some(
            entry => entry.paymentIntentId === 'pi_3RpXEuD5Lvjon30a1xbmBjsl'
          );

          if (hasPaymentIntent) {
            foundOrder = { id: doc.id, data };
            console.log('✅ Found order with Payment Intent:', doc.id);
          }
        }
      });

      if (!foundOrder) {
        console.log('❌ No order found with Payment Intent pi_3RpXEuD5Lvjon30a1xbmBjsl');
        return;
      }

      // Verwende gefundene Order
      const { id: orderId, data: orderData } = foundOrder;
      const updateRef = db.collection('orders').doc(orderId);

      // Aktualisiere TimeEntries
      const timeEntries = orderData.timeTracking.timeEntries;
      let updatedCount = 0;

      const updatedTimeEntries = timeEntries.map(entry => {
        if (
          entry.billingStatus === 'platform_held' &&
          entry.paymentIntentId === 'pi_3RpXEuD5Lvjon30a1xbmBjsl'
        ) {
          updatedCount++;
          return {
            ...entry,
            billingStatus: 'transferred',
            transferredAt: new Date().toISOString(),
            transferNote: 'Test environment transfer simulation - Stripe balance pending',
            lastUpdated: new Date().toISOString(),
          };
        }
        return entry;
      });

      await updateRef.update({
        'timeTracking.timeEntries': updatedTimeEntries,
        lastUpdated: new Date().toISOString(),
        transferSimulationNote: 'TimeEntries updated to transferred status for test environment',
      });

      console.log('');
      console.log('🎉 ERFOLGREICH AKTUALISIERT!');
      console.log('══════════════════════════════════════════════════');
      console.log(`✅ ${updatedCount} TimeEntries von "platform_held" zu "transferred" geändert`);
      console.log(`✅ Order ID: ${orderId}`);
      console.log('✅ Payment Button wird nun ausgeblendet');
      console.log('══════════════════════════════════════════════════');
    } else {
      console.log('✅ Order document found!');
      const orderData = orderSnapshot.data();

      // Aktualisiere TimeEntries in gefundener Order
      const timeEntries = orderData.timeTracking.timeEntries;
      let updatedCount = 0;

      const updatedTimeEntries = timeEntries.map(entry => {
        if (
          entry.billingStatus === 'platform_held' &&
          entry.paymentIntentId === 'pi_3RpXEuD5Lvjon30a1xbmBjsl'
        ) {
          updatedCount++;
          return {
            ...entry,
            billingStatus: 'transferred',
            transferredAt: new Date().toISOString(),
            transferNote: 'Test environment transfer simulation - Stripe balance pending',
            lastUpdated: new Date().toISOString(),
          };
        }
        return entry;
      });

      await orderDocRef.update({
        'timeTracking.timeEntries': updatedTimeEntries,
        lastUpdated: new Date().toISOString(),
        transferSimulationNote: 'TimeEntries updated to transferred status for test environment',
      });

      console.log('');
      console.log('🎉 ERFOLGREICH AKTUALISIERT!');
      console.log('══════════════════════════════════════════════════');
      console.log(`✅ ${updatedCount} TimeEntries von "platform_held" zu "transferred" geändert`);
      console.log('✅ Payment Button wird nun ausgeblendet');
      console.log('══════════════════════════════════════════════════');
    }
  } catch (error) {
    console.error('❌ ERROR during TimeEntry update:');
    console.error('══════════════════════════════════════════════════');
    console.error('🔸 Error Message:', error.message);
    console.error('🔸 Full Error:', error);
    console.error('══════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Skript ausführen
updateTimeEntriesToTransferred();
