/**
 * DATEV Clients API Route
 * Proxy für DATEV Master Clients API - löst CORS-Problem
 */

import { NextRequest } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import { DatevTokenManager } from '@/lib/datev-token-manager';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    let isAuthenticated = await DatevTokenManager.refreshTokenIfNeeded();

    if (!isAuthenticated) {
      isAuthenticated = await DatevTokenManager.validateToken();

      if (!isAuthenticated) {
        return Response.json({ error: 'DATEV authentication required' }, { status: 401 });
      }
    }

    const authHeader = DatevTokenManager.getAuthHeader();
    if (!authHeader) {
      return Response.json({ error: 'No DATEV access token available' }, { status: 401 });
    }

    const config = getDatevConfig();
    const url = `${config.apiBaseUrl}${DATEV_ENDPOINTS.accounting.clients}`;

    // Make API call to DATEV
    const response = await fetch(url, {
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

      console.error('DATEV Master Clients API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // Handle specific errors
      if (response.status === 401) {
        DatevTokenManager.clearUserToken();
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
    console.error('Error in DATEV clients API route:', error);

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
