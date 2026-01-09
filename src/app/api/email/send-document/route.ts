import { NextRequest, NextResponse } from 'next/server';
import { ResendEmailService } from '@/lib/resend-email-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      cc,
      bcc,
      subject,
      message,
      signature,
      sendCopy,
      attachments,
      companySlug,
      documentType: _documentType,
      meta: _meta,
    }: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      message: string;
      signature?: string;
      sendCopy: boolean;
      attachments: Array<{ filename: string; contentBase64: string }>;
      companySlug?: string;
      documentType: 'invoice' | 'quote' | 'reminder';
      meta?: Record<string, any>;
    } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ success: false, error: 'Empfänger (to) fehlt' }, { status: 400 });
    }
    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Betreff und Nachricht sind erforderlich' },
        { status: 400 }
      );
    }

    const service = ResendEmailService.getInstance();

    // HTML-Nachricht zusammenstellen
    let htmlMessage = message.replace(/\n/g, '<br />');
    if (signature && signature.trim()) {
      htmlMessage += '<br /><br />' + signature.replace(/\n/g, '<br />');
    }

    // Text-Version (Fallback)
    let textMessage = message;
    if (signature && signature.trim()) {
      textMessage += '\n\n' + signature;
    }

    // Absender auf firmenname@taskilo.de normalisieren
    const slug = companySlug || 'taskilo';
    const fromEmail = `${slug}@taskilo.de`;

    // Anhänge verarbeiten - mit Validierung!
    const emailAttachments = attachments
      ?.filter(attachment => attachment.contentBase64 && attachment.contentBase64.trim().length > 0) // Nur Anhänge mit Inhalt
      ?.map(attachment => ({
        filename: attachment.filename,
        content: attachment.contentBase64, // Use base64 string directly
        contentType: 'application/pdf',
      }));

    // E-Mail-Empfängerliste zusammenstellen
    const allRecipients = [...to];
    if (cc && cc.length > 0) {
      allRecipients.push(...cc);
    }
    if (bcc && bcc.length > 0) {
      allRecipients.push(...bcc);
    }
    if (sendCopy) {
      allRecipients.push(fromEmail);
    }

    const result = await service.sendEmail({
      to: allRecipients,
      subject,
      htmlContent: htmlMessage,
      textContent: textMessage,
      from: fromEmail,
      attachments: emailAttachments,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      data: result,
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'E-Mail konnte nicht versendet werden',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
