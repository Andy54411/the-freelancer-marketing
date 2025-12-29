// Nutzt die existierende Firebase SDK
import { db, storage } from '../src/firebase/server';

async function checkCompanyData() {
  const companyId = 'zIRo29svEPOorsD5XT05d888AxV2';
  
  console.log('=== FIRESTORE COMPANY DOCUMENT ===');
  const doc = await db!.collection('companies').doc(companyId).get();
  const data = doc.data();
  
  // Suche nach allen Bild/Logo-relevanten Feldern
  const imageFields = ['profilePictureURL', 'profilePictureFirebaseUrl', 'profileImage', 'logoUrl', 'logo', 'companyLogo', 'imageUrl', 'avatar'];
  console.log('Bild-Felder im Root:');
  imageFields.forEach(field => {
    console.log(`  ${field}:`, data?.[field] || 'NICHT VORHANDEN');
  });
  
  // Check step objects
  ['step1', 'step2', 'step3', 'step4', 'step5'].forEach(step => {
    if (data?.[step]) {
      const stepData = data[step];
      const stepImageFields = Object.keys(stepData).filter(k => 
        k.toLowerCase().includes('picture') || 
        k.toLowerCase().includes('image') || 
        k.toLowerCase().includes('logo') ||
        k.toLowerCase().includes('photo')
      );
      if (stepImageFields.length > 0) {
        console.log(`${step} Bild-Felder:`);
        stepImageFields.forEach(f => console.log(`  ${f}:`, stepData[f]));
      }
    }
  });
  
  // Check Storage for branding folder
  console.log('\n=== FIREBASE STORAGE ===');
  const bucket = storage!.bucket();
  const [files] = await bucket.getFiles({ prefix: `companies/${companyId}/` });
  console.log('Alle Dateien für Company:');
  files.forEach(file => console.log(`  ${file.name}`));
  
  process.exit(0);
}

checkCompanyData().catch(e => { console.error(e); process.exit(1); });
