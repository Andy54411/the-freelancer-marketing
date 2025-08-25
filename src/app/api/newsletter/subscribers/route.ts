// Saubere Newsletter Subscribers API nur mit Resend
import { NextRequest, NextResponse } from 'next/server';
import { createPendingSubscription } from '@/lib/newsletter-double-opt-in';

// Resend-Client lazy initialisieren - NUR zur Runtime mit dynamic import
async function getResendClient() {
  const { Resend } = await import('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY ist nicht gesetzt');
  }
  return new Resend(apiKey);
}

// Newsletter-Bestätigungs-E-Mail direkt über Resend senden
async function sendNewsletterConfirmation(
  email: string,
  name: string | undefined,
  confirmationToken: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/newsletter/confirm?token=${confirmationToken}&email=${encodeURIComponent(email)}`;

    const resend = await getResendClient();
    const { data, error } = await resend.emails.send({
      from: 'Taskilo Newsletter <newsletter@taskilo.de>',
      to: [email],
      subject: 'Newsletter-Anmeldung bestätigen - Taskilo',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Newsletter-Anmeldung bestätigen</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #14ad9f; margin: 0;">🎉 Willkommen bei Taskilo!</h1>
            </div>

            <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hallo${name ? ` ${name}` : ''},</p>

            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              vielen Dank für Ihr Interesse an unserem Newsletter! Um Ihre Anmeldung abzuschließen,
              bestätigen Sie bitte Ihre E-Mail-Adresse, indem Sie auf den Button unten klicken.
            </p>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${confirmationUrl}"
                 style="background-color: #14ad9f; color: white; padding: 16px 32px; text-decoration: none;
                        border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                Newsletter-Anmeldung bestätigen
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
              <a href="${confirmationUrl}" style="color: #14ad9f; word-break: break-all;">${confirmationUrl}</a>
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

            <p style="font-size: 12px; color: #6b7280;">
              Diese E-Mail wurde automatisch versendet. Falls Sie sich nicht für unseren Newsletter angemeldet haben,
              können Sie diese E-Mail einfach ignorieren.
            </p>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">
                © ${new Date().getFullYear()} Taskilo GmbH - Powered by Resend<br>
                <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {

      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// DSGVO-konforme Newsletter-Anmeldung mit Double-Opt-In
export async function POST(request: NextRequest) {
  try {
    const { email, name, source = 'website', preferences = [] } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 });
    }

    // Verwende das Double-Opt-In System
    const result = await createPendingSubscription(email, {
      name,
      source: source as 'manual' | 'website' | 'import' | 'footer',
      preferences,
      ipAddress:
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    if (result.success) {

      return NextResponse.json({
        success: true,
        message: 'Newsletter-Anmeldung erfolgreich! Bestätigungs-E-Mail wurde gesendet.',
        requiresConfirmation: true,
        service: 'Resend',
      });
    } else {

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Newsletter-Anmeldung fehlgeschlagen',
        },
        { status: 500 }
      );
    }
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Interner Server-Fehler',
      },
      { status: 500 }
    );
  }
}

// Newsletter-Abonnenten abrufen (vereinfacht)
export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Newsletter Subscribers API - Powered by Resend',
      service: 'Resend Only',
      status: 'Clean - No Google/Gmail dependencies',
      config: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
      },
    });
  } catch (error) {

    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
