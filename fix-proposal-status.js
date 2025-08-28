const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to get service account from environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://taskilo-79981-default-rtdb.europe-west1.firebasedatabase.app'
      });
    } else {
      // Fallback to default credentials
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function fixProposalStatus() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    const proposalId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
    
    console.log('🔧 Fixing proposal status...');
    
    // Update proposal status to accepted in subcollection
    await db.collection('project_requests')
      .doc(quoteId)
      .collection('proposals')
      .doc(proposalId)
      .update({
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        paymentIntentId: 'pi_3RznbED5Lvjon30a0FVoQVCA',
        updatedAt: new Date().toISOString()
      });
    
    console.log('✅ Proposal status updated to accepted');
    
    // Also update the main project_requests document to ensure consistency
    await db.collection('project_requests').doc(quoteId).update({
      status: 'accepted', // Change from contacts_exchanged to accepted
      acceptedProposal: proposalId,
      acceptedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      paymentIntentId: 'pi_3RznbED5Lvjon30a0FVoQVCA',
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Main quote status updated to accepted');
    
    // Verify the fix
    const proposalDoc = await db.collection('project_requests')
      .doc(quoteId)
      .collection('proposals')
      .doc(proposalId)
      .get();
      
    const quoteDoc = await db.collection('project_requests').doc(quoteId).get();
      
    const proposalData = proposalDoc.data();
    const quoteData = quoteDoc.data();
    
    console.log('📝 Updated Proposal Status:', proposalData?.status);
    console.log('📝 Updated Quote Status:', quoteData?.status);
    console.log('💰 Paid At:', proposalData?.paidAt);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

fixProposalStatus();
