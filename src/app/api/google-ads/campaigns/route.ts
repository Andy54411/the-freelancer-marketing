// 🚀 PHASE 2: Google Ads Campaign Management API
// Campaign CRUD operations und Performance Analytics mit Client Library

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { GoogleAdsSetupValidator } from '@/utils/googleAdsSetupValidator';
import type { GoogleAdsOAuthConfig, CreateCampaignRequest } from '@/types/googleAds';

/**
 * 📊 GET /api/google-ads/campaigns - Kampagnen abrufen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';
    const providedCustomerId = searchParams.get('customerId');

    console.log('🎯 Campaigns API called with:', { companyId, providedCustomerId });

    // Get real stored config from Firestore
    const { db } = await import('@/firebase/server');
    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          error: 'No Google Ads configuration found',
          companyId,
        },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        {
          error: 'No refresh token found in configuration',
          companyId,
        },
        { status: 400 }
      );
    }

    // Create real OAuth config from stored data
    const config = {
      clientId: accountConfig.clientId,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: accountConfig.refreshToken,
      accessToken: accountConfig.accessToken,
      tokenExpiry: accountConfig.tokenExpiry?.toDate?.() || new Date(accountConfig.tokenExpiry),
      developerToken: accountConfig.developerToken,
    } as GoogleAdsOAuthConfig;

    // If no customerId provided, get the first available customer
    let customerId = providedCustomerId;
    if (!customerId) {
      console.log('🔍 No customerId provided, fetching available customers...');

      if (!config.refreshToken) {
        return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
      }

      const customersResponse = await googleAdsClientService.getAccessibleCustomers(
        config.refreshToken
      );

      if (
        customersResponse.success &&
        customersResponse.data &&
        customersResponse.data.length > 0
      ) {
        // ✅ EINFACHE LÖSUNG: Verwende denselben Algorithmus wie test-all
        // Nimm einfach den ersten verfügbaren Account
        customerId = customersResponse.data[0].id;
        console.log('🎯 Using first available account (same as test-all):', customerId);

        // Optional: Log alle verfügbaren Accounts für Debug
        console.log(
          '📋 Available accounts:',
          customersResponse.data.map(c => ({
            id: c.id,
            name: c.name,
            manager: c.manager,
          }))
        );
      } else {
        return NextResponse.json(
          {
            error: 'No customers found or failed to fetch customers',
            details: customersResponse.error,
          },
          { status: 400 }
        );
      }
    }

    // ✅ DIREKT ZU CAMPAIGNS - Keine weitere Account-Validierung
    // Verwende den ausgewählten customerId direkt, genau wie test-all

    // Campaigns abrufen
    if (!config.refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available for campaigns' },
        { status: 400 }
      );
    }

    console.log('📊 Fetching campaigns for customerId:', customerId);
    const result = await googleAdsClientService.getCampaigns(config.refreshToken, customerId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to fetch campaigns',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Campaign fetch error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 🔨 POST /api/google-ads/campaigns - Neue Kampagne erstellen
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, campaignData, companyId } = body as {
      customerId: string;
      campaignData: CreateCampaignRequest;
      companyId?: string;
    };

    console.log('🎯 Campaign creation request:', { customerId, campaignData, companyId });

    if (!customerId || !campaignData) {
      return NextResponse.json(
        { error: 'Customer ID and campaign data are required' },
        { status: 400 }
      );
    }

    // Kampagne-Daten validieren
    if (!campaignData.name || !campaignData.budgetAmountMicros) {
      return NextResponse.json({ error: 'Campaign name and budget are required' }, { status: 400 });
    }

    // Get real stored config from Firestore
    const { db } = await import('@/firebase/server');
    const finalCompanyId = companyId || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    const googleAdsDocRef = db
      .collection('companies')
      .doc(finalCompanyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          error: 'No Google Ads configuration found',
          companyId: finalCompanyId,
        },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        {
          error: 'No refresh token found in configuration',
          companyId: finalCompanyId,
        },
        { status: 400 }
      );
    }

    // Resolve customer ID if 'auto-detect' was provided
    let finalCustomerId = customerId;
    if (customerId === 'auto-detect') {
      console.log('🔍 Resolving auto-detect customer ID...');

      const customersResponse = await googleAdsClientService.getAccessibleCustomers(
        accountConfig.refreshToken
      );

      if (
        customersResponse.success &&
        customersResponse.data &&
        customersResponse.data.length > 0
      ) {
        // Use the first real customer ID (excluding fallback)
        const realCustomer = customersResponse.data.find(c => c.id !== 'pending-setup');
        finalCustomerId = realCustomer?.id || customersResponse.data[0].id;
        console.log('🎯 Resolved customer ID:', finalCustomerId);
      } else {
        return NextResponse.json(
          {
            error: 'No customers found or failed to fetch customers',
            details: customersResponse.error,
          },
          { status: 400 }
        );
      }
    }

    // Validate resolved customer ID
    if (!finalCustomerId || finalCustomerId === 'auto-detect') {
      return NextResponse.json(
        {
          error: 'Invalid customer ID resolved',
          providedCustomerId: customerId,
          resolvedCustomerId: finalCustomerId,
        },
        { status: 400 }
      );
    }

    // Create campaign using Client Library
    console.log('🚀 Creating campaign with Client Library...');
    console.log('📝 Campaign data details:', {
      refreshToken: !!accountConfig.refreshToken,
      originalCustomerId: customerId,
      resolvedCustomerId: finalCustomerId,
      campaignData: {
        ...campaignData,
        budgetAmountMicros: `${campaignData.budgetAmountMicros} (${campaignData.budgetAmountMicros / 1000000} EUR)`,
      },
    });

    const result = await googleAdsClientService.createCampaign(
      accountConfig.refreshToken,
      finalCustomerId, // Use the resolved customer ID!
      campaignData
    );

    console.log('🔍 Campaign creation result:', result);

    if (!result.success) {
      console.error('❌ Campaign creation failed:', result.error);
      return NextResponse.json(
        {
          error: 'Failed to create campaign',
          details: result.error,
          debugInfo: {
            originalCustomerId: customerId,
            resolvedCustomerId: finalCustomerId,
            campaignName: campaignData.name,
            budget: campaignData.budgetAmountMicros,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Campaign created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Campaign creation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 🔄 PATCH /api/google-ads/campaigns - Kampagne-Status ändern
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, campaignId, status, companyId } = body as {
      customerId: string;
      campaignId: string;
      status: 'ENABLED' | 'PAUSED';
      companyId?: string;
    };

    console.log('🔄 Campaign status update request:', {
      customerId,
      campaignId,
      status,
      companyId,
    });

    if (!customerId || !campaignId || !status) {
      return NextResponse.json(
        { error: 'Customer ID, campaign ID and status are required' },
        { status: 400 }
      );
    }

    if (!['ENABLED', 'PAUSED'].includes(status)) {
      return NextResponse.json({ error: 'Status must be ENABLED or PAUSED' }, { status: 400 });
    }

    // Get real stored config from Firestore
    const { db } = await import('@/firebase/server');
    const finalCompanyId = companyId || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    const googleAdsDocRef = db
      .collection('companies')
      .doc(finalCompanyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          error: 'No Google Ads configuration found',
          companyId: finalCompanyId,
        },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        {
          error: 'No refresh token found in configuration',
          companyId: finalCompanyId,
        },
        { status: 400 }
      );
    }

    // Kampagne-Status aktualisieren using Client Library
    console.log('🔄 Updating campaign status with Client Library...');
    const result = await googleAdsClientService.updateCampaign(
      accountConfig.refreshToken,
      customerId,
      campaignId,
      { status }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to update campaign status',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Campaign ${status === 'ENABLED' ? 'activated' : 'paused'} successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Campaign status update error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
