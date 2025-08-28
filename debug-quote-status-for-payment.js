const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Initialize Firebase
const serviceAccount = JSON.parse(fs.readFileSync('./firebase_functions/service-account.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'taskilo-backend'
});

const db = getFirestore(app);

async function checkQuoteStatusForPayment() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    
    console.log(`🔍 Checking quote status for payment: ${quoteId}`);
    
    // Check main quote document
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();
    
    if (!quoteDoc.exists) {
      console.log('❌ Quote not found');
      return;
    }
    
    const quoteData = quoteDoc.data();
    console.log('\n📄 QUOTE DATA:');
    console.log('Status:', quoteData.status);
    console.log('Type:', quoteData.type);
    console.log('Project Title:', quoteData.projectTitle);
    console.log('Customer ID:', quoteData.customerId);
    console.log('Provider ID:', quoteData.providerId || quoteData.providerUid);
    
    // Check proposals subcollection
    const proposalsSnapshot = await db
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .get();
      
    console.log('\n📋 PROPOSALS:');
    console.log('Count:', proposalsSnapshot.size);
    
    if (!proposalsSnapshot.empty) {
      proposalsSnapshot.forEach((doc, index) => {
        const proposal = doc.data();
        console.log(`\nProposal ${index + 1} (${doc.id}):`);
        console.log('  Status:', proposal.status);
        console.log('  Amount:', proposal.totalAmount);
        console.log('  Submitted At:', proposal.submittedAt);
        console.log('  Provider ID:', proposal.providerId);
      });
    }
    
    console.log('\n✅ Status check complete');
    
  } catch (error) {
    console.error('❌ Error checking quote status:', error);
  }
}

checkQuoteStatusForPayment();
