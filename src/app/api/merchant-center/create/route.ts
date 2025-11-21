import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { googleMerchantCenterService } from '@/services/googleMerchantCenterService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, businessName, websiteUrl, country, adsCustomerId: manualAdsId } = body;

    if (!companyId || !businessName || !websiteUrl || !country) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    // 1. Get Google Ads Connection (RefreshToken)
    const connectionRef = db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads');
    const connectionSnap = await connectionRef.get();

    if (!connectionSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Google Ads not connected. Please connect Google Ads first.' },
        { status: 400 }
      );
    }

    const connectionData = connectionSnap.data();
    console.log(
      'Google Ads Connection Data Keys:',
      connectionData ? Object.keys(connectionData) : 'null'
    );
    console.log('connectionData.customerId:', connectionData?.customerId);
    console.log('connectionData.selectedAccountId:', connectionData?.selectedAccountId);

    // Check for both camelCase and snake_case, and also inside 'oauth' object (legacy structure)
    const refreshToken =
      connectionData?.refreshToken ||
      connectionData?.refresh_token ||
      connectionData?.oauth?.refresh_token;

    if (!refreshToken) {
      console.log('No refresh token found. Triggering re-auth.');
      return NextResponse.json(
        {
          success: false,
          error: 'REQUIRES_REAUTH',
          message: 'Kein Refresh Token gefunden. Bitte verbinden Sie Ihr Google Ads Konto neu.',
        },
        { status: 403 }
      );
    }

    // 2. Get Google Ads Customer ID (if available)
    // Prioritize manually provided ID from request body
    let adsCustomerId =
      manualAdsId || connectionData?.customerId || connectionData?.selectedAccountId;

    // Check for nested customerId in oauth object if top level is missing or invalid
    if (
      (!adsCustomerId || adsCustomerId === 'oauth-connected') &&
      connectionData?.oauth?.customerId
    ) {
      adsCustomerId = connectionData.oauth.customerId;
    }

    // 🚨 CRITICAL FIX: If ID is still "oauth-connected", it means no account was selected yet.
    if (adsCustomerId === 'oauth-connected' || adsCustomerId === 'pending_selection') {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_ACCOUNT_SELECTED',
          message:
            'Es wurde noch kein Google Ads Account ausgewählt. Bitte wählen Sie in den Einstellungen unter "Taskilo Advertising" einen Account aus.',
        },
        { status: 400 }
      );
    }

    // Validate format (should be numeric, maybe with dashes)
    // If it's "oauth-connected" or similar non-numeric string, try to find a valid ID
    if (adsCustomerId && !/^\d[\d-]*$/.test(adsCustomerId.toString())) {
      console.warn(`Invalid adsCustomerId format: ${adsCustomerId}.`);

      // Try to find a valid ID in other fields
      if (connectionData?.accountName && /^\d[\d-]*$/.test(connectionData.accountName)) {
        // Sometimes accountName might hold the ID if mapped incorrectly? Unlikely but possible.
        adsCustomerId = connectionData.accountName;
      } else {
        // If we can't find a valid ID, set to undefined so we don't send garbage to the API
        adsCustomerId = undefined;
      }
    }

    // Strip dashes for API
    if (adsCustomerId) {
      adsCustomerId = adsCustomerId.toString().replace(/-/g, '');

      // Extra safety: Google Ads Customer IDs are typically 10 digits.
      // If it's significantly longer (like a 21-digit User ID), it's likely wrong.
      if (adsCustomerId.length > 12) {
        console.warn(
          `adsCustomerId ${adsCustomerId} seems too long to be a Google Ads Customer ID. Ignoring.`
        );
        adsCustomerId = undefined;
      }
    }

    // If we still don't have a valid ID, try to fetch it from Google Ads API
    if (!adsCustomerId) {
      console.log('No valid Google Ads Customer ID found in DB. Attempting to fetch from API...');
      const fetchedId = await googleMerchantCenterService.getGoogleAdsCustomerId(refreshToken);

      if (fetchedId) {
        adsCustomerId = fetchedId;
        // Update the database with the fetched ID so we don't have to do this again
        await connectionRef.set({ customerId: fetchedId }, { merge: true });
        console.log('Updated Google Ads Customer ID in database:', fetchedId);
      } else {
        console.warn('Could not fetch Google Ads Customer ID from API.');
      }
    }

    console.log('Final adsCustomerId to use:', adsCustomerId);

    if (!adsCustomerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_ADS_ID',
          message:
            'Google Ads Customer ID fehlt. Da kein Developer Token konfiguriert ist, kann die ID nicht automatisch abgerufen werden. Bitte geben Sie die ID manuell an.',
        },
        { status: 400 }
      );
    }

    // 3. Call Service
    try {
      const result = await googleMerchantCenterService.createAndLinkAccount(
        refreshToken,
        adsCustomerId,
        { businessName, websiteUrl, country }
      );

      return NextResponse.json(result);
    } catch (error: any) {
      if (error.message === 'NO_MCA_FOUND') {
        return NextResponse.json(
          {
            success: false,
            error: 'NO_MCA_FOUND',
            message:
              'Could not create a sub-account. Please create a Merchant Center account manually.',
          },
          { status: 400 }
        );
      }

      // Check for insufficient permissions (needs re-auth)
      if (
        error.code === 403 &&
        (error.message?.includes('insufficient permissions') ||
          error.message?.includes('insufficient authentication scopes') ||
          error.errors?.some((e: any) => e.reason === 'insufficientPermissions'))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'REQUIRES_REAUTH',
            message:
              'Neue Berechtigungen erforderlich. Bitte verbinden Sie Ihr Google Ads Konto neu.',
          },
          { status: 403 }
        );
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Error creating Merchant Center account:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
