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

async function analyzeAndUpdateQuotes() {
  console.log('🔍 Analysiere Quotes und bestimme B2C/B2B Status...');

  try {
    // Get all quotes
    const quotesSnapshot = await db.collection('quotes').get();
    console.log(`📊 Gefunden: ${quotesSnapshot.docs.length} Quotes`);

    for (const quoteDoc of quotesSnapshot.docs) {
      const quoteData = quoteDoc.data();
      const quoteId = quoteDoc.id;

      console.log(`\n🔍 Analysiere Quote: ${quoteId}`);
      console.log(`   Email: ${quoteData.customerEmail}`);
      console.log(`   Name: ${quoteData.customerName}`);
      console.log(`   Aktuelle customerUid: ${quoteData.customerUid}`);

      let customerUid = null;
      let customerType = 'user'; // Default to B2C
      let isCompany = false;

      // Try to find customer by email
      if (quoteData.customerEmail) {
        try {
          // First check users collection
          const usersSnapshot = await db
            .collection('users')
            .where('email', '==', quoteData.customerEmail)
            .get();

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            customerUid = userDoc.id;

            // Check if this user is also in companies collection (B2B)
            const companyDoc = await db.collection('companies').doc(userDoc.id).get();
            if (companyDoc.exists) {
              isCompany = true;
              customerType = 'company';
              console.log(`   ✅ Gefunden als B2B Firmenkunde: ${userDoc.id}`);
            } else {
              console.log(`   ✅ Gefunden als B2C Privatkunde: ${userDoc.id}`);
            }
          } else {
            console.log(`   ❌ Kein User mit Email gefunden: ${quoteData.customerEmail}`);
          }
        } catch (error) {
          console.error(`   ❌ Fehler beim Suchen des Kunden:`, error.message);
        }
      }

      // Update quote with customer information
      const updateData = {
        customerUid: customerUid,
        customerType: customerType,
        isB2B: isCompany,
        updatedAt: new Date(),
      };

      console.log(`   🔄 Update Quote mit:`, updateData);

      try {
        await db.collection('quotes').doc(quoteId).update(updateData);
        console.log(`   ✅ Quote erfolgreich aktualisiert`);
      } catch (error) {
        console.error(`   ❌ Fehler beim Update:`, error.message);
      }
    }

    console.log('\n🎉 Analyse und Update abgeschlossen!');
  } catch (error) {
    console.error('❌ Fehler bei der Analyse:', error);
  }
}

// Run the analysis
analyzeAndUpdateQuotes()
  .then(() => {
    console.log('✅ Script beendet');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script Fehler:', error);
    process.exit(1);
  });
