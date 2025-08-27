// Script um die Mietkoch Andy Daten zu vervollständigen
const admin = require('firebase-admin');

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'taskilo-b7795',
  });
}

const db = admin.firestore();

async function fixMietkochData() {
  try {
    const companyId = 'mPOFuDVl8vcvA407kr7F8sxwKNR2';

    console.log('🔧 Updating Mietkoch Andy data...');

    const updateData = {
      selectedCategory: 'Hotel & Gastronomie',
      selectedSubcategory: 'Mietkoch',
      location: 'München', // Beispiel-Standort
      profilePictureFirebaseUrl: '/images/default-avatar.jpg',
      description:
        'Leidenschaft, die man schmeckt! Als Ihr privater Koch bringe ich kulinarische Vielfalt direkt zu Ihnen nach Hause.',
      hourlyRate: 45,
      averageRating: 4.8,
      reviewCount: 12,
      completedJobs: 25,
      responseTime: '2',
      isActive: true,
      services: [
        'Deutsche Küche',
        'Spanische Küche',
        'Österreiche Küche',
        'Mietkoch',
        'Privatkoch',
      ],
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('companies').doc(companyId).update(updateData);

    console.log('✅ Mietkoch Andy data updated successfully!');
    console.log('📊 Updated fields:', Object.keys(updateData));
  } catch (error) {
    console.error('❌ Error updating Mietkoch data:', error);
  }
}

fixMietkochData();
