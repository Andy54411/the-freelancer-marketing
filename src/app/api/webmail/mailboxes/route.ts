import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const credentials = CredentialsSchema.parse(body);

    const emailService = createEmailService({
      email: credentials.email,
      password: credentials.password,
    });

    const mailboxes = await emailService.getMailboxes();

    return NextResponse.json({
      success: true,
      mailboxes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch mailboxes';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
