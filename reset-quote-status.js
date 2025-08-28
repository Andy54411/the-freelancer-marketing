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

async function resetQuoteStatus() {
  try {
    console.log('🔄 Suche nach Quotes mit Status "processing"...');
    
    // Suche in quotes collection
    const quotesSnapshot = await db.collection('quotes')
      .where('status', '==', 'processing')
      .get();
    
    console.log(`📊 Gefunden: ${quotesSnapshot.size} Quotes mit Status "processing"`);
    
    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();
      console.log(`\n🔍 Quote ID: ${doc.id}`);
      console.log(`   Customer: ${quoteData.customerName || 'Unknown'}`);
      console.log(`   Service: ${quoteData.serviceTitle || 'Unknown'}`);
      console.log(`   Status: ${quoteData.status}`);
      
      // Reset status to 'pending'
      await doc.ref.update({
        status: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Status zurückgesetzt auf "pending"`);
      
      // Check for proposals in subcollection
      const proposalsSnapshot = await doc.ref.collection('proposals').get();
      console.log(`   📝 Proposals gefunden: ${proposalsSnapshot.size}`);
      
      for (const proposalDoc of proposalsSnapshot.docs) {
        const proposalData = proposalDoc.data();
        console.log(`   📄 Proposal ID: ${proposalDoc.id}`);
        console.log(`      Status: ${proposalData.status || 'unknown'}`);
        
        if (proposalData.status === 'accepted' || proposalData.status === 'processing') {
          await proposalDoc.ref.update({
            status: 'pending',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`   ✅ Proposal Status zurückgesetzt auf "pending"`);
        }
      }
    }
    
    // Auch in requests collection suchen
    console.log('\n🔄 Suche in requests collection...');
    const requestsSnapshot = await db.collection('requests')
      .where('status', '==', 'processing')
      .get();
    
    console.log(`📊 Gefunden: ${requestsSnapshot.size} Requests mit Status "processing"`);
    
    for (const doc of requestsSnapshot.docs) {
      const requestData = doc.data();
      console.log(`\n🔍 Request ID: ${doc.id}`);
      console.log(`   Customer: ${requestData.customerName || 'Unknown'}`);
      console.log(`   Status: ${requestData.status}`);
      
      // Reset status to 'pending'
      await doc.ref.update({
        status: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Status zurückgesetzt auf "pending"`);
    }
    
    console.log('\n🎉 Alle "processing" Status wurden zurückgesetzt!');
    
  } catch (error) {
    console.error('❌ Fehler beim Zurücksetzen:', error);
  }
}

// Run the script
resetQuoteStatus().then(() => {
  console.log('✅ Script beendet');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script Fehler:', error);
  process.exit(1);
});
