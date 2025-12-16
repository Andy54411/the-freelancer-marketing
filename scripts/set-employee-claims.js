require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const admin = require('firebase-admin');

let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY nicht gefunden');
  process.exit(1);
}

// Clean escaped characters (same logic as server.ts)
let cleanKey = serviceAccountKey.trim();

// Remove outer quotes if present
if (
  (cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
  (cleanKey.startsWith("'") && cleanKey.endsWith("'"))
) {
  cleanKey = cleanKey.slice(1, -1);
}

// Replace escaped quotes and newlines
cleanKey = cleanKey.replace(/\\"/g, '"');
cleanKey = cleanKey.replace(/\\n/g, '\n');
cleanKey = cleanKey.replace(/\\r/g, '\r');
cleanKey = cleanKey.replace(/\\t/g, '\t');
cleanKey = cleanKey.replace(/\\\\/g, '\\');

const serviceAccount = JSON.parse(cleanKey);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function setEmployeeClaims() {
  const authUid = 'nLaG0XC2nvNjsqZNpLwoThvLHNk1';
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  const employeeId = 'Oij8EPXKb7g2YohST6nu';
  
  await admin.auth().setCustomUserClaims(authUid, {
    role: 'mitarbeiter',
    companyId: companyId,
    employeeId: employeeId
  });
  
  console.log('Custom Claims gesetzt für:', authUid);
  console.log('companyId:', companyId);
  console.log('employeeId:', employeeId);
  
  // Verifizieren
  const user = await admin.auth().getUser(authUid);
  console.log('Verifiziert:', user.customClaims);
}

setEmployeeClaims()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
