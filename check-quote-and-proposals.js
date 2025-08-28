const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Setup
const serviceAccount = require('./firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function checkQuoteAndProposals() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    
    console.log(`🔍 Checking quote ${quoteId} and its proposals...`);
    
    // 1. Check Quote
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();
    
    if (!quoteDoc.exists) {
      console.error('❌ Quote not found!');
      return;
    }
    
    const quoteData = quoteDoc.data();
    console.log('📄 Quote data:', {
      status: quoteData.status,
      customerEmail: quoteData.customerEmail,
      customerUid: quoteData.customerUid,
      paymentStatus: quoteData.payment?.status,
      contactExchange: quoteData.contactExchange?.readyForExchange,
    });
    
    // 2. Check Proposals in subcollection
    const proposalsSnapshot = await db
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .get();
    
    console.log(`📋 Found ${proposalsSnapshot.size} proposal(s) in subcollection`);
    
    if (!proposalsSnapshot.empty) {
      proposalsSnapshot.docs.forEach((proposalDoc, index) => {
        const proposalData = proposalDoc.data();
        console.log(`📝 Proposal ${index + 1}:`, {
          id: proposalDoc.id,
          providerId: proposalData.providerId,
          status: proposalData.status,
          totalAmount: proposalData.totalAmount,
          message: proposalData.message,
          submittedAt: proposalData.submittedAt,
        });
      });
    } else {
      console.log('📝 No proposals found in subcollection');
    }
    
    // 3. Check old proposals collection
    const oldProposalsSnapshot = await db
      .collection('proposals')
      .where('quoteId', '==', quoteId)
      .get();
    
    console.log(`📋 Found ${oldProposalsSnapshot.size} proposal(s) in old collection`);
    
    if (!oldProposalsSnapshot.empty) {
      oldProposalsSnapshot.docs.forEach((proposalDoc, index) => {
        const proposalData = proposalDoc.data();
        console.log(`📝 Old Proposal ${index + 1}:`, {
          id: proposalDoc.id,
          providerId: proposalData.providerId,
          status: proposalData.status,
          totalAmount: proposalData.totalAmount,
          message: proposalData.message,
          submittedAt: proposalData.submittedAt,
        });
      });
    } else {
      console.log('📝 No proposals found in old collection');
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

checkQuoteAndProposals().then(() => {
  console.log('🏁 Check completed');
  process.exit(0);
});
