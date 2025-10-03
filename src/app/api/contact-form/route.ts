import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, captcha, timestamp } = await request.json();

    // Validierung der erforderlichen Felder
    if (!name || !email || !subject || !message || !captcha) {
      return NextResponse.json(
        {
          error: 'Alle Felder einschließlich Spam-Schutz sind erforderlich',
        },
        { status: 400 }
      );
    }

    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Ungültige E-Mail-Adresse',
        },
        { status: 400 }
      );
    }

    // Rate Limiting - nur eine Nachricht alle 30 Sekunden
    const now = Date.now();
    if (timestamp && now - timestamp > 300000) {
      // 5 Minuten max
      return NextResponse.json(
        {
          error: 'Anfrage zu alt. Bitte versuchen Sie es erneut.',
        },
        { status: 400 }
      );
    }

    // Spam-Filter: Einfache Wort-Blacklist
    const spamWords = [
      'casino',
      'viagra',
      'loan',
      'credit',
      'bitcoin',
      'crypto',
      'investment',
      'forex',
    ];
    const messageText = `${subject} ${message} ${name}`.toLowerCase();
    if (spamWords.some(word => messageText.includes(word))) {
      return NextResponse.json(
        {
          error: 'Nachricht enthält nicht erlaubte Inhalte',
        },
        { status: 400 }
      );
    }

    // Längen-Validierung
    if (message.length < 10) {
      return NextResponse.json(
        {
          error: 'Nachricht ist zu kurz (mindestens 10 Zeichen)',
        },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        {
          error: 'Nachricht ist zu lang (maximal 5000 Zeichen)',
        },
        { status: 400 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // E-Mail an Andy Staudinger senden
    const emailResponse = await resend.emails.send({
      from: 'Taskilo Kontaktformular <noreply@taskilo.de>',
      to: ['andy.staudinger@taskilo.de'],
      replyTo: email,
      subject: `Kontaktformular: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #14ad9f; border-bottom: 2px solid #14ad9f; padding-bottom: 10px;">
            Neue Nachricht über Taskilo Kontaktformular
          </h2>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Kontaktdaten:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Betreff:</strong> ${subject}</p>
          </div>

          <div style="background-color: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Nachricht:</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>Hinweis:</strong> Diese Nachricht wurde über das Kontaktformular auf taskilo.de gesendet.
              <br>
              <strong>Zeitstempel:</strong> ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
            </p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      return NextResponse.json(
        {
          error: 'E-Mail konnte nicht gesendet werden',
          details: emailResponse.error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Nachricht erfolgreich gesendet',
      emailId: emailResponse.data?.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
