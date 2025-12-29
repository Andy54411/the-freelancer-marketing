// Lade .env.local und verwende dieselbe Init-Logik wie server.ts
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const admin = require('firebase-admin');

// Firebase initialization - EXAKT gleiche Logik wie server.ts
function initializeFirebase() {
  if (admin.apps.length > 0) return;

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY nicht gefunden');
    process.exit(1);
  }

  let cleanKey = serviceAccountKey.trim();
  
  // Remove outer quotes if present
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
    cleanKey = cleanKey.slice(1, -1);
  }
  
  // Replace escaped quotes and special chars
  cleanKey = cleanKey.replace(/\\"/g, '"');
  cleanKey = cleanKey.replace(/\\n/g, '\n');
  cleanKey = cleanKey.replace(/\\r/g, '\r');
  cleanKey = cleanKey.replace(/\\t/g, '\t');
  cleanKey = cleanKey.replace(/\\\\/g, '\\');

  // Try direct JSON.parse first
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(cleanKey);
  } catch (firstError) {
    // Fix common private key formatting issues
    let fixedKey = cleanKey;
    
    // Ensure proper newlines in private key
    fixedKey = fixedKey.replace(/"private_key":\s*"([^"]*)"/, (match, privateKey) => {
      const fixedPrivateKey = privateKey
        .replace(/\\n/g, '\n')
        .replace(/\n+/g, '\n');
      return '"private_key": "' + fixedPrivateKey.replace(/\n/g, '\\n') + '"';
    });

    serviceAccount = JSON.parse(fixedKey);
  }

  // Fix private key format if needed
  if (serviceAccount?.private_key && !serviceAccount.private_key.includes('\n')) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'tilvo-f142f',
    storageBucket: 'tilvo-f142f.firebasestorage.app'
  });
}

initializeFirebase();

const db = admin.firestore();
const storage = admin.storage().bucket();

async function checkCompanyData() {
  const companyId = 'zIRo29svEPOorsD5XT05d888AxV2';
  
  // 1. Check Firestore document
  console.log('=== FIRESTORE COMPANY DOCUMENT ===');
  const doc = await db.collection('companies').doc(companyId).get();
  const data = doc.data();
  
  // Suche nach allen Bild/Logo-relevanten Feldern
  const imageFields = ['profilePictureURL', 'profilePictureFirebaseUrl', 'profileImage', 'logoUrl', 'logo', 'companyLogo', 'imageUrl', 'avatar'];
  console.log('Bild-Felder im Root:');
  imageFields.forEach(field => {
    console.log('  ' + field + ':', data[field] || 'NICHT VORHANDEN');
  });
  
  // Check step objects
  ['step1', 'step2', 'step3', 'step4', 'step5'].forEach(step => {
    if (data[step]) {
      const stepData = data[step];
      const stepImageFields = Object.keys(stepData).filter(k => 
        k.toLowerCase().includes('picture') || 
        k.toLowerCase().includes('image') || 
        k.toLowerCase().includes('logo') ||
        k.toLowerCase().includes('photo')
      );
      if (stepImageFields.length > 0) {
        console.log(step + ' Bild-Felder:');
        stepImageFields.forEach(f => console.log('  ' + f + ':', stepData[f]));
      }
    }
  });
  
  // 2. Check Storage for branding folder
  console.log('\n=== FIREBASE STORAGE ===');
  const [files] = await storage.getFiles({ prefix: 'companies/' + companyId + '/' });
  console.log('Alle Dateien für Company:');
  files.forEach(file => console.log('  ' + file.name));
  
  process.exit(0);
}

checkCompanyData().catch(e => { console.error(e); process.exit(1); });
