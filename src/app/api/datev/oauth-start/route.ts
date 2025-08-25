import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV OAuth Starter Endpoint
 * Leitet automatisch zur DATEV OAuth Autorisierung weiter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'default';
    const action = searchParams.get('action');

    const config = getDatevConfig();

    // Wenn debug action, zeige Konfiguration
    if (action === 'debug') {
      return NextResponse.json({
        message: 'DATEV OAuth Konfiguration',
        config: {
          clientId: config.clientId,
          clientSecret: config.clientSecret ? '***CONFIGURED***' : 'NOT_SET',
          redirectUri: config.redirectUri,
          authUrl: config.authUrl,
          tokenUrl: config.tokenUrl,
          scopes: config.scopes,
        },
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    }

    // Erstelle OAuth State für Sicherheit
    const state = `company:${companyId}:${Date.now()}`;

    // Baue OAuth Authorization URL
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('scope', config.scopes.join(' '));
    authUrl.searchParams.append('state', state);

    // WICHTIG: Redirect zum DATEV OAuth, nicht JSON Response!
    // Dies ist der KORREKTE Weg für OAuth Authorization
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Fehler beim Starten der DATEV OAuth Autorisierung',
        hint: 'Prüfe deine DATEV Konfiguration',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint für explizite OAuth URL Generierung (ohne Redirect)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId = 'default' } = body;

    const config = getDatevConfig();
    const state = `company:${companyId}:${Date.now()}`;

    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('scope', config.scopes.join(' '));
    authUrl.searchParams.append('state', state);

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      state: state,
      instructions: [
        '1. Öffne die authUrl in einem neuen Browser-Tab',
        '2. Logge dich bei DATEV ein',
        '3. Autorisiere Taskilo',
        '4. Du wirst automatisch zu /api/datev/callback weitergeleitet',
        '5. Der Callback verarbeitet den Authorization Code',
      ],
      config: {
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
