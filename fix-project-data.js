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

async function fixProjectData() {
  try {
    const projectId = 'iG3ZX09GQhVjiMAae2g8';
    const projectRef = db.collection('project_requests').doc(projectId);

    // Restore the missing proposal
    const proposalData = {
      companyUid: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1',
      companyName: 'Mietkoch Andy',
      companyEmail: 'info@the-freelancer-marketing.com',
      status: 'pending',
      price: 400,
      currency: 'eur',
      totalAmount: 400,
      description:
        'Professionelles Catering für Ihre Familienfeier. Ich biete Ihnen ein komplettes Menü mit frischen, regionalen Zutaten.',
      deliveryTime: '2-3 Tage',
      submittedAt: new Date(),
      proposalId: 'proposal_' + Date.now(),
    };

    // Update the project with the restored proposal and correct status
    await projectRef.update({
      proposals: [proposalData],
      status: 'responded', // Change back from payment_pending to responded
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ Project data restored successfully!');
    console.log('- Added proposal from:', proposalData.companyName);
    console.log('- Changed status from payment_pending to responded');
  } catch (error) {
    console.error('❌ Error fixing project data:', error);
  } finally {
    process.exit(0);
  }
}

fixProjectData();
