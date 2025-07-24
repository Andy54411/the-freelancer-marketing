// Einfache E-Mail-Test API - Direkt testen aller Systeme
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, test } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 });
    }

    console.log('🔧 Simple E-Mail Test Start für:', email);

    const results: any = { tests: [] };

    // Test 1: OAuth2 Gmail API
    try {
      console.log('📧 Test 1: OAuth2 Gmail API');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const gmailOAuth = require('@/lib/gmail-oauth-newsletter');
      const service = gmailOAuth.getGmailService();

      const oauthResult = await service.sendEmail(
        email,
        'Test: OAuth2 Gmail API - Taskilo',
        `<h2>OAuth2 Gmail API Test</h2><p>Diese E-Mail wurde über OAuth2 Gmail API gesendet.</p><p>Zeit: ${new Date().toISOString()}</p>`
      );

      results.tests.push({
        method: 'OAuth2 Gmail API',
        success: oauthResult.success,
        result: oauthResult,
      });

      console.log('✅ OAuth2 Test erfolgreich:', oauthResult);
    } catch (oauth2Error) {
      console.error('❌ OAuth2 Test fehlgeschlagen:', oauth2Error);
      results.tests.push({
        method: 'OAuth2 Gmail API',
        success: false,
        error: oauth2Error instanceof Error ? oauth2Error.message : 'OAuth2 Fehler',
      });
    }

    // Test 2: SMTP Gmail (falls OAuth2 fehlschlägt)
    if (results.tests.length === 0 || !results.tests[0].success) {
      try {
        console.log('📧 Test 2: SMTP Gmail');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodemailer = require('nodemailer');

        const smtpTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.GMAIL_USERNAME,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        const smtpResult = await smtpTransporter.sendMail({
          from: `"Taskilo Test" <${process.env.GMAIL_USERNAME}>`,
          to: email,
          subject: 'Test: SMTP Gmail - Taskilo',
          html: `<h2>SMTP Gmail Test</h2><p>Diese E-Mail wurde über SMTP Gmail gesendet.</p><p>Zeit: ${new Date().toISOString()}</p>`,
        });

        results.tests.push({
          method: 'SMTP Gmail',
          success: true,
          result: { messageId: smtpResult.messageId },
        });

        console.log('✅ SMTP Test erfolgreich:', smtpResult.messageId);
      } catch (smtpError) {
        console.error('❌ SMTP Test fehlgeschlagen:', smtpError);
        results.tests.push({
          method: 'SMTP Gmail',
          success: false,
          error: smtpError instanceof Error ? smtpError.message : 'SMTP Fehler',
        });
      }
    }

    // Ergebnis
    const successfulTests = results.tests.filter((t: any) => t.success);
    const hasSuccess = successfulTests.length > 0;

    return NextResponse.json({
      success: hasSuccess,
      message: hasSuccess
        ? `✅ E-Mail erfolgreich gesendet via ${successfulTests[0].method}`
        : '❌ Alle E-Mail-Methoden fehlgeschlagen',
      results,
      config: {
        GMAIL_USERNAME: process.env.GMAIL_USERNAME || 'NICHT GESETZT',
        GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD ? 'VORHANDEN' : 'NICHT GESETZT',
        GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ? 'VORHANDEN'
          : 'NICHT GESETZT',
        GMAIL_IMPERSONATE_EMAIL: process.env.GMAIL_IMPERSONATE_EMAIL || 'NICHT GESETZT',
      },
    });
  } catch (error) {
    console.error('🚨 Simple E-Mail Test Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple E-Mail Test API',
    usage: 'POST { "email": "test@example.com" }',
    available_methods: ['OAuth2 Gmail API', 'SMTP Gmail'],
    config: {
      GMAIL_USERNAME: process.env.GMAIL_USERNAME || 'NICHT GESETZT',
      GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD ? 'VORHANDEN' : 'NICHT GESETZT',
      GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
        ? 'VORHANDEN'
        : 'NICHT GESETZT',
      GMAIL_IMPERSONATE_EMAIL: process.env.GMAIL_IMPERSONATE_EMAIL || 'NICHT GESETZT',
    },
  });
}
