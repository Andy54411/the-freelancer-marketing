const admin = require('firebase-admin');

// Firebase Admin initialisieren (falls noch nicht initialisiert)
if (!admin.apps.length) {
  const serviceAccount = require('../certs/tilvo-f142f-firebase-adminsdk-8j6sj-9f7eaeb6ed.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
}

const db = admin.firestore();

async function checkReviewData() {
  try {
    const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
    const reviewId = '5Ok62RDfegdOOq84ROik';

    console.log('🔍 Prüfe Review-Daten...');

    // Subcollection-Review prüfen
    const subReviewRef = db.collection(`companies/${companyId}/reviews`).doc(reviewId);
    const subReviewDoc = await subReviewRef.get();

    if (subReviewDoc.exists) {
      const data = subReviewDoc.data();
      console.log('📄 Subcollection Review:');
      console.log('- Comment:', data.comment);
      console.log('- ProviderResponse:', data.providerResponse);

      if (!data.providerResponse || !data.providerResponse.comment) {
        console.log('❌ ProviderResponse fehlt oder ist leer!');

        // Prüfe alte Collection zum Vergleich
        console.log('\n🔍 Prüfe alte Collection...');
        const oldReviewRef = db.collection('reviews').doc(reviewId);
        const oldReviewDoc = await oldReviewRef.get();

        if (oldReviewDoc.exists) {
          const oldData = oldReviewDoc.data();
          console.log('📄 Alte Collection Review:');
          console.log('- Comment:', oldData.comment);
          console.log('- ProviderResponse:', oldData.providerResponse);

          if (oldData.providerResponse && oldData.providerResponse.comment) {
            console.log('✅ ProviderResponse in alter Collection gefunden!');
            console.log('🔄 Aktualisiere Subcollection...');

            await subReviewRef.update({
              providerResponse: oldData.providerResponse,
            });

            console.log('✅ ProviderResponse erfolgreich übertragen!');
          }
        }
      } else {
        console.log('✅ ProviderResponse ist vorhanden:', data.providerResponse);
      }
    } else {
      console.log('❌ Review in Subcollection nicht gefunden');
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

checkReviewData();
