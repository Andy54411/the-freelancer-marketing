import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message } = await request.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('🧪 Teste einfache E-Mail mit Resend...', { to, subject });

    const emailResponse = await resend.emails.send({
      from: 'Test <noreply@taskilo.de>',
      to: [to],
      subject: subject,
      html: `
        <h1>Test E-Mail</h1>
        <p>${message}</p>
        <p>Zeitstempel: ${new Date().toISOString()}</p>
      `,
    });

    if (emailResponse.error) {
      console.error('❌ Resend Fehler:', emailResponse.error);
      return NextResponse.json(
        {
          success: false,
          error: emailResponse.error.message,
        },
        { status: 500 }
      );
    }

    console.log('✅ Test-E-Mail erfolgreich gesendet:', emailResponse.data?.id);

    return NextResponse.json({
      success: true,
      messageId: emailResponse.data?.id,
      message: 'Test-E-Mail erfolgreich versendet',
    });
  } catch (error) {
    console.error('❌ Test-E-Mail Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
