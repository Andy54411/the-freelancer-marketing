import { NextRequest, NextResponse } from 'next/server';
import { createMasterUserEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

/**
 * API Route für Taskilo E-Mails - nutzt Master User Authentifizierung.
 * Kein Benutzerpasswort erforderlich.
 * Nur für @taskilo.de E-Mail-Adressen erlaubt.
 */

const GetMessagesSchema = z.object({
  email: z.string().email().refine(
    (email) => email.endsWith('@taskilo.de'),
    { message: 'Nur Taskilo E-Mail-Adressen erlaubt' }
  ),
  mailbox: z.string().default('INBOX'),
  page: z.number().default(1),
  limit: z.number().default(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, mailbox, page, limit } = GetMessagesSchema.parse(body);

    const emailService = createMasterUserEmailService(email);
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
