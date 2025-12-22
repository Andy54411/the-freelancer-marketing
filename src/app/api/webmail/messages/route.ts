import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

const GetMessagesSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  page: z.number().default(1),
  limit: z.number().default(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, mailbox, page, limit } = GetMessagesSchema.parse(body);

    const emailService = createEmailService({ email, password });
    const result = await emailService.getMessages(mailbox, { page, limit });

    return NextResponse.json({
      success: true,
      messages: result.messages,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
