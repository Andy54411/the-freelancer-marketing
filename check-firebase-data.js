const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'firebase_functions', 'service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tilvo-f142f-default-rtdb.firebaseio.com',
});

const db = admin.firestore();

async function checkProjectData() {
  try {
    console.log('🔍 Checking project_requests collection...');

    // Check if the specific project exists
    const projectId = 'iG3ZX09GQhVjiMAae2g8';
    const projectRef = db.collection('project_requests').doc(projectId);
    const projectDoc = await projectRef.get();

    if (projectDoc.exists) {
      const data = projectDoc.data();
      console.log('✅ Project found in project_requests:');
      console.log('- ID:', projectDoc.id);
      console.log('- Title:', data.title);
      console.log('- Status:', data.status);
      console.log('- Customer UID:', data.customerUid);
      console.log('- Proposals count:', data.proposals?.length || 0);

      if (data.proposals && data.proposals.length > 0) {
        console.log('\n📋 Proposals:');
        data.proposals.forEach((proposal, index) => {
          console.log(`  ${index + 1}. Company: ${proposal.companyUid}`);
          console.log(`     Status: ${proposal.status}`);
          console.log(`     Price: ${proposal.price} ${proposal.currency || 'EUR'}`);
          console.log(`     Description: ${proposal.description?.substring(0, 50)}...`);
          console.log('');
        });
      }
    } else {
      console.log('❌ Project NOT found in project_requests');

      // Check if it might be in quotes collection
      console.log('🔍 Checking quotes collection...');
      const quoteRef = db.collection('quotes').doc(projectId);
      const quoteDoc = await quoteRef.get();

      if (quoteDoc.exists) {
        console.log('✅ Found in quotes collection instead!');
        const data = quoteDoc.data();
        console.log('- ID:', quoteDoc.id);
        console.log('- Data:', JSON.stringify(data, null, 2));
      } else {
        console.log('❌ Also NOT found in quotes collection');

        // List all documents in project_requests to see what's there
        console.log('🔍 Listing all project_requests documents...');
        const snapshot = await db.collection('project_requests').limit(10).get();
        console.log(`Found ${snapshot.size} documents in project_requests:`);
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`- ${doc.id}: ${data.title || 'No title'} (${data.status || 'No status'})`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking Firebase:', error);
  } finally {
    process.exit(0);
  }
}

checkProjectData();
