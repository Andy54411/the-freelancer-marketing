import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
const API_KEY = process.env.HETZNER_WEBMAIL_API_KEY || '';

/**
 * POST /api/webmail/chat/typing
 * Tipp-Status senden (User tippt gerade)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, spaceId, isTyping } = body;

    if (!email || !spaceId) {
      return NextResponse.json(
        { success: false, error: 'E-Mail und Space-ID sind erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${HETZNER_API_URL}/api/chat/typing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify({ email, spaceId, isTyping: isTyping !== false }),
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Senden des Tipp-Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webmail/chat/typing
 * Tipp-Status für einen Space abrufen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const email = searchParams.get('email');

    if (!spaceId) {
      return NextResponse.json(
        { success: false, error: 'Space-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${HETZNER_API_URL}/api/chat/typing?spaceId=${encodeURIComponent(spaceId)}`, 
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'X-User-Email': email || '',
        },
      }
    );

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Abrufen des Tipp-Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
