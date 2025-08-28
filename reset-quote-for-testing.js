const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Setup
const serviceAccount = require('./firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

async function resetQuoteForTesting() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    
    console.log(`🔄 Resetting quote ${quoteId} for testing...`);
    
    // 1. Reset Quote status to 'open'
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();
    
    if (!quoteDoc.exists) {
      console.error('❌ Quote not found!');
      return;
    }
    
    const quoteData = quoteDoc.data();
    console.log(`📄 Current quote status: ${quoteData.status}`);
    
    // Reset quote to open status
    await quoteRef.update({
      status: 'open',
      'contactExchange.readyForExchange': false,
      'payment.status': null,
      'payment.paidAt': null,
      'payment.paymentIntentId': null,
    });
    
    console.log('✅ Quote status reset to "open"');
    
    // 2. Delete proposals from subcollection
    const proposalsSnapshot = await db
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .get();
    
    if (!proposalsSnapshot.empty) {
      console.log(`🗑️ Deleting ${proposalsSnapshot.size} proposal(s)...`);
      
      const batch = db.batch();
      proposalsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      console.log('✅ Proposals deleted from subcollection');
    } else {
      console.log('📝 No proposals found in subcollection');
    }
    
    // 3. Check for old proposals in main collection and delete them
    const oldProposalsSnapshot = await db
      .collection('proposals')
      .where('quoteId', '==', quoteId)
      .get();
    
    if (!oldProposalsSnapshot.empty) {
      console.log(`🗑️ Deleting ${oldProposalsSnapshot.size} old proposal(s)...`);
      
      const batch = db.batch();
      oldProposalsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      console.log('✅ Old proposals deleted');
    } else {
      console.log('📝 No old proposals found');
    }
    
    console.log('🎉 Quote successfully reset for testing!');
    console.log('🔄 You can now test the complete workflow:');
    console.log('   1. Company submits proposal');
    console.log('   2. Customer accepts proposal');
    console.log('   3. Customer pays');
    console.log('   4. Status updates to "accepted"');
    
  } catch (error) {
    console.error('❌ Error resetting quote:', error);
  }
}

resetQuoteForTesting().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
});
