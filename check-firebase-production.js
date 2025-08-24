const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK with production credentials
const serviceAccount = require('./firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'tilvo-f142f',
});

const db = getFirestore(app);

async function checkProjectInProduction() {
  const quoteId = 'iG3ZX09GQhVjiMAae2g8';

  try {
    console.log('🔍 Checking PRODUCTION Firebase for project:', quoteId);

    // Check project_requests collection
    const projectRef = db.collection('project_requests').doc(quoteId);
    const projectDoc = await projectRef.get();

    if (projectDoc.exists) {
      const data = projectDoc.data();
      console.log('✅ Found in project_requests:');
      console.log('- Title:', data.title);
      console.log('- Status:', data.status);
      console.log('- Customer UID:', data.customerUid);
      console.log('- Proposals count:', data.proposals?.length || 0);
      console.log('- Proposals type:', typeof data.proposals);
      console.log('- Proposals data:', data.proposals);

      if (data.proposals && Array.isArray(data.proposals)) {
        data.proposals.forEach((proposal, index) => {
          console.log(`  Proposal ${index + 1}:`);
          console.log(`  - Company UID: ${proposal.companyUid}`);
          console.log(`  - Status: ${proposal.status}`);
          console.log(`  - Price: ${proposal.price || proposal.totalAmount}`);
        });
      } else if (data.proposals) {
        console.log('⚠️ Proposals is not an array:', data.proposals);
      }
    } else {
      console.log('❌ NOT found in project_requests');

      // Check other collections
      console.log('🔍 Checking quotes collection...');
      const quoteRef = db.collection('quotes').doc(quoteId);
      const quoteDoc = await quoteRef.get();

      if (quoteDoc.exists) {
        console.log('✅ Found in quotes collection');
        console.log(quoteDoc.data());
      } else {
        console.log('❌ NOT found in quotes collection either');
      }
    }
  } catch (error) {
    console.error('❌ Error checking production Firebase:', error);
  }

  process.exit(0);
}

checkProjectInProduction();
