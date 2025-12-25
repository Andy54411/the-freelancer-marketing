import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de:3001';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const UpdateContactSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  contact: z.object({
    uid: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    nickname: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    emails: z.array(z.object({
      value: z.string().email(),
      label: z.string().default('Privat'),
    })).default([]),
    phones: z.array(z.object({
      value: z.string(),
      label: z.string().default('Mobil'),
    })).default([]),
    addresses: z.array(z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      label: z.string().default('Privat'),
    })).default([]),
    websites: z.array(z.object({
      value: z.string(),
      label: z.string().default('Website'),
    })).default([]),
    birthday: z.string().optional(),
    notes: z.string().optional(),
    photo: z.string().optional(),
    labels: z.array(z.string()).default([]),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = UpdateContactSchema.parse(body);

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/contacts/update`, {
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
        { success: false, error: data.error || 'Failed to update contact' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update contact';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
