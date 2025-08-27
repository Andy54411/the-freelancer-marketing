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

async function findAllProposalsForProvider() {
  console.log('🔍 Suche alle Proposals für Provider...');

  const providerId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

  try {
    // 1. Search in proposals collection
    console.log('\n📋 Suche in proposals collection...');
    const proposalsSnapshot = await db
      .collection('proposals')
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
          quoteId: data.quoteId,
          status: data.status,
          submittedAt: data.submittedAt,
          totalAmount: data.totalAmount,
        });
      });
    } else {
      console.log('❌ Keine proposals in proposals collection gefunden');
    }

    // 2. Try companyUid field
    console.log('\n📋 Suche mit companyUid field...');
    const companyProposalsSnapshot = await db
      .collection('proposals')
      .where('companyUid', '==', providerId)
      .get();

    if (!companyProposalsSnapshot.empty) {
      console.log(
        `✅ Gefunden: ${companyProposalsSnapshot.docs.length} proposal(s) mit companyUid`
      );
      companyProposalsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Company Proposal ${index + 1}:`, {
          id: doc.id,
          quoteId: data.quoteId,
          status: data.status,
          submittedAt: data.submittedAt,
          totalAmount: data.totalAmount,
        });
      });
    } else {
      console.log('❌ Keine proposals mit companyUid gefunden');
    }

    // 3. Check project_requests collection (old structure)
    console.log('\n📋 Suche in project_requests collection (alte Struktur)...');
    const projectRequestsSnapshot = await db.collection('project_requests').get();

    let foundInProjects = 0;
    projectRequestsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.proposals && Array.isArray(data.proposals)) {
        const userProposals = data.proposals.filter(
          p => p.companyUid === providerId || p.providerId === providerId
        );
        if (userProposals.length > 0) {
          foundInProjects++;
          console.log(`   Gefunden in Projekt ${doc.id}:`, {
            projectId: doc.id,
            title: data.title,
            userProposals: userProposals.length,
            proposals: userProposals.map(p => ({
              status: p.status,
              submittedAt: p.submittedAt,
              totalAmount: p.totalAmount || p.estimatedPrice,
            })),
          });
        }
      }
    });

    if (foundInProjects === 0) {
      console.log('❌ Keine proposals in project_requests gefunden');
    }

    // 4. Check ALL quotes to see if any have this provider
    console.log('\n📋 Suche alle Quotes für diesen Provider...');
    const quotesSnapshot = await db
      .collection('quotes')
      .where('providerId', '==', providerId)
      .get();

    if (!quotesSnapshot.empty) {
      console.log(`✅ Gefunden: ${quotesSnapshot.docs.length} quote(s) für diesen Provider`);
      quotesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Quote ${index + 1}:`, {
          id: doc.id,
          status: data.status,
          customerEmail: data.customerEmail,
          projectTitle: data.projectTitle,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        });
      });
    } else {
      console.log('❌ Keine quotes für diesen Provider gefunden');
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Run the search
findAllProposalsForProvider()
  .then(() => {
    console.log('\n✅ Search completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
