import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { SendEmailSchema } from '@/services/webmail/types';
import { z } from 'zod';

// Erhöhe das Body-Size-Limit für große Anhänge (50MB)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SendRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).merge(SendEmailSchema);

export async function POST(request: NextRequest) {
  try {
    // Prüfe Content-Length Header
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Anhänge zu groß. Maximale Größe: 50MB' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { email, password, ...emailData } = SendRequestSchema.parse(body);

    const emailService = createEmailService({ email, password });
    const result = await emailService.sendEmail(emailData);

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    
    // Spezielle Fehlerbehandlung für JSON-Parsing-Fehler
    if (message.includes('Unterminated string') || message.includes('JSON')) {
      return NextResponse.json(
        { success: false, error: 'Anhang zu groß oder ungültig. Bitte versuchen Sie eine kleinere Datei.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
