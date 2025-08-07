import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  try {
    // Prüfe Environment Variable
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'RESEND_API_KEY nicht gefunden',
          configured: false,
        },
        { status: 500 }
      );
    }

    // Prüfe API Key Format
    if (!apiKey.startsWith('re_')) {
      return NextResponse.json(
        {
          error: 'RESEND_API_KEY hat falsches Format (sollte mit "re_" beginnen)',
          configured: false,
          keyPrefix: apiKey.substring(0, 10) + '...',
        },
        { status: 500 }
      );
    }

    // Teste Resend Connection
    const resend = new Resend(apiKey);

    console.log('🔍 Teste Resend API Key...');

    // Verwende eine einfache Domain-Test-E-Mail
    const testResponse = await resend.emails.send({
      from: 'test@taskilo.de',
      to: ['andy.staudinger@taskilo.de'], // Teste mit einer bekannten E-Mail
      subject: 'Taskilo Resend API Test',
      html: `
        <h1>Resend API Test</h1>
        <p>Dies ist ein Test der Resend API Konfiguration.</p>
        <p>Zeitstempel: ${new Date().toISOString()}</p>
      `,
    });

    if (testResponse.error) {
      console.error('❌ Resend Test Fehler:', testResponse.error);
      return NextResponse.json(
        {
          error: 'Resend API Test fehlgeschlagen',
          details: testResponse.error.message,
          configured: true,
          keyValid: false,
        },
        { status: 500 }
      );
    }

    console.log('✅ Resend Test erfolgreich:', testResponse.data?.id);

    return NextResponse.json({
      success: true,
      configured: true,
      keyValid: true,
      messageId: testResponse.data?.id,
      message: 'Resend API funktioniert korrekt',
    });
  } catch (error) {
    console.error('❌ Resend Test Fehler:', error);
    return NextResponse.json(
      {
        error: 'Resend Test fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        configured: !!process.env.RESEND_API_KEY,
      },
      { status: 500 }
    );
  }
}
