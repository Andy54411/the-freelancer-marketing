// Environment Check Script
// Verwendung: node check-env.js

console.log('🔍 Überprüfe Umgebungsvariablen...');
console.log('');

// Lade .env.local falls vorhanden
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  console.log('⚠️ dotenv nicht verfügbar, prüfe direkt process.env');
}

const requiredEnvVars = ['RESEND_API_KEY', 'NEXT_PUBLIC_APP_URL', 'FIREBASE_SERVICE_ACCOUNT_KEY'];

console.log('📋 Erforderliche Umgebungsvariablen:');
console.log('');

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'RESEND_API_KEY') {
      console.log(
        `✅ ${varName}: re_${value.substring(3, 8)}...${value.substring(value.length - 5)} (${value.length} Zeichen)`
      );
    } else if (varName === 'FIREBASE_SERVICE_ACCOUNT_KEY') {
      console.log(`✅ ${varName}: {"type":"service_account"...} (${value.length} Zeichen)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: FEHLT`);
  }
});

console.log('');

// Teste Resend API Key Format
const resendKey = process.env.RESEND_API_KEY;
if (resendKey) {
  if (resendKey.startsWith('re_')) {
    console.log('✅ RESEND_API_KEY hat korrektes Format (re_...)');
  } else {
    console.log('❌ RESEND_API_KEY hat falsches Format (sollte mit re_ beginnen)');
  }
} else {
  console.log('❌ RESEND_API_KEY nicht gefunden');
  console.log('💡 Fügen Sie RESEND_API_KEY zu Ihrer .env.local Datei hinzu:');
  console.log('   RESEND_API_KEY=re_your_api_key_here');
}

console.log('');
console.log('🔧 Nächste Schritte:');
console.log('   1. Überprüfen Sie .env.local in der Projekt-Root');
console.log('   2. Holen Sie sich einen Resend API Key von https://resend.com');
console.log('   3. Starten Sie den Server neu nach Änderungen an .env.local');
