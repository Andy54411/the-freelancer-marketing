// Script zur Überprüfung von Stripe-Konten in Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkStripeAccounts() {
  try {
    console.log('🔍 Suche nach Benutzern mit Stripe-Konten...');

    const usersSnapshot = await db.collection('users').get();
    let totalUsers = 0;
    let usersWithStripeAccounts = 0;
    let stripeAccountDetails = [];

    usersSnapshot.forEach(doc => {
      totalUsers++;
      const userData = doc.data();

      if (userData.stripeAccountId) {
        usersWithStripeAccounts++;
        stripeAccountDetails.push({
          userId: doc.id,
          email: userData.email || userData.step1?.email || 'Keine E-Mail',
          stripeAccountId: userData.stripeAccountId,
          accountCreationDate: userData.stripeAccountCreationDate?.toDate?.() || 'Unbekannt',
          detailsSubmitted: userData.stripeAccountDetailsSubmitted || false,
          payoutsEnabled: userData.stripeAccountPayoutsEnabled || false,
          chargesEnabled: userData.stripeAccountChargesEnabled || false,
        });
      }
    });

    console.log(`\n📊 ERGEBNISSE:`);
    console.log(`   Gesamte Benutzer: ${totalUsers}`);
    console.log(`   Benutzer mit Stripe-Konten: ${usersWithStripeAccounts}`);

    if (usersWithStripeAccounts > 0) {
      console.log(`\n✅ GEFUNDENE STRIPE-KONTEN:`);
      stripeAccountDetails.forEach((account, index) => {
        console.log(`\n   ${index + 1}. Konto:`);
        console.log(`      Benutzer-ID: ${account.userId}`);
        console.log(`      E-Mail: ${account.email}`);
        console.log(`      Stripe Account ID: ${account.stripeAccountId}`);
        console.log(`      Erstellt am: ${account.accountCreationDate}`);
        console.log(`      Details eingereicht: ${account.detailsSubmitted ? '✅' : '❌'}`);
        console.log(`      Auszahlungen aktiviert: ${account.payoutsEnabled ? '✅' : '❌'}`);
        console.log(`      Zahlungen aktiviert: ${account.chargesEnabled ? '✅' : '❌'}`);
      });
    } else {
      console.log(`\n❌ KEINE STRIPE-KONTEN GEFUNDEN`);
    }
  } catch (error) {
    console.error('❌ Fehler beim Prüfen der Stripe-Konten:', error);
  }
}

checkStripeAccounts();
