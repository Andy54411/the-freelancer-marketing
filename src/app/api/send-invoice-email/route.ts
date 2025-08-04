import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/firebase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
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

    // Rechnung laden (direkt mit Admin SDK)
    console.log('🔄 Lade Rechnung aus Firestore...');
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as any; // Typisierung für Firestore-Daten

    // PDF generieren
    console.log('🔄 Generiere PDF für E-Mail-Anhang...');
    const pdfResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/api/generate-invoice-pdf`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      }
    );

    if (!pdfResponse.ok) {
      throw new Error('PDF-Generierung fehlgeschlagen');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    console.log('✅ PDF erfolgreich generiert, Größe:', pdfBuffer.byteLength, 'bytes');

    // E-Mail mit Resend senden
    const emailResponse = await resend.emails.send({
      from: `${senderName} <noreply@taskilo.de>`,
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
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
              line-height: 1.6; 
              color: #374151; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
              background-color: #f9fafb; 
            }
            .container { 
              background: white; 
              padding: 40px; 
              border-radius: 8px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
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
              margin: 0; 
            }
            .content { 
              white-space: pre-line; 
              font-size: 16px; 
              line-height: 1.6; 
            }
            .invoice-info { 
              background-color: #f3f4f6; 
              padding: 20px; 
              border-radius: 6px; 
              margin: 20px 0; 
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              font-size: 14px; 
              color: #6b7280; 
              text-align: center; 
            }
            .taskilo-link { 
              color: #14ad9f; 
              text-decoration: none; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">Taskilo</h1>
              <p style="margin: 0; color: #6b7280;">Professionelle Rechnungsstellung</p>
            </div>
            
            <div class="content">${message}</div>
            
            <div class="invoice-info">
              <h3 style="margin: 0 0 10px 0; color: #374151;">📄 Rechnungsdetails</h3>
              <p style="margin: 5px 0;"><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber || invoice.number}</p>
              <p style="margin: 5px 0;"><strong>Rechnungsdatum:</strong> ${new Date(invoice.date).toLocaleDateString('de-DE')}</p>
              <p style="margin: 5px 0;"><strong>Fälligkeitsdatum:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
              <p style="margin: 5px 0;"><strong>Gesamtbetrag:</strong> ${invoice.total.toFixed(2)} €</p>
            </div>
            
            <div class="footer">
              <p>Diese E-Mail wurde automatisch über <a href="https://taskilo.de" class="taskilo-link">Taskilo</a> versendet.</p>
              <p>Bei Fragen wenden Sie sich bitte direkt an ${senderName}.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Rechnung_${invoice.invoiceNumber || invoice.number}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    });

    if (emailResponse.error) {
      console.error('❌ Resend Fehler:', emailResponse.error);
      throw new Error(`E-Mail-Versendung fehlgeschlagen: ${emailResponse.error.message}`);
    }

    console.log('✅ E-Mail erfolgreich gesendet:', emailResponse.data?.id);

    // Rechnungsstatus auf "sent" aktualisieren
    try {
      await db.collection('invoices').doc(invoiceId).update({ status: 'sent' });
      console.log('✅ Rechnungsstatus auf "sent" aktualisiert');
    } catch (updateError) {
      console.warn('⚠️ Rechnungsstatus konnte nicht aktualisiert werden:', updateError);
      // Nicht kritisch - E-Mail wurde bereits gesendet
    }

    return NextResponse.json({
      success: true,
      messageId: emailResponse.data?.id,
      message: 'Rechnung erfolgreich per E-Mail versendet',
    });
  } catch (error) {
    console.error('❌ Fehler beim Senden der Rechnung per E-Mail:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim E-Mail-Versand',
      },
      { status: 500 }
    );
  }
}
