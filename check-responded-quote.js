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

async function checkRespondedQuote() {
  console.log('🔍 Überprüfe responded Quote Details...');

  const respondedQuoteId = 'quote_1756320622873_zuv5lwk04';
  const providerId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

  try {
    // 1. Get the responded quote details
    console.log('\n📋 Quote Details...');
    const quoteDoc = await db.collection('quotes').doc(respondedQuoteId).get();
    if (quoteDoc.exists) {
      const quoteData = quoteDoc.data();
      console.log('Quote Data:', {
        id: respondedQuoteId,
        status: quoteData.status,
        projectTitle: quoteData.projectTitle,
        customerEmail: quoteData.customerEmail,
        providerId: quoteData.providerId,
        createdAt: quoteData.createdAt?.toDate?.() || quoteData.createdAt,
      });
    }

    // 2. Check for proposals in proposals collection
    console.log('\n📋 Suche Proposals für responded Quote...');
    const proposalsSnapshot = await db
      .collection('proposals')
      .where('quoteId', '==', respondedQuoteId)
      .get();

    if (!proposalsSnapshot.empty) {
      console.log(`✅ Gefunden: ${proposalsSnapshot.docs.length} proposal(s)`);
      proposalsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Proposal ${index + 1}:`, {
          id: doc.id,
          providerId: data.providerId,
          companyUid: data.companyUid,
          status: data.status,
          submittedAt: data.submittedAt,
          totalAmount: data.totalAmount,
          message: data.message?.substring(0, 50) + '...',
        });
      });
    } else {
      console.log('❌ Keine proposals gefunden');
    }

    // 3. Check subcollection
    console.log('\n📋 Suche in Subcollection...');
    const subcollectionSnapshot = await db
      .collection('quotes')
      .doc(respondedQuoteId)
      .collection('proposals')
      .get();

    if (!subcollectionSnapshot.empty) {
      console.log(`✅ Subcollection: ${subcollectionSnapshot.docs.length} proposal(s)`);
      subcollectionSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Subcollection Proposal ${index + 1}:`, {
          id: doc.id,
          providerId: data.providerId,
          companyUid: data.companyUid,
          status: data.status,
          submittedAt: data.submittedAt,
          totalAmount: data.totalAmount,
        });
      });
    } else {
      console.log('❌ Keine proposals in subcollection gefunden');
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Run the check
checkRespondedQuote()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
