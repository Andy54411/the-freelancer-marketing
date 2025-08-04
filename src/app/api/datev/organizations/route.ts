/**
 * DATEV Organizations API Route
 * This API route acts as a secure proxy for the DATEV Organizations API.
 * It handles authentication by first checking for a valid session cookie,
 * then falling back to Firestore for persistent tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import { getDatevTokenFromCookies, ServerDatevToken } from '@/lib/datev-server-utils';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[DATEV Organizations] Processing request...');

    // Extract company ID from URL or headers
    const companyId =
      new URL(request.url).searchParams.get('companyId') || request.headers.get('x-company-id');

    let accessToken: string | null = null;

    // 1. Try to get a valid token from the secure cookie first.
    const cookieToken: ServerDatevToken | null = await getDatevTokenFromCookies();
    if (cookieToken?.access_token) {
      accessToken = cookieToken.access_token;
      console.log('[DATEV Organizations] Using valid token from cookie.');
    }

    // 2. If no valid cookie token, fall back to Firestore (e.g., for server-to-server calls or first load)
    if (!accessToken && companyId) {
      console.log(
        // eslint-disable-line
        '[DATEV Organizations] No valid cookie token. Checking Firestore for company:',
        companyId
      );
      try {
        const tokenDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('datev')
          .doc('tokens')
          .get();

        if (tokenDoc.exists) {
          const tokenData = tokenDoc.data();
          const expiresAt = tokenData?.expires_at?.toDate?.() || new Date(tokenData?.expires_at);

          // Check if token is still valid (with 5-minute buffer)
          if (expiresAt && expiresAt.getTime() > Date.now() && tokenData?.access_token) {
            accessToken = tokenData.access_token;
            console.log('[DATEV Organizations] Using Firestore token');
          } else {
            console.log('[DATEV Organizations] Firestore token expired');
          }
        }
      } catch (firestoreError) {
        console.error('[DATEV Organizations] Firestore token retrieval failed:', firestoreError);
      }
    }

    // 3. Final check - no auth available
    if (!accessToken) {
      console.log('[DATEV Organizations] No valid token available - authentication required');
      return NextResponse.json(
        {
          error: 'DATEV authentication required - please re-authenticate',
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    console.log('[DATEV Organizations] Valid token found, making API call...');

    const config = getDatevConfig();
    const apiUrl = `${config.apiBaseUrl}${DATEV_ENDPOINTS.organizations}`;

    // Make API call to DATEV
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('[DATEV Organizations] API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('DATEV Organizations API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // Handle specific errors
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'DATEV authentication required - please re-authenticate',
            requiresAuth: true,
          },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: `DATEV API access denied: ${errorData.message || 'Insufficient permissions'}` },
          { status: 403 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json({ error: 'DATEV API rate limit exceeded' }, { status: 429 });
      }

      return NextResponse.json(
        { error: `DATEV API error: ${errorData.message || errorData.error || errorText}` },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    if (!responseText.trim()) {
      return NextResponse.json({ organizations: [] });
    }

    const data = JSON.parse(responseText);
    console.log('[DATEV Organizations] Success - returning data');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in DATEV organizations API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
