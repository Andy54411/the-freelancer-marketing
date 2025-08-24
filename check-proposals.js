const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'taskilo-5e921',
  });
}

const db = admin.firestore();

async function checkProjectData() {
  console.log('🔍 Checking project data...');
  const doc = await db.collection('project_requests').doc('iG3ZX09GQhVjiMAae2g8').get();
  if (doc.exists) {
    const data = doc.data();
    console.log('📋 Current project status:', data.status);
    console.log('📋 Proposals structure:', typeof data.proposals, Array.isArray(data.proposals));
    console.log('📋 Proposals data:', JSON.stringify(data.proposals, null, 2));

    if (data.proposals && typeof data.proposals === 'object' && !Array.isArray(data.proposals)) {
      console.log('📋 Proposals Object keys:', Object.keys(data.proposals));
      const firstKey = Object.keys(data.proposals)[0];
      if (firstKey) {
        console.log('📋 First proposal:', JSON.stringify(data.proposals[firstKey], null, 2));
      }
    }
  } else {
    console.log('❌ Project not found');
  }
}

checkProjectData().catch(console.error);
