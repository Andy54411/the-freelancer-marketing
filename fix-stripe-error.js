const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase_functions/service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'tilvo-f142f',
});

const db = admin.firestore();

async function fixStripeError() {
  const userId = 'Nw1pGl2D5Da7OD8uLwx6ADp9JuC3';

  try {
    console.log(`🔧 Fixing Stripe Error für User: ${userId}`);

    // Lese aktuellen User
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ User nicht gefunden!');
      return;
    }

    const userData = userDoc.data();
    console.log('📋 Aktueller Status:');
    console.log('- stripeAccountId:', userData.stripeAccountId);
    console.log('- stripeAccountError:', userData.stripeAccountError);

    // Lösche den Stripe Error und stabilisiere die Account ID
    const updateData = {
      stripeAccountError: admin.firestore.FieldValue.delete(),
      // Stabilisiere die stripeAccountId - setze sie fest auf den existierenden Wert
      stripeAccountId: userData.stripeAccountId || 'acct_1S01SkD77u5aF6C6',
      // Setze ein Flag dass dies manuell gefixt wurde
      manuallyFixed: new Date().toISOString(),
      profileLastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userId).update(updateData);

    console.log('✅ Stripe Error gefixt!');
    console.log('✅ stripeAccountId stabilisiert');
    console.log('✅ Update erfolgreich!');
  } catch (error) {
    console.error('❌ Fehler beim Fixen:', error);
  } finally {
    process.exit(0);
  }
}

fixStripeError();
