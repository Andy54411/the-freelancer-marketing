const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK with production credentials
const serviceAccount = require('./firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'tilvo-f142f',
});

const db = getFirestore(app);

async function setProjectToOpen() {
  const quoteId = 'iG3ZX09GQhVjiMAae2g8';

  try {
    console.log('🔄 Setting project to OPEN status:', quoteId);

    const projectRef = db.collection('project_requests').doc(quoteId);

    // Reset to open proposal structure
    const openProposals = [
      {
        companyUid: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1',
        companyName: 'Mietkoch Andy',
        status: 'pending', // OFFEN für Annahme
        price: 400,
        totalAmount: 400,
        currency: 'eur',
        description: 'Catering für Ihre Familienfeier',
        deliveryTime: '2-3 Tage',
        submittedAt: new Date('2025-08-24T22:00:00.000Z'),
      },
    ];

    // Update to open status
    await projectRef.update({
      proposals: openProposals,
      status: 'responded', // Projekt hat Angebote erhalten aber ist offen
      updatedAt: new Date().toISOString(),
      // Remove any payment-related fields
      acceptedProposal: null,
      acceptedAt: null,
      paidAt: null,
      paymentIntentId: null,
      orderId: null,
    });

    console.log('✅ Project set to OPEN status');
    console.log('✅ Proposal from Mietkoch Andy is now PENDING');
    console.log('✅ Ready for customer to accept and pay');
  } catch (error) {
    console.error('❌ Error setting project to open:', error);
  }

  process.exit(0);
}

setProjectToOpen();
