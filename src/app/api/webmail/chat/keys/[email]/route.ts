import { NextRequest, NextResponse } from 'next/server';

const HETZNER_WEBMAIL_API = process.env.HETZNER_WEBMAIL_API || 'https://mail.taskilo.de/webmail-api';

/**
 * GET /api/webmail/chat/keys/[email]
 * Holt den öffentlichen Schlüssel eines Nutzers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;
  
  try {
    const response = await fetch(`${HETZNER_WEBMAIL_API}/api/chat/keys/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: 'Schlüssel nicht gefunden', details: error },
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
 * DELETE /api/webmail/chat/keys/[email]
 * Löscht den öffentlichen Schlüssel eines Nutzers
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;
  
  try {
    const response = await fetch(`${HETZNER_WEBMAIL_API}/api/chat/keys/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: 'Schlüssel konnte nicht gelöscht werden', details: error },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
