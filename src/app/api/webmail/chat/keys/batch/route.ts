import { NextRequest, NextResponse } from 'next/server';

const HETZNER_WEBMAIL_API = process.env.HETZNER_WEBMAIL_API || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

/**
 * POST /api/webmail/chat/keys/batch
 * Holt die öffentlichen Schlüssel mehrerer Nutzer auf einmal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${HETZNER_WEBMAIL_API}/api/chat/keys/batch`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: 'Fehler beim Abrufen der Schlüssel', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
