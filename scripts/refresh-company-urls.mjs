// Erneuere abgelaufene Logo-URLs für Test-Account
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const TEST_COMPANY_ID = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';

// Manuell .env.local parsen (für mehrzeiliges JSON)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

// Finde FIREBASE_SERVICE_ACCOUNT_KEY Zeile
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+?)(?=\n[A-Z_]+=|$)/s);
if (!match) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY nicht in .env.local gefunden!');
  process.exit(1);
}

let serviceAccountKey = match[1].trim();
if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
serviceAccountKey = serviceAccountKey.replace(/\\\\n/g, '\\n');

const serviceAccount = JSON.parse(serviceAccountKey);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: 'tilvo-f142f.firebasestorage.app',
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

// Extrahiere Storage-Pfad aus signierter URL
function extractStoragePath(signedUrl) {
  try {
    const url = new URL(signedUrl);
    // Format: /BUCKET/PATH
    const pathMatch = url.pathname.match(/\/[^/]+\/(.+)/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch {
    return null;
  }
}

// Generiere neue signierte URL
async function refreshUrl(oldUrl) {
  const storagePath = extractStoragePath(oldUrl);
  if (!storagePath) {
    console.log('  Konnte Storage-Pfad nicht extrahieren:', oldUrl.substring(0, 80));
    return null;
  }

  try {
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log('  Datei existiert nicht mehr:', storagePath);
      return null;
    }

    const [newSignedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + TEN_YEARS_MS,
    });

    console.log('  Neue URL generiert für:', storagePath.substring(0, 50) + '...');
    return newSignedUrl;
  } catch (error) {
    console.error('  Fehler:', error.message);
    return null;
  }
}

async function refreshCompanyUrls() {
  console.log('Erneuere URLs für Test-Account:', TEST_COMPANY_ID);
  
  const companyRef = db.collection('companies').doc(TEST_COMPANY_ID);
  const companyDoc = await companyRef.get();
  
  if (!companyDoc.exists) {
    console.error('Unternehmen nicht gefunden!');
    process.exit(1);
  }
  
  const companyData = companyDoc.data();
  const updates = {};
  
  // URL-Felder die erneuert werden sollen
  const urlFields = [
    'logoUrl',
    'profilePictureURL',
    'profilePictureFirebaseUrl',
    'businessLicenseURL',
    'identityFrontUrl',
    'identityBackUrl',
    'masterCraftsmanCertificateUrl',
  ];
  
  for (const field of urlFields) {
    const currentUrl = companyData[field];
    if (!currentUrl || typeof currentUrl !== 'string') continue;
    
    // Prüfe ob es eine signierte URL ist
    if (!currentUrl.includes('GoogleAccessId=') && !currentUrl.includes('Signature=')) {
      console.log(`${field}: Keine signierte URL, überspringe`);
      continue;
    }
    
    // Prüfe Ablaufdatum
    const expiresMatch = currentUrl.match(/Expires=(\d+)/);
    if (!expiresMatch) continue;
    
    const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
    const now = Date.now();
    const daysUntilExpiry = Math.floor((expiresTimestamp - now) / (24 * 60 * 60 * 1000));
    
    if (expiresTimestamp > now && daysUntilExpiry > 30) {
      console.log(`${field}: Noch ${daysUntilExpiry} Tage gültig, überspringe`);
      continue;
    }
    
    console.log(`${field}: ${expiresTimestamp < now ? 'ABGELAUFEN' : `Läuft in ${daysUntilExpiry} Tagen ab`}`);
    const newUrl = await refreshUrl(currentUrl);
    if (newUrl) {
      updates[field] = newUrl;
    }
  }
  
  // Prüfe auch step5-Felder
  const step5 = companyData.step5;
  if (step5) {
    const step5Fields = ['businessLicenseUrl', 'identityFrontUrl', 'identityBackUrl', 'masterCraftsmanCertificateUrl'];
    for (const field of step5Fields) {
      const currentUrl = step5[field];
      if (!currentUrl || typeof currentUrl !== 'string') continue;
      if (!currentUrl.includes('GoogleAccessId=') && !currentUrl.includes('Signature=')) continue;
      
      const expiresMatch = currentUrl.match(/Expires=(\d+)/);
      if (!expiresMatch) continue;
      
      const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
      const now = Date.now();
      
      if (expiresTimestamp < now || (expiresTimestamp - now) < 30 * 24 * 60 * 60 * 1000) {
        console.log(`step5.${field}: Erneuere...`);
        const newUrl = await refreshUrl(currentUrl);
        if (newUrl) {
          updates[`step5.${field}`] = newUrl;
        }
      }
    }
  }
  
  if (Object.keys(updates).length > 0) {
    updates.urlsRefreshedAt = new Date().toISOString();
    await companyRef.update(updates);
    console.log('\nAktualisiert:', Object.keys(updates).join(', '));
  } else {
    console.log('\nKeine URLs mussten erneuert werden.');
  }
  
  console.log('\nFERTIG!');
}

refreshCompanyUrls()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fehler:', err);
    process.exit(1);
  });
