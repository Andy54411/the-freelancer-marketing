/**
 * DATEV Organizations API Route
 * Proxy für DATEV Organizations API - löst CORS-Problem
 */

import { NextRequest } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[DATEV Organizations] Processing request...');

    // Extract company ID from URL or headers
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId') || request.headers.get('x-company-id');

    // Try to get authentication token from multiple sources
    let authHeader = DatevTokenManager.getServerAuthHeader(request);

    // If no cookie-based token, try to get from Firestore
    if (!authHeader && companyId) {
      console.log(
        '[DATEV Organizations] No cookie token, checking Firestore for company:',
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
          if (expiresAt && expiresAt.getTime() > Date.now() + 300000 && tokenData) {
            authHeader = `${tokenData.token_type || 'Bearer'} ${tokenData.access_token}`;
            console.log('[DATEV Organizations] Using Firestore token');
          } else {
            console.log('[DATEV Organizations] Firestore token expired');
          }
        }
      } catch (firestoreError) {
        console.error('[DATEV Organizations] Firestore token retrieval failed:', firestoreError);
      }
    }

    if (!authHeader) {
      console.log('[DATEV Organizations] No auth header available - authentication required');
      return Response.json(
        {
          error: 'DATEV authentication required - please re-authenticate',
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    console.log('[DATEV Organizations] Auth header found, making API call...');

    const config = getDatevConfig();
    const url2 = `${config.apiBaseUrl}${DATEV_ENDPOINTS.organizations}`;

    // Make API call to DATEV
    const response = await fetch(url2, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
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
        return Response.json(
          {
            error: 'DATEV authentication required - please re-authenticate',
            requiresAuth: true,
          },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return Response.json(
          { error: `DATEV API access denied: ${errorData.message || 'Insufficient permissions'}` },
          { status: 403 }
        );
      }

      if (response.status === 429) {
        return Response.json({ error: 'DATEV API rate limit exceeded' }, { status: 429 });
      }

      return Response.json(
        { error: `DATEV API error: ${errorData.message || errorData.error || errorText}` },
        { status: response.status }
      );
    }

    const responseText = await response.text();

    if (!responseText.trim()) {
      return Response.json({ organizations: [] });
    }

    const data = JSON.parse(responseText);
    console.log('[DATEV Organizations] Success - returning data');
    return Response.json(data);
  } catch (error) {
    console.error('Error in DATEV organizations API route:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
