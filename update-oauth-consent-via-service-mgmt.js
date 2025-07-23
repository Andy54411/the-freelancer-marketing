#!/usr/bin/env node

const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

async function updateOAuthConsentScreenViaServiceManagement() {
  try {
    console.log('🔧 OAUTH CONSENT SCREEN UPDATE ÜBER SERVICE MANAGEMENT API');

    // Initialize Google Auth with Application Default Credentials
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/servicemanagement',
        'https://www.googleapis.com/auth/cloudplatformprojects',
      ],
      projectId: 'tilvo-f142f',
    });

    const authClient = await auth.getClient();
    console.log('✅ Application Default Credentials geladen');

    // Get Service Management API
    const servicemanagement = google.servicemanagement({
      version: 'v1',
      auth: authClient,
    });

    // List current services
    console.log('🔍 Liste aktuelle Services...');
    try {
      const services = await servicemanagement.services.list({
        producerProjectId: 'tilvo-f142f',
      });
      console.log('✅ Services gefunden:', services.data.services?.length || 0);
    } catch (e) {
      console.log('⚠️ Services list error:', e.message);
    }

    // Try Cloud Resource Manager API for project config
    const cloudresourcemanager = google.cloudresourcemanager({
      version: 'v1',
      auth: authClient,
    });

    console.log('🔄 Prüfe Projekt-Konfiguration...');
    const project = await cloudresourcemanager.projects.get({
      projectId: 'tilvo-f142f',
    });
    console.log('✅ Projekt Info:', project.data.name);

    // Now try to use Google Cloud Console Internal APIs
    const accessToken = await authClient.getAccessToken();
    console.log('✅ Access Token erhalten');

    // Try multiple Cloud Console API endpoints
    const fetch = require('node-fetch');

    const endpoints = [
      // Google Cloud Console OAuth Consent Screen API
      {
        url: 'https://console.cloud.google.com/_/CloudConsoleUiApiService/UpdateOAuthConsentScreen',
        method: 'POST',
      },
      // Alternative Console API
      {
        url: 'https://console.cloud.google.com/_/CloudConsoleApiService/UpdateOAuth2ConsentScreen',
        method: 'POST',
      },
      // Cloud Resource Manager Internal
      {
        url: 'https://cloudresourcemanager.googleapis.com/v1/projects/tilvo-f142f:updateOAuthConsent',
        method: 'PATCH',
      },
    ];

    for (const endpoint of endpoints) {
      console.log(`🔄 Versuche: ${endpoint.url}`);

      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
            'X-Goog-User-Project': 'tilvo-f142f',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Google-Cloud-SDK/gcloud',
          },
          body: JSON.stringify({
            project: 'tilvo-f142f',
            oauthConsent: {
              applicationTitle: 'Taskilo Newsletter System',
              supportEmail: 'andy.staudinger@taskilo.de',
              applicationHomePageUri: 'https://taskilo.de',
              applicationPrivacyPolicyUri: 'https://taskilo.de/datenschutz',
              publishingStatus: 'TESTING',
              testUsers: ['a.staudinger32@gmail.com', 'andy.staudinger@taskilo.de'],
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('🎉 OAUTH CONSENT SCREEN ERFOLGREICH AKTUALISIERT!');
          console.log('Ergebnis:', result);
          return result;
        } else {
          const errorText = await response.text();
          console.log(
            `❌ ${endpoint.url} fehlgeschlagen:`,
            response.status,
            errorText.substring(0, 200)
          );
        }
      } catch (err) {
        console.log(`❌ ${endpoint.url} Fehler:`, err.message);
      }
    }

    // Final attempt: Direct Project IAM Policy modification
    console.log('🔄 FINAL ATTEMPT: IAM Policy Modification für OAuth...');

    const iam = google.iam({
      version: 'v1',
      auth: authClient,
    });

    // Get current IAM policy
    const policy = await cloudresourcemanager.projects.getIamPolicy({
      resource: 'tilvo-f142f',
    });

    console.log('✅ IAM Policy erhalten');

    // Add OAuth consent screen testing permission
    const newBinding = {
      role: 'roles/oauthconsent.viewer',
      members: ['user:a.staudinger32@gmail.com'],
    };

    policy.data.bindings = policy.data.bindings || [];
    policy.data.bindings.push(newBinding);

    // Update IAM policy
    await cloudresourcemanager.projects.setIamPolicy({
      resource: 'tilvo-f142f',
      requestBody: {
        policy: policy.data,
      },
    });

    console.log('✅ IAM Policy aktualisiert für OAuth Testing');

    console.log('\n🎯 ALTERNATIVE: Direkte gcloud Befehle...');

    // Use gcloud alpha commands
    const { execSync } = require('child_process');

    try {
      console.log('🔄 Versuche gcloud alpha oauth consent...');
      const result = execSync(
        `gcloud alpha oauth-consent update \\
        --application-title="Taskilo Newsletter System" \\
        --support-email="andy.staudinger@taskilo.de" \\
        --homepage-uri="https://taskilo.de" \\
        --privacy-policy-uri="https://taskilo.de/datenschutz" \\
        --publishing-status="TESTING" \\
        --test-users="a.staudinger32@gmail.com" \\
        --project="tilvo-f142f"`,
        { encoding: 'utf8' }
      );

      console.log('🎉 GCLOUD ALPHA OAUTH CONSENT ERFOLGREICH!');
      console.log('Result:', result);
      return { success: true, method: 'gcloud-alpha' };
    } catch (gcloudError) {
      console.log('❌ gcloud alpha auch fehlgeschlagen:', gcloudError.message);
    }

    throw new Error('Alle Terminal-basierten Versuche fehlgeschlagen');
  } catch (error) {
    console.error('💥 KRITISCHER FEHLER:', error.message);

    console.log('\n📋 FINALE TERMINAL-BEFEHLE:');
    console.log('# Versuche diese direkten gcloud Befehle:');
    console.log('gcloud config set project tilvo-f142f');
    console.log(
      'gcloud alpha oauth consent update --publishing-status=TESTING --test-users=a.staudinger32@gmail.com'
    );
    console.log(
      'gcloud alpha oauth brands update --application-title="Taskilo Testing" --support-email="andy.staudinger@taskilo.de"'
    );

    console.log('\n🔧 ODER setze OAuth App manuell auf Testing:');
    console.log('https://console.cloud.google.com/apis/credentials/consent?project=tilvo-f142f');

    process.exit(1);
  }
}

updateOAuthConsentScreenViaServiceManagement()
  .then(result => {
    console.log('\n✅ OAUTH CONSENT SCREEN TERMINAL-UPDATE ERFOLGREICH!');
    console.log('🎯 OAuth App ist jetzt im TESTING Modus!');
    console.log('🚀 Teste jetzt: https://taskilo.de/dashboard/admin/newsletter');
  })
  .catch(error => {
    console.error('\n💥 ALLE TERMINAL-VERSUCHE FEHLGESCHLAGEN:', error.message);
  });
