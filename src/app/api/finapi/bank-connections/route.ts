import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';

/**
 * Get bank connections for user - NO MOCK DATA, SAME AUTH AS ACCOUNTS API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log(
      '🏦 Getting bank connections for user:',
      userId,
      'with credential type:',
      credentialType
    );

    // Get finAPI configuration (SAME AS ACCOUNTS API)
    const baseUrl = getFinApiBaseUrl(credentialType);
    const taskiloCredentials = getFinApiCredentials(credentialType);

    if (!taskiloCredentials.clientId || !taskiloCredentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    console.log('🔑 Getting new finAPI client token...');

    // Step 1: Get client credentials token (SAME AS ACCOUNTS API)
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
      console.error('❌ Client token request failed');
      return NextResponse.json({ error: 'Failed to authenticate with finAPI' }, { status: 401 });
    }

    const clientTokenData = await tokenResponse.json();
    console.log('✅ finAPI client token obtained');

    // Step 2: Get user access token (EXACT SAME AS ACCOUNTS API)
    const finapiUserId = `tsk_${userId.slice(0, 28)}`.slice(0, 36);
    const userPassword = `TaskiloPass_${userId.slice(0, 10)}!2024`;

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
      console.error('❌ User token request failed');
      return NextResponse.json({ error: 'Failed to get user token' }, { status: 401 });
    }

    const userTokenData = await userTokenResponse.json();
    console.log('✅ finAPI user token obtained');

    // Step 3: Get bank connections using user token
    const connectionsResponse = await fetch(`${baseUrl}/api/v2/bankConnections`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userTokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!connectionsResponse.ok) {
      console.error('❌ Bank connections request failed:', connectionsResponse.status);
      const errorText = await connectionsResponse.text();
      console.error('❌ Error details:', errorText);
      return NextResponse.json(
        { error: 'Failed to get bank connections' },
        { status: connectionsResponse.status }
      );
    }

    const connectionsData = await connectionsResponse.json();
    const bankConnections = connectionsData.connections || [];

    console.log('✅ Real bank connections retrieved:', bankConnections.length);

    // Log bank names for debugging
    bankConnections.forEach((conn: any, index: number) => {
      console.log(
        `📊 Connection ${index + 1}: ID=${conn.id}, Name="${conn.name}", Bank=${conn.bankId}`
      );
    });

    return NextResponse.json({
      success: true,
      bankConnections: bankConnections,
      totalCount: bankConnections.length,
      user: {
        finapiUserId: finapiUserId,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in bank connections API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
