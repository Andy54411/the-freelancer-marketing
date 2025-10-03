import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { ticketId, title, reportedBy } = await request.json();

    const emailResponse = await resend.emails.send({
      from: 'Taskilo Support <support@taskilo.de>',
      to: ['andy.staudinger@taskilo.de'],
      replyTo: reportedBy || 'admin@taskilo.de',
      subject: `🎫 Test: Neues Ticket erstellt - ${title} [#${ticketId}]`,
      html: `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Taskilo Ticket Test</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="background: linear-gradient(135deg, #14ad9f 0%, #129488 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🎫 Taskilo Ticket-System</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Test-E-Mail erfolgreich</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px;">

            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #14ad9f;">
              <h2 style="margin: 0 0 15px 0; color: #14ad9f;">
                ${title}
              </h2>

              <div style="margin-bottom: 15px;">
                <strong>Ticket-ID:</strong> #${ticketId}
              </div>

              <div style="margin-bottom: 15px;">
                <strong>Erstellt von:</strong> ${reportedBy || 'admin@taskilo.de'}
              </div>

              <div style="margin-bottom: 15px;">
                <strong>Zeitstempel:</strong> ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
              </div>
            </div>

            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong>✅ E-Mail-System funktioniert!</strong><br>
              Das Ticket-E-Mail-System ist erfolgreich konfiguriert und bereit für den Einsatz.
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <a href="http://localhost:3000/dashboard/admin/tickets"
                 style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Ticket-Dashboard öffnen
              </a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
              <p>
                <strong>Taskilo Support Team</strong><br>
                E-Mail: <a href="mailto:support@taskilo.de" style="color: #14ad9f;">support@taskilo.de</a><br>
                Web: <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
              </p>
            </div>
          </div>
        </body>
        </html>
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
      message: 'Test-E-Mail erfolgreich gesendet',
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
