const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to get service account from environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://taskilo-79981-default-rtdb.europe-west1.firebasedatabase.app'
      });
    } else {
      // Fallback to default credentials
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkQuoteStatus() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    
    console.log(`🔍 Prüfe Quote Status für ${quoteId}...`);
    
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();
    
    if (quoteDoc.exists) {
      const quoteData = quoteDoc.data();
      
      console.log(`📊 Quote Status: ${quoteData.status}`);
      console.log(`📅 UpdatedAt: ${quoteData.updatedAt}`);
      console.log(`🤝 CustomerDecision:`, quoteData.customerDecision);
      
      if (quoteData.customerDecision) {
        console.log(`  Action: ${quoteData.customerDecision.action}`);
        console.log(`  DecidedAt: ${quoteData.customerDecision.decidedAt}`);
        console.log(`  CustomerName: ${quoteData.customerDecision.customerName}`);
      }
      
      // Check proposals
      console.log(`\n📝 Prüfe Proposals...`);
      const proposalsSnapshot = await db.collection('quotes').doc(quoteId).collection('proposals').get();
      
      proposalsSnapshot.docs.forEach(proposalDoc => {
        const proposalData = proposalDoc.data();
        console.log(`  Proposal ${proposalDoc.id}: Status = ${proposalData.status || 'no status'}`);
        console.log(`  Customer Decision: ${proposalData.customerDecision || 'none'}`);
      });
      
    } else {
      console.log(`❌ Quote ${quoteId} nicht gefunden`);
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

checkQuoteStatus().then(() => {
  console.log('✅ Check beendet');
  process.exit(0);
});
