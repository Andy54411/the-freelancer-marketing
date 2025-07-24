// Resend Test API - Neuer E-Mail-Service testen
import { NextRequest, NextResponse } from 'next/server';

// Lazy Resend initialization to avoid build-time API key requirement
async function getResendClient() {
  const { Resend } = await import('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html } = await request.json();

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY ist nicht konfiguriert' }, { status: 500 });
    }

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse und Betreff sind erforderlich' },
        { status: 400 }
      );
    }

    const resend = await getResendClient();

    const { data, error } = await resend.emails.send({
      from: 'Taskilo <noreply@taskilo.de>',
      to: [to],
      subject: subject,
      html:
        html ||
        `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #333;">🔧 Resend Test E-Mail</h2>
          <p>Dies ist eine Test-E-Mail vom Taskilo Resend-Service.</p>
          <p><strong>Zeit:</strong> ${new Date().toLocaleString('de-DE')}</p>
          <p><strong>Service:</strong> Resend API</p>
          <p><strong>Status:</strong> E-Mail-System erfolgreich migriert! ✅</p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend Test-Fehler:', error);
      return NextResponse.json(
        { error: 'Fehler beim Versenden der Test-E-Mail', details: error },
        { status: 500 }
      );
    }

    console.log('✅ Resend Test erfolgreich:', data);
    return NextResponse.json({
      success: true,
      message: 'Test-E-Mail erfolgreich versendet',
      data: data,
      service: 'Resend API',
    });
  } catch (error) {
    console.error('❌ Resend Test Exception:', error);
    return NextResponse.json(
      {
        error: 'Unerwarteter Fehler beim E-Mail-Test',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '🚀 Resend E-Mail Test API für Taskilo',
    usage: 'POST { "to": "test@example.com", "subject": "Test", "html": "optional" }',
    service: 'Resend API',
    config: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
      from_domain: 'taskilo.de',
      limits: '3.000 E-Mails/Monat kostenlos',
    },
  });
}
