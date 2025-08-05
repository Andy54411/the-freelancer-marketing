/**
 * DATEV Organizations API Route
 * Enhanced with new DATEV Authentication Middleware
 * Handles authentication using the same pattern as finAPI
 * INCLUDES TOKEN REFRESH LOGIC
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import {
  getDatevTokenFromCookies,
  ServerDatevToken,
  refreshDatevAccessToken,
  setDatevTokenCookies,
} from '@/lib/datev-server-utils';
import { db } from '@/firebase/server';
import { getAuth } from 'firebase-admin/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[DATEV Organizations] Processing request...');

    // Get Firebase user from Authorization header
    let firebaseUserId: string | null = null;
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decodedToken = await getAuth().verifyIdToken(token);
        firebaseUserId = decodedToken.uid;
        console.log('[DATEV Organizations] Firebase user authenticated:', firebaseUserId);
      } catch (authError) {
        console.error('[DATEV Organizations] Firebase auth failed:', authError);
      }
    }

    // Fallback: Extract company ID from URL or headers
    const companyId =
      new URL(request.url).searchParams.get('companyId') || request.headers.get('x-company-id');

    let accessToken: string | null = null;

    // 1. Try new DATEV auth middleware if Firebase user is available
    if (firebaseUserId) {
      console.log('[DATEV Organizations] Using new Firebase-based DATEV auth');

      try {
        const tokenRef = db.collection('datev_tokens').doc(firebaseUserId);
        const tokenDoc = await tokenRef.get();

        if (tokenDoc.exists) {
          const tokenData = tokenDoc.data() as any;
          const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt || 0);

          if (expiresAt && expiresAt.getTime() > Date.now() + 300000) {
            accessToken = tokenData.accessToken;
            console.log('[DATEV Organizations] Using valid token from datev_tokens collection.');
          } else if (tokenData.refreshToken) {
            console.log(
              '[DATEV Organizations] Token from datev_tokens expired, attempting refresh...'
            );
            const newTokenData = await refreshDatevAccessToken(tokenData.refreshToken);
            accessToken = newTokenData.access_token;
            console.log('[DATEV Organizations] Token refresh successful.');

            // Asynchronously update cookies and Firestore
            setDatevTokenCookies(newTokenData);
            const newExpiresAt = new Date(Date.now() + (newTokenData.expires_in || 3600) * 1000);
            tokenRef.update({
              accessToken: newTokenData.access_token,
              refreshToken: newTokenData.refresh_token || tokenData.refreshToken,
              expiresAt: newExpiresAt,
              updatedAt: new Date(),
            });
          }
        }
      } catch (e) {
        console.error('[DATEV Organizations] Error fetching token from datev_tokens:', e);
      }
    }

    // 2. Fallback: Try to get a valid token from the secure cookie
    if (!accessToken) {
      const cookieToken: ServerDatevToken | null = await getDatevTokenFromCookies();
      if (cookieToken?.access_token) {
        accessToken = cookieToken.access_token;
        console.log('[DATEV Organizations] Using valid token from cookie (primary fallback)');
      }
    }

    // 3. Fallback: Check Firestore for company-based tokens (legacy)
    if (!accessToken && companyId) {
      console.log(
        '[DATEV Organizations] No auth token found. Checking legacy Firestore path for company:',
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
          const expiresAt =
            tokenData?.expires_at?.toDate?.() || new Date(tokenData?.expires_at || 0);

          // Check if token is still valid
          if (expiresAt && expiresAt.getTime() > Date.now() + 300000 && tokenData?.access_token) {
            accessToken = tokenData.access_token;
            console.log('[DATEV Organizations] Using valid token from legacy Firestore path.');
          } else if (tokenData?.refresh_token) {
            // Token is expired, try to refresh it
            console.log('[DATEV Organizations] Firestore token expired, attempting refresh...');
            try {
              const newTokenData = await refreshDatevAccessToken(tokenData.refresh_token);
              accessToken = newTokenData.access_token;
              console.log('[DATEV Organizations] Token refresh successful.');

              // Asynchronously update cookies and Firestore with the new token
              setDatevTokenCookies(newTokenData);
              const newExpiresAt = new Date(Date.now() + (newTokenData.expires_in || 3600) * 1000);
              tokenDoc.ref.update({
                access_token: newTokenData.access_token,
                refresh_token: newTokenData.refresh_token,
                expires_at: newExpiresAt,
                last_updated: new Date(),
              });
            } catch (refreshError) {
              console.error('[DATEV Organizations] Token refresh failed:', refreshError);
              // Continue with no access token, will result in 401
            }
          } else {
            console.log(
              '[DATEV Organizations] Firestore token expired and no refresh token found.'
            );
          }
        }
      } catch (firestoreError) {
        console.error('[DATEV Organizations] Firestore token retrieval failed:', firestoreError);
      }
    }

    // 4. Final check: If no token was found after all checks, return auth required error
    if (!accessToken) {
      console.warn('[DATEV Organizations] No valid DATEV authentication token found');

      return NextResponse.json(
        {
          success: false,
          error: 'DATEV authentication required - please re-authenticate',
          authRequired: true,
          details: 'No valid DATEV access token available. Please complete DATEV OAuth2 flow.',
          redirectUrl: '/api/datev/oauth-start',
          environment: process.env.NODE_ENV,
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
