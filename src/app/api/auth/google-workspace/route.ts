// API Route für Google Workspace OAuth-Authentifizierung
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, getAccessToken } from '@/lib/google-workspace';

// OAuth Authorization URL abrufen
export async function GET(request: NextRequest) {
  try {
    // Prüfe, ob Google Workspace konfiguriert ist
    const CLIENT_ID = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json(
        {
          error: 'Google Workspace OAuth ist nicht konfiguriert',
          message:
            'GOOGLE_WORKSPACE_CLIENT_ID und GOOGLE_WORKSPACE_CLIENT_SECRET müssen in Vercel Environment Variables gesetzt werden.',
          setup_required: true,
          // Temporärer Status während Produktionsproblemen
          status: 'temporarily_unavailable',
          missing_vars: [
            !CLIENT_ID ? 'GOOGLE_WORKSPACE_CLIENT_ID' : null,
            !CLIENT_SECRET ? 'GOOGLE_WORKSPACE_CLIENT_SECRET' : null,
          ].filter(Boolean),
        },
        { status: 503 } // Service Unavailable statt 400 Bad Request
      );
    }

    const authUrl = getAuthUrl();
    return NextResponse.json({ success: true, authUrl });
  } catch (error) {
    console.error('Google Auth URL Fehler:', error);

    // Spezifische Fehlermeldung für fehlende Konfiguration
    if (error instanceof Error && error.message.includes('OAuth-Credentials')) {
      return NextResponse.json(
        {
          error: 'Google Workspace ist nicht konfiguriert',
          message: error.message,
          setup_required: true,
          // Temporärer Status während Produktionsproblemen
          status: 'temporarily_unavailable',
        },
        { status: 503 } // Service Unavailable statt 400 Bad Request
      );
    }

    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

// OAuth Callback - Access Token erhalten
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization Code erforderlich' }, { status: 400 });
    }

    const tokens = await getAccessToken(code);

    return NextResponse.json({
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });
  } catch (error) {
    console.error('Google Token Exchange Fehler:', error);
    return NextResponse.json({ error: 'Token-Austausch fehlgeschlagen' }, { status: 500 });
  }
}
