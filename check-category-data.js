const admin = require('firebase-admin');
const serviceAccount = require('./firebase_functions/service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkCategoryData() {
  try {
    console.log('📊 Checking Category/Subcategory Data...');
    console.log('========================================');
    
    const firmCollection = await db.collection('firma').get();
    
    firmCollection.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n🏢 Company ${index + 1} (ID: ${doc.id}):`);
      console.log('- companyName:', data.companyName);
      console.log('- selectedCategory:', data.selectedCategory);
      console.log('- selectedSubcategory:', data.selectedSubcategory);
      console.log('- location:', `${data.companyCity}, ${data.companyCountry}`);
      console.log('- hourlyRate:', data.hourlyRate);
      console.log('- isActive:', data.isActive);
      
      // Prüfe ob Subcategory mit "mietkoch" übereinstimmt
      const matchesSubcategory = data.selectedSubcategory && 
        data.selectedSubcategory.toLowerCase() === 'mietkoch';
      console.log('- Matches "mietkoch":', matchesSubcategory);
    });
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
  process.exit(0);
}

checkCategoryData();
