import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db, storage } from '@/firebase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Prüfe Resend API Key
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'E-Mail-Service nicht konfiguriert - API Key fehlt' },
        { status: 500 }
      );
    }

    const { invoiceId, companyId, recipientEmail, recipientName, subject, message, senderName } =
      await request.json();

    // Validierung
    if (!invoiceId || !companyId || !recipientEmail || !subject || !message || !senderName) {
      return NextResponse.json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
    }

    // Rechnung laden aus der Subcollection companies/{companyId}/invoices
    const invoiceDoc = await db!
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .doc(invoiceId)
      .get();
    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as any;

    // Funktion zur Konvertierung des Firmennamens in E-Mail-Format
    const createEmailFromCompanyName = (companyName: string): string => {
      return (
        companyName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-') // Ersetze alle Nicht-Buchstaben/Zahlen mit -
          .replace(/-+/g, '-') // Mehrfache - zu einem -
          .replace(/^-|-$/g, '') // Entferne - am Anfang/Ende
          .substring(0, 30) || // Maximal 30 Zeichen
        'noreply'
      ); // Fallback falls leer
    };

    // Personalisierte Sender-E-Mail erstellen
    const personalizedEmailPrefix = createEmailFromCompanyName(senderName);
    const personalizedSenderEmail = `${personalizedEmailPrefix}@taskilo.de`;

    // PDF-Anhang generieren
    let pdfAttachment: {
      filename: string;
      content: string;
      type: string;
      disposition: string;
    } | null = null;

    try {
      // Prüfen, ob bereits ein gespeichertes PDF vorhanden ist
      if (invoice.pdfPath) {
        // PDF aus Storage laden
        if (!storage) {
          console.warn('Firebase Storage nicht verfügbar, generiere neues PDF');
        } else {
          const bucket = storage.bucket('tilvo-f142f.firebasestorage.app');

          // PDF-Pfad parsen (gs://bucket-name/path)
          const pdfPathMatch = invoice.pdfPath.match(/gs:\/\/([^\/]+)\/(.+)/);
          if (pdfPathMatch) {
            const [, , filePath] = pdfPathMatch;
            const file = bucket.file(filePath);

            try {
              const [pdfBuffer] = await file.download();
              const pdfBase64 = pdfBuffer.toString('base64');

              pdfAttachment = {
                filename: `Rechnung_${invoice.invoiceNumber || invoice.number}.pdf`,
                content: pdfBase64,
                type: 'application/pdf',
                disposition: 'attachment',
              };
            } catch (storageError) {
              console.warn(
                'Gespeichertes PDF konnte nicht geladen werden, generiere neues:',
                storageError
              );
            }
          }
        }
      }

      // Fallback: PDF neu generieren, wenn kein gespeichertes PDF vorhanden oder Laden fehlgeschlagen
      if (!pdfAttachment) {
        const pdfResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/api/generate-invoice-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              invoiceData: invoice,
            }),
          }
        );

        if (pdfResponse.ok) {
          const contentType = pdfResponse.headers.get('content-type');

          if (contentType && contentType.includes('application/pdf')) {
            // Echtes PDF erhalten
            const pdfBuffer = await pdfResponse.arrayBuffer();
            const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

            pdfAttachment = {
              filename: `Rechnung_${invoice.invoiceNumber || invoice.number}.pdf`,
              content: pdfBase64,
              type: 'application/pdf',
              disposition: 'attachment',
            };
          } else {
            // JSON-Antwort (Fallback-Modus) - verarbeitet, aber nicht weiter verwendet
            await pdfResponse.json();
          }
        }
      }
    } catch (pdfError) {
      console.warn('PDF-Generierung fehlgeschlagen:', pdfError);
    }

    // E-Mail-Konfiguration mit optionalem PDF-Anhang
    const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/print/invoice/${invoice.id}`;

    const emailConfig = {
      from: `${senderName} <${personalizedSenderEmail}>`,
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
            .download-button {
              display: inline-block;
              background-color: #14ad9f;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              margin: 10px 0;
            }
            .download-button:hover {
              background-color: #129488;
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
            ${
              !pdfAttachment
                ? `
            <div style="margin-top: 15px;">
              <a href="${invoiceUrl}" class="download-button" target="_blank">📄 Rechnung als PDF anzeigen</a>
            </div>
            `
                : ''
            }
          </div>

          <p>Bei Fragen wenden Sie sich bitte direkt an ${senderName}.</p>

          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>Diese E-Mail wurde automatisch über <a href="https://taskilo.de" style="color: #14ad9f;">Taskilo</a> versendet.</p>
          </div>
        </body>
        </html>
      `,
      ...(pdfAttachment && { attachments: [pdfAttachment] }),
    };

    const emailResponse = await resend.emails.send(emailConfig);

    if (emailResponse.error) {
      throw new Error(`E-Mail-Versendung fehlgeschlagen: ${emailResponse.error.message}`);
    }

    if (!emailResponse.data?.id) {
      throw new Error('E-Mail-Versendung fehlgeschlagen: Keine Message ID erhalten');
    }

    // Rechnungsstatus aktualisieren
    try {
      await db!
        .collection('companies')
        .doc(companyId)
        .collection('invoices')
        .doc(invoiceId)
        .update({ status: 'sent' });
    } catch {}

    return NextResponse.json({
      success: true,
      messageId: emailResponse.data.id,
      message: 'Rechnung erfolgreich per E-Mail versendet',
      senderUsed: personalizedSenderEmail,
      personalizedEmail: true,
      fallbackUsed: false,
      pdfAttached: !!pdfAttachment,
      attachmentFilename: pdfAttachment?.filename,
    });
  } catch (error: any) {
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
