import { NextRequest, NextResponse } from 'next/server';
import { ResendEmailService } from '@/lib/resend-email-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      subject,
      html,
      text,
      from,
      attachment,
      meta,
    }: {
      to: string[];
      subject: string;
      html: string;
      text?: string;
      from?: string;
      attachment?: { filename: string; contentBase64: string };
      meta?: Record<string, any>;
    } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ success: false, error: 'Empfänger (to) fehlt' }, { status: 400 });
    }
    if (!subject || !html) {
      return NextResponse.json(
        { success: false, error: 'Betreff und HTML sind erforderlich' },
        { status: 400 }
      );
    }

    const service = ResendEmailService.getInstance();
    // Resend akzeptiert Buffer sehr stabil – wir wandeln Base64 in Buffer.
    const attachments = attachment
      ? [
          {
            filename: attachment.filename,
            content: Buffer.from(attachment.contentBase64, 'base64') as unknown as string,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    const result = await service.sendEmail({
      to,
      from: from || 'noreply@taskilo.de',
      subject,
      htmlContent: html,
      textContent: text,
      attachments,
      metadata: {
        ...(meta || {}),
        attachmentBytes: attachment?.contentBase64?.length || 0,
        attachmentPresent: Boolean(
          attachment?.contentBase64 && attachment.contentBase64.length > 1000
        ),
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Versand fehlgeschlagen' },
        { status: 500 }
      );
    }
    const attachedBytes = attachment?.contentBase64?.length || 0;
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      attachment: {
        present: Boolean(attachedBytes && attachedBytes > 1000),
        bytes: attachedBytes,
        filename: attachment?.filename,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Serverfehler' },
      { status: 500 }
    );
  }
}
