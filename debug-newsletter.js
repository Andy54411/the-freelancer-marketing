// Debug-Skript für Newsletter Subscribers
const admin = require('firebase-admin');

// Firebase Admin initialisieren wenn noch nicht initialisiert
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID || 'tilvo-f142f',
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    }),
    databaseURL: 'https://tilvo-f142f-default-rtdb.firebaseio.com',
  });
}

async function checkNewsletterData() {
  try {
    console.log('🔍 Prüfe Newsletter-Daten in Firestore...');

    // Newsletter Subscribers
    const subscribersSnapshot = await admin.firestore().collection('newsletterSubscribers').get();
    console.log(`📧 Newsletter Subscribers: ${subscribersSnapshot.size} Dokumente`);

    subscribersSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nSubscriber ${index + 1}:`);
      console.log('  ID:', doc.id);
      console.log('  Email:', data.email);
      console.log('  Name:', data.name || 'Kein Name');
      console.log('  Subscribed:', data.subscribed);
      console.log('  Source:', data.source || 'unbekannt');
      console.log('  SubscribedAt:', data.subscribedAt?.toDate?.() || data.subscribedAt);
    });

    // Newsletter Pending Confirmations
    const pendingSnapshot = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .get();
    console.log(`\n⏳ Pending Confirmations: ${pendingSnapshot.size} Dokumente`);

    pendingSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\nPending ${index + 1}:`);
      console.log('  ID:', doc.id);
      console.log('  Email:', data.email);
      console.log('  Confirmed:', data.confirmed);
      console.log('  CreatedAt:', data.createdAt?.toDate?.() || data.createdAt);
      console.log('  ExpiresAt:', data.expiresAt?.toDate?.() || data.expiresAt);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler beim Prüfen der Newsletter-Daten:', error);
    process.exit(1);
  }
}

checkNewsletterData();
