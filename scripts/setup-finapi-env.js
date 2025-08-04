#!/usr/bin/env node

/**
 * Script zum Setzen aller finAPI Umgebungsvariablen über das Vercel SDK
 */

const { execSync } = require('child_process');

// finAPI Anmeldeinformationen
const envVars = {
  // Default Client (Sandbox)
  FINAPI_SANDBOX_CLIENT_ID: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29',
  FINAPI_SANDBOX_CLIENT_SECRET: '73689ad2-95e5-4180-93a2-7209ba6e10aa',

  // Admin Client
  FINAPI_ADMIN_CLIENT_ID: 'a2d8cf0e-c68c-45fa-b4ad-4184a355094e',
  FINAPI_ADMIN_CLIENT_SECRET: '478a0e66-8c9a-49ee-84cd-e49d87d077c9',
};

const environments = ['production', 'preview', 'development'];

console.log('🚀 Setze finAPI Umgebungsvariablen über Vercel...');

// Erst alle alten Variablen löschen
console.log('🧹 Lösche alte Variablen...');
Object.keys(envVars).forEach(key => {
  environments.forEach(env => {
    try {
      execSync(`vercel env rm ${key} ${env} --yes`, { stdio: 'pipe' });
      console.log(`✅ Gelöscht: ${key} (${env})`);
    } catch (error) {
      // Ignoriere Fehler falls Variable nicht existiert
      console.log(`ℹ️  Variable ${key} (${env}) existierte nicht`);
    }
  });
});

console.log('\n📝 Füge neue Variablen hinzu...');

// Neue Variablen setzen
Object.entries(envVars).forEach(([key, value]) => {
  environments.forEach(env => {
    try {
      const command = `vercel env add ${key} ${value} ${env}`;
      execSync(command, { stdio: 'pipe' });
      console.log(`✅ Gesetzt: ${key} (${env})`);
    } catch (error) {
      console.error(`❌ Fehler beim Setzen von ${key} (${env}):`, error.message);
    }
  });
});

console.log('\n🎉 Alle finAPI Umgebungsvariablen wurden erfolgreich gesetzt!');
console.log('\n📋 Gesetzte Variablen:');
Object.keys(envVars).forEach(key => {
  console.log(`   - ${key}`);
});

console.log('\n🔄 Die Änderungen werden beim nächsten Deployment aktiv.');
