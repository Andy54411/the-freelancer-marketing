// Newsletter Proxy API - Leitet Anfragen an Hetzner webmail-proxy weiter
import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_URL || 'https://mail.taskilo.de';

// POST - Newsletter-Anmeldung
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Newsletter-Service nicht erreichbar', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 503 }
    );
  }
}
