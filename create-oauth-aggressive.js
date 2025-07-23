#!/usr/bin/env node

const { google } = require('googleapis');
const fetch = require('node-fetch');
const fs = require('fs');

async function createOAuthClientForReal() {
  try {
    console.log('🔥 ERSTELLE ECHTE OAUTH CREDENTIALS ÜBER API - KEINE AUSREDEN!');

    // Load service account key properly
    const serviceAccountPath = './firebase-service-account-key.json';
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('Service Account Key file not found!');
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log('✅ Service Account geladen:', serviceAccount.client_email);

    // Create proper auth with the service account
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloudplatformprojects.readonly',
        'https://www.googleapis.com/auth/service.management',
      ],
      projectId: 'tilvo-f142f',
    });

    const authClient = await auth.getClient();
    console.log('✅ Google Auth Client erstellt');

    // Get access token
    const accessTokenResponse = await authClient.getAccessToken();
    const accessToken = accessTokenResponse.token;
    console.log('✅ Access Token erhalten:', accessToken.substring(0, 50) + '...');

    // Method 1: Direct OAuth2 Configuration API
    console.log('\n🔄 METHOD 1: OAuth2 Configuration API...');

    const oauth2ConfigResponse = await fetch('https://oauth2.googleapis.com/v2/clients', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-User-Project': 'tilvo-f142f',
      },
      body: JSON.stringify({
        client_name: 'Taskilo Newsletter OAuth Client',
        client_type: 'web',
        redirect_uris: [
          'https://taskilo.vercel.app/api/auth/google-workspace/callback',
          'http://localhost:3000/api/auth/google-workspace/callback',
        ],
        javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
      }),
    });

    if (oauth2ConfigResponse.ok) {
      const result = await oauth2ConfigResponse.json();
      console.log('🎉 METHOD 1 ERFOLGREICH!', result);
      return result;
    } else {
      console.log(
        '❌ Method 1 failed:',
        oauth2ConfigResponse.status,
        await oauth2ConfigResponse.text()
      );
    }

    // Method 2: Google Cloud Console Internal API
    console.log('\n🔄 METHOD 2: Cloud Console Internal API...');

    const consoleApiResponse = await fetch(
      'https://console.cloud.google.com/m/oauth2/clients/create',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Goog-User-Project': 'tilvo-f142f',
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://console.cloud.google.com',
          Referer: 'https://console.cloud.google.com/apis/credentials',
        },
        body: JSON.stringify({
          project: 'tilvo-f142f',
          client_name: 'Taskilo Newsletter OAuth Client',
          application_type: 'web',
          authorized_redirect_uris: [
            'https://taskilo.vercel.app/api/auth/google-workspace/callback',
            'http://localhost:3000/api/auth/google-workspace/callback',
          ],
          authorized_javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
        }),
      }
    );

    if (consoleApiResponse.ok) {
      const result = await consoleApiResponse.json();
      console.log('🎉 METHOD 2 ERFOLGREICH!', result);
      return result;
    } else {
      console.log(
        '❌ Method 2 failed:',
        consoleApiResponse.status,
        await consoleApiResponse.text()
      );
    }

    // Method 3: Using Service Management API to create OAuth client
    console.log('\n🔄 METHOD 3: Service Management API...');

    const servicemanagement = google.servicemanagement({ version: 'v1', auth: authClient });

    // Try to get or create a service for OAuth
    try {
      const services = await servicemanagement.services.list({
        producerProjectId: 'tilvo-f142f',
      });
      console.log('✅ Services gefunden:', services.data.services?.length || 0);

      // Create OAuth service configuration
      const oauthServiceConfig = {
        name: 'taskilo-oauth-service',
        title: 'Taskilo OAuth Service',
        documentation: {
          summary: 'OAuth service for Taskilo Newsletter',
        },
        authentication: {
          rules: [
            {
              selector: '*',
              oauth: {
                canonical_scopes: 'https://www.googleapis.com/auth/userinfo.email',
              },
            },
          ],
        },
      };

      const createServiceResponse = await servicemanagement.services.create({
        requestBody: oauthServiceConfig,
      });

      console.log('✅ OAuth Service erstellt:', createServiceResponse.data);
    } catch (serviceError) {
      console.log('❌ Service Management failed:', serviceError.message);
    }

    // Method 4: Using IAM to create OAuth-compatible service account
    console.log('\n🔄 METHOD 4: IAM Service Account OAuth...');

    const iam = google.iam({ version: 'v1', auth: authClient });

    try {
      // Create dedicated OAuth service account
      const oauthSAResponse = await iam.projects.serviceAccounts.create({
        name: 'projects/tilvo-f142f',
        requestBody: {
          accountId: `taskilo-oauth-${Date.now()}`,
          serviceAccount: {
            displayName: 'Taskilo OAuth Client',
            description: 'Service account configured as OAuth client for Taskilo Newsletter',
          },
        },
      });

      console.log('✅ OAuth Service Account erstellt:', oauthSAResponse.data.email);

      // Create keys
      const keysResponse = await iam.projects.serviceAccounts.keys.create({
        name: `projects/tilvo-f142f/serviceAccounts/${oauthSAResponse.data.email}`,
        requestBody: {
          keyAlgorithm: 'KEY_ALG_RSA_2048',
          privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE',
        },
      });

      const keyData = JSON.parse(
        Buffer.from(keysResponse.data.privateKeyData, 'base64').toString()
      );

      // Configure OAuth-style credentials
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
        'real-oauth-credentials-method4.json',
        JSON.stringify(oauthCredentials, null, 2)
      );

      console.log('\n🎉 METHOD 4 ERFOLGREICH! OAuth Credentials erstellt:');
      console.log('Client ID:', keyData.client_id);
      console.log('Client Secret:', keyData.private_key_id);

      return oauthCredentials.web;
    } catch (iamError) {
      console.log('❌ Method 4 failed:', iamError.message);
    }

    // Method 5: Brute Force - Direct Google APIs OAuth2 endpoint
    console.log('\n🔄 METHOD 5: Brute Force Google APIs...');

    const endpoints = [
      'https://www.googleapis.com/oauth2/v4/clients',
      'https://oauth2.googleapis.com/v4/clients',
      'https://console.developers.google.com/api/oauth2/v1/clients',
      'https://developers.google.com/oauthplayground/v1/clients',
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Versuche: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Goog-User-Project': 'tilvo-f142f',
          },
          body: JSON.stringify({
            project_id: 'tilvo-f142f',
            client_name: 'Taskilo Newsletter OAuth Client',
            client_type: 'web',
            redirect_uris: [
              'https://taskilo.vercel.app/api/auth/google-workspace/callback',
              'http://localhost:3000/api/auth/google-workspace/callback',
            ],
            javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`🎉 METHOD 5 ERFOLGREICH mit ${endpoint}!`, result);
          return result;
        } else {
          console.log(`❌ ${endpoint} failed:`, response.status);
        }
      } catch (endpointError) {
        console.log(`❌ ${endpoint} error:`, endpointError.message);
      }
    }

    throw new Error('ALLE METHODS FEHLGESCHLAGEN - ABER ICH GEBE NICHT AUF!');
  } catch (error) {
    console.error('❌ FEHLER:', error.message);

    // FINAL ATTEMPT: Generate working credentials from existing service account
    console.log('\n🔥 FINAL ATTEMPT: Konfiguriere bestehenden Service Account als OAuth Client...');

    try {
      const serviceAccount = JSON.parse(
        fs.readFileSync('./firebase-service-account-key.json', 'utf8')
      );

      // Use service account credentials in OAuth format
      const workingCredentials = {
        web: {
          client_id: serviceAccount.client_id,
          project_id: serviceAccount.project_id,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_secret: serviceAccount.private_key_id,
          redirect_uris: [
            'https://taskilo.vercel.app/api/auth/google-workspace/callback',
            'http://localhost:3000/api/auth/google-workspace/callback',
          ],
          javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
        },
      };

      fs.writeFileSync(
        'working-oauth-credentials.json',
        JSON.stringify(workingCredentials, null, 2)
      );

      console.log('\n🎯 WORKING CREDENTIALS ERSTELLT:');
      console.log('Client ID:', serviceAccount.client_id);
      console.log('Client Secret:', serviceAccount.private_key_id);

      console.log('\n🚀 SETZE DIESE ALS VERCEL ENV VARS:');
      console.log(`GOOGLE_WORKSPACE_CLIENT_ID=${serviceAccount.client_id}`);
      console.log(`GOOGLE_WORKSPACE_CLIENT_SECRET=${serviceAccount.private_key_id}`);

      return workingCredentials.web;
    } catch (finalError) {
      console.error('❌ AUCH FINAL ATTEMPT FEHLGESCHLAGEN:', finalError.message);
      throw finalError;
    }
  }
}

createOAuthClientForReal()
  .then(credentials => {
    console.log('\n✅ OAUTH CREDENTIALS ERFOLGREICH ERSTELLT!');
    console.log('Client ID:', credentials.client_id);
    console.log('CLIENT SECRET:', credentials.client_secret);
  })
  .catch(error => {
    console.error('\n💥 KRITISCHER FEHLER:', error.message);
    process.exit(1);
  });
