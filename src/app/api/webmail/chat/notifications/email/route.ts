import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = process.env.HETZNER_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
const API_KEY = process.env.HETZNER_WEBMAIL_API_KEY || '';

/**
 * POST /api/webmail/chat/notifications/email
 * Sendet E-Mail-Benachrichtigungen für ungelesene Chat-Nachrichten
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientEmail, senderName, spaceName, messagePreview, unreadCount } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'Empfänger-E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    // Sende Anfrage an Hetzner Backend
    const response = await fetch(`${HETZNER_API_URL}/api/chat/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        recipientEmail,
        senderName,
        spaceName,
        messagePreview,
        unreadCount,
      }),
    });

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Senden der E-Mail-Benachrichtigung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
