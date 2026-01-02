// Newsletter Subscribers Proxy API - Leitet Anfragen an Hetzner webmail-proxy weiter
import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_URL || 'https://mail.taskilo.de';

// GET - Liste aller Subscribers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribers?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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

// POST - Neuen Subscriber hinzufügen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribers`, {
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

// DELETE - Subscriber löschen
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID erforderlich' }, { status: 400 });
    }

    const response = await fetch(`${HETZNER_API_URL}/api/newsletter/subscribers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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
