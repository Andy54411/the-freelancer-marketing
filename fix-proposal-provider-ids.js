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

async function fixProposalProviderIds() {
  console.log('🔧 Repariere providerId in bestehenden Proposals...');

  try {
    // Get all quotes
    const quotesSnapshot = await db.collection('quotes').get();

    for (const quoteDoc of quotesSnapshot.docs) {
      const quoteId = quoteDoc.id;

      // Check subcollection proposals
      const proposalsSnapshot = await db
        .collection('quotes')
        .doc(quoteId)
        .collection('proposals')
        .get();

      if (!proposalsSnapshot.empty) {
        console.log(`\n📋 Bearbeite Quote: ${quoteId}`);

        for (const proposalDoc of proposalsSnapshot.docs) {
          const proposalData = proposalDoc.data();
          const proposalId = proposalDoc.id;

          console.log(`   Proposal ${proposalId}:`, {
            companyUid: proposalData.companyUid,
            providerId: proposalData.providerId,
            needsUpdate: !proposalData.providerId && proposalData.companyUid,
          });

          // Fix if providerId is missing but companyUid exists
          if (!proposalData.providerId && proposalData.companyUid) {
            console.log(`   🔧 Repariere providerId für ${proposalId}...`);

            await db
              .collection('quotes')
              .doc(quoteId)
              .collection('proposals')
              .doc(proposalId)
              .update({
                providerId: proposalData.companyUid,
                updatedAt: new Date(),
              });

            console.log(`   ✅ Repariert: providerId = ${proposalData.companyUid}`);
          }
        }
      }
    }

    console.log('\n🎉 Reparatur abgeschlossen!');
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Run the fix
fixProposalProviderIds()
  .then(() => {
    console.log('✅ Fix completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
