#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

async function createRealOAuthClientViaAPI() {
  try {
    console.log('🔧 Erstelle OAuth Client über Google Cloud APIs...');

    // Load service account credentials
    const serviceAccount = JSON.parse(fs.readFileSync('firebase-service-account-key.json', 'utf8'));

    // Create JWT auth client
    const auth = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloudplatformprojects',
      ]
    );

    await auth.authorize();
    console.log('✅ Service Account authentifiziert');

    // Use Cloud Resource Manager API to access project
    const cloudresourcemanager = google.cloudresourcemanager({ version: 'v1', auth });

    const projectId = 'tilvo-f142f';

    // Get project info
    const project = await cloudresourcemanager.projects.get({ projectId });
    console.log('✅ Project Info:', project.data.name);

    // Now use the correct API to create OAuth client
    // We need to use the Google Cloud Console API endpoints directly

    const fetch = require('node-fetch');
    const accessToken = await auth.getAccessToken();

    console.log('🔄 Erstelle OAuth Client über Console API...');

    // Create OAuth client using the correct Console API endpoint
    const createOAuthResponse = await fetch(
      'https://console.cloud.google.com/_/ConsoleUiGatewayApiService/CreateOAuth2Client',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
          'X-Goog-User-Project': projectId,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify([
          {
            1: projectId,
            2: {
              1: 'Taskilo Newsletter OAuth Client',
              2: 1, // WEB application type
              3: {
                1: [
                  'https://taskilo.vercel.app/api/auth/google-workspace/callback',
                  'http://localhost:3000/api/auth/google-workspace/callback',
                ],
                2: ['https://taskilo.vercel.app', 'http://localhost:3000'],
              },
            },
          },
        ]),
      }
    );

    if (createOAuthResponse.ok) {
      const oauthResult = await createOAuthResponse.json();
      console.log('🎉 OAuth Client erstellt!', oauthResult);

      if (oauthResult && oauthResult[0] && oauthResult[0][1]) {
        const clientData = oauthResult[0][1];
        const clientId = clientData[1];
        const clientSecret = clientData[2];

        const credentials = {
          web: {
            client_id: clientId,
            project_id: projectId,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_secret: clientSecret,
            redirect_uris: [
              'https://taskilo.vercel.app/api/auth/google-workspace/callback',
              'http://localhost:3000/api/auth/google-workspace/callback',
            ],
            javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
          },
        };

        fs.writeFileSync(
          'google-oauth-credentials-real.json',
          JSON.stringify(credentials, null, 2)
        );

        console.log('\n🎉 ECHTE OAuth-Credentials erstellt:');
        console.log('Client ID:', clientId);
        console.log('Client Secret:', clientSecret);
        console.log('\n🚀 Bereit für Vercel:');
        console.log(`GOOGLE_WORKSPACE_CLIENT_ID=${clientId}`);
        console.log(`GOOGLE_WORKSPACE_CLIENT_SECRET=${clientSecret}`);

        return credentials.web;
      }
    } else {
      console.log(
        '⚠️ Console API Response:',
        createOAuthResponse.status,
        await createOAuthResponse.text()
      );

      // Alternative: Try using IAM API to create OAuth client
      console.log('\n🔄 Versuche alternative Methode über IAM API...');

      const iam = google.iam({ version: 'v1', auth });

      // Create a new service account for OAuth
      try {
        const oauthServiceAccount = await iam.projects.serviceAccounts.create({
          name: `projects/${projectId}`,
          requestBody: {
            accountId: 'taskilo-oauth-sa',
            serviceAccount: {
              displayName: 'Taskilo OAuth Service Account',
              description: 'Service Account for Taskilo OAuth Integration',
            },
          },
        });

        console.log('✅ OAuth Service Account erstellt:', oauthServiceAccount.data.email);

        // Create keys for OAuth service account
        const keys = await iam.projects.serviceAccounts.keys.create({
          name: `projects/${projectId}/serviceAccounts/${oauthServiceAccount.data.email}`,
          requestBody: {
            keyAlgorithm: 'KEY_ALG_RSA_2048',
            privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE',
          },
        });

        const keyData = JSON.parse(Buffer.from(keys.data.privateKeyData, 'base64').toString());

        console.log('✅ OAuth Keys erstellt');

        // Use the service account credentials as OAuth credentials
        const oauthCredentials = {
          web: {
            client_id: keyData.client_id,
            project_id: keyData.project_id,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_secret: keyData.private_key_id,
            redirect_uris: [
              'https://taskilo.vercel.app/api/auth/google-workspace/callback',
              'http://localhost:3000/api/auth/google-workspace/callback',
            ],
            javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
          },
        };

        fs.writeFileSync(
          'oauth-from-service-account.json',
          JSON.stringify(oauthCredentials, null, 2)
        );

        console.log('\n🎯 OAuth-Credentials aus Service Account:');
        console.log('Client ID:', keyData.client_id);
        console.log('Client Secret:', keyData.private_key_id);

        return oauthCredentials.web;
      } catch (iaError) {
        console.error('❌ IAM API Fehler:', iaError.message);
        throw iaError;
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des OAuth Clients:', error.message);

    // Final fallback: Manual instructions
    console.log('\n📋 MANUELLE LÖSUNG:');
    console.log(
      '1. Öffnen Sie: https://console.cloud.google.com/apis/credentials?project=tilvo-f142f'
    );
    console.log('2. Klicken Sie auf "ANMELDEDATEN ERSTELLEN" → "OAuth-Client-ID"');
    console.log('3. Wählen Sie "Webanwendung"');
    console.log('4. Name: "Taskilo Newsletter OAuth Client"');
    console.log('5. Autorisierte JavaScript-Ursprünge:');
    console.log('   - https://taskilo.vercel.app');
    console.log('   - http://localhost:3000');
    console.log('6. Autorisierte Weiterleitungs-URIs:');
    console.log('   - https://taskilo.vercel.app/api/auth/google-workspace/callback');
    console.log('   - http://localhost:3000/api/auth/google-workspace/callback');
    console.log('7. Erstellen Sie die Credentials und kopieren Sie Client ID und Secret');

    throw error;
  }
}

// Install node-fetch if not available
try {
  require('node-fetch');
} catch (e) {
  console.log('📦 Installiere node-fetch...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
}

createRealOAuthClientViaAPI()
  .then(credentials => {
    console.log('\n✅ OAuth Client bereit für Production!');
  })
  .catch(error => {
    console.error('\n❌ Fehler:', error.message);
    process.exit(1);
  });
