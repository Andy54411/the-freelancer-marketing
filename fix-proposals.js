const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK with production credentials
const serviceAccount = require('./firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'tilvo-f142f',
});

const db = getFirestore(app);

async function fixProposalsStructure() {
  const quoteId = 'iG3ZX09GQhVjiMAae2g8';

  try {
    console.log('🔧 Fixing proposals structure for project:', quoteId);

    const projectRef = db.collection('project_requests').doc(quoteId);
    const projectDoc = await projectRef.get();

    if (projectDoc.exists) {
      const data = projectDoc.data();

      // Create a proper proposal structure - OFFEN da noch keine Zahlung
      const fixedProposals = [
        {
          companyUid: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1', // Mietkoch Andy UID
          companyName: 'Mietkoch Andy',
          status: 'pending', // OFFEN - noch keine Zahlung ausgelöst
          price: 400,
          totalAmount: 400,
          currency: 'eur',
          description: 'Catering für Ihre Familienfeier',
          deliveryTime: '2-3 Tage',
          submittedAt: new Date('2025-08-24T22:00:00.000Z'),
          // KEINE paymentIntentId oder paymentPendingAt da noch nicht bezahlt
        },
      ];

      // Update the document with proper proposals array
      await projectRef.update({
        proposals: fixedProposals,
        status: 'responded', // Projekt hat Angebote erhalten, aber noch keine Zahlung
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ Fixed proposals structure');
      console.log('✅ Restored proposal from Mietkoch Andy');
      console.log('✅ Status set to RESPONDED (offen für Zahlung)');
    } else {
      console.log('❌ Project not found');
    }
  } catch (error) {
    console.error('❌ Error fixing proposals:', error);
  }

  process.exit(0);
}

fixProposalsStructure();
