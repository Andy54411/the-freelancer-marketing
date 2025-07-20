#!/usr/bin/env node

const admin = require('firebase-admin');

// Firebase Admin initialisieren
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://taskilo-b828a-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.firestore();

async function updateProfileStats() {
  try {
    const companyId = 'BsUxClYQtkNWRmpSY17YsJyVR0D2';

    // Berechne Statistiken aus den Reviews
    const reviewsSnapshot = await db
      .collection('reviews')
      .where('anbieterId', '==', companyId)
      .get();

    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    const totalReviews = reviews.length;
    const totalStars = reviews.reduce((sum, review) => sum + review.sterne, 0);
    const averageRating = totalReviews > 0 ? totalStars / totalReviews : 0;

    console.log(`Gefundene Reviews: ${totalReviews}`);
    console.log(`Durchschnittsbewertung: ${averageRating.toFixed(1)} Sterne`);

    // Update sowohl users als auch companies collection
    const updateData = {
      totalReviews: totalReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Runde auf 1 Dezimalstelle
    };

    // Update users collection
    await db.collection('users').doc(companyId).update(updateData);
    console.log('✅ Users-Profil aktualisiert');

    // Update companies collection
    await db.collection('companies').doc(companyId).update(updateData);
    console.log('✅ Companies-Profil aktualisiert');

    console.log('\n🎉 Profil-Statistiken wurden erfolgreich aktualisiert!');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Profil-Statistiken:', error);
  } finally {
    process.exit(0);
  }
}

updateProfileStats();
