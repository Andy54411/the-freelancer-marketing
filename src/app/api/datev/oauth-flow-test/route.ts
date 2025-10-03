import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV OAuth Flow Test Endpoint
 * Demonstriert den kompletten OAuth Flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'step1';
    const companyId = searchParams.get('companyId') || 'test123';

    const config = getDatevConfig();

    switch (action) {
      case 'step1':
        // Schritt 1: Authorization URL generieren
        const state = `company:${companyId}:${Date.now()}`;
        const authUrl = new URL(config.authUrl);

        authUrl.searchParams.append('client_id', config.clientId);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', config.redirectUri);
        authUrl.searchParams.append('scope', config.scopes.join(' '));
        authUrl.searchParams.append('state', state);

        return NextResponse.json({
          step: 1,
          description: 'OAuth Authorization URL generiert',
          authUrl: authUrl.toString(),
          instructions: [
            '1. Kopiere die authUrl',
            '2. Öffne sie im Browser',
            '3. Autorisiere bei DATEV',
            '4. Du wirst zu /api/datev/callback weitergeleitet',
            '5. Der Callback tauscht Code gegen Token aus',
          ],
          config: {
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            scopes: config.scopes,
            state: state,
          },
          timestamp: new Date().toISOString(),
        });

      case 'step2':
        // Schritt 2: Code gegen Token austauschen (simuliert)
        const code = searchParams.get('code');

        if (!code) {
          return NextResponse.json(
            {
              error: 'Authorization code required',
              hint: 'Call step1 first, then follow OAuth flow',
            },
            { status: 400 }
          );
        }

        // Token Exchange Request (simuliert)
        const tokenRequestBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
        });

        const authHeader = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;

        return NextResponse.json({
          step: 2,
          description: 'Token Exchange Simulation',
          tokenRequest: {
            url: config.tokenUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: authHeader.substring(0, 20) + '...',
            },
            body: Object.fromEntries(tokenRequestBody),
          },
          note: 'Dies ist eine Simulation. Echter Token Exchange passiert im Callback.',
          timestamp: new Date().toISOString(),
        });

      case 'debug':
        // Debug: Aktuelle Konfiguration anzeigen
        return NextResponse.json({
          step: 'debug',
          description: 'DATEV OAuth Konfiguration',
          config: {
            clientId: config.clientId,
            clientSecret: config.clientSecret ? '***configured***' : 'NOT_SET',
            redirectUri: config.redirectUri,
            baseUrl: config.apiBaseUrl,
            authUrl: config.authUrl,
            tokenUrl: config.tokenUrl,
            scopes: config.scopes,
          },
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['step1', 'step2', 'debug'],
            usage: {
              step1: '?action=step1&companyId=test123',
              step2: '?action=step2&code=AUTH_CODE',
              debug: '?action=debug',
            },
          },
          { status: 400 }
        );
    }
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
