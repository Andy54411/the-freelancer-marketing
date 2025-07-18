#!/usr/bin/env node
// OAuth Token Generator für GTM API

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

// Lade Konfiguration
require('dotenv').config({ path: '.env.gtm' });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

const SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.publish'
];

function generateAuthUrl() {
  const scope = encodeURIComponent(SCOPES.join(' '));
  const redirectUri = encodeURIComponent(REDIRECT_URI);
  
  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${redirectUri}&` +
    `scope=${scope}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `prompt=consent`;
}

async function exchangeCodeForToken(code) {
  const postData = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error_description || response.error));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ CLIENT_ID und CLIENT_SECRET müssen in .env.gtm gesetzt werden');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔗 Öffnen Sie diese URL in Ihrem Browser:');
    console.log('\n' + generateAuthUrl() + '\n');
    console.log('Nach der Autorisierung erhalten Sie einen Code.');
    console.log('Führen Sie dann aus: node oauth-helper.js <code>');
    
    // Automatisch URL öffnen
    try {
      execSync(`open "${generateAuthUrl()}"`);
    } catch (e) {
      // Fallback für andere Systeme
      console.log('(URL wird automatisch geöffnet)');
    }
    
  } else {
    const code = args[0];
    try {
      console.log('🔄 Tausche Code gegen Token...');
      const tokens = await exchangeCodeForToken(code);
      
      console.log('✅ Token erfolgreich erhalten!');
      console.log(`Access Token: ${tokens.access_token}`);
      console.log(`Refresh Token: ${tokens.refresh_token}`);
      
      // Aktualisiere .env.gtm
      let envContent = fs.readFileSync('.env.gtm', 'utf8');
      envContent = envContent.replace(/GTM_AUTH_TOKEN=.*/, `GTM_AUTH_TOKEN=${tokens.access_token}`);
      envContent += `\nGTM_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      
      fs.writeFileSync('.env.gtm', envContent);
      console.log('✅ .env.gtm aktualisiert');
      
    } catch (error) {
      console.error('❌ Fehler beim Token-Austausch:', error.message);
      process.exit(1);
    }
  }
}

main();
