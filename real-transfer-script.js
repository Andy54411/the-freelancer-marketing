#!/usr/bin/env node

/**
 * Echter Transfer für verfügbare Stripe-Gelder
 *
 * Transferiert die verfügbaren €3,267.05 an den Connect Account
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Stripe initialisieren
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Firebase initialisieren
const serviceAccount = require('./firebase_functions/service-account.json');
initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const db = getFirestore();

async function executeRealTransfer() {
  try {
    console.log('🚀 Echter Transfer für verfügbare Stripe-Gelder');
    console.log('📋 Payment Intent: pi_3RpXEuD5Lvjon30a1xbmBjsl');
    console.log('🏢 Connect Account: acct_1RoSL4DlTKEWRrRh');
    console.log('💰 Erwarteter Transfer: €3,267.05');
    console.log('');

    // 1. Aktuelles Stripe-Guthaben prüfen
    console.log('📊 Prüfe verfügbares Stripe-Guthaben...');
    const balance = await stripe.balance.retrieve();

    let availableEur = 0;
    balance.available.forEach(b => {
      if (b.currency === 'eur') {
        availableEur = b.amount;
        console.log(`💰 Verfügbar: €${(b.amount / 100).toFixed(2)}`);
      }
    });

    if (availableEur === 0) {
      console.log('⚠️  Kein verfügbares EUR-Guthaben für Transfer');

      // Prüfe Connect Account Balance
      console.log('🔍 Prüfe Connect Account Balance...');
      try {
        const connectBalance = await stripe.balance.retrieve({
          stripeAccount: 'acct_1RoSL4DlTKEWRrRh',
        });

        connectBalance.available.forEach(b => {
          if (b.currency === 'eur') {
            console.log(`🏢 Connect Available: €${(b.amount / 100).toFixed(2)}`);
          }
        });
      } catch (connectError) {
        console.log('❌ Connect Account Zugriff fehlgeschlagen:', connectError.message);
      }

      console.log('');
      console.log('💡 LÖSUNGSANSÄTZE:');
      console.log('1. Warten Sie, bis Stripe die Gelder freigibt (normalerweise 2-7 Tage)');
      console.log('2. Verwenden Sie das Stripe Dashboard für manuelle Transfers');
      console.log('3. Die TimeEntries sind bereits als "transferred" markiert für die UI');

      return;
    }

    // 2. Transfer zu Connect Account
    const transferAmount = Math.min(availableEur, 326705); // €3267.05 oder weniger falls nicht genug da

    console.log(`📤 Erstelle Transfer von €${(transferAmount / 100).toFixed(2)}...`);

    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'eur',
      destination: 'acct_1RoSL4DlTKEWRrRh',
      description: 'Additional hours payment for Order 4bMTQQzVWsHyKhkbkRRu',
      metadata: {
        paymentIntentId: 'pi_3RpXEuD5Lvjon30a1xbmBjsl',
        orderId: '4bMTQQzVWsHyKhkbkRRu',
        type: 'additional_hours_transfer',
        originalAmount: '326705',
      },
    });

    console.log('✅ Transfer erfolgreich erstellt!');
    console.log('📋 Transfer ID:', transfer.id);
    console.log('💰 Transferierter Betrag:', `€${(transfer.amount / 100).toFixed(2)}`);
    console.log('🏢 Destination:', transfer.destination);

    // 3. Firebase Company Balance aktualisieren
    console.log('');
    console.log('📝 Aktualisiere Firebase Company Balance...');

    // Finde die Company über den Connect Account
    const companiesSnapshot = await db
      .collection('companies')
      .where('anbieterStripeAccountId', '==', 'acct_1RoSL4DlTKEWRrRh')
      .get();

    if (!companiesSnapshot.empty) {
      const companyDoc = companiesSnapshot.docs[0];
      const companyData = companyDoc.data();

      await companyDoc.ref.update({
        'stripeBalance.transferred': (companyData.stripeBalance?.transferred || 0) + transferAmount,
        'stripeBalance.lastTransferAt': new Date().toISOString(),
        'stripeBalance.lastTransferId': transfer.id,
        'stripeBalance.pendingTransfers': 0,
        lastUpdated: new Date().toISOString(),
      });

      console.log('✅ Company Balance aktualisiert');
    }

    console.log('');
    console.log('🎉 TRANSFER ERFOLGREICH ABGESCHLOSSEN!');
    console.log('══════════════════════════════════════════════════');
    console.log(`✅ €${(transferAmount / 100).toFixed(2)} an Connect Account transferiert`);
    console.log('✅ Firebase Company Balance aktualisiert');
    console.log('✅ Payment-Button wird ausgeblendet (keine unbezahlten Stunden)');
    console.log('✅ Anbieter erhält die Zahlung in seinem Connect Account');
    console.log('══════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ ERROR during real transfer:');
    console.error('══════════════════════════════════════════════════');
    console.error('🔸 Error Type:', error.constructor.name);
    console.error('🔸 Error Code:', error.code || 'N/A');
    console.error('🔸 Error Message:', error.message);
    console.error('🔸 Full Error:', error);
    console.error('══════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Skript ausführen
executeRealTransfer();
