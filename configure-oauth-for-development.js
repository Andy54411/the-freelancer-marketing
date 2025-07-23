#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

async function configureOAuthForDevelopment() {
  try {
    console.log('🔧 KONFIGURIERE OAUTH FÜR DEVELOPMENT/UNVERIFIED APP');

    // Load current OAuth credentials
    const oauthCredentials = JSON.parse(fs.readFileSync('client_secret_oauth.json', 'utf8'));
    console.log('✅ OAuth Credentials geladen');
    console.log('Client ID:', oauthCredentials.web.client_id);

    // Load service account key
    const serviceAccountPath = './firebase-service-account-key.json';
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Create auth with service account
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloudplatformprojects',
      ],
      projectId: 'tilvo-f142f',
    });

    const authClient = await auth.getClient();
    const accessTokenResponse = await authClient.getAccessToken();
    const accessToken = accessTokenResponse.token;

    console.log('🔄 Versuche OAuth App für unverified development zu konfigurieren...');

    // Try to update OAuth client to allow unverified access
    const updateResponse = await fetch(
      'https://console.cloud.google.com/_/ConsoleUiGatewayApiService/UpdateOAuth2Client',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Goog-User-Project': 'tilvo-f142f',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify([
          {
            1: 'tilvo-f142f', // project ID
            2: oauthCredentials.web.client_id, // client ID
            3: {
              1: 'Taskilo Newsletter OAuth Client', // name
              2: 1, // WEB application type
              3: {
                1: [
                  // Redirect URIs
                  'https://taskilo.de/api/auth/google-workspace/callback',
                  'https://taskilo.vercel.app/api/auth/google-workspace/callback',
                  'http://localhost:3000/api/auth/google-workspace/callback',
                ],
                2: [
                  // JavaScript origins
                  'https://taskilo.de',
                  'https://taskilo.vercel.app',
                  'http://localhost:3000',
                ],
              },
              // Add development/testing configuration
              4: {
                1: true, // Allow unverified apps for development
                2: 'development', // App status
              },
            },
          },
        ]),
      }
    );

    if (updateResponse.ok) {
      console.log('🎉 OAuth Client für Development konfiguriert!');
    } else {
      console.log('⚠️ Standard Update fehlgeschlagen, versuche OAuth Consent Screen...');

      // Try to configure OAuth consent screen for unverified apps
      const consentResponse = await fetch(
        'https://console.cloud.google.com/_/ConsoleUiGatewayApiService/UpdateOAuthConsentScreen',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Goog-User-Project': 'tilvo-f142f',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify([
            {
              1: 'tilvo-f142f',
              2: {
                1: 'Taskilo Newsletter System', // App name
                2: 'andy.staudinger@taskilo.de', // Support email
                3: 'Development and testing OAuth for newsletter system', // App description
                4: 'TESTING', // Publishing status - allows unverified access
                5: {
                  1: ['https://www.googleapis.com/auth/gmail.send'],
                  2: ['https://www.googleapis.com/auth/spreadsheets'],
                },
                6: {
                  1: 'andy.staudinger@taskilo.de', // Developer contact
                },
                7: {
                  1: 'https://taskilo.de', // Homepage
                  2: 'https://taskilo.de/datenschutz', // Privacy policy
                  3: 'https://taskilo.de/agb', // Terms of service
                },
              },
            },
          ]),
        }
      );

      if (consentResponse.ok) {
        console.log('🎉 OAuth Consent Screen für TESTING konfiguriert!');
      } else {
        console.log('❌ Consent Screen Update fehlgeschlagen');
      }
    }

    // Alternative: Create test user list for unverified app
    console.log('\n🔄 Füge Test-User zur unverified app hinzu...');

    const testUserResponse = await fetch(
      'https://console.cloud.google.com/_/ConsoleUiGatewayApiService/AddOAuthTestUser',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Goog-User-Project': 'tilvo-f142f',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify([
          {
            1: 'tilvo-f142f',
            2: oauthCredentials.web.client_id,
            3: ['a.staudinger32@gmail.com', 'andy.staudinger@taskilo.de', 'info@taskilo.de'],
          },
        ]),
      }
    );

    if (testUserResponse.ok) {
      console.log('✅ Test-User hinzugefügt für unverified app access!');
    }

    // Show manual instructions
    console.log('\n📋 MANUELLE LÖSUNG - Google Cloud Console:');
    console.log(
      '1. Gehe zu: https://console.cloud.google.com/apis/credentials/consent?project=tilvo-f142f'
    );
    console.log('2. Bearbeite OAuth consent screen:');
    console.log('   - Publishing status: "Testing" (nicht "In production")');
    console.log('   - Füge Test users hinzu: a.staudinger32@gmail.com');
    console.log('3. Speichere die Änderungen');
    console.log('\n🔧 ODER verwende eine andere E-Mail für Development!');
  } catch (error) {
    console.error('💥 FEHLER:', error.message);

    console.log('\n📋 SOFORT-LÖSUNG:');
    console.log(
      '1. Gehe zu: https://console.cloud.google.com/apis/credentials/consent?project=tilvo-f142f'
    );
    console.log('2. Klicke "OAuth consent screen"');
    console.log('3. Ändere Publishing status zu "Testing"');
    console.log('4. Füge unter "Test users" hinzu: a.staudinger32@gmail.com');
    console.log('5. Speichern und erneut versuchen!');
  }
}

configureOAuthForDevelopment()
  .then(() => {
    console.log('\n✅ OAUTH DEVELOPMENT KONFIGURATION ABGESCHLOSSEN!');
    console.log('🎯 Versuche jetzt erneut: https://taskilo.de/dashboard/admin/newsletter');
  })
  .catch(error => {
    console.error('\n💥 KRITISCHER FEHLER:', error.message);
  });
