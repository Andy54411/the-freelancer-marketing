#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔥 GTM API Setup mit Firebase Service Account');
console.log('===========================================');

// Service Account Pfad
const serviceAccountPath = './firebase-service-account-key.json';

try {
  // Service Account laden
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  console.log('✅ Firebase Service Account gefunden');
  console.log(`   Projekt: ${serviceAccount.project_id}`);
  console.log(`   Email: ${serviceAccount.client_email}`);

  // .env.gtm mit Service Account Daten aktualisieren
  const envGtmPath = '.env.gtm';
  let envContent = fs.readFileSync(envGtmPath, 'utf8');

  // Service Account Daten einsetzen
  envContent = envContent.replace(
    'GTM_API_KEY=AIzaSyD_jf9CiuvGKMK7wUw9mu-NkUIJDzoMusw',
    `GTM_API_KEY=${serviceAccount.private_key_id || 'AIzaSyD_jf9CiuvGKMK7wUw9mu-NkUIJDzoMusw'}`
  );

  envContent = envContent.replace(
    'GOOGLE_CLIENT_ID=112284971720513566837',
    `GOOGLE_CLIENT_ID=${serviceAccount.client_id}`
  );

  // Service Account Pfad hinzufügen
  if (!envContent.includes('GOOGLE_SERVICE_ACCOUNT_PATH')) {
    envContent += '\n# Firebase Service Account\n';
    envContent += `GOOGLE_SERVICE_ACCOUNT_PATH=${serviceAccountPath}\n`;
  }

  fs.writeFileSync(envGtmPath, envContent);

  console.log('✅ .env.gtm mit Service Account Daten aktualisiert');

  // GTM Upload Script für Service Account anpassen
  const gtmUploadPath = 'gtm-upload.js';
  if (fs.existsSync(gtmUploadPath)) {
    let uploadScript = fs.readFileSync(gtmUploadPath, 'utf8');

    // Service Account Authentication hinzufügen
    const serviceAccountAuth = `
// Service Account Authentication
const { GoogleAuth } = require('google-auth-library');

class GTMServiceAccountClient {
  constructor() {
    this.auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
      scopes: [
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.publish'
      ]
    });
  }

  async getAccessToken() {
    try {
      const client = await this.auth.getClient();
      const accessToken = await client.getAccessToken();
      return accessToken.token;
    } catch (error) {
      console.error('❌ Service Account Authentication Error:', error);
      throw error;
    }
  }
}
`;

    // Falls nicht bereits vorhanden, Service Account Auth hinzufügen
    if (!uploadScript.includes('GTMServiceAccountClient')) {
      uploadScript = serviceAccountAuth + uploadScript;
      fs.writeFileSync(gtmUploadPath, uploadScript);
      console.log('✅ GTM Upload Script für Service Account aktualisiert');
    }
  }

  console.log('\n🚀 BEREIT FÜR GTM API!');
  console.log('===================');
  console.log('1. Service Account Authentication ist konfiguriert');
  console.log('2. Führen Sie aus: npm run gtm:auth-service');
  console.log('3. Testen Sie mit: npm run gtm:upload-dry');
  console.log('4. Laden Sie hoch mit: npm run gtm:upload');
} catch (error) {
  console.error('❌ Fehler beim Setup:', error);
  console.log('\n💡 Stellen Sie sicher, dass firebase-service-account-key.json existiert');
}
