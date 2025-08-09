// 🚀 PHASE 2: Google Ads Campaign Management API
// Campaign CRUD operations und Performance Analytics

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/services/googleAdsService';
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

    if (!accountConfig?.accessToken) {
      return NextResponse.json(
        {
          error: 'No access token found in configuration',
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
      const customersResponse = await googleAdsService.getCustomers(config);

      if (
        customersResponse.success &&
        customersResponse.data?.customers &&
        customersResponse.data.customers.length > 0
      ) {
        // Use the first customer ID (excluding fallback)
        const realCustomer = customersResponse.data.customers.find(c => c.id !== 'pending-setup');
        customerId = realCustomer?.id || customersResponse.data.customers[0].id;
        console.log('🎯 Using auto-detected customerId:', customerId);
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

    // Campaigns abrufen
    const result = await googleAdsService.getCampaigns(config, customerId);

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
    const { customerId, campaignData } = body as {
      customerId: string;
      campaignData: CreateCampaignRequest;
    };

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

    // OAuth Config validieren
    const configValidation = GoogleAdsSetupValidator.validateSetup();
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          error: 'Google Ads configuration invalid',
          details: configValidation.errors,
        },
        { status: 400 }
      );
    }

    // Environment Config laden
    const config = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    } as GoogleAdsOAuthConfig;

    // Kampagne erstellen
    const result = await googleAdsService.createCampaign(config, customerId, {
      name: campaignData.name,
      budgetAmountMicros: campaignData.budgetAmountMicros,
      advertisingChannelType: campaignData.advertisingChannelType || 'SEARCH',
      startDate: campaignData.startDate || new Date().toISOString().split('T')[0],
      endDate: campaignData.endDate,
      geoTargets: campaignData.geoTargets,
      languageTargets: campaignData.languageTargets,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to create campaign',
          details: result.error,
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
    const { customerId, campaignId, status } = body as {
      customerId: string;
      campaignId: string;
      status: 'ENABLED' | 'PAUSED';
    };

    if (!customerId || !campaignId || !status) {
      return NextResponse.json(
        { error: 'Customer ID, campaign ID and status are required' },
        { status: 400 }
      );
    }

    if (!['ENABLED', 'PAUSED'].includes(status)) {
      return NextResponse.json({ error: 'Status must be ENABLED or PAUSED' }, { status: 400 });
    }

    // OAuth Config validieren
    const configValidation = GoogleAdsSetupValidator.validateSetup();
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          error: 'Google Ads configuration invalid',
          details: configValidation.errors,
        },
        { status: 400 }
      );
    }

    // Environment Config laden
    const config = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    } as GoogleAdsOAuthConfig;

    // Kampagne-Status aktualisieren
    const result = await googleAdsService.updateCampaignStatus(
      config,
      customerId,
      campaignId,
      status
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
    console.error('❌ Campaign update error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
