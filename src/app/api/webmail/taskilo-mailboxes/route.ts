import { NextRequest, NextResponse } from 'next/server';
import { createMasterUserEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

/**
 * API Route für Taskilo Mailboxes - nutzt Master User Authentifizierung.
 */

const GetMailboxesSchema = z.object({
  email: z.string().email().refine(
    (email) => email.endsWith('@taskilo.de'),
    { message: 'Nur Taskilo E-Mail-Adressen erlaubt' }
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = GetMailboxesSchema.parse(body);

    const emailService = createMasterUserEmailService(email);
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
