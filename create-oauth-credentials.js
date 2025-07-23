#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

async function createOAuthCredentials() {
  console.log('🔧 Erstelle OAuth-Credentials für Taskilo Newsletter...');

  // Use gcloud command to create OAuth client ID
  const projectId = 'tilvo-f142f';

  // Check if we can create OAuth credentials via gcloud
  const createCommand = `gcloud alpha iap oauth-clients create \
    --project=${projectId} \
    --display_name="Taskilo Newsletter OAuth Client"`;

  console.log('Versuche OAuth-Client über gcloud zu erstellen...');

  exec(createCommand, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ gcloud alpha command nicht verfügbar');
      console.log('\n📋 Manuelle Erstellung erforderlich:');
      console.log('\n🌐 Gehe zu Google Cloud Console:');
      console.log(`https://console.cloud.google.com/apis/credentials?project=${projectId}`);
      console.log('\n📝 Erstelle OAuth-Client-ID:');
      console.log('1. Klicke "+ ANMELDEDATEN ERSTELLEN"');
      console.log('2. Wähle "OAuth-Client-ID"');
      console.log('3. Anwendungstyp: "Webanwendung"');
      console.log('4. Name: "Taskilo Newsletter"');
      console.log('\n🔗 Autorisierte JavaScript-Ursprünge:');
      console.log('   https://taskilo.vercel.app');
      console.log('   http://localhost:3000');
      console.log('\n🔗 Autorisierte Weiterleitungs-URIs:');
      console.log('   https://taskilo.vercel.app/api/auth/google-workspace/callback');
      console.log('   http://localhost:3000/api/auth/google-workspace/callback');
      console.log('\n✅ Nach der Erstellung erhalten Sie:');
      console.log('   - Client-ID (ends with .apps.googleusercontent.com)');
      console.log('   - Client-Secret (random string)');
      console.log('\n🚀 Dann fügen Sie diese als Vercel Environment Variables hinzu:');
      console.log('   npx vercel env add GOOGLE_WORKSPACE_CLIENT_ID production');
      console.log('   npx vercel env add GOOGLE_WORKSPACE_CLIENT_SECRET production');
      return;
    }

    console.log('✅ OAuth-Client erstellt:', stdout);
  });
}

createOAuthCredentials();
