import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
const API_KEY = process.env.HETZNER_WEBMAIL_API_KEY || '';

/**
 * POST /api/webmail/chat/read-receipts
 * Lesebestätigung senden
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, spaceId, messageIds, lastReadAt } = body;

    if (!email || !spaceId) {
      return NextResponse.json(
        { success: false, error: 'E-Mail und Space-ID sind erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${HETZNER_API_URL}/api/chat/read-receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify({ 
        email, 
        spaceId, 
        messageIds: messageIds || [],
        lastReadAt: lastReadAt || new Date().toISOString(),
      }),
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Senden der Lesebestätigung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webmail/chat/read-receipts
 * Lesebestätigungen für einen Space oder Nachricht abrufen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const messageId = searchParams.get('messageId');
    const email = searchParams.get('email');

    if (!spaceId) {
      return NextResponse.json(
        { success: false, error: 'Space-ID ist erforderlich' },
        { status: 400 }
      );
    }

    let queryString = `spaceId=${encodeURIComponent(spaceId)}`;
    if (messageId) {
      queryString += `&messageId=${encodeURIComponent(messageId)}`;
    }

    const response = await fetch(
      `${HETZNER_API_URL}/api/chat/read-receipts?${queryString}`, 
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
        error: 'Fehler beim Abrufen der Lesebestätigungen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
