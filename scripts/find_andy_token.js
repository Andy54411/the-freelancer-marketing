
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

async function findAndyToken() {
  console.log('Searching for Andy Staudinger user...');
  const users = await db.collection('users').where('email', '==', 'andy.staudinger@taskilo.de').get();
  
  if (users.empty) {
    console.log('User not found');
    return;
  }

  const user = users.docs[0];
  console.log(`Found user: ${user.id}`);
  
  // Check companies where this user is owner/member
  // Assuming user ID is the company ID or there's a mapping. 
  // Let's check the company with the same ID as user first (common pattern)
  // Or check 'companies' where 'ownerId' == user.id
  
  const companies = await db.collection('companies').where('ownerId', '==', user.id).get();
  console.log(`Found ${companies.size} companies owned by user`);

  for (const doc of companies.docs) {
    console.log(`Checking company: ${doc.id}`);
    const connectionDoc = await doc.ref.collection('advertising_connections').doc('google-ads').get();
    if (connectionDoc.exists) {
      const data = connectionDoc.data();
      if (data.refresh_token) {
        console.log('✅ FOUND REFRESH TOKEN:', data.refresh_token);
      }
    }
  }
}

findAndyToken();
