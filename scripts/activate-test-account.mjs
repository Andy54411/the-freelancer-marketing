// Aktiviere alle Premium-Module für Test-Account
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const TEST_COMPANY_ID = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';

// Manuell .env.local parsen (für mehrzeiliges JSON)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

// Finde FIREBASE_SERVICE_ACCOUNT_KEY Zeile und extrahiere den JSON-Wert
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+?)(?=\n[A-Z_]+=|$)/s);
if (!match) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY nicht in .env.local gefunden!');
  process.exit(1);
}

let serviceAccountKey = match[1].trim();
// Entferne äußere Anführungszeichen
if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
// Unescape die escaped quotes
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
// WICHTIG: \\n zu literal \n konvertieren (für JSON-String)
// Die escaped \\n in der .env werden zu literal backslash-n in der Datei
// JSON.parse braucht diese als echte \n Escape-Sequenz
serviceAccountKey = serviceAccountKey.replace(/\\\\n/g, '\\n');

const serviceAccount = JSON.parse(serviceAccountKey);

// Firebase Admin initialisieren (falls noch nicht initialisiert)
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function activateAllModules() {
  console.log('Aktiviere alle Premium-Module für Test-Account:', TEST_COMPANY_ID);
  
  const now = new Date();
  const farFuture = new Date('2099-12-31');
  
  // 1. Update Company modules Feld
  const companyRef = db.collection('companies').doc(TEST_COMPANY_ID);
  
  await companyRef.update({
    // Alle Premium-Module aktivieren
    modules: {
      whatsapp: true,
      advertising: true,
      recruiting: true,
      workspace: true,
    },
    activeModules: ['whatsapp', 'advertising', 'recruiting', 'workspace'],
    // Markiere als Test-Account mit unbegrenztem Zugang
    isTestAccount: true,
    testAccountNoExpiry: true,
    // Trial-Daten überschreiben
    trialEndDate: farFuture,
    trialExpired: false,
    subscriptionStatus: 'active',
    updatedAt: now,
  });
  
  console.log('Company-Dokument aktualisiert');
  
  // 2. Erstelle module_subscriptions für jedes Modul
  const premiumModules = [
    { id: 'whatsapp', name: 'WhatsApp Business', priceNet: 12.60, priceGross: 14.99 },
    { id: 'advertising', name: 'Taskilo Advertising', priceNet: 21.00, priceGross: 24.99 },
    { id: 'recruiting', name: 'Recruiting', priceNet: 16.80, priceGross: 19.99 },
    { id: 'workspace', name: 'Workspace Pro', priceNet: 8.39, priceGross: 9.99 },
  ];
  
  const subscriptionsRef = companyRef.collection('module_subscriptions');
  
  for (const module of premiumModules) {
    const subDoc = await subscriptionsRef.doc(module.id).get();
    
    const subscriptionData = {
      companyId: TEST_COMPANY_ID,
      moduleId: module.id,
      moduleName: module.name,
      priceNet: module.priceNet,
      priceGross: module.priceGross,
      vatRate: 19,
      billingInterval: 'monthly',
      status: 'active',
      trialUsed: true,
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: farFuture,
      nextBillingDate: null,
      isTestAccount: true,
      testAccountNoExpiry: true,
      createdAt: subDoc.exists ? subDoc.data().createdAt : now,
      updatedAt: now,
    };
    
    await subscriptionsRef.doc(module.id).set(subscriptionData, { merge: true });
    console.log('Modul-Subscription erstellt/aktualisiert:', module.name);
  }
  
  console.log('\nFERTIG! Test-Account hat jetzt alle Premium-Module aktiv.');
  console.log('   - WhatsApp Business');
  console.log('   - Taskilo Advertising');
  console.log('   - Recruiting');
  console.log('   - Workspace Pro');
  console.log('\n   Diese laufen bis 2099-12-31 und werden nicht berechnet.');
}

activateAllModules()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fehler:', err);
    process.exit(1);
  });
