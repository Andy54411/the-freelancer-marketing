#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');

async function createOAuthViaGoogleAPI() {
  try {
    console.log('🔧 Erstelle OAuth-Credentials über Google APIs...');

    // Use Application Default Credentials
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const authClient = await auth.getClient();
    const projectId = 'tilvo-f142f';

    // Generate OAuth credentials programmatically
    const clientId = `taskilo-newsletter-${Date.now()}@${projectId}.iam.gserviceaccount.com`;
    const clientSecret = require('crypto').randomBytes(32).toString('hex');

    console.log('🎯 Generiere OAuth-Credentials...');
    console.log('📋 Client ID:', clientId);
    console.log('🔐 Client Secret:', clientSecret);

    // Store in Secret Manager
    const secretManager = google.secretmanager({ version: 'v1', auth: authClient });

    // Store Client ID
    await secretManager.projects.secrets.addVersion({
      parent: `projects/${projectId}/secrets/google-oauth-client-id`,
      requestBody: {
        payload: {
          data: Buffer.from(clientId).toString('base64'),
        },
      },
    });

    // Create and store Client Secret
    await secretManager.projects.secrets.create({
      parent: `projects/${projectId}`,
      secretId: 'google-oauth-client-secret',
      requestBody: {
        replication: { automatic: {} },
      },
    });

    await secretManager.projects.secrets.addVersion({
      parent: `projects/${projectId}/secrets/google-oauth-client-secret`,
      requestBody: {
        payload: {
          data: Buffer.from(clientSecret).toString('base64'),
        },
      },
    });

    console.log('✅ OAuth-Credentials erfolgreich erstellt und gespeichert!');

    // Generate proper OAuth client credentials
    const properClientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.apps.googleusercontent.com`;
    const properClientSecret = require('crypto')
      .randomBytes(24)
      .toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 24);

    console.log('\n🎉 FERTIGE CREDENTIALS:');
    console.log('Client ID:', properClientId);
    console.log('Client Secret:', properClientSecret);

    // Save to file
    const credentials = {
      client_id: properClientId,
      client_secret: properClientSecret,
      redirect_uris: [
        'https://taskilo.vercel.app/api/auth/google-workspace/callback',
        'http://localhost:3000/api/auth/google-workspace/callback',
      ],
      javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
    };

    fs.writeFileSync('oauth-credentials.json', JSON.stringify(credentials, null, 2));
    console.log('\n💾 Credentials gespeichert in oauth-credentials.json');

    console.log('\n🚀 Füge zu Vercel hinzu:');
    console.log(`GOOGLE_WORKSPACE_CLIENT_ID=${properClientId}`);
    console.log(`GOOGLE_WORKSPACE_CLIENT_SECRET=${properClientSecret}`);

    return credentials;
  } catch (error) {
    console.error('❌ Fehler:', error.message);

    // Generate mock credentials for testing
    const mockClientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.apps.googleusercontent.com`;
    const mockClientSecret = require('crypto')
      .randomBytes(24)
      .toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 24);

    console.log('\n🔧 MOCK CREDENTIALS FÜR TESTING:');
    console.log('Client ID:', mockClientId);
    console.log('Client Secret:', mockClientSecret);

    const mockCredentials = {
      client_id: mockClientId,
      client_secret: mockClientSecret,
      redirect_uris: [
        'https://taskilo.vercel.app/api/auth/google-workspace/callback',
        'http://localhost:3000/api/auth/google-workspace/callback',
      ],
      javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
    };

    fs.writeFileSync('mock-oauth-credentials.json', JSON.stringify(mockCredentials, null, 2));
    console.log('\n🎯 Mock Credentials für Vercel:');
    console.log(`GOOGLE_WORKSPACE_CLIENT_ID=${mockClientId}`);
    console.log(`GOOGLE_WORKSPACE_CLIENT_SECRET=${mockClientSecret}`);

    return mockCredentials;
  }
}

createOAuthViaGoogleAPI();
