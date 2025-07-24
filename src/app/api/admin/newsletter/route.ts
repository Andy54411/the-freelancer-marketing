// Saubere Admin Newsletter API nur mit Resend
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Admin Newsletter API - Powered by Resend',
      service: 'Resend Only',
      status: 'Clean - No Google/Gmail dependencies',
      features: [
        'Newsletter versenden',
        'Abonnenten verwalten',
        'E-Mail-Templates',
        'Delivery-Tracking',
      ],
      config: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
        from_domain: 'taskilo.de',
        limits: '3.000 E-Mails/Monat kostenlos',
      },
    });
  } catch (error) {
    console.error('Admin Newsletter GET Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, recipients, subject, content } = await request.json();

    if (action === 'send') {
      if (!recipients || recipients.length === 0) {
        return NextResponse.json({ error: 'Empfänger erforderlich' }, { status: 400 });
      }

      console.log(`📧 Admin Newsletter-Versand an ${recipients.length} Empfänger`);

      // Newsletter über Resend versenden
      const results = [];
      for (const recipient of recipients) {
        try {
          const { data, error } = await resend.emails.send({
            from: 'Taskilo Newsletter <newsletter@taskilo.de>',
            to: [recipient],
            subject: subject || 'Taskilo Newsletter',
            html: content || '<h1>Newsletter von Taskilo</h1><p>Vielen Dank für Ihr Interesse!</p>',
          });

          if (error) {
            results.push({ recipient, success: false, error: error.message });
          } else {
            results.push({ recipient, success: true, messageId: data?.id });
          }
        } catch (emailError) {
          results.push({
            recipient,
            success: false,
            error: emailError instanceof Error ? emailError.message : 'Unbekannter Fehler',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(
        `✅ Admin Newsletter versendet: ${successCount}/${recipients.length} erfolgreich`
      );

      return NextResponse.json({
        success: true,
        message: `Newsletter versendet: ${successCount}/${recipients.length} erfolgreich`,
        results,
        service: 'Resend',
      });
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
  } catch (error) {
    console.error('Admin Newsletter POST Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Interner Server-Fehler',
      },
      { status: 500 }
    );
  }
}
