const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('/Users/andystaudinger/Downloads/tilvo-f142f-firebase-adminsdk-fbsvc-e78b138c09.json');

const app = initializeApp({ credential: cert(serviceAccount) }, 'check-gmail-' + Date.now());
const db = getFirestore(app);

async function checkGmailScopes() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  
  // Check gmail config
  const gmailDoc = await db.collection('companies').doc(companyId).collection('emailConfigs').doc('gmail').get();
  
  if (gmailDoc.exists) {
    const data = gmailDoc.data();
    console.log('=== GMAIL CONFIG ===');
    console.log('email:', data.email);
    console.log('isConnected:', data.isConnected);
    console.log('provider:', data.provider);
    console.log('');
    console.log('=== SCOPES (stored in Firestore) ===');
    console.log('scope:', data.scope);
    console.log('grantedScopes:', data.grantedScopes);
    console.log('');
    console.log('=== TOKEN INFO ===');
    console.log('access_token exists:', !!data.access_token);
    console.log('refresh_token exists:', !!data.refresh_token);
    console.log('expiry_date:', data.expiry_date ? new Date(data.expiry_date).toISOString() : 'none');
    
    // Check actual token scopes via Google API
    if (data.access_token) {
      console.log('');
      console.log('=== CHECKING GOOGLE TOKEN INFO ===');
      const https = require('https');
      
      const url = `https://oauth2.googleapis.com/tokeninfo?access_token=${data.access_token}`;
      
      return new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const tokenInfo = JSON.parse(body);
              console.log('Google Token Info:');
              console.log('- scope:', tokenInfo.scope);
              console.log('- expires_in:', tokenInfo.expires_in, 'seconds');
              console.log('- error:', tokenInfo.error);
              console.log('- error_description:', tokenInfo.error_description);
              
              // Check for gmail.modify
              if (tokenInfo.scope) {
                const scopes = tokenInfo.scope.split(' ');
                console.log('');
                console.log('=== SCOPE ANALYSIS ===');
                console.log('Has gmail.readonly:', scopes.some(s => s.includes('gmail.readonly')));
                console.log('Has gmail.modify:', scopes.some(s => s.includes('gmail.modify')));
                console.log('Has gmail.send:', scopes.some(s => s.includes('gmail.send')));
              }
              resolve();
            } catch (e) {
              console.log('Failed to parse token info:', body);
              resolve();
            }
          });
        }).on('error', (e) => {
          console.log('Error checking token:', e.message);
          resolve();
        });
      });
    }
  } else {
    console.log('No Gmail config found for company:', companyId);
  }
}

checkGmailScopes().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
