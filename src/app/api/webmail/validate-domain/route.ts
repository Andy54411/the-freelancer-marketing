import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod-Schema für Request-Validierung
const validateDomainSchema = z.object({
  domain: z.string()
    .min(1, 'Domain erforderlich')
    .regex(
      /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/,
      'Ungültige Domain'
    )
    .transform((domain) => domain.toLowerCase().trim()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod-Validierung
    const validation = validateDomainSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { domain } = validation.data;

    // KRITISCH: Hetzner webmail-proxy für MongoDB-Check (NICHT Firebase!)
    const hetznerUrl = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
    const response = await fetch(`${hetznerUrl}/api/domains/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.WEBMAIL_API_KEY || '',
      },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
      return NextResponse.json(
        {
          success: false,
          error: error.error || 'Domain-Prüfung fehlgeschlagen',
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      exists: result.exists,
      domain: result.domain,
    });

  } catch (error) {
    console.error('Domain validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
