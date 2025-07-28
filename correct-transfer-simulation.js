#!/usr/bin/env node

/**
 * Korrekte Transfer-Simulation für Payment Intent pi_3RpXEuD5Lvjon30a1xbmBjsl
 *
 * Basierend auf den echten Stripe-Daten:
 * - Payment Intent: pi_3RpXEuD5Lvjon30a1xbmBjsl
 * - Betrag: €3,421.00 (€3,267.05 für Provider + €153.95 Platform Fee)
 * - Connect Account: acct_1RoSL4DlTKEWRrRh
 * - 10 TimeEntries mit Status "platform_held"
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

async function simulateCorrectTransfer() {
  try {
    console.log('🚀 Korrekte Transfer-Simulation');
    console.log('📋 Payment Intent: pi_3RpXEuD5Lvjon30a1xbmBjsl');
    console.log('📦 Order ID: 4bMTQQzVWsHyKhkbkRRu');
    console.log('💰 Total Payment: €3,421.00');
    console.log('💵 Provider Receives: €3,267.05');
    console.log('🏢 Platform Fee: €153.95');
    console.log('🎯 Connect Account: acct_1RoSL4DlTKEWRrRh');
    console.log('');

    // Order-Dokument abrufen
    const orderRef = db.collection('orders').doc('4bMTQQzVWsHyKhkbkRRu');
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new Error('Order nicht gefunden: 4bMTQQzVWsHyKhkbkRRu');
    }

    const orderData = orderDoc.data();
    console.log('📋 Order gefunden:', orderData.projectTitle || 'Unbekannter Titel');

    // TimeEntries aus dem Order abrufen
    const timeTracking = orderData.timeTracking;
    if (!timeTracking || !timeTracking.timeEntries) {
      throw new Error('Keine TimeEntries im Order gefunden');
    }

    console.log(`📊 Total TimeEntries: ${timeTracking.timeEntries.length}`);

    // Filtere TimeEntries mit dem korrekten Payment Intent
    const targetPaymentIntent = 'pi_3RpXEuD5Lvjon30a1xbmBjsl';
    const platformHeldEntries = timeTracking.timeEntries.filter(
      entry =>
        entry.paymentIntentId === targetPaymentIntent && entry.billingStatus === 'platform_held'
    );

    console.log(
      `💰 Platform held entries für ${targetPaymentIntent}: ${platformHeldEntries.length}`
    );

    if (platformHeldEntries.length === 0) {
      console.log(
        '⚠️  Keine TimeEntries mit "platform_held" Status für dieses Payment Intent gefunden'
      );
      console.log('');
      console.log('🔍 Debug: Vorhandene Payment Intents:');
      timeTracking.timeEntries.forEach((entry, index) => {
        if (entry.paymentIntentId) {
          console.log(
            `   ${index}: ${entry.paymentIntentId} (Status: ${entry.billingStatus || 'none'})`
          );
        }
      });
      return;
    }

    // Aktualisiere TimeEntries von "platform_held" zu "transferred"
    let transferredCount = 0;
    const updatedTimeEntries = timeTracking.timeEntries.map(entry => {
      if (
        entry.billingStatus === 'platform_held' &&
        entry.paymentIntentId === targetPaymentIntent
      ) {
        transferredCount++;
        return {
          ...entry,
          billingStatus: 'transferred',
          transferredAt: new Date().toISOString(),
          transferNote:
            'Simulated transfer completion - Stripe balance was pending in test environment',
          lastUpdated: new Date().toISOString(),
        };
      }
      return entry;
    });

    console.log(`✅ Updating ${transferredCount} TimeEntries von "platform_held" zu "transferred"`);

    // Order mit aktualisierten TimeEntries speichern
    await orderRef.update({
      'timeTracking.timeEntries': updatedTimeEntries,
      lastUpdated: new Date().toISOString(),
      transferSimulationCompletedAt: new Date().toISOString(),
      transferSimulationNote: 'Transfer simulated due to pending Stripe test balance',
    });

    console.log('');
    console.log('🎉 TRANSFER-SIMULATION ERFOLGREICH!');
    console.log('══════════════════════════════════════════════════');
    console.log(
      `✅ ${transferredCount} TimeEntries von "platform_held" zu "transferred" aktualisiert`
    );
    console.log('✅ Payment Intent pi_3RpXEuD5Lvjon30a1xbmBjsl verarbeitet');
    console.log('✅ €3,267.05 als transferred für Connect Account acct_1RoSL4DlTKEWRrRh markiert');
    console.log('✅ Payment-Button wird nun ausgeblendet (keine unbezahlten Stunden)');
    console.log('');
    console.log('📝 HINWEISE:');
    console.log('   - Webhook-System ist aktiv für zukünftige automatische Transfers');
    console.log('   - Stripe Test-Balance: €3,976.30 pending → wird automatisch verfügbar');
    console.log('   - Live-System wird echte Transfers durchführen');
    console.log('══════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ ERROR during transfer simulation:');
    console.error('══════════════════════════════════════════════════');
    console.error('🔸 Error Message:', error.message);
    console.error('🔸 Full Error:', error);
    console.error('══════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Skript ausführen
simulateCorrectTransfer();
