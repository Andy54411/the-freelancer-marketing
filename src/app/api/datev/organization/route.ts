/**
 * DATEV Organization API Route - Cookie Based
 * Fetches organization data after OAuth and stores it in cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatevConfig, DATEV_ENDPOINTS } from '@/lib/datev-config';
import { DatevCookieManager } from '@/lib/datev-cookie-manager';
import { DatevOrganization } from '@/services/datevService';

export async function POST(request: NextRequest) {
  try {
    console.log('[DATEV Cookie Organization] Processing request...');

    const { company_id } = await request.json();

    if (!company_id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    console.log('[DATEV Cookie Organization] Getting tokens for company:', company_id);

    // Get tokens from cookies
    const tokenData = DatevCookieManager.getTokens(company_id);

    if (!tokenData || !tokenData.access_token) {
      return NextResponse.json({ error: 'No valid DATEV tokens found' }, { status: 401 });
    }

    // Check if organization data is already stored
    if (tokenData.organization) {
      console.log('[DATEV Cookie Organization] Organization data already available in cookie');
      return NextResponse.json({
        success: true,
        organization: tokenData.organization,
      });
    }

    console.log('[DATEV Cookie Organization] Fetching organization data from DATEV API...');

    // Get DATEV configuration
    const config = getDatevConfig();
    const organizationsUrl = `${config.apiBaseUrl}${DATEV_ENDPOINTS.organizations}`;

    console.log('[DATEV Cookie Organization] Fetching from URL:', organizationsUrl);

    // Fetch organizations from DATEV API
    const response = await fetch(organizationsUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DATEV Cookie Organization] DATEV API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // If token expired, try to refresh
      if (response.status === 401) {
        console.log('[DATEV Cookie Organization] Token expired, attempting refresh...');

        const refreshed = await DatevCookieManager.refreshTokens(company_id);
        if (refreshed) {
          // Retry the request with new token
          const newTokenData = DatevCookieManager.getTokens(company_id);
          if (newTokenData?.access_token) {
            return await fetchOrganizationsWithToken(newTokenData.access_token, company_id);
          }
        }
      }

      return NextResponse.json(
        { error: `DATEV API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const organizationsData = await response.json();
    console.log('[DATEV Cookie Organization] Organizations data received:', organizationsData);

    // Process organizations data
    let organization: DatevOrganization | null = null;

    if (organizationsData.content && organizationsData.content.length > 0) {
      const orgData = organizationsData.content[0]; // Take first organization

      organization = {
        id: orgData.id || orgData.organization_id || 'unknown',
        name: orgData.name || orgData.organization_name || 'Unbekannte Organisation',
        type: orgData.type === 'consultant' ? 'consultant' : 'client',
        address: {
          street: orgData.address?.street || '',
          city: orgData.address?.city || '',
          zipCode: orgData.address?.zip_code || orgData.address?.postal_code || '',
          country: orgData.address?.country || 'DE',
        },
        taxNumber: orgData.tax_number,
        vatId: orgData.vat_id,
        status: orgData.status === 'inactive' ? 'inactive' : 'active',
        consultantId: orgData.consultant_id,
      };

      console.log('[DATEV Cookie Organization] Processed organization:', organization);

      // Update cookie with organization data
      DatevCookieManager.setTokens(company_id, {
        ...tokenData,
        organization,
      });

      console.log('[DATEV Cookie Organization] Organization data stored in cookie');
    } else {
      console.warn('[DATEV Cookie Organization] No organizations found in response');
    }

    return NextResponse.json({
      success: true,
      organization,
      raw_data: organizationsData, // Include raw data for debugging
    });
  } catch (error) {
    console.error('[DATEV Cookie Organization] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to fetch organizations with a specific token
async function fetchOrganizationsWithToken(accessToken: string, companyId: string) {
  try {
    const config = getDatevConfig();
    const organizationsUrl = `${config.apiBaseUrl}${DATEV_ENDPOINTS.organizations}`;

    const response = await fetch(organizationsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DATEV API error: ${response.status} ${response.statusText}`);
    }

    const organizationsData = await response.json();

    let organization: DatevOrganization | null = null;

    if (organizationsData.content && organizationsData.content.length > 0) {
      const orgData = organizationsData.content[0];

      organization = {
        id: orgData.id || orgData.organization_id || 'unknown',
        name: orgData.name || orgData.organization_name || 'Unbekannte Organisation',
        type: orgData.type === 'consultant' ? 'consultant' : 'client',
        address: {
          street: orgData.address?.street || '',
          city: orgData.address?.city || '',
          zipCode: orgData.address?.zip_code || orgData.address?.postal_code || '',
          country: orgData.address?.country || 'DE',
        },
        taxNumber: orgData.tax_number,
        vatId: orgData.vat_id,
        status: orgData.status === 'inactive' ? 'inactive' : 'active',
        consultantId: orgData.consultant_id,
      };

      // Update cookie with organization data
      const tokenData = DatevCookieManager.getTokens(companyId);
      if (tokenData) {
        DatevCookieManager.setTokens(companyId, {
          ...tokenData,
          organization,
        });
      }
    }

    return NextResponse.json({
      success: true,
      organization,
      raw_data: organizationsData,
    });
  } catch (error) {
    console.error('[DATEV Cookie Organization] Error in fetchOrganizationsWithToken:', error);
    return NextResponse.json({ error: 'Failed to fetch organization data' }, { status: 500 });
  }
}
