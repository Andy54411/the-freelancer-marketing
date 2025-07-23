#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

async function createNewOAuthClientViaCLI() {
  try {
    console.log('🔧 ERSTELLE NEUEN OAUTH CLIENT ÜBER GCLOUD CLI IM TESTING MODUS');

    // Setze das Projekt
    execSync('gcloud config set project tilvo-f142f', { stdio: 'inherit' });

    // Aktiviere OAuth2 API falls nicht aktiviert
    console.log('🔄 Aktiviere OAuth2 APIs...');
    try {
      execSync('gcloud services enable oauth2.googleapis.com', { stdio: 'inherit' });
      execSync('gcloud services enable iamcredentials.googleapis.com', { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️ APIs bereits aktiviert oder Fehler bei Aktivierung');
    }

    // Prüfe aktuelle OAuth Brands
    console.log('🔍 Prüfe aktuelle OAuth Brands...');
    try {
      const brands = execSync('gcloud iap oauth-brands list --format="value(name)"', {
        encoding: 'utf8',
      });
      console.log('✅ Bestehende Brands:', brands.trim());
    } catch (e) {
      console.log('⚠️ Keine Brands gefunden oder Fehler:', e.message);
    }

    // Versuche ein OAuth Brand zu erstellen (falls noch nicht vorhanden)
    console.log('🔄 Erstelle/aktualisiere OAuth Brand...');
    try {
      const createBrandResult = execSync(
        `gcloud iap oauth-brands create \\
        --application_title="Taskilo Newsletter System" \\
        --support_email="andy.staudinger@taskilo.de" \\
        --application_home_page_uri="https://taskilo.de" \\
        --application_privacy_policy_uri="https://taskilo.de/datenschutz" \\
        --application_terms_of_service_uri="https://taskilo.de/agb" \\
        --format="value(name)"`,
        { encoding: 'utf8' }
      );

      console.log('✅ OAuth Brand erstellt:', createBrandResult.trim());
    } catch (e) {
      console.log('⚠️ Brand bereits vorhanden oder Fehler:', e.message);
    }

    // Jetzt erstelle OAuth Client über gcloud (das ist automatisch im Testing mode)
    console.log('🔄 Erstelle neuen OAuth Client über gcloud...');

    const createClientCommand = `gcloud iap oauth-clients create \\
      projects/tilvo-f142f/brands/tilvo-f142f \\
      --display_name="Taskilo Newsletter OAuth Client Terminal" \\
      --format="value(name,secret)"`;

    let clientResult;
    try {
      clientResult = execSync(createClientCommand, { encoding: 'utf8' });
      console.log('✅ OAuth Client erstellt via gcloud CLI!');
      console.log('Ergebnis:', clientResult);
    } catch (e) {
      console.log('❌ gcloud OAuth Client Erstellung fehlgeschlagen:', e.message);

      // Fallback: Verwende curl mit gcloud access token
      console.log('🔄 Fallback: Verwende curl mit gcloud token...');

      const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

      // Versuche direkten REST API Call
      const curlCommand = `curl -X POST \\
        "https://iap.googleapis.com/v1/projects/tilvo-f142f/brands/-/identityAwareProxyClients" \\
        -H "Authorization: Bearer ${accessToken}" \\
        -H "Content-Type: application/json" \\
        -d '{
          "displayName": "Taskilo Newsletter OAuth Client Terminal Created",
          "secret": "auto-generated-secret"
        }'`;

      try {
        const curlResult = execSync(curlCommand, { encoding: 'utf8' });
        console.log('✅ OAuth Client über curl erstellt!');
        console.log('Curl Ergebnis:', curlResult);
        clientResult = curlResult;
      } catch (curlError) {
        console.log('❌ Auch curl fehlgeschlagen:', curlError.message);
        throw new Error('Alle Versuche, OAuth Client zu erstellen, fehlgeschlagen');
      }
    }

    // Parse das Ergebnis und extrahiere Client ID und Secret
    if (clientResult) {
      console.log('📋 NEUER OAUTH CLIENT BEREIT!');
      console.log('Raw Result:', clientResult);

      // Schreibe das Ergebnis in eine Datei für weitere Verarbeitung
      fs.writeFileSync('new-oauth-client-result.txt', clientResult);
      console.log('💾 Ergebnis gespeichert in: new-oauth-client-result.txt');

      console.log('\n🎯 NÄCHSTE SCHRITTE:');
      console.log('1. Prüfe new-oauth-client-result.txt für Client ID und Secret');
      console.log('2. Aktualisiere Vercel Environment Variables');
      console.log('3. Der neue Client ist automatisch im TESTING Modus!');
    }
  } catch (error) {
    console.error('💥 KRITISCHER FEHLER:', error.message);
    console.log('\n📋 MANUELLE LÖSUNG ERFORDERLICH:');
    console.log(
      '1. Gehe zu: https://console.cloud.google.com/apis/credentials/consent?project=tilvo-f142f'
    );
    console.log('2. Setze Publishing Status auf "Testing"');
    console.log('3. Füge Test Users hinzu: a.staudinger32@gmail.com');
    process.exit(1);
  }
}

createNewOAuthClientViaCLI()
  .then(() => {
    console.log('\n✅ OAUTH CLIENT CREATION ABGESCHLOSSEN!');
  })
  .catch(error => {
    console.error('\n💥 FEHLER:', error.message);
  });
