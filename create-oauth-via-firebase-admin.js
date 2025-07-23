#!/usr/bin/env node

const admin = require('firebase-admin');
const { google } = require('googleapis');
const fs = require('fs');

async function createOAuthClientViaFirebaseAdmin() {
  try {
    console.log('🔥 LETZTE TERMINAL-LÖSUNG: OAUTH CLIENT ÜBER FIREBASE ADMIN SDK');

    // Initialize Firebase Admin
    const serviceAccount = require('./firebase-service-account-key.json');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'tilvo-f142f',
      });
    }

    console.log('✅ Firebase Admin SDK initialisiert');

    // Get access token from Firebase Admin
    const accessToken = await admin.credential.cert(serviceAccount).getAccessToken();
    console.log('✅ Firebase Admin Access Token erhalten');

    // Now try to create OAuth client via Google APIs with Firebase token
    const oauth2 = google.oauth2({
      version: 'v2',
      auth: new google.auth.OAuth2(),
    });

    // Set the access token
    oauth2.context._options.auth = accessToken.access_token;

    console.log('🔄 Versuche OAuth Client über Google APIs mit Firebase Admin Token...');

    // Try creating OAuth client with direct API call using firebase token
    const fetch = require('node-fetch');

    const createClientResponse = await fetch('https://www.googleapis.com/oauth2/v2/client', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: 'auto-generated',
        client_secret: 'auto-generated',
        redirect_uris: [
          'https://taskilo.de/api/auth/google-workspace/callback',
          'https://taskilo.vercel.app/api/auth/google-workspace/callback',
          'http://localhost:3000/api/auth/google-workspace/callback',
        ],
        javascript_origins: [
          'https://taskilo.de',
          'https://taskilo.vercel.app',
          'http://localhost:3000',
        ],
        application_type: 'web',
        application_name: 'Taskilo Newsletter OAuth Client Firebase',
      }),
    });

    if (createClientResponse.ok) {
      const clientData = await createClientResponse.json();
      console.log('🎉 OAUTH CLIENT ÜBER FIREBASE ERSTELLT!');
      console.log('Client Data:', clientData);

      fs.writeFileSync('firebase-oauth-client.json', JSON.stringify(clientData, null, 2));
      console.log('💾 Client Data gespeichert');

      return clientData;
    } else {
      console.log('❌ Firebase OAuth API auch fehlgeschlagen:', await createClientResponse.text());

      // Final attempt: Use Firebase Project Management API
      console.log('🔄 FINAL ATTEMPT: Firebase Project Management API...');

      const projectResponse = await fetch(
        `https://firebase.googleapis.com/v1beta1/projects/tilvo-f142f/oauthClients`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: 'Taskilo Newsletter OAuth Client Firebase Final',
            redirectUris: [
              'https://taskilo.de/api/auth/google-workspace/callback',
              'https://taskilo.vercel.app/api/auth/google-workspace/callback',
              'http://localhost:3000/api/auth/google-workspace/callback',
            ],
            javascriptOrigins: [
              'https://taskilo.de',
              'https://taskilo.vercel.app',
              'http://localhost:3000',
            ],
          }),
        }
      );

      if (projectResponse.ok) {
        const finalClientData = await projectResponse.json();
        console.log('🎉 FINAL OAUTH CLIENT ÜBER FIREBASE PROJECT API ERSTELLT!');
        console.log('Final Client Data:', finalClientData);

        fs.writeFileSync(
          'firebase-final-oauth-client.json',
          JSON.stringify(finalClientData, null, 2)
        );
        return finalClientData;
      } else {
        console.log('❌ Auch Firebase Project API fehlgeschlagen:', await projectResponse.text());
        throw new Error('Alle Firebase-basierten Versuche fehlgeschlagen');
      }
    }
  } catch (error) {
    console.error('💥 FIREBASE ADMIN LÖSUNG FEHLGESCHLAGEN:', error.message);

    console.log('\n📋 ES GIBT NUR NOCH EINE LÖSUNG:');
    console.log(
      '🌐 Öffne: https://console.cloud.google.com/apis/credentials/consent?project=tilvo-f142f'
    );
    console.log('1. Klicke "EDIT APP"');
    console.log('2. Ändere "Publishing status" von "In production" zu "Testing"');
    console.log('3. Unter "Test users" klicke "+ ADD USERS"');
    console.log('4. Füge hinzu: a.staudinger32@gmail.com');
    console.log('5. Klicke "SAVE" und "SAVE AND CONTINUE"');
    console.log('\n🎯 DAS IST DER EINZIGE WEG IM TERMINAL IST UNMÖGLICH!');

    process.exit(1);
  }
}

createOAuthClientViaFirebaseAdmin()
  .then(clientData => {
    console.log('\n✅ OAUTH CLIENT ÜBER FIREBASE ERFOLGREICH ERSTELLT!');
    if (clientData) {
      console.log('🚀 Bereit für Vercel Environment Variables Update!');
    }
  })
  .catch(error => {
    console.error('\n💥 ALLE TERMINAL-LÖSUNGEN FEHLGESCHLAGEN:', error.message);
    console.log(
      '\n🌐 VERWENDE WEB-CONSOLE: https://console.cloud.google.com/apis/credentials/consent?project=tilvo-f142f'
    );
  });
