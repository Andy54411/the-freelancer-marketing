const admin = require('firebase-admin');

// Firebase Admin initialisieren  
if (!admin.apps.length) {
  const serviceAccount = require('./firebase_functions/service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function resetAcceptedQuotes() {
  console.log('🔄 Starte Zurücksetzen von falschen "accepted" Quote-Status...');
  
  try {
    // 1. Alle Quotes mit status "accepted" finden
    const quotesSnapshot = await db.collection('quotes')
      .where('status', '==', 'accepted')
      .get();
    
    console.log(`📊 Gefunden: ${quotesSnapshot.size} Quotes mit Status "accepted"`);
    
    let resetCount = 0;
    
    for (const quoteDoc of quotesSnapshot.docs) {
      const quoteData = quoteDoc.data();
      const quoteId = quoteDoc.id;
      
      console.log(`\\n🔍 Überprüfe Quote: ${quoteId}`);
      console.log(`   Titel: ${quoteData.projectTitle || quoteData.title || 'Unbekannt'}`);
      console.log(`   Created: ${quoteData.createdAt?.toDate?.()?.toLocaleDateString() || 'Unbekannt'}`);
      
      // Prüfe ob es eine echte, erfolgreiche Zahlung gibt
      let hasSuccessfulPayment = false;
      
      if (quoteData.payment) {
        console.log(`   💳 Payment Status: ${quoteData.payment.status || 'undefined'}`);
        console.log(`   💳 Payment Intent: ${quoteData.payment.paymentIntentId || 'undefined'}`);
        
        if (quoteData.payment.status === 'succeeded' || 
            quoteData.payment.status === 'completed' ||
            quoteData.payment.status === 'paid') {
          hasSuccessfulPayment = true;
          console.log(`   ✅ Hat erfolgreiche Zahlung!`);
        }
      } else {
        console.log(`   ❌ Keine Payment-Daten gefunden`);
      }
      
      // Wenn keine erfolgreiche Zahlung, dann Status zurücksetzen
      if (!hasSuccessfulPayment) {
        console.log(`   🔧 RESET: "accepted" → "responded"`);
        
        const updateData = {
          status: 'responded',
          resetAt: admin.firestore.FieldValue.serverTimestamp(),
          resetReason: 'No successful payment found'
        };
        
        // Entferne acceptedAt falls vorhanden
        if (quoteData.acceptedAt) {
          updateData.acceptedAt = admin.firestore.FieldValue.delete();
        }
        
        await quoteDoc.ref.update(updateData);
        
        // Auch alle Proposals in der Subcollection zurücksetzen
        try {
          const proposalsSnapshot = await db
            .collection('quotes')
            .doc(quoteId)
            .collection('proposals')
            .get();
          
          for (const proposalDoc of proposalsSnapshot.docs) {
            const proposalData = proposalDoc.data();
            if (proposalData.status === 'accepted') {
              console.log(`   🔧 Reset Proposal: ${proposalDoc.id}`);
              await proposalDoc.ref.update({
                status: 'responded',
                resetAt: admin.firestore.FieldValue.serverTimestamp(),
                acceptedAt: admin.firestore.FieldValue.delete()
              });
            }
          }
        } catch (proposalError) {
          console.error(`   ❌ Fehler bei Proposals für ${quoteId}:`, proposalError.message);
        }
        
        resetCount++;
      } else {
        console.log(`   ✅ BEHALTEN: Hat erfolgreiche Zahlung`);
      }
    }
    
    console.log(`\\n🎉 FERTIG: ${resetCount} Quote(s) zurückgesetzt!`);
    console.log(`📊 ${quotesSnapshot.size - resetCount} Quote(s) mit echten Zahlungen behalten.`);
    
  } catch (error) {
    console.error('❌ Fehler beim Zurücksetzen:', error);
    throw error;
  }
}

// Skript ausführen
if (require.main === module) {
  resetAcceptedQuotes()
    .then(() => {
      console.log('\\n✅ Skript erfolgreich abgeschlossen!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n❌ Skript-Fehler:', error);
      process.exit(1);
    });
}

module.exports = { resetAcceptedQuotes };
