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

async function resetSpecificQuote() {
  try {
    const quoteId = 'quote_1756320622873_zuv5lwk04';
    const proposalId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
    
    console.log(`🔄 Setze Quote ${quoteId} zurück...`);
    
    // 1. Quote Status zurücksetzen
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();
    
    if (quoteDoc.exists) {
      const quoteData = quoteDoc.data();
      console.log(`📄 Aktueller Quote Status: ${quoteData.status}`);
      
      await quoteRef.update({
        status: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Quote Status auf "pending" gesetzt`);
      
      // 2. Proposal Status zurücksetzen
      const proposalRef = quoteRef.collection('proposals').doc(proposalId);
      const proposalDoc = await proposalRef.get();
      
      if (proposalDoc.exists) {
        const proposalData = proposalDoc.data();
        console.log(`📋 Aktueller Proposal Status: ${proposalData.status}`);
        
        await proposalRef.update({
          status: 'pending',
          customerDecision: admin.firestore.FieldValue.delete(),
          customerDecisionAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Proposal Status auf "pending" gesetzt`);
        console.log(`✅ customerDecision und customerDecisionAt entfernt`);
      } else {
        console.log(`❌ Proposal ${proposalId} nicht gefunden`);
      }
      
      // 3. CustomerDecision aus Quote entfernen
      if (quoteData.customerDecision) {
        await quoteRef.update({
          customerDecision: admin.firestore.FieldValue.delete()
        });
        console.log(`✅ customerDecision aus Quote entfernt`);
      }
      
      // 4. Payment Status zurücksetzen falls vorhanden
      if (quoteData.payment) {
        await quoteRef.update({
          'payment.provisionStatus': 'pending'
        });
        console.log(`✅ Payment provisionStatus auf "pending" gesetzt`);
      }
      
    } else {
      console.log(`❌ Quote ${quoteId} nicht gefunden`);
    }
    
    console.log(`\n🎉 Quote ${quoteId} wurde komplett zurückgesetzt!`);
    console.log(`📌 Status: pending`);
    console.log(`📌 Proposal Status: pending`);
    console.log(`📌 CustomerDecision: entfernt`);
    
  } catch (error) {
    console.error('❌ Fehler beim Zurücksetzen:', error);
  }
}

// Run the script
resetSpecificQuote().then(() => {
  console.log('✅ Script beendet');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script Fehler:', error);
  process.exit(1);
});
