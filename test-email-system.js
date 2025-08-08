// Test-Script für das intelligente E-Mail-System
// Verwendung: node test-email-system.js

const testEmailSystem = async () => {
  console.log('🧪 Teste Taskilo E-Mail-System...');

  // Test-Daten für eine Rechnung
  const testData = {
    invoiceId: 'wUqlbBR6DJ2fDrAY0jVJ', // Echte Invoice-ID aus Firestore
    recipientEmail: 'a.staudinger32@icloud.com',
    recipientName: 'Andy Staudinger',
    subject: 'Test: Ihre Rechnung von Taskilo',
    message: 'Dies ist eine Test-E-Mail vom neuen intelligenten E-Mail-System.',
    senderName: 'Mietkoch Andy',
  };

  try {
    console.log('📤 Sende Test-E-Mail an:', testData.recipientEmail);

    const response = await fetch('http://localhost:3000/api/send-invoice-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('📊 API Response Status:', response.status);
    console.log('📋 API Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ E-Mail erfolgreich gesendet!');
      console.log('📧 Message ID:', result.messageId);
      console.log('👤 Sender verwendet:', result.senderUsed);
      console.log('🔄 Fallback verwendet:', result.fallbackUsed ? 'Ja' : 'Nein');

      if (result.replyToEmail) {
        console.log('↩️ Reply-To gesetzt auf:', result.replyToEmail);
      }

      if (result.hasAttachment) {
        console.log('📎 PDF-Anhang: Ja');
      } else if (result.downloadLinkProvided) {
        console.log('🔗 Download-Link bereitgestellt: Ja');
      }
    } else {
      console.error('❌ E-Mail-Versand fehlgeschlagen:', result.error);
    }
  } catch (error) {
    console.error('🚨 Test-Fehler:', error.message);
  }
};

// Test starten
testEmailSystem();
