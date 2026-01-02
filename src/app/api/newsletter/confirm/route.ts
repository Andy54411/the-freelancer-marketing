// Newsletter Confirm Proxy API - Leitet Anfragen an Hetzner webmail-proxy weiter
import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_URL || 'https://mail.taskilo.de';

// GET - Bestätigung via E-Mail-Link
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Weiterleitung zum Hetzner-Backend
    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/confirm?${queryString}`, {
      method: 'GET',
      redirect: 'manual', // Wir wollen den Redirect selbst behandeln
    });

    // Wenn Hetzner einen Redirect sendet, geben wir ihn weiter
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        return NextResponse.redirect(location);
      }
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.redirect(new URL('/newsletter/error?message=Service+nicht+erreichbar', request.url));
  }
}

// POST - Programmatische Bestätigung
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
