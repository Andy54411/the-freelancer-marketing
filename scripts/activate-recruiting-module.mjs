// Aktiviere Recruiting-Modul für Company
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const COMPANY_ID = 'E1bFqbyPGDRBXY3MVIyeANz1TCY2';

// Manuell .env.local parsen
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

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
  });
}

const db = getFirestore();

async function activateRecruiting() {
  console.log('Aktiviere Recruiting-Modul für Company:', COMPANY_ID);
  
  const now = new Date();
  const farFuture = new Date('2099-12-31');
  
  const companyRef = db.collection('companies').doc(COMPANY_ID);
  
  // 1. Update Company modules Feld
  await companyRef.update({
    'modules.recruiting': true,
    activeModules: FieldValue.arrayUnion('recruiting'),
    updatedAt: now,
  });
  
  console.log('Company-Dokument aktualisiert');
  
  // 2. Erstelle module_subscription für recruiting
  const subscriptionsRef = companyRef.collection('module_subscriptions');
  
  await subscriptionsRef.doc('recruiting').set({
    companyId: COMPANY_ID,
    moduleId: 'recruiting',
    moduleName: 'Recruiting',
    priceNet: 16.80,
    priceGross: 19.99,
    vatRate: 19,
    billingInterval: 'monthly',
    status: 'active',
    trialUsed: true,
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd: farFuture,
    nextBillingDate: null,
    createdAt: now,
    updatedAt: now,
    isManualActivation: true,
    activatedBy: 'admin',
  }, { merge: true });
  
  console.log('Recruiting-Modul-Subscription erstellt');
  console.log('✅ Recruiting-Modul erfolgreich für Company aktiviert!');
}

activateRecruiting().catch(console.error);
