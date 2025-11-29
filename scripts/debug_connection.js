
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

// Initialize Firebase Admin
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    let cleanKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
      cleanKey = cleanKey.slice(1, -1);
    }
    cleanKey = cleanKey.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    
    // Fix private key newlines if needed
    cleanKey = cleanKey.replace(/"private_key":\s*"([^"]*)"/, (match, privateKey) => {
        const fixedPrivateKey = privateKey.replace(/\\n/g, '\n').replace(/\n+/g, '\n');
        return `"private_key": "${fixedPrivateKey.replace(/\n/g, '\\n')}"`;
    });

    serviceAccount = JSON.parse(cleanKey);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  } else {
    serviceAccount = require(path.join(process.cwd(), 'firebase-config.json'));
  }
} catch (e) {
  console.error('Failed to load service account:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkConnection() {
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  console.log(`Checking connection for company: ${companyId}`);

  try {
    const docRef = db.collection('companies').doc(companyId).collection('advertising_connections').doc('google-ads');
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log('❌ Document does not exist!');
    } else {
      console.log('✅ Document exists!');
      const data = doc.data();
      console.log('Data:', JSON.stringify(data, null, 2));
      
      if (!data.refresh_token) console.log('❌ Missing refresh_token');
      else console.log('✅ Has refresh_token');
      
      if (!data.customer_id) console.log('❌ Missing customer_id');
      else console.log('✅ Has customer_id');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkConnection();
