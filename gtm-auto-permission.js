#!/usr/bin/env node
// GTM Service Account Auto-Permission Script

const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.gtm' });

console.log('🚀 GTM Service Account Auto-Permission Setup');
console.log('=============================================');

async function autoSetupGTMPermissions() {
  try {
    // Service Account Info laden
    const serviceAccount = JSON.parse(
      fs.readFileSync('./firebase-service-account-key.json', 'utf8')
    );
    console.log(`📧 Service Account Email: ${serviceAccount.client_email}`);

    // GTM Management API Authentication
    const auth = new GoogleAuth({
      keyFilename: './firebase-service-account-key.json',
      scopes: [
        'https://www.googleapis.com/auth/tagmanager.manage.accounts',
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.publish',
      ],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    console.log('✅ GTM Management API Authentication erfolgreich');

    // Account und Container suchen
    console.log('\n🔍 Suche GTM Account und Container...');

    // Zuerst alle Accounts auflisten
    const accountsResponse = await makeHTTPSRequest(
      'https://www.googleapis.com/tagmanager/v2/accounts',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (accountsResponse.account && accountsResponse.account.length > 0) {
      console.log(`📊 Gefundene Accounts: ${accountsResponse.account.length}`);

      // GTM-TG3H7QHX Container in allen Accounts suchen
      for (const account of accountsResponse.account) {
        console.log(`🔍 Suche in Account: ${account.name} (${account.accountId})`);

        try {
          const containersResponse = await makeHTTPSRequest(
            `https://www.googleapis.com/tagmanager/v2/accounts/${account.accountId}/containers`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (containersResponse.container) {
            const targetContainer = containersResponse.container.find(
              c => c.publicId === 'GTM-TG3H7QHX'
            );

            if (targetContainer) {
              console.log('🎯 GTM-TG3H7QHX Container gefunden!');
              console.log(`   Account ID: ${account.accountId}`);
              console.log(`   Container ID: ${targetContainer.containerId}`);

              // Service Account zu Container hinzufügen
              console.log('\n🔐 Füge Service Account Berechtigung hinzu...');

              const userPermissionData = {
                accountAccess: {
                  permission: 'read',
                },
                containerAccess: [
                  {
                    containerId: targetContainer.containerId,
                    permission: 'edit',
                  },
                ],
              };

              const permissionResponse = await makeHTTPSRequest(
                `https://www.googleapis.com/tagmanager/v2/accounts/${account.accountId}/user_permissions`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken.token}`,
                    'Content-Type': 'application/json',
                  },
                  data: userPermissionData,
                }
              );

              console.log('✅ Service Account Berechtigung hinzugefügt!');

              // .env.gtm mit korrekten IDs aktualisieren
              let envContent = fs.readFileSync('.env.gtm', 'utf8');
              envContent = envContent.replace(
                /GTM_ACCOUNT_ID=\d+/,
                `GTM_ACCOUNT_ID=${account.accountId}`
              );
              envContent = envContent.replace(
                /GTM_CONTAINER_ID=GTM-TG3H7QHX/,
                `GTM_CONTAINER_ID=${targetContainer.containerId}`
              );

              if (!envContent.includes('GTM_CONTAINER_PUBLIC_ID')) {
                envContent += `\nGTM_CONTAINER_PUBLIC_ID=GTM-TG3H7QHX\n`;
              }

              fs.writeFileSync('.env.gtm', envContent);
              console.log('✅ .env.gtm mit korrekten IDs aktualisiert');

              // Test Upload
              console.log('\n🧪 Teste GTM Upload...');
              const { execSync } = require('child_process');

              try {
                const testResult = execSync(
                  'node gtm-upload-service-account.js gtm-dsgvo-triggers-fixed.json --dry-run',
                  {
                    encoding: 'utf8',
                    stdio: 'pipe',
                  }
                );
                console.log('✅ Upload Test erfolgreich!');
                console.log(testResult);

                console.log('\n🎉 BEREIT FÜR UPLOAD!');
                console.log('=====================');
                console.log(
                  'Führen Sie aus: node gtm-upload-service-account.js gtm-dsgvo-triggers-fixed.json'
                );
              } catch (testError) {
                console.log('⚠️  Upload Test Warnung:', testError.message);
                console.log('💡 Versuchen Sie trotzdem den Upload');
              }

              return; // Erfolgreich gefunden und konfiguriert
            }
          }
        } catch (containerError) {
          console.log(`   ❌ Container Fehler: ${containerError.message}`);
        }
      }

      console.log('\n❌ GTM-TG3H7QHX Container nicht gefunden in verfügbaren Accounts');
    } else {
      console.log('❌ Keine GTM Accounts mit Service Account Zugriff gefunden');
      console.log('\n💡 ALTERNATIVE LÖSUNG:');
      console.log('1. Gehen Sie zu https://tagmanager.google.com/');
      console.log('2. Wählen Sie GTM-TG3H7QHX Container');
      console.log('3. Admin > User Management');
      console.log(`4. Fügen Sie hinzu: ${serviceAccount.client_email}`);
      console.log('5. Berechtigung: Edit');
    }
  } catch (error) {
    console.error('❌ Auto-Setup Fehler:', error);
    console.log('\n💡 FALLBACK LÖSUNG:');
    console.log('Manueller Setup erforderlich über GTM Web Interface');
  }
}

function makeHTTPSRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const requestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(requestOptions, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.error?.message || data}`));
          }
        } catch (parseError) {
          reject(
            new Error(`Parse Error: ${parseError.message}. Response: ${data.substring(0, 200)}...`)
          );
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (options.data) {
      req.write(JSON.stringify(options.data));
    }

    req.end();
  });
}

// Script ausführen
autoSetupGTMPermissions();
