const admin = require('firebase-admin');

// Direkte Firebase Admin SDK Connection
admin.initializeApp({
  projectId: 'tilvo-f142f',
});

const db = admin.firestore();

async function moveReviewToSubcollection() {
  try {
    console.log('Moving review to subcollection...');

    // 1. Lade die spezifische Review
    const reviewDoc = await db.collection('reviews').doc('5Ok62RDfegdOOq84ROik').get();

    if (!reviewDoc.exists) {
      console.log('Review not found!');
      return;
    }

    const reviewData = reviewDoc.data();
    console.log('Found review:', reviewData);

    // 2. Erstelle in Subcollection
    await db
      .collection('companies')
      .doc(reviewData.providerId)
      .collection('reviews')
      .doc('5Ok62RDfegdOOq84ROik')
      .set(reviewData);

    console.log('✅ Review moved to subcollection');

    // 3. Lösche aus Top-Level
    await db.collection('reviews').doc('5Ok62RDfegdOOq84ROik').delete();

    console.log('✅ Old review deleted');

    // 4. Validiere
    const newDoc = await db
      .collection('companies')
      .doc(reviewData.providerId)
      .collection('reviews')
      .doc('5Ok62RDfegdOOq84ROik')
      .get();

    if (newDoc.exists) {
      console.log('✅ Validation successful:', newDoc.data());
    } else {
      console.log('❌ Validation failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

moveReviewToSubcollection();
