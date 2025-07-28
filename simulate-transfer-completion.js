#!/usr/bin/env node

/**
 * Simulate Transfer Completion für Test-Umgebung
 *
 * Da die €3,976.30 in Stripe "pending" sind (typisch für Test-Accounts),
 * simulieren wir den erfolgreichen Transfer durch Aktualisierung der TimeEntries
 * von "platform_held" zu "transferred" Status.
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

async function simulateTransferCompletion() {
  try {
    console.log('🚀 Simulation: Transfer Completion für Test-Umgebung');
    console.log('📋 Payment Intent: pi_3RpXEuD5Lvjon30a1xbmBjsl');
    console.log('📦 Order ID: 4bMTQQzVWsHyKhkbkRRu');
    console.log('💰 Transfer Amount: €3267.05');
    console.log('');

    // Order-Dokument abrufen (aus der "auftraege" Collection)
    const orderRef = db.collection('auftraege').doc('4bMTQQzVWsHyKhkbkRRu');
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new Error('Order nicht gefunden: 4bMTQQzVWsHyKhkbkRRu');
    }

    const orderData = orderDoc.data();
    console.log('📋 Order gefunden:', orderData.projectTitle);

    // TimeEntries aus dem Order abrufen
    const timeTracking = orderData.timeTracking;
    if (!timeTracking || !timeTracking.timeEntries) {
      throw new Error('Keine TimeEntries im Order gefunden');
    }

    console.log(`📊 Gefunden: ${timeTracking.timeEntries.length} TimeEntries`);

    // Debug: Analysiere alle TimeEntries
    console.log('\n🔍 DEBUG: TimeEntry Analyse:');
    timeTracking.timeEntries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}:`);
      console.log(`  ID: ${entry.id}`);
      console.log(`  Status: ${entry.billingStatus || entry.status}`);
      console.log(`  Payment Intent: ${entry.paymentIntentId || 'none'}`);
      console.log(`  Category: ${entry.category}`);
    });
    console.log('');

    // Zähle TimeEntries mit "platform_held" Status
    let transferredCount = 0;
    const updatedTimeEntries = timeTracking.timeEntries.map(entry => {
      if (
        (entry.billingStatus === 'platform_held' || entry.status === 'platform_held') &&
        entry.paymentIntentId === 'pi_3RpXEuD5Lvjon30a1xbmBjsl'
      ) {
        transferredCount++;
        return {
          ...entry,
          billingStatus: 'transferred',
          status: 'transferred',
          transferredAt: new Date().toISOString(),
          transferNote:
            'Simulated transfer completion for test environment (pending Stripe balance)',
          lastUpdated: new Date().toISOString(),
        };
      }
      return entry;
    });

    if (transferredCount === 0) {
      console.log(
        '⚠️  Keine TimeEntries mit "platform_held" Status für dieses Payment Intent gefunden'
      );
      return;
    }

    console.log(`✅ Updating ${transferredCount} TimeEntries von "platform_held" zu "transferred"`);

    // Order mit aktualisierten TimeEntries speichern
    await orderRef.update({
      'timeTracking.timeEntries': updatedTimeEntries,
      lastUpdated: new Date().toISOString(),
      transferSimulationCompletedAt: new Date().toISOString(),
    });

    console.log('');
    console.log('🎉 SIMULATION ERFOLGREICH ABGESCHLOSSEN!');
    console.log('══════════════════════════════════════════════════');
    console.log(
      `✅ ${transferredCount} TimeEntries von "platform_held" zu "transferred" aktualisiert`
    );
    console.log('✅ Payment-Button wird nun ausgeblendet (keine unbezahlten Stunden)');
    console.log('');
    console.log('📝 HINWEIS:');
    console.log('   - In der Test-Umgebung sind €3976.30 in Stripe "pending"');
    console.log(
      '   - Der tatsächliche Transfer erfolgt automatisch wenn Stripe die Gelder freigibt'
    );
    console.log('   - Die Webhook-Integration ist bereits aktiv für zukünftige Payments');
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
simulateTransferCompletion();
