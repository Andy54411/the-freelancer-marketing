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

async function findAndResetQuotes() {
  try {
    console.log('🔍 Suche nach allen Quotes und ihre Status...');
    
    // Alle quotes anzeigen
    const quotesSnapshot = await db.collection('quotes').get();
    console.log(`📊 Gefunden: ${quotesSnapshot.size} Quotes total`);
    
    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();
      console.log(`\n📄 Quote ID: ${doc.id}`);
      console.log(`   Customer: ${quoteData.customerName || 'Unknown'}`);
      console.log(`   Service: ${quoteData.serviceTitle || 'Unknown'}`);
      console.log(`   Status: ${quoteData.status || 'no status'}`);
      
      // Suche nach problematischen Status
      if (quoteData.status === 'contacts_exchanged' || 
          quoteData.status === 'processing' || 
          quoteData.status === 'accepted') {
        
        console.log(`   🔄 Setze Status zurück von "${quoteData.status}" auf "pending"`);
        
        await doc.ref.update({
          status: 'pending',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ Status zurückgesetzt!`);
      }
      
      // Check proposals
      const proposalsSnapshot = await doc.ref.collection('proposals').get();
      if (proposalsSnapshot.size > 0) {
        console.log(`   📝 Proposals: ${proposalsSnapshot.size}`);
        
        for (const proposalDoc of proposalsSnapshot.docs) {
          const proposalData = proposalDoc.data();
          console.log(`      📋 Proposal ${proposalDoc.id}: Status = ${proposalData.status || 'no status'}`);
          
          if (proposalData.status === 'accepted' || 
              proposalData.status === 'processing' || 
              proposalData.status === 'contacts_exchanged') {
            
            console.log(`      🔄 Setze Proposal Status zurück auf "pending"`);
            
            await proposalDoc.ref.update({
              status: 'pending',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`      ✅ Proposal Status zurückgesetzt!`);
          }
        }
      }
    }
    
    console.log('\n🎉 Alle problematischen Status wurden zurückgesetzt!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Run the script
findAndResetQuotes().then(() => {
  console.log('✅ Script beendet');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script Fehler:', error);
  process.exit(1);
});
