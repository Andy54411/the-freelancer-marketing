#!/usr/bin/env node

/**
 * Test Script für E-Mail-API
 * Testet die sendNewProposalEmail Funktion
 */

async function testEmailAPI() {
  console.log('🧪 Teste E-Mail-API...');

  // Test-Daten
  const testData = {
    customerEmail: 'info@the-freelancer-marketing.com', // Deine E-Mail für den Test
    projectTitle: 'Test Projekt - Mietkoch für Ostern',
    providerName: 'Test Anbieter GmbH',
    proposalAmount: 1400,
  };

  try {
    console.log('📧 Teste direkt die E-Mail-Service...');

    // Importiere den E-Mail-Service
    const { emailService } = await import('./src/lib/resend-email-service.ts');

    console.log('📤 Sende Test-E-Mail mit Daten:', testData);

    const result = await emailService.sendNewProposalEmail(
      testData.customerEmail,
      testData.projectTitle,
      testData.providerName,
      testData.proposalAmount
    );

    console.log('📧 E-Mail-Ergebnis:', result);

    if (result.success) {
      console.log('✅ TEST ERFOLGREICH: E-Mail wurde gesendet!');
      console.log('📨 Message ID:', result.messageId);
      console.log('🔍 Prüfe dein E-Mail-Postfach (auch Spam-Ordner)!');
    } else {
      console.log('❌ TEST FEHLGESCHLAGEN:', result.error);
    }
  } catch (error) {
    console.error('💥 Fehler beim Testen der E-Mail-API:', error);

    // Zeige Umgebungsvariablen (ohne sensitive Daten)
    console.log('🔍 Environment Check:');
    console.log('- RESEND_API_KEY vorhanden:', !!process.env.RESEND_API_KEY);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
  }
}

// Führe den Test aus
testEmailAPI().catch(console.error);
