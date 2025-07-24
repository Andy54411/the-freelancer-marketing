// Saubere Newsletter API nur mit Resend
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { recipient, subject, content } = await request.json();

    if (!recipient) {
      return NextResponse.json({ error: 'Empfänger-E-Mail erforderlich' }, { status: 400 });
    }

    console.log('📧 Newsletter-Versand über Resend:', recipient);

    // Newsletter über Resend versenden
    const { data, error } = await resend.emails.send({
      from: 'Taskilo Newsletter <newsletter@taskilo.de>',
      to: [recipient],
      subject: subject || '📬 Taskilo Newsletter',
      html:
        content ||
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Taskilo Newsletter</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>📬 Taskilo Newsletter</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #667eea;">Willkommen bei Taskilo!</h2>
            
            <p>Vielen Dank für Ihr Interesse an unserem Newsletter. Wir halten Sie über alle Neuigkeiten und Updates auf dem Laufenden.</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af;">🚀 Neuigkeiten</h3>
              <p style="margin: 0;">Bleiben Sie dran für spannende Updates zu Taskilo!</p>
            </div>
            
            <p>Ihr Taskilo Team 🎉</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
            <p>© ${new Date().getFullYear()} Taskilo - Powered by Resend</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend Newsletter Fehler:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    console.log('✅ Newsletter erfolgreich versendet:', data);

    return NextResponse.json({
      success: true,
      message: '📧 Newsletter erfolgreich über Resend versendet!',
      messageId: data?.id,
      service: 'Resend',
    });
  } catch (error) {
    console.error('🚨 Newsletter API Fehler:', error);
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
    message: '📬 Taskilo Newsletter API - Powered by Resend',
    usage:
      'POST { "recipient": "test@example.com", "subject": "Newsletter", "content": "HTML content" }',
    service: 'Resend Only',
    status: 'Clean - No Google/Gmail dependencies',
    config: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
      from_domain: 'taskilo.de',
      limits: '3.000 E-Mails/Monat kostenlos',
    },
  });
}
