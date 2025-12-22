import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { SendEmailSchema } from '@/services/webmail/types';
import { z } from 'zod';

const SendRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).merge(SendEmailSchema);

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
