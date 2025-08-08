import { NextRequest, NextResponse } from 'next/server';
import { DeliveryNoteService } from '@/services/deliveryNoteService';
import nodemailer from 'nodemailer';

// Email template für Lieferscheine
const generateEmailTemplate = (deliveryNote: any, pdfUrl: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lieferschein ${deliveryNote.deliveryNoteNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #14ad9f, #0f9d84); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px; }
        .delivery-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .delivery-info h3 { color: #14ad9f; margin-top: 0; }
        .button { display: inline-block; background-color: #14ad9f; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        .button:hover { background-color: #0f9d84; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
        .social-links { margin-top: 15px; }
        .social-links a { color: #14ad9f; text-decoration: none; margin: 0 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Taskilo</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ihr Lieferschein ist bereit</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-top: 0;">Hallo ${deliveryNote.customerName},</h2>
          
          <p>wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bestellung bearbeitet und versandbereit ist.</p>
          
          <div class="delivery-info">
            <h3>Lieferinformationen</h3>
            <p><strong>Lieferschein-Nr.:</strong> ${deliveryNote.deliveryNoteNumber}</p>
            <p><strong>Lieferdatum:</strong> ${new Date(deliveryNote.deliveryDate).toLocaleDateString('de-DE')}</p>
            ${deliveryNote.orderNumber ? `<p><strong>Ihre Bestellung:</strong> ${deliveryNote.orderNumber}</p>` : ''}
            <p><strong>Anzahl Positionen:</strong> ${deliveryNote.items.length}</p>
          </div>
          
          <p>Im Anhang finden Sie den detaillierten Lieferschein als PDF-Dokument.</p>
          
          <div style="text-align: center;">
            <a href="${pdfUrl}" class="button">📄 Lieferschein als PDF öffnen</a>
          </div>
          
          <p><strong>Wichtige Hinweise:</strong></p>
          <ul style="color: #666; line-height: 1.6;">
            <li>Bitte prüfen Sie die gelieferten Artikel bei Erhalt auf Vollständigkeit und Beschädigungen</li>
            <li>Bewahren Sie diesen Lieferschein für Ihre Unterlagen auf</li>
            <li>Bei Fragen oder Problemen kontaktieren Sie uns gerne</li>
          </ul>
          
          <p>Wir bedanken uns für Ihr Vertrauen und stehen Ihnen für Rückfragen jederzeit zur Verfügung.</p>
          
          <p style="margin-top: 30px;">
            Mit freundlichen Grüßen<br>
            <strong style="color: #14ad9f;">Ihr Taskilo Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Taskilo</strong></p>
          <p>Musterstraße 123 • 12345 Musterstadt • Deutschland</p>
          <p>E-Mail: info@taskilo.de • Web: www.taskilo.de</p>
          
          <div class="social-links">
            <a href="mailto:info@taskilo.de">✉ E-Mail</a>
            <a href="https://www.taskilo.de">🌐 Website</a>
          </div>
          
          <p style="margin-top: 20px; font-size: 11px;">
            Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.
            Bei Fragen verwenden Sie bitte unsere offizielle E-Mail-Adresse.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function POST(request: NextRequest) {
  try {
    const { deliveryNoteId, recipientEmail, recipientName, subject, message, senderEmail } =
      await request.json();

    if (!deliveryNoteId || !recipientEmail) {
      return NextResponse.json(
        { error: 'Lieferschein-ID und Empfänger-E-Mail sind erforderlich' },
        { status: 400 }
      );
    }

    // Lieferschein laden
    const deliveryNote = await DeliveryNoteService.getDeliveryNote(deliveryNoteId);
    if (!deliveryNote) {
      return NextResponse.json({ error: 'Lieferschein nicht gefunden' }, { status: 404 });
    }

    // PDF URL generieren
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const pdfUrl = `${baseUrl}/api/generate-delivery-note-pdf?id=${deliveryNoteId}`;

    // E-Mail-Transporter konfigurieren
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Sender-E-Mail bestimmen (personalisiert oder Standard)
    const fromEmail = senderEmail || process.env.SMTP_FROM || 'info@taskilo.de';
    const fromName = 'Taskilo';

    // Standard-Betreff wenn nicht angegeben
    const emailSubject = subject || `Lieferschein ${deliveryNote.deliveryNoteNumber} - Taskilo`;

    // E-Mail-Inhalt
    const htmlContent = generateEmailTemplate(deliveryNote, pdfUrl);

    const textContent = `
Hallo ${recipientName || deliveryNote.customerName},

wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bestellung bearbeitet und versandbereit ist.

Lieferinformationen:
- Lieferschein-Nr.: ${deliveryNote.deliveryNoteNumber}
- Lieferdatum: ${new Date(deliveryNote.deliveryDate).toLocaleDateString('de-DE')}
${deliveryNote.orderNumber ? `- Ihre Bestellung: ${deliveryNote.orderNumber}` : ''}
- Anzahl Positionen: ${deliveryNote.items.length}

${message ? `\nNachricht:\n${message}\n` : ''}

Den detaillierten Lieferschein finden Sie als PDF im Anhang oder unter folgendem Link:
${pdfUrl}

Wichtige Hinweise:
- Bitte prüfen Sie die gelieferten Artikel bei Erhalt auf Vollständigkeit und Beschädigungen
- Bewahren Sie diesen Lieferschein für Ihre Unterlagen auf
- Bei Fragen oder Problemen kontaktieren Sie uns gerne

Wir bedanken uns für Ihr Vertrauen und stehen Ihnen für Rückfragen jederzeit zur Verfügung.

Mit freundlichen Grüßen
Ihr Taskilo Team

---
Taskilo
Musterstraße 123, 12345 Musterstadt
E-Mail: info@taskilo.de
Web: www.taskilo.de

Diese E-Mail wurde automatisch generiert.
    `.trim();

    // PDF für Anhang generieren
    let pdfBuffer: Buffer | undefined;
    try {
      const pdfResponse = await fetch(pdfUrl);
      if (pdfResponse.ok) {
        pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      }
    } catch (error) {
      console.warn('PDF konnte nicht für Anhang geladen werden:', error);
    }

    // E-Mail-Optionen
    const mailOptions: any = {
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
      replyTo: fromEmail,
    };

    // PDF als Anhang hinzufügen wenn verfügbar
    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Lieferschein_${deliveryNote.deliveryNoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    // E-Mail senden
    const info = await transporter.sendMail(mailOptions);

    // Versandstatus im Lieferschein aktualisieren
    try {
      await DeliveryNoteService.updateDeliveryNote(deliveryNoteId, {
        ...deliveryNote,
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        emailSentTo: recipientEmail,
        lastEmailId: info.messageId,
      });
    } catch (updateError) {
      console.warn('Versandstatus konnte nicht aktualisiert werden:', updateError);
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: 'Lieferschein wurde erfolgreich per E-Mail versendet',
      pdfIncluded: !!pdfBuffer,
    });
  } catch (error) {
    console.error('Fehler beim E-Mail-Versand:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Versenden der E-Mail',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
