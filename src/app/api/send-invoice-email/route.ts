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
        {
          error: 'E-Mail-Service nicht konfiguriert - API Key fehlt',
        },
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

    // Rechnung laden (direkt mit Admin SDK)
    console.log('🔄 Lade Rechnung aus Firestore...');
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() } as any; // Typisierung für Firestore-Daten

    console.log('📋 Rechnung geladen:', {
      id: invoice.id,
      companyId: invoice.companyId,
      createdBy: invoice.createdBy,
      senderName: senderName,
    });

    // Benutzer-E-Mail-Adresse aus Firestore laden
    console.log('🔄 Lade Benutzer-E-Mail-Adresse...');
    let senderEmail = 'noreply@taskilo.de'; // Fallback

    try {
      // Bestimme die User-ID für die E-Mail-Suche
      const userId = invoice.companyId || invoice.createdBy;
      console.log('🔍 Suche E-Mail für User-ID:', userId);

      // Versuche User-Daten zu laden ZUERST (da dort meist die echte E-Mail steht)
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.email && userData.email !== 'noreply@taskilo.de') {
          senderEmail = userData.email;
          console.log('� User-E-Mail gefunden:', senderEmail);
        }
      }

      // Falls keine User-E-Mail oder nur Fallback, versuche Company-Daten
      if (senderEmail === 'noreply@taskilo.de') {
        const companyDoc = await db.collection('companies').doc(userId).get();
        if (companyDoc.exists) {
          const companyData = companyDoc.data();
          const companyEmailFound = companyData?.email || companyData?.companyEmail;
          if (companyEmailFound && companyEmailFound !== 'noreply@taskilo.de') {
            senderEmail = companyEmailFound;
            console.log('🏢 Company-E-Mail gefunden:', senderEmail);
          }
        }
      }

      console.log('✅ Finale Sender-E-Mail:', senderEmail);
    } catch (emailError) {
      console.warn('⚠️ Konnte Benutzer-E-Mail nicht laden, verwende Fallback:', emailError.message);
    }

    // Validiere E-Mail-Format - nur wenn nicht Fallback
    if (senderEmail && senderEmail !== 'noreply@taskilo.de') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(senderEmail)) {
        console.warn('⚠️ Ungültige E-Mail-Adresse gefunden:', senderEmail, '- verwende Fallback');
        senderEmail = 'noreply@taskilo.de';
      }
    }

    // PDF generieren mit Fallback-Strategie
    console.log('🔄 Generiere PDF für E-Mail-Anhang...');
    const attachments: any[] = [];
    let downloadLinkMessage = '';

    try {
      const pdfResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/api/generate-invoice-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceData: invoice }),
        }
      );

      if (pdfResponse.ok) {
        const contentType = pdfResponse.headers.get('content-type');

        if (contentType && contentType.includes('application/pdf')) {
          // PDF wurde erfolgreich generiert
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          const pdfBase64 = Buffer.from(pdfArrayBuffer).toString('base64');

          attachments.push({
            filename: `Rechnung_${invoice.invoiceNumber || invoice.number || 'invoice'}.pdf`,
            content: pdfBase64,
            type: 'application/pdf',
            disposition: 'attachment',
          });

          console.log(
            '✅ PDF erfolgreich generiert und als Anhang hinzugefügt, Größe:',
            pdfArrayBuffer.byteLength,
            'bytes'
          );
        } else {
          // Fallback: JSON Response mit Print-URL
          const responseData = await pdfResponse.json();
          const printUrl =
            responseData.printUrl ||
            `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/print/invoice/${invoiceId}`;
          downloadLinkMessage = `\n\nSie können Ihre Rechnung hier herunterladen: ${printUrl}`;
          console.log('🔗 PDF-Service nicht verfügbar, verwende Download-Link:', printUrl);
        }
      } else {
        throw new Error(`PDF-Service Fehler: ${pdfResponse.status}`);
      }
    } catch (pdfError) {
      console.warn('⚠️ PDF-Generierung fehlgeschlagen:', pdfError.message);
      const printUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/print/invoice/${invoiceId}`;
      downloadLinkMessage = `\n\nSie können Ihre Rechnung hier herunterladen: ${printUrl}`;
      console.log('🔄 Sende E-Mail ohne PDF-Anhang, aber mit Download-Link...');
    }

    // E-Mail-Konfiguration mit individueller Sender-Adresse
    const verifiedSenderEmail = 'noreply@taskilo.de'; // Fallback: verifizierte Domain

    // Versuche zunächst die echte E-Mail-Adresse zu verwenden
    let finalSenderEmail = verifiedSenderEmail; // Fallback: verifizierte Domain
    const replyToEmail = undefined;

    // Wenn wir eine persönliche E-Mail haben, versuche sie als Sender zu verwenden
    if (senderEmail !== 'noreply@taskilo.de') {
      console.log('🔍 Versuche persönliche E-Mail als Sender zu verwenden:', senderEmail);

      // Versuche direkt mit der persönlichen E-Mail - Resend wird uns sagen ob sie verifiziert ist
      finalSenderEmail = senderEmail;
      console.log('✅ Verwende persönliche E-Mail als Sender:', finalSenderEmail);
    } else {
      console.log('ℹ️ Keine persönliche E-Mail gefunden, verwende verifizierte Domain');
    }

    // HTML-Content für die E-Mail
    const emailHTML = `
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
              margin: 20px 0; 
            }
            .invoice-details { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 6px; 
              margin: 20px 0; 
              border-left: 4px solid #14ad9f; 
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #e5e7eb; 
              font-size: 14px; 
              color: #6b7280; 
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
              <p>Ihre Rechnung von ${senderName}</p>
            </div>
            
            <div class="content">
              <p>Hallo,</p>
              <p>anbei erhalten Sie Ihre Rechnung von ${senderName}.</p>
              ${downloadLinkMessage ? `<p style="color: #14ad9f; font-weight: 500;">${downloadLinkMessage}</p>` : ''}
            </div>
            
            <div class="invoice-details">
              <h3 style="margin-top: 0; color: #14ad9f;">Rechnungsdetails</h3>
              <p style="margin: 5px 0;"><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber || invoice.number}</p>
              <p style="margin: 5px 0;"><strong>Rechnungsdatum:</strong> ${new Date(invoice.invoiceDate || invoice.createdAt.toDate()).toLocaleDateString('de-DE')}</p>
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
      `;

    // Finale E-Mail-Konfiguration
    const emailConfig: any = {
      from: `${senderName} <${finalSenderEmail}>`,
      to: [recipientEmail],
      subject: subject,
      html: emailHTML,
    };

    // ReplyTo nur hinzufügen wenn anders als Sender
    if (replyToEmail && replyToEmail !== finalSenderEmail) {
      emailConfig.replyTo = replyToEmail;
    }

    // Attachments nur hinzufügen wenn PDF erfolgreich generiert wurde
    if (attachments.length > 0) {
      emailConfig.attachments = attachments;
    }

    // E-Mail mit Resend senden - mit intelligentem Fallback
    console.log('📤 Sende E-Mail mit Resend...', {
      from: `${senderName} <${finalSenderEmail}>`,
      replyTo: emailConfig.replyTo,
      to: recipientEmail,
      subject: subject,
      hasAttachments: attachments.length > 0,
    });

    let emailResponse;
    let fallbackUsed = false;

    try {
      // Versuche erst mit der gewünschten E-Mail-Adresse
      emailResponse = await resend.emails.send(emailConfig);

      if (emailResponse.error) {
        console.error('⚠️ Erster Versuch fehlgeschlagen:', emailResponse.error);
        throw new Error(emailResponse.error.message || 'Resend-Fehler');
      }
    } catch (firstAttemptError) {
      console.log('🔄 Erster Versuch fehlgeschlagen, prüfe ob Fallback nötig ist...');

      // Prüfe ob das ein Domain-/Verification-Problem ist
      const errorMessage = firstAttemptError.message?.toLowerCase() || '';
      const isVerificationError =
        errorMessage.includes('not verified') ||
        errorMessage.includes('domain') ||
        errorMessage.includes('sender') ||
        errorMessage.includes('verify');

      if (isVerificationError && finalSenderEmail !== 'noreply@taskilo.de') {
        console.log('🔄 Domain-Verifikationsproblem erkannt, verwende taskilo.de Fallback...');

        // Verwende verifizierte Domain als Fallback
        const fallbackConfig = {
          ...emailConfig,
          from: `${senderName} <noreply@taskilo.de>`,
          replyTo: finalSenderEmail, // Antworten gehen an die ursprüngliche E-Mail
        };

        try {
          emailResponse = await resend.emails.send(fallbackConfig);
          fallbackUsed = true;
          console.log('✅ Fallback erfolgreich, E-Mail gesendet von: noreply@taskilo.de');

          if (emailResponse.error) {
            throw new Error(emailResponse.error.message || 'Fallback-Fehler');
          }
        } catch (fallbackError) {
          console.error('❌ Auch Fallback fehlgeschlagen:', fallbackError);
          throw fallbackError;
        }
      } else {
        // Anderer Fehler, nicht domain-related
        throw firstAttemptError;
      }
    }

    if (emailResponse.error) {
      console.error('❌ Resend Fehler:', {
        error: emailResponse.error,
        message: emailResponse.error?.message,
        name: emailResponse.error?.name,
      });
      throw new Error(
        `E-Mail-Versendung fehlgeschlagen: ${emailResponse.error.message || 'Unbekannter Resend-Fehler'}`
      );
    }

    if (!emailResponse.data?.id) {
      console.error('❌ Resend Response ohne Message ID:', emailResponse);
      throw new Error('E-Mail-Versendung fehlgeschlagen: Keine Message ID erhalten');
    }

    console.log('✅ E-Mail erfolgreich gesendet:', {
      messageId: emailResponse.data?.id,
      senderUsed: fallbackUsed ? 'noreply@taskilo.de' : finalSenderEmail,
      fallbackUsed: fallbackUsed,
      replyToSet: fallbackUsed ? finalSenderEmail : emailConfig.replyTo,
    });

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
      hasAttachment: attachments.length > 0,
      downloadLinkProvided: !!downloadLinkMessage,
      senderUsed: fallbackUsed ? 'noreply@taskilo.de' : finalSenderEmail,
      fallbackUsed: fallbackUsed,
      replyToEmail: fallbackUsed ? finalSenderEmail : emailConfig.replyTo,
    });
  } catch (error) {
    console.error('❌ Fehler beim Versenden der Rechnung:', error);

    // Mehr detaillierte Fehlerbehandlung
    let errorMessage = 'Unbekannter Fehler beim Versenden der Rechnung';
    let errorCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500),
      });
    }

    // Spezifische Fehlerbehandlung
    if (error.message?.includes('Resend')) {
      errorMessage = 'E-Mail-Service nicht verfügbar. Bitte versuchen Sie es später erneut.';
      errorCode = 503;
    } else if (error.message?.includes('not found')) {
      errorMessage = 'Rechnung nicht gefunden';
      errorCode = 404;
    } else if (error.message?.includes('RESEND_API_KEY')) {
      errorMessage = 'E-Mail-Service nicht konfiguriert';
      errorCode = 500;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString(),
      },
      { status: errorCode }
    );
  }
}
