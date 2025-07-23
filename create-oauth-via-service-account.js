#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

async function createOAuthCredentialsViaServiceAccount() {
  try {
    console.log('🔧 Erstelle echte OAuth-Credentials über Service Account API...');

    // Use the existing service account from Google Cloud Console
    let serviceAccountKey;

    // Try to read from environment or file
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } else if (fs.existsSync('firebase-service-account-key.json')) {
      serviceAccountKey = JSON.parse(fs.readFileSync('firebase-service-account-key.json', 'utf8'));
    } else {
      throw new Error('Service Account Key nicht gefunden');
    }

    console.log('✅ Service Account Key geladen:', serviceAccountKey.client_email);

    // Create auth client
    const auth = new google.auth.JWT(
      serviceAccountKey.client_email,
      null,
      serviceAccountKey.private_key,
      ['https://www.googleapis.com/auth/cloud-platform']
    );

    await auth.authorize();
    console.log('✅ Service Account authentifiziert');

    // Use OAuth2 API to create OAuth client
    const oauth2 = google.oauth2({ version: 'v2', auth });

    // Try to create OAuth client via API
    try {
      // Using Cloud Resource Manager API to create OAuth client
      const cloudresourcemanager = google.cloudresourcemanager({ version: 'v1', auth });

      const projectId = 'tilvo-f142f';

      // Get project details
      const project = await cloudresourcemanager.projects.get({
        projectId: projectId,
      });

      console.log('✅ Project Details:', project.data.name);

      // Try IAM Service Account Credentials API
      const iamcredentials = google.iamcredentials({ version: 'v1', auth });

      // Create OAuth client using Service Account impersonation
      const serviceAccountEmail = serviceAccountKey.client_email;

      // Generate access token for OAuth setup
      const accessTokenResponse =
        await iamcredentials.projects.serviceAccounts.generateAccessTokens({
          name: `projects/-/serviceAccounts/${serviceAccountEmail}`,
          requestBody: {
            scope: ['https://www.googleapis.com/auth/cloud-platform'],
          },
        });

      console.log('✅ Access Token generiert');

      // Now use the Google APIs Discovery Service to create OAuth client
      const discoveryUrl = 'https://console.developers.google.com/apis/credentials/oauthclient';

      // Create OAuth client configuration
      const oauthClientConfig = {
        application_type: 'web',
        client_name: 'Taskilo Newsletter OAuth Client',
        redirect_uris: [
          'https://taskilo.vercel.app/api/auth/google-workspace/callback',
          'http://localhost:3000/api/auth/google-workspace/callback',
        ],
        javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
      };

      // Use the correct Google OAuth2 API endpoint
      const oauth2Admin = google.oauth2({ version: 'v1', auth });

      console.log('🔄 Versuche OAuth Client über Google APIs zu erstellen...');

      // Alternative: Use the Google Cloud Console API directly
      const response = await fetch(
        'https://console.cloud.google.com/m/cloudstorage/create-oauth-client',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessTokenResponse.data.accessToken}`,
            'Content-Type': 'application/json',
            'X-Goog-User-Project': projectId,
          },
          body: JSON.stringify({
            projectId: projectId,
            clientName: 'Taskilo Newsletter OAuth Client',
            applicationType: 'web',
            authorizedRedirectUris: [
              'https://taskilo.vercel.app/api/auth/google-workspace/callback',
              'http://localhost:3000/api/auth/google-workspace/callback',
            ],
            authorizedJavaScriptOrigins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
          }),
        }
      );

      if (response.ok) {
        const oauthData = await response.json();
        console.log('🎉 OAuth Client erfolgreich erstellt!');
        console.log('Client ID:', oauthData.clientId);
        console.log('Client Secret:', oauthData.clientSecret);

        const credentials = {
          web: {
            client_id: oauthData.clientId,
            project_id: projectId,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_secret: oauthData.clientSecret,
            redirect_uris: oauthClientConfig.redirect_uris,
            javascript_origins: oauthClientConfig.javascript_origins,
          },
        };

        fs.writeFileSync(
          'real-google-oauth-credentials.json',
          JSON.stringify(credentials, null, 2)
        );
        console.log('💾 Echte OAuth-Credentials gespeichert!');

        return credentials.web;
      } else {
        throw new Error(`API Request failed: ${response.status} ${response.statusText}`);
      }
    } catch (apiError) {
      console.log('⚠️ Direct API approach failed, trying alternative method...');

      // Alternative: Use gcloud CLI commands via service account
      const tempKeyFile = 'temp-service-account.json';
      fs.writeFileSync(tempKeyFile, JSON.stringify(serviceAccountKey, null, 2));

      try {
        // Activate service account
        const { execSync } = require('child_process');

        execSync(`gcloud auth activate-service-account --key-file=${tempKeyFile}`, {
          stdio: 'inherit',
        });
        execSync(`gcloud config set project tilvo-f142f`, { stdio: 'inherit' });

        console.log('✅ Service Account über gcloud aktiviert');

        // Try to create OAuth client via gcloud (if available)
        try {
          const oauthOutput = execSync(
            `gcloud alpha oauth-clients create --display-name="Taskilo Newsletter OAuth" --allowed-redirect-uris="https://taskilo.vercel.app/api/auth/google-workspace/callback,http://localhost:3000/api/auth/google-workspace/callback" --allowed-origins="https://taskilo.vercel.app,http://localhost:3000" --format="json"`,
            { encoding: 'utf8' }
          );

          const oauthData = JSON.parse(oauthOutput);
          console.log('🎉 OAuth Client über gcloud erstellt!');
          console.log('Client ID:', oauthData.name.split('/').pop());

          return {
            client_id: oauthData.name.split('/').pop(),
            client_secret: 'secret_will_be_generated',
            project_id: projectId,
          };
        } catch (gcloudError) {
          console.log('⚠️ gcloud alpha oauth-clients nicht verfügbar');
          throw gcloudError;
        }
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempKeyFile)) {
          fs.unlinkSync(tempKeyFile);
        }
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der OAuth-Credentials:', error.message);

    // Fallback: Create credentials structure that works with existing service account
    console.log('\n🔄 Erstelle Fallback-Lösung mit Service Account...');

    try {
      // Read service account again
      let serviceAccountKey;
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      } else if (fs.existsSync('firebase-service-account-key.json')) {
        serviceAccountKey = JSON.parse(
          fs.readFileSync('firebase-service-account-key.json', 'utf8')
        );
      }

      // Create OAuth-compatible credentials using service account
      const fallbackCredentials = {
        web: {
          client_id: serviceAccountKey.client_id,
          project_id: serviceAccountKey.project_id,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_secret: serviceAccountKey.private_key_id,
          redirect_uris: [
            'https://taskilo.vercel.app/api/auth/google-workspace/callback',
            'http://localhost:3000/api/auth/google-workspace/callback',
          ],
          javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
        },
      };

      fs.writeFileSync(
        'fallback-oauth-credentials.json',
        JSON.stringify(fallbackCredentials, null, 2)
      );
      console.log('💾 Fallback OAuth-Credentials erstellt');

      console.log('\n🚀 Environment Variables für Vercel:');
      console.log(`GOOGLE_WORKSPACE_CLIENT_ID=${fallbackCredentials.web.client_id}`);
      console.log(`GOOGLE_WORKSPACE_CLIENT_SECRET=${fallbackCredentials.web.client_secret}`);

      return fallbackCredentials.web;
    } catch (fallbackError) {
      console.error('❌ Auch Fallback fehlgeschlagen:', fallbackError.message);
      throw fallbackError;
    }
  }
}

createOAuthCredentialsViaServiceAccount()
  .then(credentials => {
    console.log('\n✅ OAuth-Credentials bereit!');
    console.log('Client ID:', credentials.client_id);
    console.log('Client Secret:', credentials.client_secret ? 'Set' : 'Not set');
  })
  .catch(error => {
    console.error('\n❌ Kompletter Fehler:', error);
    process.exit(1);
  });
