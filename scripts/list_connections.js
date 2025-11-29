
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : require(path.join(process.cwd(), 'firebase-config.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function listConnections() {
  console.log('Listing companies with Google Ads connections...');
  try {
    const companies = await db.collection('companies').get();
    let found = 0;
    
    for (const doc of companies.docs) {
      const connectionDoc = await doc.ref.collection('advertising_connections').doc('google-ads').get();
      if (connectionDoc.exists) {
        const data = connectionDoc.data();
        console.log(`✅ Company ${doc.id}: Connected (Customer ID: ${data.customer_id})`);
        found++;
      }
    }
    
    if (found === 0) {
      console.log('❌ No companies with Google Ads connections found.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

listConnections();
