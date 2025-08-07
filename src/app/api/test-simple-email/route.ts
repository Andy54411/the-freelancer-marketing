import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('🧪 Teste einfache E-Mail mit Resend...');

    const emailResponse = await resend.emails.send({
      from: 'Mietkoch Andy <noreply@taskilo.de>',
      replyTo: 'a.staudinger32@icloud.com',
      to: ['a.staudinger32@icloud.com'],
      subject: 'Taskilo E-Mail Test',
      html: `
        <h1>Test E-Mail</h1>
        <p>Dies ist ein Test der Resend E-Mail-Funktionalität.</p>
        <p>Von: Mietkoch Andy</p>
        <p>Reply-To: a.staudinger32@icloud.com</p>
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
