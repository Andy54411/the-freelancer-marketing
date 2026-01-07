const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envMatch = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY="(.+?)"\n/s);
if (!envMatch) {
  console.error('Could not find FIREBASE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}

// Initialize if not already
if (admin.apps.length === 0) {
  // The JSON has escaped quotes - replace them first
  let jsonStr = envMatch[1].replace(/\\"/g, '"');
  // Parse the JSON
  const serviceAccount = JSON.parse(jsonStr);
  // Fix the private key - replace literal \n with actual newlines
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkWhatsAppConnection() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  // Check whatsappConnection subcollection
  const connectionDoc = await db.collection('companies').doc(companyId).collection('whatsappConnection').doc('current').get();
  
  console.log('=== WhatsApp Connection ===');
  if (connectionDoc.exists) {
    const data = connectionDoc.data();
    console.log('Phone Number:', data.phoneNumber);
    console.log('Phone Number ID:', data.phoneNumberId);
    console.log('Is Connected:', data.isConnected);
    console.log('Status:', data.status);
    console.log('Connected At:', data.connectedAt);
    console.log('Has Access Token:', !!data.accessToken);
    console.log('WABA ID:', data.wabaId);
  } else {
    console.log('No connection found');
  }
  
  process.exit(0);
}

checkWhatsAppConnection().catch(e => { console.error(e); process.exit(1); });
