const admin = require('firebase-admin');
const serviceAccount = require('./firebase_functions/service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkFirmaData() {
  try {
    console.log('📊 Checking Firma Collection Data...');
    console.log('====================================');

    const firmCollection = await db.collection('firma').get();
    console.log('Total documents:', firmCollection.docs.length);

    firmCollection.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n🏢 Company ${index + 1} (ID: ${doc.id}):`);
      console.log('- companyName:', data.companyName);
      console.log('- services:', data.services);
      console.log('- skills:', data.skills);
      console.log('- location:', data.location);
      console.log('- isActive:', data.isActive);
      console.log('- businessType:', data.businessType);
      console.log('- Available keys:', Object.keys(data).sort().join(', '));

      // Prüfe speziell nach Mietkoch-relevanten Daten
      if (data.services) {
        console.log(
          '- Services contains "mietkoch":',
          JSON.stringify(data.services).toLowerCase().includes('mietkoch')
        );
      }
      if (data.skills) {
        console.log(
          '- Skills contains "mietkoch":',
          JSON.stringify(data.skills).toLowerCase().includes('mietkoch')
        );
      }
      if (data.businessType) {
        console.log(
          '- BusinessType contains "mietkoch":',
          data.businessType.toLowerCase().includes('mietkoch')
        );
      }
    });
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
  process.exit(0);
}

checkFirmaData();
