// Resend Test API - Neuer E-Mail-Service testen
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { recipient } = await request.json();

    if (!recipient) {
      return NextResponse.json({ error: 'Empfänger-E-Mail erforderlich' }, { status: 400 });
    }

    console.log('🚀 Resend Test gestartet für:', recipient);

    // Test-E-Mail über Resend versenden
    const { data, error } = await resend.emails.send({
      from: 'Taskilo Newsletter <newsletter@taskilo.de>',
      to: [recipient],
      subject: '🎉 Resend E-Mail System Test - Taskilo',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Resend Test</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>🚀 Resend Test erfolgreich!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #667eea;">✅ E-Mail-System funktioniert!</h2>
            
            <p>Diese E-Mail wurde erfolgreich über <strong>Resend</strong> versendet - das neue E-Mail-System für Taskilo.</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af;">📊 System-Details:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Service:</strong> Resend API</li>
                <li><strong>Domain:</strong> taskilo.de</li>
                <li><strong>Status:</strong> Voll funktionsfähig</li>
                <li><strong>Zeitstempel:</strong> ${new Date().toISOString()}</li>
                <li><strong>API-Key:</strong> ${process.env.RESEND_API_KEY?.substring(0, 10)}...</li>
              </ul>
            </div>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin: 0 0 10px 0; color: #065f46;">🎯 Nächste Schritte:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>✅ Gmail-Probleme sind Geschichte</li>
                <li>✅ Newsletter-Versand funktioniert</li>
                <li>✅ 3.000 E-Mails/Monat kostenlos</li>
                <li>✅ Professionelle Zustellbarkeit</li>
              </ul>
            </div>
            
            <p><strong>Das Taskilo Newsletter-System ist bereit! 🎉</strong></p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
            <p>© ${new Date().getFullYear()} Taskilo - Powered by Resend</p>
            <p>Diese Test-E-Mail wurde automatisch generiert.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Resend Fehler:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 }
      );
    }

    console.log('✅ Resend Test erfolgreich:', data);

    return NextResponse.json({
      success: true,
      message: '🎉 E-Mail erfolgreich über Resend versendet!',
      messageId: data?.id,
      data: data,
      config: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
        from: 'newsletter@taskilo.de',
        service: 'Resend API',
      },
    });
  } catch (error) {
    console.error('🚨 Resend Test Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '🚀 Resend E-Mail Test API für Taskilo',
    usage: 'POST { "recipient": "test@example.com" }',
    service: 'Resend API',
    config: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
      from_domain: 'taskilo.de',
      limits: '3.000 E-Mails/Monat kostenlos',
    },
  });
}
