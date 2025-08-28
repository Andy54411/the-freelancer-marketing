const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Initialize Firebase Admin using service account file
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-minimal.json', 'utf8'));

const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: "tilvo-f142f"
});

const db = getFirestore(app);

async function checkIncomingQuote() {
    try {
        const quoteId = 'quote_1756369179622_4ium7lqpz';
        console.log('🔍 Checking quote:', quoteId);

        // Check in quotes collection
        const quoteDoc = await db.collection('quotes').doc(quoteId).get();

        if (quoteDoc.exists) {
            const data = quoteDoc.data();
            console.log('📄 Quote Status:', data.status);
            console.log('📄 Quote Data:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ Quote not found in quotes collection');
        }

        // Also check proposals collection
        const proposalsSnapshot = await db.collection('proposals').where('quoteId', '==', quoteId).get();
        console.log(`📋 Found ${proposalsSnapshot.size} proposals for this quote`);

        proposalsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`📋 Proposal ${doc.id}:`, {
                status: data.status,
                providerId: data.providerId,
                totalAmount: data.totalAmount
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkIncomingQuote();
