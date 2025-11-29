
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

// Initialize Firebase
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    let cleanKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
      cleanKey = cleanKey.slice(1, -1);
    }
    cleanKey = cleanKey.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    
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

async function findManagerToken() {
  console.log('Searching for Manager Account (655-923-8498) token...');
  const companies = await db.collection('companies').get();
  
  for (const doc of companies.docs) {
    const connectionDoc = await doc.ref.collection('advertising_connections').doc('google-ads').get();
    if (connectionDoc.exists) {
      const data = connectionDoc.data();
      const cid = data.customer_id || data.customerId;
      // Check for Manager ID (formatted or unformatted)
      if (cid === '655-923-8498' || cid === '6559238498') {
        console.log(`FOUND Manager Account in company: ${doc.id}`);
        if (data.refresh_token) {
            console.log('✅ Has refresh_token:', data.refresh_token.substring(0, 10) + '...');
            console.log('FULL_TOKEN_FOR_ENV:', data.refresh_token);
        } else {
            console.log('❌ No refresh_token found in manager doc');
        }
      }
    }
  }
}

findManagerToken();
