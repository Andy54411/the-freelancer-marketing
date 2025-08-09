// Real Google Ads API Test with stored tokens
import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/services/googleAdsService';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    console.log('🧪 Testing Google Ads API with real stored tokens...');

    // Get real stored config from Firestore
    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          success: false,
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
          success: false,
          error: 'No access token found in configuration',
          companyId,
        },
        { status: 400 }
      );
    }

    // Create real OAuth config from stored data
    const realConfig = {
      clientId: accountConfig.clientId,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: accountConfig.refreshToken,
      accessToken: accountConfig.accessToken,
      tokenExpiry: accountConfig.tokenExpiry?.toDate?.() || new Date(accountConfig.tokenExpiry),
      developerToken: accountConfig.developerToken,
    };

    console.log('🔧 Using real config:', {
      hasClientId: !!realConfig.clientId,
      hasClientSecret: !!realConfig.clientSecret,
      hasRefreshToken: !!realConfig.refreshToken,
      hasAccessToken: !!realConfig.accessToken,
      hasDeveloperToken: !!realConfig.developerToken,
      tokenExpiry: realConfig.tokenExpiry,
      isExpired: realConfig.tokenExpiry < new Date(),
    });

    // Test 1: List accessible customers
    console.log('📞 Testing listAccessibleCustomers...');
    const customersResponse = await googleAdsService.getCustomers(realConfig);

    // Test 2: Check connection status
    console.log('📞 Testing checkConnectionStatus...');
    const statusResponse = await googleAdsService.checkConnectionStatus(realConfig);

    return NextResponse.json({
      success: true,
      testType: 'Real Google Ads API Test',
      companyId,
      configValidation: {
        hasClientId: !!realConfig.clientId,
        hasClientSecret: !!realConfig.clientSecret,
        hasRefreshToken: !!realConfig.refreshToken,
        hasAccessToken: !!realConfig.accessToken,
        hasDeveloperToken: !!realConfig.developerToken,
        tokenExpiry: realConfig.tokenExpiry,
        isExpired: realConfig.tokenExpiry < new Date(),
      },
      tests: {
        getCustomers: {
          success: customersResponse.success,
          error: customersResponse.error,
          customerCount: customersResponse.data?.customers?.length || 0,
          customers: customersResponse.data?.customers || [],
        },
        checkConnectionStatus: {
          status: statusResponse.status,
          accountsConnected: statusResponse.accountsConnected,
          error: statusResponse.error,
          lastSync: statusResponse.lastSync,
        },
      },
    });
  } catch (error) {
    console.error('❌ Real API test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
