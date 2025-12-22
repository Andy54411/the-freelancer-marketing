import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

const TestConnectionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = TestConnectionSchema.parse(body);

    const emailService = createEmailService({ email, password });
    const result = await emailService.testConnection();

    return NextResponse.json({
      success: result.imap && result.smtp,
      imap: result.imap,
      smtp: result.smtp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection test failed';
    return NextResponse.json(
      { success: false, error: message, imap: false, smtp: false },
      { status: 500 }
    );
  }
}
