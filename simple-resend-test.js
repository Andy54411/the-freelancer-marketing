// Einfacher Resend Test ohne komplexe Logik
// Verwendung: node simple-resend-test.js

require('dotenv').config({ path: '.env.local' });

const testSimpleResend = async () => {
  console.log('🧪 Einfacher Resend Test...');

  const resendKey = process.env.RESEND_API_KEY;
  console.log(
    `🔑 API Key: re_${resendKey?.substring(3, 8)}...${resendKey?.substring(resendKey.length - 5)}`
  );

  try {
    // Teste mit einfachem fetch statt Resend SDK
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Taskilo Test <noreply@taskilo.de>',
        to: ['a.staudinger32@icloud.com'],
        subject: 'Einfacher Resend Test',
        html: '<h1>Test E-Mail</h1><p>Wenn Sie diese E-Mail erhalten, funktioniert Resend!</p>',
      }),
    });

    const result = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ Resend funktioniert! Message ID:', result.id);
    } else {
      console.error('❌ Resend Fehler:', result);
    }
  } catch (error) {
    console.error('🚨 Fetch Fehler:', error.message);
  }
};

testSimpleResend();
