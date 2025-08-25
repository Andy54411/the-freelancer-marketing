/**
 * DATEV Clients API Route
 * Proxy für DATEV Master Clients API - löst CORS-Problem
 */

import { NextRequest } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import { DatevTokenManager } from '@/lib/datev-token-manager';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {

    // Extract company ID from URL or headers
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId') || request.headers.get('x-company-id');

    // Try to get authentication token from multiple sources
    let authHeader = DatevTokenManager.getServerAuthHeader(request);

    // If no cookie-based token, try to get from Firestore
    if (!authHeader && companyId) {

      try {
        const tokenDoc = await db
          .collection('users')
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

          } else {

          }
        }
      } catch (firestoreError) {

      }
    }

    if (!authHeader) {

      return Response.json(
        {
          error: 'DATEV authentication required - please re-authenticate',
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const config = getDatevConfig();
    const url2 = `${config.apiBaseUrl}${DATEV_ENDPOINTS.accounting.clients}`;

    // Make API call to DATEV
    const response = await fetch(url2, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // Handle specific errors
      if (response.status === 401) {
        // Note: For server-side, we can't clear localStorage
        // Client will need to handle token expiration
        return Response.json({ error: 'DATEV authentication expired' }, { status: 401 });
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
      return Response.json({ clients: [] });
    }

    const data = JSON.parse(responseText);
    return Response.json(data);
  } catch (error) {

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
