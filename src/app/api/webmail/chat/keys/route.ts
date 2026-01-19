import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

/**
 * GET /api/webmail/chat/keys
 * Listet alle registrierten öffentlichen Schlüssel
 */
export async function GET() {
  try {
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/keys`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
      },
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

/**
 * POST /api/webmail/chat/keys
 * Registriert einen neuen öffentlichen Schlüssel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/keys`, {
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
        { success: false, error: 'Fehler beim Registrieren des Schlüssels', details: error },
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
