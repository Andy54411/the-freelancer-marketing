#!/usr/bin/env node
// GTM API Authentication Setup

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 GTM API Authentication Setup');
console.log('================================\n');

// Google Cloud Projekt Setup
console.log('1. Google Cloud Projekt Setup:');
console.log('   - Gehen Sie zu: https://console.cloud.google.com/');
console.log('   - Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes aus');
console.log('   - Aktivieren Sie die "Tag Manager API"');
console.log('   - Gehen Sie zu "APIs & Services" > "Credentials"');
console.log('   - Erstellen Sie OAuth 2.0 Client IDs\n');

// OAuth Setup
console.log('2. OAuth 2.0 Setup:');
console.log('   - Application Type: Desktop Application');
console.log('   - Name: GTM VS Code Integration');
console.log('   - Laden Sie die client_secret.json herunter\n');

// Scopes Info
console.log('3. Erforderliche Scopes:');
console.log('   - https://www.googleapis.com/auth/tagmanager.edit.containers');
console.log('   - https://www.googleapis.com/auth/tagmanager.publish\n');

// Erstelle .env Template
const envTemplate = `# GTM API Konfiguration
GTM_AUTH_TOKEN=your-oauth-token-here
GTM_API_KEY=your-api-key-here
GTM_ACCOUNT_ID=1022290879475
GTM_CONTAINER_ID=GTM-TG3H7QHX

# Google Cloud Projekt
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# OAuth 2.0 Konfiguration
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
`;

fs.writeFileSync('.env.gtm', envTemplate);
console.log('✅ .env.gtm Template erstellt');

// Erstelle OAuth Helper Script
const oauthHelper = `#!/usr/bin/env node
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
  
  return \`https://accounts.google.com/o/oauth2/v2/auth?\` +
    \`client_id=\${CLIENT_ID}&\` +
    \`redirect_uri=\${redirectUri}&\` +
    \`scope=\${scope}&\` +
    \`response_type=code&\` +
    \`access_type=offline&\` +
    \`prompt=consent\`;
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
    console.log('\\n' + generateAuthUrl() + '\\n');
    console.log('Nach der Autorisierung erhalten Sie einen Code.');
    console.log('Führen Sie dann aus: node oauth-helper.js <code>');
    
    // Automatisch URL öffnen
    try {
      execSync(\`open "\${generateAuthUrl()}"\`);
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
      console.log(\`Access Token: \${tokens.access_token}\`);
      console.log(\`Refresh Token: \${tokens.refresh_token}\`);
      
      // Aktualisiere .env.gtm
      let envContent = fs.readFileSync('.env.gtm', 'utf8');
      envContent = envContent.replace(/GTM_AUTH_TOKEN=.*/, \`GTM_AUTH_TOKEN=\${tokens.access_token}\`);
      envContent += \`\\nGTM_REFRESH_TOKEN=\${tokens.refresh_token}\\n\`;
      
      fs.writeFileSync('.env.gtm', envContent);
      console.log('✅ .env.gtm aktualisiert');
      
    } catch (error) {
      console.error('❌ Fehler beim Token-Austausch:', error.message);
      process.exit(1);
    }
  }
}

main();
`;

fs.writeFileSync('oauth-helper.js', oauthHelper);
fs.chmodSync('oauth-helper.js', '755');
console.log('✅ oauth-helper.js erstellt');

// Package.json Script hinzufügen
const packageJsonPath = 'package.json';
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  packageJson.scripts['gtm:auth'] = 'node oauth-helper.js';
  packageJson.scripts['gtm:upload'] = 'node gtm-upload.js';
  packageJson.scripts['gtm:upload-dry'] = 'node gtm-upload.js --dry-run';

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json Scripts hinzugefügt');
}

// Gitignore aktualisieren
const gitignorePath = '.gitignore';
if (fs.existsSync(gitignorePath)) {
  let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  if (!gitignoreContent.includes('.env.gtm')) {
    gitignoreContent += '\n# GTM API Konfiguration\n.env.gtm\nclient_secret.json\n';
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✅ .gitignore aktualisiert');
  }
}

console.log('\n🎉 Setup abgeschlossen!');
console.log('\nNächste Schritte:');
console.log('1. Bearbeiten Sie .env.gtm mit Ihren Google Cloud Credentials');
console.log('2. Führen Sie aus: npm run gtm:auth');
console.log('3. Folgen Sie den OAuth-Anweisungen');
console.log('4. Testen Sie mit: npm run gtm:upload-dry');
console.log('5. Laden Sie hoch mit: npm run gtm:upload');
