const admin = require('firebase-admin');

// Initialisiere Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'tasko-7e498',
  });
}

const db = admin.firestore();

async function checkCompanies() {
  const snapshot = await db.collection('companies').get();
  
  console.log('=== Alle Companies mit Hotel & Gastronomie oder Mietkoch ===\n');
  
  let foundAny = false;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const matchesCategory = data.selectedCategory && data.selectedCategory.includes('Hotel');
    const matchesSubcategory = data.selectedSubcategory && data.selectedSubcategory.toLowerCase().includes('mietkoch');
    const matchesName = data.companyName && data.companyName.toLowerCase().includes('andy');
    
    if (matchesCategory || matchesSubcategory || matchesName) {
      foundAny = true;
      console.log('ID:', doc.id);
      console.log('companyName:', data.companyName);
      console.log('selectedCategory:', data.selectedCategory);
      console.log('selectedSubcategory:', data.selectedSubcategory);
      console.log('adminApproved:', data.adminApproved);
      console.log('status:', data.status);
      console.log('accountSuspended:', data.accountSuspended);
      console.log('skills:', data.skills);
      console.log('---');
    }
  });
  
  if (!foundAny) {
    console.log('Keine passenden Companies gefunden.');
    console.log('\nAlle Companies:');
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.companyName} | Category: ${data.selectedCategory} | Subcategory: ${data.selectedSubcategory}`);
    });
  }
}

checkCompanies().catch(console.error);
