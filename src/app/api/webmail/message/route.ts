import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

const GetMessageSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  uid: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, mailbox, uid } = GetMessageSchema.parse(body);

    const emailService = createEmailService({ email, password });
    const message = await emailService.getMessage(mailbox, uid);

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch message';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
