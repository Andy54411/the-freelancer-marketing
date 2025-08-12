import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend-email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    // Validierung
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine E-Mail erforderlich' },
        { status: 400 }
      );
    }

    // Bulk-Versand
    const result = await emailService.sendBulkEmails(messages);

    const successCount = result.results.filter(r => r.messageId).length;
    const failureCount = result.results.length - successCount;

    return NextResponse.json({
      success: result.success,
      totalSent: messages.length,
      successCount,
      failureCount,
      results: result.results,
      message: `${successCount} von ${messages.length} E-Mails erfolgreich gesendet`
    });
  } catch (error) {
    console.error('Bulk-E-Mail API Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    );
  }
}
