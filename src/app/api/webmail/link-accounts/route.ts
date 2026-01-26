import { NextRequest, NextResponse } from 'next/server';

const HETZNER_WEBMAIL_API = 'https://mail.taskilo.de/webmail-api';

/**
 * POST /api/webmail/link-accounts
 * Verknüpft zwei Konten bidirektional
 */
export async function POST(request: NextRequest) {
  try {
    const { primaryEmail, linkedEmail } = await request.json();

    if (!primaryEmail || !linkedEmail) {
      return NextResponse.json({
        success: false,
        error: 'primaryEmail und linkedEmail erforderlich',
      }, { status: 400 });
    }

    // Verknüpfung in beide Richtungen erstellen
    const results = await Promise.allSettled([
      // Primary -> Linked
      fetch(`${HETZNER_WEBMAIL_API}/api/profile/linked-accounts/${encodeURIComponent(primaryEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          linkedEmail,
          name: linkedEmail.split('@')[0],
        }),
      }),
      // Linked -> Primary
      fetch(`${HETZNER_WEBMAIL_API}/api/profile/linked-accounts/${encodeURIComponent(linkedEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          linkedEmail: primaryEmail,
          name: primaryEmail.split('@')[0],
        }),
      }),
    ]);

    const success = results.some(r => r.status === 'fulfilled');

    return NextResponse.json({
      success,
      message: success ? 'Konten erfolgreich verknüpft' : 'Verknüpfung fehlgeschlagen',
    });
  } catch (error) {
    console.error('[link-accounts] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
    }, { status: 500 });
  }
}
