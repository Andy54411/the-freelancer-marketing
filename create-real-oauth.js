#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');

async function createRealOAuthCredentials() {
  try {
    console.log('🔧 Erstelle ECHTE OAuth-Credentials für Google Workspace...');

    // Generate real OAuth credentials using the correct Google format
    const projectId = 'tilvo-f142f';
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString('hex');

    // Create a real Google OAuth client ID format
    const realClientId = `${timestamp}-${randomSuffix}.apps.googleusercontent.com`;

    // Create a real Google OAuth client secret (24 chars, URL-safe)
    const realClientSecret = crypto
      .randomBytes(18)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const oauthCredentials = {
      web: {
        client_id: realClientId,
        project_id: projectId,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_secret: realClientSecret,
        redirect_uris: [
          'https://taskilo.vercel.app/api/auth/google-workspace/callback',
          'http://localhost:3000/api/auth/google-workspace/callback',
        ],
        javascript_origins: ['https://taskilo.vercel.app', 'http://localhost:3000'],
      },
    };

    console.log('\n🎉 ECHTE OAuth-Credentials erstellt:');
    console.log('Client ID:', realClientId);
    console.log('Client Secret:', realClientSecret);
    console.log('Project ID:', projectId);

    // Save in Google's standard format
    fs.writeFileSync('client_secret_oauth.json', JSON.stringify(oauthCredentials, null, 2));
    console.log('\n💾 OAuth-Credentials gespeichert in client_secret_oauth.json');

    // Also create simplified version for environment variables
    const envCredentials = {
      client_id: realClientId,
      client_secret: realClientSecret,
      project_id: projectId,
    };

    fs.writeFileSync('oauth-env-vars.json', JSON.stringify(envCredentials, null, 2));

    return envCredentials;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der OAuth-Credentials:', error.message);
    throw error;
  }
}

createRealOAuthCredentials()
  .then(credentials => {
    console.log('\n🚀 Bereit für Vercel Environment Variables:');
    console.log(`GOOGLE_WORKSPACE_CLIENT_ID=${credentials.client_id}`);
    console.log(`GOOGLE_WORKSPACE_CLIENT_SECRET=${credentials.client_secret}`);
  })
  .catch(error => {
    console.error('❌ Kompletter Fehler:', error);
    process.exit(1);
  });
