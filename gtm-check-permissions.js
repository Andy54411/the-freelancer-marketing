#!/usr/bin/env node
// GTM Account & Permissions Check

const { GoogleAuth } = require('google-auth-library');
const https = require('https');
require('dotenv').config({ path: '.env.gtm' });

console.log('🔍 GTM Account & Permissions Check');
console.log('===================================');

async function checkGTMPermissions() {
  try {
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

    // Service Account Email abrufen
    const fs = require('fs');
    const serviceAccount = JSON.parse(
      fs.readFileSync('./firebase-service-account-key.json', 'utf8')
    );
    console.log(`📧 Service Account Email: ${serviceAccount.client_email}`);

    // Alle Accounts auflisten
    console.log('\n📡 Suche verfügbare GTM Accounts...');
    const accountsUrl = 'https://www.googleapis.com/tagmanager/v2/accounts';

    const response = await makeHTTPSRequest(accountsUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Accounts Response erhalten');

    if (response.account && response.account.length > 0) {
      console.log('\n📊 Verfügbare GTM Accounts:');
      response.account.forEach((account, index) => {
        console.log(`${index + 1}. Name: ${account.name}`);
        console.log(`   Account ID: ${account.accountId}`);
        console.log(`   Path: ${account.path}`);
        console.log('   ---');
      });

      // Jetzt Container für jeden Account suchen
      for (const account of response.account) {
        console.log(`\n🔍 Suche Container für Account: ${account.accountId}`);
        try {
          const containersUrl = `https://www.googleapis.com/tagmanager/v2/accounts/${account.accountId}/containers`;
          const containerResponse = await makeHTTPSRequest(containersUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            },
          });

          if (containerResponse.container && containerResponse.container.length > 0) {
            console.log(`   📦 Container in Account ${account.accountId}:`);
            containerResponse.container.forEach((container, index) => {
              console.log(`   ${index + 1}. Name: ${container.name}`);
              console.log(`      Public ID: ${container.publicId}`);
              console.log(`      Container ID: ${container.containerId}`);

              if (container.publicId === 'GTM-TG3H7QHX') {
                console.log(`      🎯 GEFUNDEN: GTM-TG3H7QHX!`);
                console.log(`      ✅ Numerische ID: ${container.containerId}`);
                console.log(`      ✅ Account ID: ${account.accountId}`);
              }
            });
          } else {
            console.log(`   ❌ Keine Container in Account ${account.accountId}`);
          }
        } catch (containerError) {
          console.log(
            `   ❌ Container Error für Account ${account.accountId}:`,
            containerError.message
          );
        }
      }
    } else {
      console.log('\n❌ Keine GTM Accounts gefunden');
      console.log('🚨 PROBLEM: Service Account hat keinen Zugriff auf GTM');
      console.log('\n💡 LÖSUNG:');
      console.log('1. Gehen Sie zu https://tagmanager.google.com/');
      console.log('2. Wählen Sie Ihren GTM Container');
      console.log('3. Gehen Sie zu Admin > Container Settings > User Management');
      console.log(`4. Fügen Sie diese Email hinzu: ${serviceAccount.client_email}`);
      console.log('5. Geben Sie "Edit" Berechtigung');
    }
  } catch (error) {
    console.error('❌ Fehler beim Prüfen der GTM Permissions:', error);
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
          resolve(jsonData);
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

    req.end();
  });
}

// Script ausführen
checkGTMPermissions();
