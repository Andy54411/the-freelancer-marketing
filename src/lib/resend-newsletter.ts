// Resend Newsletter System - Moderne E-Mail API ohne Gmail-Probleme
import { Resend } from 'resend';

// Resend Client initialisieren
const resend = new Resend(process.env.RESEND_API_KEY);

// Newsletter-Bestätigungs-E-Mail senden
export async function sendNewsletterConfirmationViaResend(
  email: string,
  name: string | undefined,
  confirmationToken: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/newsletter/confirm?token=${confirmationToken}&email=${encodeURIComponent(email)}`;

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

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 30px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                <strong>Funktioniert der Button nicht?</strong><br>
                Kopieren Sie diesen Link in Ihren Browser:<br>
                <a href="${confirmationUrl}" style="color: #14ad9f; word-break: break-all;">${confirmationUrl}</a>
              </p>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

            <div style="text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                <strong>Warum erhalten Sie diese E-Mail?</strong><br>
                Diese E-Mail wurde versendet, weil sich jemand mit Ihrer E-Mail-Adresse für unseren Newsletter angemeldet hat.
              </p>

              <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                Falls Sie sich nicht angemeldet haben, können Sie diese E-Mail einfach ignorieren.
                Der Bestätigungslink ist 24 Stunden gültig.
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  <strong>Taskilo GmbH</strong><br>
                  E-Mail: <a href="mailto:support@taskilo.de" style="color: #14ad9f;">support@taskilo.de</a><br>
                  Web: <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      replyTo: 'support@taskilo.de',
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'E-Mail-Versand fehlgeschlagen',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Newsletter an mehrere Empfänger versenden
export async function sendBulkNewsletterViaResend(
  recipients: string[],
  subject: string,
  htmlContent: string
): Promise<{
  success: boolean;
  results: Array<{
    batch: number;
    recipients: string[];
    success: boolean;
    error?: string;
    messageId?: string;
  }>;
  error?: string;
}> {
  try {
    const results: Array<{
      batch: number;
      recipients: string[];
      success: boolean;
      error?: string;
      messageId?: string;
    }> = [];

    // Resend unterstützt Batch-Versand (bis zu 50 Empfänger pro API-Call)
    const batchSize = 50;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      try {
        const { data, error } = await resend.emails.send({
          from: 'Taskilo Newsletter <newsletter@taskilo.de>',
          to: batch,
          subject: subject,
          html: htmlContent,
          replyTo: 'support@taskilo.de',
        });

        if (error) {
          results.push({
            batch: i / batchSize + 1,
            recipients: batch,
            success: false,
            error: error.message,
          });
        } else {
          results.push({
            batch: i / batchSize + 1,
            recipients: batch,
            success: true,
            messageId: data?.id,
          });
        }

        // Kurze Pause zwischen Batches
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (batchError) {
        results.push({
          batch: i / batchSize + 1,
          recipients: batch,
          success: false,
          error: batchError instanceof Error ? batchError.message : 'Batch-Fehler',
        });
      }
    }

    const successfulBatches = results.filter(r => r.success);
    const totalSuccess = successfulBatches.length > 0;

    return {
      success: totalSuccess,
      results,
    };
  } catch (error) {
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Bulk-Newsletter-Fehler',
    };
  }
}

// Test-Funktion für Resend
export async function testResendConnection(): Promise<{
  success: boolean;
  error?: string;
  apiKey?: string;
}> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'RESEND_API_KEY nicht gesetzt',
      };
    }

    // Einfacher Test mit einer Test-E-Mail
    const { error } = await resend.emails.send({
      from: 'Test <newsletter@taskilo.de>',
      to: ['delivered@resend.dev'], // Resend Test-E-Mail-Adresse
      subject: 'Resend Verbindungstest',
      html: '<p>Test-E-Mail zur Überprüfung der Resend-Verbindung</p>',
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      apiKey: process.env.RESEND_API_KEY.substring(0, 8) + '...',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen',
    };
  }
}
