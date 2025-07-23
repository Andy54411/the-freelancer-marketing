// API Route für Google Workspace OAuth-Authentifizierung
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, getAccessToken } from '@/lib/google-workspace';

// OAuth Authorization URL abrufen
export async function GET(request: NextRequest) {
  try {
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
        },
        { status: 400 }
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
