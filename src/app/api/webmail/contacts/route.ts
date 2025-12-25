import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

const GetContactsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  limit: z.number().default(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, limit } = GetContactsSchema.parse(body);

    const emailService = createEmailService({ email, password });
    const result = await emailService.getContacts(limit);

    return NextResponse.json({
      success: true,
      contacts: result.contacts,
      total: result.total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contacts';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
