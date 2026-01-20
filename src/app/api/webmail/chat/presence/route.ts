import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
const API_KEY = process.env.HETZNER_WEBMAIL_API_KEY || '';

/**
 * GET /api/webmail/chat/presence
 * Online-Status eines Users abrufen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const emails = searchParams.get('emails'); // Komma-getrennte Liste für Bulk-Abfrage

    if (!email && !emails) {
      return NextResponse.json(
        { success: false, error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    const queryParam = emails ? `emails=${encodeURIComponent(emails)}` : `email=${encodeURIComponent(email!)}`;
    
    const response = await fetch(`${HETZNER_API_URL}/api/chat/presence?${queryParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Abrufen des Online-Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webmail/chat/presence
 * Eigenen Online-Status aktualisieren
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, status, customMessage } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    if (!status || !['online', 'away', 'dnd', 'offline'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Status' },
        { status: 400 }
      );
    }

    const response = await fetch(`${HETZNER_API_URL}/api/chat/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify({ email, status, customMessage }),
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Aktualisieren des Online-Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
