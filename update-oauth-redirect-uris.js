#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

async function updateOAuthClientRedirectURIs() {
  try {
    console.log('🔧 AKTUALISIERE BESTEHENDEN OAUTH CLIENT MIT KORREKTEN REDIRECT URIs');

    // Load service account key
    const serviceAccountPath = './firebase-service-account-key.json';
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('Service Account Key file not found!');
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log('✅ Service Account geladen:', serviceAccount.client_email);

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
    console.log('✅ Google Auth Client erstellt');

    // Get access token
    const accessTokenResponse = await authClient.getAccessToken();
    const accessToken = accessTokenResponse.token;
    console.log('✅ Access Token erhalten');

    // Current OAuth Client ID that we want to update
    const currentClientId = '1753259666356-c2dc15bbc54d72aa.apps.googleusercontent.com';

    console.log('🔄 Aktualisiere OAuth Client:', currentClientId);

    // Use Google Cloud Console API to update the OAuth client
    const updateResponse = await fetch(
      `https://console.cloud.google.com/_/ConsoleUiGatewayApiService/UpdateOAuth2Client`,
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
            2: currentClientId, // client ID to update
            3: {
              1: 'Taskilo Newsletter OAuth Client', // name
              2: 1, // WEB application type
              3: {
                1: [
                  // CORRECTED REDIRECT URIs - this is the fix!
                  'https://taskilo.de/api/auth/google/callback',
                  'https://taskilo.vercel.app/api/auth/google/callback',
                  'http://localhost:3000/api/auth/google/callback',
                ],
                2: [
                  // JavaScript origins
                  'https://taskilo.de',
                  'https://taskilo.vercel.app',
                  'http://localhost:3000',
                ],
              },
            },
          },
        ]),
      }
    );

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('🎉 OAUTH CLIENT ERFOLGREICH AKTUALISIERT!');
      console.log('✅ Neue Redirect URIs:');
      console.log('  - https://taskilo.de/api/auth/google/callback');
      console.log('  - https://taskilo.vercel.app/api/auth/google/callback');
      console.log('  - http://localhost:3000/api/auth/google/callback');

      console.log('\n🚀 Client bleibt derselbe:');
      console.log('Client ID:', currentClientId);
      console.log('Client Secret: gEDFUZSgACdwKXnqilJXxzYw');

      return result;
    } else {
      const errorText = await updateResponse.text();
      console.log('❌ Update failed:', updateResponse.status, errorText);

      // Alternative: Try Google Cloud Resource Manager API
      console.log('\n🔄 Versuche alternative Update-Methode...');

      const cloudresourcemanager = google.cloudresourcemanager({
        version: 'v1',
        auth: authClient,
      });

      // Get OAuth2 API service
      const oauth2 = google.oauth2({ version: 'v2', auth: authClient });

      // Try to update via oauth2 API
      try {
        const updateViaAPI = await fetch(
          `https://oauth2.googleapis.com/v2/clients/${currentClientId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              redirect_uris: [
                'https://taskilo.de/api/auth/google/callback',
                'https://taskilo.vercel.app/api/auth/google/callback',
                'http://localhost:3000/api/auth/google/callback',
              ],
              javascript_origins: [
                'https://taskilo.de',
                'https://taskilo.vercel.app',
                'http://localhost:3000',
              ],
            }),
          }
        );

        if (updateViaAPI.ok) {
          const apiResult = await updateViaAPI.json();
          console.log('🎉 UPDATE VIA OAUTH2 API ERFOLGREICH!', apiResult);
          return apiResult;
        } else {
          console.log('❌ OAuth2 API Update auch fehlgeschlagen:', await updateViaAPI.text());
        }
      } catch (apiError) {
        console.log('❌ OAuth2 API Fehler:', apiError.message);
      }

      throw new Error(`Update fehlgeschlagen: ${errorText}`);
    }
  } catch (error) {
    console.error('💥 KRITISCHER FEHLER:', error.message);

    // Fallback: Show manual instructions
    console.log('\n📋 MANUELLE LÖSUNG:');
    console.log(
      '1. Gehe zu: https://console.cloud.google.com/apis/credentials?project=tilvo-f142f'
    );
    console.log(
      '2. Klicke auf den OAuth Client: 1753259666356-c2dc15bbc54d72aa.apps.googleusercontent.com'
    );
    console.log('3. Bearbeite "Authorized redirect URIs":');
    console.log('   - https://taskilo.de/api/auth/google/callback');
    console.log('   - https://taskilo.vercel.app/api/auth/google/callback');
    console.log('   - http://localhost:3000/api/auth/google/callback');
    console.log('4. Speichern');

    process.exit(1);
  }
}

updateOAuthClientRedirectURIs()
  .then(() => {
    console.log('\n✅ OAUTH CLIENT REDIRECT URIs ERFOLGREICH AKTUALISIERT!');
    console.log('🎯 Das sollte den "invalid_client" Fehler beheben!');
    console.log('🚀 Teste jetzt: https://taskilo.de/dashboard/admin/newsletter');
  })
  .catch(error => {
    console.error('\n💥 KRITISCHER FEHLER:', error.message);
    process.exit(1);
  });
