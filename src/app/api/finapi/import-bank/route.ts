import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import { getOrCreateFinAPIUser } from '@/lib/banking-auth-middleware';
import {
  AuthorizationApi,
  BankConnectionsApi,
  UsersApi,
  createConfiguration,
  ServerConfiguration,
  BankingInterface,
} from 'finapi-client';

/**
 * Import Bank Connection - Uses finAPI Web Form 2.0 (Recommended approach)
 * 1. Creates finAPI user for Taskilo if needed
 * 2. Generates web form for bank connection import
 * 3. Returns web form URL for user authentication
 */
export async function POST(req: NextRequest) {
  try {
    const { bankId, userId, credentialType = 'sandbox' } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    // Get Taskilo's finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const taskiloCredentials = getFinApiCredentials(credentialType);

    if (!taskiloCredentials.clientId || !taskiloCredentials.clientSecret) {
      return NextResponse.json(
        { error: 'Taskilo finAPI credentials not configured' },
        { status: 500 }
      );
    }

    // Step 1: Get Client Credentials Token (Raw Fetch - getestet und funktioniert)
    const tokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: taskiloCredentials.clientId,
        client_secret: taskiloCredentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Client token request failed:', errorText);
      return NextResponse.json(
        { error: 'Client authentication failed', details: errorText },
        { status: 401 }
      );
    }

    const clientTokenData = await tokenResponse.json();
    console.log('✅ Client credentials token obtained');

    // Step 2: Create or get finAPI user (FIXED - persistent user ID and password)
    // Use Firebase UID as finAPI user ID with consistent format (max 36 chars)
    const finapiUserId = `tsk_${userId.slice(0, 28)}`.slice(0, 36); // Consistent ID without timestamp
    const userPassword = `TaskiloPass_${userId.slice(0, 10)}!2024`; // Consistent password based on userId

    let userAccessToken;

    // Try to get token for existing user first with consistent credentials
    const userTokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: finapiUserId,
        password: userPassword,
        client_id: taskiloCredentials.clientId,
        client_secret: taskiloCredentials.clientSecret,
      }),
    });

    if (!userTokenResponse.ok) {
      // User doesn't exist, create them
      console.log('🔄 Creating new finAPI user:', finapiUserId);

      const createUserResponse = await fetch(`${baseUrl}/api/v2/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientTokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: finapiUserId,
          password: userPassword,
          email: `${finapiUserId}@taskilo.de`,
        }),
      });

      if (!createUserResponse.ok) {
        const errorText = await createUserResponse.text();
        console.error('❌ User creation failed:', errorText);
        return NextResponse.json(
          { error: 'User creation failed', details: errorText },
          { status: 500 }
        );
      }

      console.log('✅ finAPI user created:', finapiUserId);

      // Now get token for the newly created user
      const newUserTokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: finapiUserId,
          password: userPassword,
          client_id: taskiloCredentials.clientId,
          client_secret: taskiloCredentials.clientSecret,
        }),
      });

      if (!newUserTokenResponse.ok) {
        const errorText = await newUserTokenResponse.text();
        return NextResponse.json(
          { error: 'User token request failed', details: errorText },
          { status: 401 }
        );
      }

      const newUserTokenData = await newUserTokenResponse.json();
      userAccessToken = newUserTokenData.access_token;
    } else {
      const userTokenData = await userTokenResponse.json();
      userAccessToken = userTokenData.access_token;
    }

    console.log('✅ User access token obtained for:', finapiUserId);

    // Step 3: Generate Web Form for Bank Connection Import
    try {
      // Web Form 2.0 API Request (korrigierte Struktur basierend auf Tests)
      const webFormRequest = {
        bank: {
          id: parseInt(bankId), // finAPI erwartet Integer, nicht String
        },
        bankConnectionName: `Taskilo Connection ${new Date().toLocaleDateString('de-DE')}`,
        allowedInterfaces: ['XS2A', 'FINTS_SERVER', 'WEB_SCRAPER'],
        callbacks: {
          finalised: `https://taskilo.de/api/finapi/webform/success?userId=${userId}`,
        },
        allowTestBank: true,
      };

      // Verwende webform-sandbox.finapi.io für Web Form 2.0 (getestet und funktioniert)
      const webFormEndpoint =
        credentialType === 'sandbox'
          ? 'https://webform-sandbox.finapi.io/api/webForms/bankConnectionImport'
          : 'https://webform.finapi.io/api/webForms/bankConnectionImport';

      const webFormResponse = await fetch(webFormEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webFormRequest),
      });

      if (!webFormResponse.ok) {
        const errorText = await webFormResponse.text();
        console.error('❌ Web Form Response Error:', {
          status: webFormResponse.status,
          statusText: webFormResponse.statusText,
          error: errorText,
        });

        return NextResponse.json(
          {
            error: 'Web Form Erstellung fehlgeschlagen',
            status: webFormResponse.status,
            details: errorText,
            debug: {
              endpoint: webFormEndpoint,
              request: webFormRequest,
            },
          },
          { status: 500 }
        );
      }

      const webFormData = await webFormResponse.json();
      console.log('✅ Web Form created:', webFormData.url);

      return NextResponse.json({
        success: true,
        message: 'Web Form für Bank-Verbindung erstellt',
        userId: userId,
        finapiUserId: finapiUserId,
        webForm: {
          id: webFormData.id,
          url: webFormData.url,
          expiresAt: webFormData.expiresAt,
        },
        instructions: {
          step: 'redirect_to_webform',
          description: 'Leiten Sie den User zur Web Form URL weiter für Bank-Authentifizierung',
          next_steps: [
            '1. User zur webForm.url weiterleiten',
            '2. User authentifiziert sich bei seiner Bank',
            '3. Callback wird nach Abschluss aufgerufen',
            '4. Bank-Verbindung ist dann verfügbar',
          ],
        },
        debug_info: {
          environment: credentialType,
          base_url: baseUrl,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (webFormError: any) {
      console.error('❌ Web Form creation failed:', webFormError);
      return NextResponse.json(
        {
          error: 'Web Form Erstellung fehlgeschlagen',
          details: webFormError.message || 'Unknown error',
          suggestion: 'Prüfen Sie die finAPI WebForm 2.0 API Berechtigung',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Bank connection web form error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during web form creation',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get all bank connections for the user
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const { searchParams } = new URL(req.url);
  const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

  try {
    // Get correct base URL
    const baseUrl = getFinApiBaseUrl(credentialType);

    // finAPI SDK Configuration
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });

    const bankConnectionsApi = new BankConnectionsApi(configuration);

    // Get all bank connections
    const connectionsResponse = await bankConnectionsApi.getAllBankConnections();

    return NextResponse.json({
      success: true,
      connections: connectionsResponse.connections || [],
      total: connectionsResponse.connections?.length || 0,
      debug_info: {
        environment: credentialType,
        base_url: baseUrl,
        token_provided: !!token,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get bank connections error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get bank connections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
