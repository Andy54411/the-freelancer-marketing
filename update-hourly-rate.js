// Script um fehlende hourlyRate für bestehende Firmen zu setzen
const admin = require('firebase-admin');

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'taskilo-b7795',
  });
}

const db = admin.firestore();

async function updateMietkochHourlyRate() {
  try {
    const companyId = 'mPOFuDVl8vcvA407kr7F8sxwKNR2';

    console.log('🔧 Setting hourlyRate for Mietkoch Andy...');

    // Setze einen Beispiel-Stundensatz
    const updateData = {
      hourlyRate: 45, // 45 Euro pro Stunde
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('companies').doc(companyId).update(updateData);

    console.log('✅ HourlyRate updated successfully to 45 EUR/hour');
  } catch (error) {
    console.error('❌ Error updating hourlyRate:', error);
  }
}

updateMietkochHourlyRate();
