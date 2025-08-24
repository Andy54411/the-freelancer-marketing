#!/usr/bin/env node

// Resend Domain Setup Script für taskilo.de
require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

const DOMAIN_ID = '890d01ad-c327-4dd1-be5a-582293a164a9';

async function checkDomainStatus() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const domain = await resend.domains.get(DOMAIN_ID);

    console.log('🌐 Domain Status für taskilo.de:');
    console.log('='.repeat(50));
    console.log(`Status: ${domain.data.status}`);
    console.log(`Created: ${domain.data.created_at}`);
    console.log();

    console.log('📝 DNS Records Status:');
    console.log('-'.repeat(30));

    domain.data.records.forEach((record, index) => {
      const statusIcon = record.status === 'verified' ? '✅' : '❌';
      console.log(`${statusIcon} ${record.record} (${record.type}): ${record.status}`);
      console.log(`   Name: ${record.name}.taskilo.de`);

      if (record.type === 'TXT') {
        const shortValue =
          record.value.length > 50 ? record.value.substring(0, 50) + '...' : record.value;
        console.log(`   Value: ${shortValue}`);
      } else {
        console.log(`   Value: ${record.value}`);
      }

      if (record.priority) {
        console.log(`   Priority: ${record.priority}`);
      }
      console.log();
    });

    return domain.data;
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Domain-Details:', error.message);
    throw error;
  }
}

async function verifyDomain() {
  try {
    console.log('🔍 Starte Domain-Verifizierung...');

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.domains.verify(DOMAIN_ID);

    console.log('✅ Verifizierung gestartet!');
    console.log('Result:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('❌ Fehler bei der Domain-Verifizierung:', error.message);
    throw error;
  }
}

async function sendTestEmail() {
  try {
    console.log('📧 Sende Test-E-Mail...');

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'test@taskilo.de',
      to: ['andy.staudinger@taskilo.de'],
      subject: '🧪 Resend Domain Test - taskilo.de',
      html: `
        <h1>🎉 Domain-Setup erfolgreich!</h1>
        <p>Diese Test-E-Mail bestätigt, dass Resend für taskilo.de korrekt konfiguriert ist.</p>
        <p><strong>Gesendet am:</strong> ${new Date().toLocaleString('de-DE')}</p>
        <p><strong>Von:</strong> test@taskilo.de</p>
        <hr>
        <p><small>Automatisch generiert vom Resend Domain Setup Script</small></p>
      `,
    });

    console.log('✅ Test-E-Mail gesendet!');
    console.log('E-Mail ID:', result.data?.id);

    return result;
  } catch (error) {
    console.error('❌ Fehler beim Senden der Test-E-Mail:', error.message);
    throw error;
  }
}

// Hauptfunktion
async function main() {
  const command = process.argv[2];

  console.log('🚀 Resend Domain Setup für taskilo.de');
  console.log('='.repeat(50));

  try {
    switch (command) {
      case 'status':
        await checkDomainStatus();
        break;

      case 'verify':
        await verifyDomain();
        console.log('⏳ Warte 30 Sekunden und prüfe Status...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        await checkDomainStatus();
        break;

      case 'test':
        const domain = await checkDomainStatus();
        if (domain.status === 'verified') {
          await sendTestEmail();
        } else {
          console.log('⚠️ Domain ist noch nicht verifiziert. Führe erst "verify" aus.');
        }
        break;

      case 'setup':
        console.log('📋 SETUP-ANLEITUNG:');
        console.log();
        console.log('1️⃣ FÜGE DIESE DNS-RECORDS HINZU:');
        const domainData = await checkDomainStatus();
        console.log();
        console.log('2️⃣ FÜHRE VERIFIZIERUNG AUS:');
        console.log('   node scripts/resend-setup.js verify');
        console.log();
        console.log('3️⃣ TESTE E-MAIL-VERSAND:');
        console.log('   node scripts/resend-setup.js test');
        break;

      default:
        console.log('📖 VERWENDUNG:');
        console.log('   node scripts/resend-setup.js [command]');
        console.log();
        console.log('📋 VERFÜGBARE COMMANDS:');
        console.log('   setup  - Zeige Setup-Anleitung');
        console.log('   status - Prüfe Domain-Status');
        console.log('   verify - Starte Domain-Verifizierung');
        console.log('   test   - Sende Test-E-Mail');
    }
  } catch (error) {
    console.error('💥 Script-Fehler:', error.message);
    process.exit(1);
  }
}

main();
