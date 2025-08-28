const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Setup
const serviceAccount = require('./firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function checkCurrentQuoteStatus() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    
    console.log(`🔍 Current status check for quote ${quoteId}...`);
    
    // Check Quote current status
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();
    
    if (!quoteDoc.exists) {
      console.error('❌ Quote not found!');
      return;
    }
    
    const quoteData = quoteDoc.data();
    console.log('📄 Current Quote Data:', {
      id: quoteDoc.id,
      status: quoteData.status,
      customerEmail: quoteData.customerEmail,
      customerUid: quoteData.customerUid,
      projectTitle: quoteData.projectTitle,
      payment: quoteData.payment,
      contactExchange: quoteData.contactExchange,
      createdAt: quoteData.createdAt,
      updatedAt: quoteData.updatedAt,
    });
    
    // Check proposals again
    const proposalsSnapshot = await db
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .get();
    
    console.log(`📋 Current proposals count: ${proposalsSnapshot.size}`);
    
    if (!proposalsSnapshot.empty) {
      console.log('⚠️ WARNING: Found proposals after reset!');
      proposalsSnapshot.docs.forEach((doc, index) => {
        const proposalData = doc.data();
        console.log(`📝 Proposal ${index + 1}:`, {
          id: doc.id,
          status: proposalData.status,
          providerId: proposalData.providerId,
          totalAmount: proposalData.totalAmount,
          submittedAt: proposalData.submittedAt,
        });
      });
    }
    
    // If status is not "open", reset it again
    if (quoteData.status !== 'open') {
      console.log(`🔄 Status is "${quoteData.status}" instead of "open" - resetting again...`);
      
      await quoteRef.update({
        status: 'open',
        'contactExchange.readyForExchange': false,
      });
      
      console.log('✅ Status reset to "open" again');
      
      // Verify the change
      const updatedDoc = await quoteRef.get();
      const updatedData = updatedDoc.data();
      console.log('📄 After reset - Status:', updatedData.status);
    } else {
      console.log('✅ Status is correctly "open"');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error);
  }
}

checkCurrentQuoteStatus().then(() => {
  console.log('🏁 Status check completed');
  process.exit(0);
});
