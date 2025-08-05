/**
 * DATEV Organizations API Route
 * Enhanced with new DATEV Authentication Middleware
 * Handles authentication using the same pattern as finAPI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import { getDatevTokenFromCookies, ServerDatevToken } from '@/lib/datev-server-utils';
import { db } from '@/firebase/server';
import { getDatevUserToken, validateDatevUserExists } from '@/services/datev-user-auth-service';
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
      console.log('[DATEV Organizations] Using new DATEV auth middleware');

      // Validate DATEV user exists
      const userValidation = await validateDatevUserExists(firebaseUserId);

      if (userValidation.exists && userValidation.isActive) {
        // Get DATEV token from Firestore via new service
        const tokenResult = await getDatevUserToken(firebaseUserId);

        if (tokenResult.success && tokenResult.token) {
          accessToken = tokenResult.token.accessToken;
          console.log('[DATEV Organizations] Using token from new auth service');
        } else {
          console.log('[DATEV Organizations] New auth service token failed:', tokenResult.error);
        }
      } else {
        console.log("[DATEV Organizations] DATEV user not active or doesn't exist");
      }
    }

    // 2. Fallback: Try to get a valid token from the secure cookie
    if (!accessToken) {
      const cookieToken: ServerDatevToken | null = await getDatevTokenFromCookies();
      if (cookieToken?.access_token) {
        accessToken = cookieToken.access_token;
        console.log('[DATEV Organizations] Using valid token from cookie (fallback)');
      }
    }

    // 3. Fallback: Check Firestore for company-based tokens (legacy)
    if (!accessToken && companyId) {
      console.log(
        '[DATEV Organizations] No auth token found. Checking legacy Firestore for company:',
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

    // 3. Check if we have valid authentication - if not, return auth required error
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
