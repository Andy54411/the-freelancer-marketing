
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { GoogleAdsApi } = require('google-ads-api');

// 1. Load Environment Variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

// 2. Initialize Firebase
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

// 3. Test Logic
async function testSearch() {
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  const query = 'Friseur';

  console.log(`Testing search for company: ${companyId}, query: "${query}"`);

  // Fetch Connection Data
  const connectionDoc = await db.collection('companies').doc(companyId).collection('advertising_connections').doc('google-ads').get();
  
  if (!connectionDoc.exists) {
    console.error('Connection doc not found');
    return;
  }

  const connectionData = connectionDoc.data();
  console.log('Connection Data:', JSON.stringify(connectionData, null, 2));

  // Determine Credentials
  let refreshToken = connectionData.refresh_token;
  let loginCustomerId = undefined;

  if (!refreshToken && process.env.GOOGLE_ADS_MANAGER_REFRESH_TOKEN) {
    console.log('Using Manager Account Fallback');
    refreshToken = process.env.GOOGLE_ADS_MANAGER_REFRESH_TOKEN;
    loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  }

  const customerId = connectionData.customer_id || connectionData.customerId;

  console.log('Credentials:', {
    clientId: process.env.GOOGLE_CLIENT_ID ? '***' : 'MISSING',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '***' : 'MISSING',
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? '***' : 'MISSING',
    refreshToken: refreshToken ? '***' : 'MISSING',
    customerId,
    loginCustomerId
  });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    console.error('Missing API Configuration');
    return;
  }

  // Initialize Client
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: refreshToken,
    login_customer_id: loginCustomerId,
  });

  // Execute Queries
  const userInterestQuery = `
    SELECT 
      user_interest.user_interest_id, 
      user_interest.name, 
      user_interest.taxonomy_type,
      user_interest.user_interest_parent
    FROM user_interest 
    WHERE 
      user_interest.name LIKE '%${query}%' 
      AND user_interest.status = 'ENABLED'
    LIMIT 50
  `;

  const demographicQuery = `
    SELECT 
      detailed_demographic.detailed_demographic_id, 
      detailed_demographic.name, 
      detailed_demographic.parent
    FROM detailed_demographic 
    WHERE 
      detailed_demographic.name LIKE '%${query}%' 
    LIMIT 20
  `;

  try {
    console.log('Executing queries...');
    const [interestResults, demographicResults] = await Promise.all([
      customer.query(userInterestQuery),
      customer.query(demographicQuery)
    ]);

    console.log(`Interests found: ${interestResults.length}`);
    console.log(`Demographics found: ${demographicResults.length}`);
    
    if (interestResults.length > 0) {
        console.log('First Interest:', JSON.stringify(interestResults[0], null, 2));
    }

  } catch (error) {
    console.error('API Error:', error);
    if (error.errors) {
        console.error('Google Ads Errors:', JSON.stringify(error.errors, null, 2));
    }
  }
}

testSearch();
