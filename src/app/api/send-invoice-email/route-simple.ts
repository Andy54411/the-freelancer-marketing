import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/firebase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Prüfe Resend API Key
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY nicht gefunden');
      return NextResponse.json(
        { error: 'E-Mail-Service nicht konfiguriert - API Key fehlt' },
        { status: 500 }
      );
    }

    const { invoiceId, recipientEmail, recipientName, subject, message, senderName } =
      await request.json();

    console.log('📧 Starte Rechnungsversendung:', {
      invoiceId,
      recipientEmail,
      recipientName,
      senderName,
    });

    // Validierung
    if (!invoiceId || !recipientEmail || !subject || !message || !senderName) {
      return NextResponse.json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
    }

    // Rechnung laden
    console.log('🔄 Lade Rechnung aus Firestore...');
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as any;

    // Einfache E-Mail-Konfiguration ohne komplexe Fallback-Logik
    const emailConfig = {
      from: `${senderName} <noreply@taskilo.de>`, // Verwende erstmal nur die verifizierte Domain
      to: [recipientEmail],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #14ad9f; 
              padding-bottom: 20px; 
            }
            .logo { 
              color: #14ad9f; 
              font-size: 24px; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="logo">Taskilo</h1>
            <p>Ihre Rechnung von ${senderName}</p>
          </div>
          
          <p>Hallo ${recipientName || 'Kunde'},</p>
          <p>${message}</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #14ad9f;">Rechnungsdetails</h3>
            <p><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber || invoice.number}</p>
            <p><strong>Gesamtbetrag:</strong> ${invoice.total?.toFixed(2) || 'N/A'} €</p>
          </div>
          
          <p>Bei Fragen wenden Sie sich bitte direkt an ${senderName}.</p>
          
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>Diese E-Mail wurde automatisch über <a href="https://taskilo.de" style="color: #14ad9f;">Taskilo</a> versendet.</p>
          </div>
        </body>
        </html>
      `,
    };

    console.log('📤 Sende E-Mail mit Resend...');
    const emailResponse = await resend.emails.send(emailConfig);

    if (emailResponse.error) {
      console.error('❌ Resend Fehler:', emailResponse.error);
      throw new Error(`E-Mail-Versendung fehlgeschlagen: ${emailResponse.error.message}`);
    }

    if (!emailResponse.data?.id) {
      console.error('❌ Keine Message ID erhalten');
      throw new Error('E-Mail-Versendung fehlgeschlagen: Keine Message ID erhalten');
    }

    console.log('✅ E-Mail erfolgreich gesendet:', emailResponse.data.id);

    // Rechnungsstatus aktualisieren
    try {
      await db.collection('invoices').doc(invoiceId).update({ status: 'sent' });
      console.log('✅ Rechnungsstatus auf "sent" aktualisiert');
    } catch (updateError) {
      console.warn('⚠️ Rechnungsstatus konnte nicht aktualisiert werden:', updateError);
    }

    return NextResponse.json({
      success: true,
      messageId: emailResponse.data.id,
      message: 'Rechnung erfolgreich per E-Mail versendet',
      senderUsed: 'noreply@taskilo.de',
      fallbackUsed: false,
    });
  } catch (error: any) {
    console.error('❌ Fehler beim Versenden der Rechnung:', error);

    return NextResponse.json(
      {
        error: error.message || 'Unbekannter Fehler beim Versenden der Rechnung',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
