import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de:3001';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const DeleteContactSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  contactUid: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = DeleteContactSchema.parse(body);

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/contacts/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
      },
      body: JSON.stringify(validated),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to delete contact' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete contact';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
