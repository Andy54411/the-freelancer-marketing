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

    // Step 1: Get Client Credentials Token
    const server = new ServerConfiguration(baseUrl, {});
    const authConfig = createConfiguration({ baseServer: server });
    const authApi = new AuthorizationApi(authConfig);

    let clientToken;
    try {
      clientToken = await authApi.getToken(
        'client_credentials',
        taskiloCredentials.clientId,
        taskiloCredentials.clientSecret
      );
      console.log('✅ Client credentials token obtained');
    } catch (authError: any) {
      console.error('❌ Client authentication failed:', authError?.body || authError.message);
      return NextResponse.json(
        {
          error: 'finAPI Client authentication failed',
          details: authError?.body?.errors?.[0]?.message || authError.message,
        },
        { status: 401 }
      );
    }

    // Step 2: Create or get finAPI user for this specific Taskilo user
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const usersApi = new UsersApi(configuration);

    // Use Firebase UID as finAPI user ID with prefix to ensure uniqueness
    const finapiUserId = `taskilo_${userId}`;
    const userCredentials = {
      id: finapiUserId,
      password: `taskilo_secure_${userId}`, // Fixed password per user - consistent for repeated access
      email: `user_${userId}@taskilo.de`,
      phone: '+49123456789',
      isAutoUpdateEnabled: true,
    };

    let userAccessToken;
    try {
      // First try to get access token for existing user
      try {
        const userTokenResponse = await authApi.getToken(
          'password',
          taskiloCredentials.clientId,
          taskiloCredentials.clientSecret,
          userCredentials.id,
          userCredentials.password
        );

        userAccessToken = userTokenResponse.accessToken;
        console.log('✅ User access token obtained for existing user:', finapiUserId);
      } catch (loginError: any) {
        // User doesn't exist, create them
        if (loginError.status === 401) {
          console.log('🔄 Creating new finAPI user for Taskilo user:', finapiUserId);
          const createUserResponse = await usersApi.createUser(userCredentials);
          console.log('✅ finAPI user created:', createUserResponse.id);

          // Now get token for the newly created user
          const userTokenResponse = await authApi.getToken(
            'password',
            taskiloCredentials.clientId,
            taskiloCredentials.clientSecret,
            userCredentials.id,
            userCredentials.password
          );

          userAccessToken = userTokenResponse.accessToken;
          console.log('✅ User access token obtained for new user:', finapiUserId);
        } else {
          throw loginError;
        }
      }
    } catch (userError: any) {
      console.error('❌ User authentication failed:', userError?.body || userError.message);
      return NextResponse.json(
        {
          error: 'finAPI User authentication failed',
          details: userError?.body?.errors?.[0]?.message || userError.message,
        },
        { status: 401 }
      );
    }

    // Step 3: Generate Web Form for Bank Connection Import
    try {
      // Use raw fetch since finapi-client might not have WebForm 2.0 support
      const webFormRequest = {
        bankId: bankId || undefined, // Optional - let user choose if not provided
        accountTypes: ['CHECKING', 'SAVINGS'], // Focus on main account types
        callbacks: {
          successCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/finapi/webhooks?type=success&userId=${userId}`,
          errorCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/finapi/webhooks?type=error&userId=${userId}`,
        },
        profileId: undefined, // Use default profile
        redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${userId}/finance/banking/accounts?import=success`,
      };

      const webFormResponse = await fetch(`${baseUrl}/api/webForms/bankConnectionImport`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webFormRequest),
      });

      if (!webFormResponse.ok) {
        const errorData = await webFormResponse.json();
        throw new Error(
          `WebForm creation failed: ${errorData.errors?.[0]?.message || 'Unknown error'}`
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
