const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

async function listAllCompanies() {
  console.log('🔍 Listing all companies and their Stripe Account IDs...\n');

  try {
    const companiesRef = db.collection('companies');
    const snapshot = await companiesRef.get();

    if (snapshot.empty) {
      console.log('❌ No companies found in database');
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Company ID: ${doc.id}`);
      console.log(`  Name: ${data.companyName || 'N/A'}`);
      console.log(`  Stripe Account ID: ${data.stripeAccountId || 'N/A'}`);
      console.log(`  Platform Hold Balance: €${(data.platformHoldBalance || 0) / 100}`);
      console.log(`  Last Updated: ${data.lastUpdated?.toDate()?.toISOString() || 'N/A'}\n`);
    });
  } catch (error) {
    console.error('❌ Error listing companies:', error);
  } finally {
    process.exit(0);
  }
}

listAllCompanies();
