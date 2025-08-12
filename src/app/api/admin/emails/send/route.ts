import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend-email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, bcc, subject, htmlContent, textContent, from = 'noreply@taskilo.de' } = body;

    // Validierung
    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens ein Empfänger erforderlich' },
        { status: 400 }
      );
    }

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Betreff und Inhalt sind erforderlich' },
        { status: 400 }
      );
    }

    // E-Mail senden
    const result = await emailService.sendEmail({
      to,
      cc,
      bcc,
      from,
      subject,
      htmlContent,
      textContent,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'E-Mail erfolgreich gesendet'
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('E-Mail API Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}

// E-Mail-Status abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message-ID erforderlich' },
        { status: 400 }
      );
    }

    const status = await emailService.getEmailStatus(messageId);
    
    return NextResponse.json({
      success: true,
      status: status.status,
      lastEvent: status.lastEvent,
      error: status.error
    });
  } catch (error) {
    console.error('E-Mail Status API Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
