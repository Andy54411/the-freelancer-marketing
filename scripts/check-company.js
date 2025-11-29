const admin = require('firebase-admin');
const serviceAccount = require('../firebase-config.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCompany() {
  try {
    const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
    
    console.log('🔍 Suche Unternehmen:', companyId);
    console.log('');
    
    const companyDoc = await db.collection('companies').doc(companyId).get();
    
    if (companyDoc.exists) {
      const data = companyDoc.data();
      console.log('✅ Unternehmen EXISTIERT in companies Collection');
      console.log('');
      console.log('📋 Wichtige Daten:');
      console.log('  - Company Name:', data.companyName);
      console.log('  - Email:', data.email);
      console.log('  - Admin Approved:', data.adminApproved);
      console.log('  - Onboarding Completed:', data.onboardingCompleted);
      console.log('  - Profile Complete:', data.profileComplete);
      console.log('  - Onboarding %:', data.onboardingCompletionPercentage);
      console.log('  - Status:', data.status);
      console.log('  - Created At:', data.createdAt?.toDate?.());
      console.log('');
      console.log('🔧 Status-Logik für Admin-Liste:');
      const isAdminApproved = data?.adminApproved === true;
      const isOnboardingComplete =
        data?.onboardingCompleted === true ||
        data?.onboardingCompletionPercentage >= 100 ||
        data?.profileComplete === true;
      
      let status = 'inactive';
      if (isAdminApproved && isOnboardingComplete) {
        status = 'active';
      } else if (data?.status === 'suspended') {
        status = 'suspended';
      }
      
      console.log('  - Admin Approved:', isAdminApproved);
      console.log('  - Onboarding Complete:', isOnboardingComplete);
      console.log('  - Berechneter Status:', status);
      console.log('');
      console.log('📄 Vollständige Daten:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Unternehmen NICHT GEFUNDEN in companies Collection');
      console.log('');
      
      // Prüfe in users Collection
      const userDoc = await db.collection('users').doc(companyId).get();
      if (userDoc.exists) {
        console.log('✅ Aber in users Collection gefunden:');
        console.log('Daten:', JSON.stringify(userDoc.data(), null, 2));
      } else {
        console.log('❌ Auch nicht in users Collection gefunden');
      }
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
  
  process.exit(0);
}

checkCompany();
