const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase_functions/service-account.json');

initializeApp({
  credential: credential.cert(serviceAccount),
  projectId: 'tilvo-f142f',
});

const db = getFirestore();

async function checkProposalStatus() {
  console.log('🔍 Überprüfe Proposal Status für Quote...');

  const quoteId = 'quote_1756317103159_7myjblks1';
  const providerId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

  try {
    // 1. Check proposals collection
    console.log('\n📋 Suche in proposals collection...');
    const proposalsSnapshot = await db
      .collection('proposals')
      .where('quoteId', '==', quoteId)
      .where('providerId', '==', providerId)
      .get();

    if (!proposalsSnapshot.empty) {
      console.log(
        `✅ Gefunden: ${proposalsSnapshot.docs.length} proposal(s) in proposals collection`
      );
      proposalsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Proposal ${index + 1}:`, {
          id: doc.id,
          status: data.status,
          submittedAt: data.submittedAt,
          totalAmount: data.totalAmount,
          message: data.message?.substring(0, 100) + '...',
        });
      });
    } else {
      console.log('❌ Keine proposals in proposals collection gefunden');
    }

    // 2. Check proposals subcollection under quote
    console.log('\n📋 Suche in quotes/{quoteId}/proposals subcollection...');
    const subcollectionSnapshot = await db
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .where('providerId', '==', providerId)
      .get();

    if (!subcollectionSnapshot.empty) {
      console.log(`✅ Gefunden: ${subcollectionSnapshot.docs.length} proposal(s) in subcollection`);
      subcollectionSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Subcollection Proposal ${index + 1}:`, {
          id: doc.id,
          status: data.status,
          submittedAt: data.submittedAt,
          totalAmount: data.totalAmount,
          message: data.message?.substring(0, 100) + '...',
        });
      });
    } else {
      console.log('❌ Keine proposals in subcollection gefunden');
    }

    // 3. Check quote document itself
    console.log('\n📋 Überprüfe Quote Document...');
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();
    if (quoteDoc.exists) {
      const quoteData = quoteDoc.data();
      console.log('Quote Status:', quoteData.status);
      console.log('Quote providerId:', quoteData.providerId);

      // Check if there's an old proposals array
      if (quoteData.proposals && Array.isArray(quoteData.proposals)) {
        console.log(`⚠️  ALTE STRUKTUR: ${quoteData.proposals.length} proposals im Array gefunden`);
        quoteData.proposals.forEach((proposal, index) => {
          console.log(`   Array Proposal ${index + 1}:`, {
            companyUid: proposal.companyUid,
            providerId: proposal.providerId,
            status: proposal.status,
            submittedAt: proposal.submittedAt,
          });
        });
      }
    }

    // 4. Check alle proposals für diese Quote (ohne providerId filter)
    console.log('\n📋 Alle proposals für diese Quote...');
    const allProposalsSnapshot = await db
      .collection('proposals')
      .where('quoteId', '==', quoteId)
      .get();

    if (!allProposalsSnapshot.empty) {
      console.log(`✅ Gesamt: ${allProposalsSnapshot.docs.length} proposal(s) für diese Quote`);
      allProposalsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Proposal ${index + 1}:`, {
          id: doc.id,
          providerId: data.providerId,
          companyUid: data.companyUid,
          status: data.status,
          isFromOurProvider: data.providerId === providerId || data.companyUid === providerId,
        });
      });
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Run the check
checkProposalStatus()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
