// Test API für Gmail SMTP Newsletter-System
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Import mit try-catch für bessere Fehlerbehandlung
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let testGmailConnection: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sendNewsletterConfirmationEmail: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gmailModule = require('@/lib/gmail-oauth-newsletter');
  testGmailConnection = gmailModule.testGmailConnection;
  sendNewsletterConfirmationEmail = gmailModule.sendNewsletterConfirmationEmail;
} catch {
  console.log('🔧 Gmail OAuth Module nicht verfügbar, verwende SMTP Fallback');
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Gmail Test API - Start...');

    const { email, token, method } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Umgebungsvariablen prüfen
    const config = {
      GMAIL_USERNAME: process.env.GMAIL_USERNAME,
      GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD ? 'VORHANDEN' : 'FEHLT',
      GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'VORHANDEN' : 'FEHLT',
      GMAIL_IMPERSONATE_EMAIL: process.env.GMAIL_IMPERSONATE_EMAIL || 'newsletter@taskilo.de',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    console.log('🔧 Gmail Konfiguration:', config);

    // Methode 1: OAuth2 mit Service Account (Empfohlen)
    if (method === 'oauth' || config.GOOGLE_SERVICE_ACCOUNT_KEY === 'VORHANDEN') {
      try {
        console.log('📧 Teste Gmail OAuth2 API...');

        if (!testGmailConnection || !sendNewsletterConfirmationEmail) {
          throw new Error('Gmail OAuth Module nicht verfügbar');
        }

        // OAuth Test mit Domain-wide Delegation
        const connectionTest = await testGmailConnection();
        if (connectionTest.success) {
          const emailResult = await sendNewsletterConfirmationEmail(email, token || 'test-token');

          return NextResponse.json({
            success: emailResult.success,
            message: emailResult.success
              ? 'Gmail OAuth2 Test und E-Mail-Versand erfolgreich!'
              : 'Gmail OAuth2 Test erfolgreich, aber E-Mail-Versand fehlgeschlagen',
            method: 'oauth2',
            connectionTest,
            emailResult,
            config: {
              ...config,
              GOOGLE_SERVICE_ACCOUNT_KEY: config.GOOGLE_SERVICE_ACCOUNT_KEY,
              GMAIL_IMPERSONATE_EMAIL: config.GMAIL_IMPERSONATE_EMAIL,
            },
          });
        } else {
          console.error('🚨 Gmail API Verbindungstest fehlgeschlagen:', connectionTest.error);
          // Fallback zu SMTP
        }
      } catch (error) {
        console.error('🚨 OAuth2 Test fehlgeschlagen:', error);
        // Fallback zu SMTP
      }
    }

    // Methode 2: SMTP mit App-Passwort (Fallback)
    if (!process.env.GMAIL_USERNAME || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        {
          error: 'Gmail-Konfiguration unvollständig',
          config,
          missing: [
            !process.env.GMAIL_USERNAME && 'GMAIL_USERNAME',
            !process.env.GMAIL_APP_PASSWORD && 'GMAIL_APP_PASSWORD',
          ].filter(Boolean),
          suggestion:
            'Verwende OAuth2 mit Service Account oder setze GMAIL_USERNAME und GMAIL_APP_PASSWORD',
        },
        { status: 500 }
      );
    }

    // Test-E-Mail senden
    const testToken = token || 'test-token-12345';
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/newsletter/confirm?token=${testToken}&email=${encodeURIComponent(email)}`;

    console.log('📧 Teste E-Mail-Versand an:', email);
    console.log('🔗 Confirmation URL:', confirmationUrl);

    // Gmail Transporter erstellen
    const gmailTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });

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

    const mailOptions = {
      from: `"Taskilo Newsletter" <${process.env.GMAIL_USERNAME}>`,
      to: email,
      subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, ''), // HTML zu Text
      replyTo: process.env.GMAIL_USERNAME,
    };

    console.log('📧 Gmail SMTP - Sende E-Mail mit Options:', {
      ...mailOptions,
      html: '[HTML Content]',
      to: email,
    });

    const result = await gmailTransporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Test-E-Mail erfolgreich gesendet!',
      method: 'smtp',
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
    GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'VORHANDEN' : 'FEHLT',
    GMAIL_IMPERSONATE_EMAIL: process.env.GMAIL_IMPERSONATE_EMAIL || 'newsletter@taskilo.de',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'FEHLT',
    NODE_ENV: process.env.NODE_ENV,
  };

  const methods = [];

  if (config.GOOGLE_SERVICE_ACCOUNT_KEY === 'VORHANDEN') {
    methods.push('oauth2');
  }

  if (config.GMAIL_USERNAME !== 'FEHLT' && config.GMAIL_APP_PASSWORD === 'VORHANDEN') {
    methods.push('smtp');
  }

  return NextResponse.json({
    message: 'Gmail Newsletter System Konfiguration',
    config,
    availableMethods: methods,
    recommended: methods.includes('oauth2') ? 'oauth2' : 'smtp',
    ready: methods.length > 0,
    instructions: {
      oauth2: {
        step1: 'Google Cloud Console: Gmail API aktivieren',
        step2: 'Service Account mit Domain-wide Delegation erstellen',
        step3: 'GOOGLE_SERVICE_ACCOUNT_KEY und GMAIL_IMPERSONATE_EMAIL setzen',
        step4: 'Google Workspace Admin: Domain-wide Delegation konfigurieren',
      },
      smtp: {
        step1: 'Gmail App-Passwort erstellen in Google Account',
        step2: 'GMAIL_USERNAME und GMAIL_APP_PASSWORD in Umgebungsvariablen setzen',
        step3: 'Newsletter API testen mit POST /api/test-gmail',
      },
    },
  });
}
