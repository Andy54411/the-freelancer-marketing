// Direkter Resend API Test
// Verwendung: node test-resend.js

require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

const testResend = async () => {
  console.log('🧪 Teste Resend API direkt...');

  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    console.error('❌ RESEND_API_KEY nicht gefunden');
    return;
  }

  console.log(
    `🔑 Verwende API Key: re_${resendKey.substring(3, 8)}...${resendKey.substring(resendKey.length - 5)}`
  );

  const resend = new Resend(resendKey);

  try {
    console.log('📧 Sende Test-E-Mail über Resend...');

    const result = await resend.emails.send({
      from: 'Taskilo Test <noreply@taskilo.de>',
      to: ['andystaudinger@gmail.com'],
      subject: 'Resend API Test - Taskilo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #14ad9f;">🧪 Resend API Test</h1>
          <p>Diese E-Mail wurde direkt über die Resend API gesendet.</p>
          <p>Wenn Sie diese E-Mail erhalten, funktioniert die Resend-Integration!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Test durchgeführt am: ${new Date().toLocaleString('de-DE')}</p>
        </div>
      `,
    });

    if (result.error) {
      console.error('❌ Resend Fehler:', result.error);
      console.log('🔍 Fehlerdetails:', JSON.stringify(result.error, null, 2));
    } else {
      console.log('✅ E-Mail erfolgreich gesendet!');
      console.log('📧 Message ID:', result.data?.id);
      console.log('🎉 Resend API funktioniert korrekt!');
    }
  } catch (error) {
    console.error('🚨 Fehler beim Resend-Test:', error.message);
    console.log('');
    console.log('🔧 Mögliche Ursachen:');
    console.log('   - API Key ist ungültig oder abgelaufen');
    console.log('   - Domain taskilo.de ist nicht bei Resend verifiziert');
    console.log('   - Resend Service ist temporär nicht verfügbar');
    console.log('   - Netzwerkprobleme');

    if (error.message.includes('not verified')) {
      console.log('');
      console.log('💡 Domain-Verifikation erforderlich:');
      console.log('   1. Gehen Sie zu https://resend.com/domains');
      console.log('   2. Fügen Sie taskilo.de hinzu');
      console.log('   3. Bestätigen Sie die DNS-Einträge');
    }
  }
};

testResend();
