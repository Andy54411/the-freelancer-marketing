// Test API für Gmail SMTP Newsletter-System
import { NextRequest, NextResponse } from 'next/server';
import { sendSingleEmailViaGmail } from '@/lib/gmail-smtp-newsletter';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Gmail Test API - Start...');

    const { email, token } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Umgebungsvariablen prüfen
    const config = {
      GMAIL_USERNAME: process.env.GMAIL_USERNAME,
      GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD ? 'VORHANDEN' : 'FEHLT',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    console.log('🔧 Gmail Konfiguration:', config);

    if (!process.env.GMAIL_USERNAME || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        {
          error: 'Gmail-Konfiguration unvollständig',
          config,
          missing: [
            !process.env.GMAIL_USERNAME && 'GMAIL_USERNAME',
            !process.env.GMAIL_APP_PASSWORD && 'GMAIL_APP_PASSWORD',
          ].filter(Boolean),
        },
        { status: 500 }
      );
    }

    // Test-E-Mail senden
    const testToken = token || 'test-token-12345';
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/newsletter/confirm?token=${testToken}&email=${encodeURIComponent(email)}`;

    console.log('📧 Teste E-Mail-Versand an:', email);
    console.log('🔗 Confirmation URL:', confirmationUrl);

    // Direkte E-Mail ohne sendConfirmationEmail
    const subject = 'Test: Newsletter-Anmeldung bestätigen - Taskilo';
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #14ad9f;">Test: Newsletter-Bestätigung</h1>
          <p>Hallo Test User,</p>
          <p>Dies ist eine Test-E-Mail für die Newsletter-Bestätigung.</p>
          <p><a href="${confirmationUrl}" style="background: #14ad9f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Newsletter bestätigen</a></p>
          <p>Confirmation URL: ${confirmationUrl}</p>
        </body>
      </html>
    `;

    const result = await sendSingleEmailViaGmail(email, subject, htmlContent);

    return NextResponse.json({
      success: true,
      message: 'Test-E-Mail erfolgreich gesendet!',
      result,
      config: {
        ...config,
        confirmationUrl,
      },
    });
  } catch (error) {
    console.error('🚨 Gmail Test Fehler:', error);

    return NextResponse.json(
      {
        error: 'Gmail Test fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : 'Kein Stack verfügbar',
      },
      { status: 500 }
    );
  }
}

// GET für Konfigurationscheck
export async function GET() {
  const config = {
    GMAIL_USERNAME: process.env.GMAIL_USERNAME || 'FEHLT',
    GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD ? 'VORHANDEN' : 'FEHLT',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'FEHLT',
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json({
    message: 'Gmail SMTP Konfiguration',
    config,
    ready: !!(process.env.GMAIL_USERNAME && process.env.GMAIL_APP_PASSWORD),
    instructions: {
      step1: 'Gmail App-Passwort erstellen in Google Workspace',
      step2: 'GMAIL_USERNAME und GMAIL_APP_PASSWORD in .env.local setzen',
      step3: 'Newsletter API testen mit POST /api/test-gmail',
    },
  });
}
