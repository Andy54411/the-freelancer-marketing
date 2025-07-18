#!/usr/bin/env node
// GTM Service Account Setup & Upload

const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.gtm' });

console.log('� GTM Service Account Setup & Upload');
console.log('=====================================');

async function setupAndUpload() {
  try {
    // Service Account Email anzeigen
    const serviceAccount = JSON.parse(
      fs.readFileSync('./firebase-service-account-key.json', 'utf8')
    );

    console.log('📧 WICHTIG: Fügen Sie diese Email-Adresse zu GTM hinzu:');
    console.log('=======================================================');
    console.log(`📮 ${serviceAccount.client_email}`);
    console.log('=======================================================');
    console.log('');
    console.log('🎯 SCHRITTE IN GTM (wo Sie gerade sind):');
    console.log('1. Klicken Sie auf das "+" Symbol oder "Benutzer hinzufügen"');
    console.log('2. Fügen Sie diese Email ein: ' + serviceAccount.client_email);
    console.log('3. Wählen Sie Berechtigung: "Bearbeiten" oder "Edit"');
    console.log('4. Klicken Sie "Einladen"');
    console.log('');
    console.log('⏳ Warten Sie 30 Sekunden, dann drücken Sie Enter...');

    // Warten auf Benutzer Input
    await waitForUserInput();

    console.log('🔄 Versuche GTM Upload...');

    // Service Account Authentication
    const auth = new GoogleAuth({
      keyFilename: './firebase-service-account-key.json',
      scopes: [
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.publish',
      ],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    console.log('✅ Service Account Authentication erfolgreich');

    // Alle Container für den Account auflisten
    const accountsUrl = 'https://www.googleapis.com/tagmanager/v2/accounts';

    console.log('📡 Suche verfügbare GTM Accounts...');

    const accountsResponse = await makeHTTPSRequest(accountsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (accountsResponse.account && accountsResponse.account.length > 0) {
      console.log('✅ GTM Accounts gefunden');

      // Nach GTM-TG3H7QHX Container suchen
      let targetContainer = null;
      let targetAccount = null;

      for (const account of accountsResponse.account) {
        const containersUrl = `https://www.googleapis.com/tagmanager/v2/accounts/${account.accountId}/containers`;

        try {
          const containerResponse = await makeHTTPSRequest(containersUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            },
          });

          if (containerResponse.container) {
            const container = containerResponse.container.find(c => c.publicId === 'GTM-TG3H7QHX');
            if (container) {
              targetContainer = container;
              targetAccount = account;
              break;
            }
          }
        } catch (error) {
          // Weiter mit nächstem Account
        }
      }

      if (targetContainer && targetAccount) {
        console.log('🎯 GTM-TG3H7QHX Container gefunden!');
        console.log(`✅ Account: ${targetAccount.accountId}`);
        console.log(`✅ Container ID: ${targetContainer.containerId}`);

        // .env.gtm aktualisieren
        let envContent = fs.readFileSync('.env.gtm', 'utf8');
        envContent = envContent.replace(
          /GTM_ACCOUNT_ID=1022290879475/,
          `GTM_ACCOUNT_ID=${targetAccount.accountId}`
        );
        envContent = envContent.replace(
          /GTM_CONTAINER_ID=GTM-TG3H7QHX/,
          `GTM_CONTAINER_ID=${targetContainer.containerId}`
        );
        fs.writeFileSync('.env.gtm', envContent);

        console.log('✅ .env.gtm aktualisiert');

        // Jetzt Upload durchführen
        console.log('🚀 Starte DSGVO-Trigger Upload...');
        await uploadDSGVOTriggers(
          accessToken.token,
          targetAccount.accountId,
          targetContainer.containerId
        );
      } else {
        console.log('❌ GTM-TG3H7QHX Container nicht gefunden');
        console.log('💡 Möglicherweise wurde der Service Account noch nicht hinzugefügt');
        console.log('   Versuchen Sie es in 1-2 Minuten erneut');
      }
    } else {
      console.log('❌ Keine GTM Accounts gefunden');
      console.log('💡 Service Account wurde möglicherweise noch nicht hinzugefügt');
    }
  } catch (error) {
    console.error('❌ Fehler beim Setup:', error);
  }
}

async function uploadDSGVOTriggers(accessToken, accountId, containerId) {
  try {
    const configData = JSON.parse(fs.readFileSync('gtm-dsgvo-triggers-fixed.json', 'utf8'));
    const baseUrl = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`;

    // Variablen erstellen
    if (configData.variables) {
      console.log(`📊 Erstelle ${configData.variables.length} Variablen...`);

      for (const variable of configData.variables) {
        try {
          const result = await makeHTTPSRequest(
            `${baseUrl}/variables`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
            variable
          );

          console.log(`   ✅ Variable "${variable.name}" erstellt`);
        } catch (error) {
          console.log(`   ❌ Variable "${variable.name}": ${error.message}`);
        }
      }
    }

    // Trigger erstellen
    if (configData.triggers) {
      console.log(`🎯 Erstelle ${configData.triggers.length} Trigger...`);

      for (const trigger of configData.triggers) {
        try {
          const result = await makeHTTPSRequest(
            `${baseUrl}/triggers`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
            trigger
          );

          console.log(`   ✅ Trigger "${trigger.name}" erstellt`);
        } catch (error) {
          console.log(`   ❌ Trigger "${trigger.name}": ${error.message}`);
        }
      }
    }

    console.log('🎉 DSGVO-Trigger Upload abgeschlossen!');
    console.log('💡 Gehen Sie zu GTM und veröffentlichen Sie die Änderungen');
  } catch (error) {
    console.error('❌ Upload Fehler:', error);
  }
}

function waitForUserInput() {
  return new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

function makeHTTPSRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const requestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(requestOptions, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(
              new Error(`API Error ${res.statusCode}: ${jsonData.error?.message || responseData}`)
            );
          }
        } catch (parseError) {
          reject(
            new Error(
              `Parse Error: ${parseError.message}. Response: ${responseData.substring(0, 200)}...`
            )
          );
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Script ausführen
setupAndUpload();
