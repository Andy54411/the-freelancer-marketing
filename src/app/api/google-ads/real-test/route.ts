// Real Google Ads API Test with stored tokens
import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
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
    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      realConfig.refreshToken
    );

    // Test 2: Check connection status
    console.log('📞 Testing checkConnectionStatus...');
    const statusResponse = await googleAdsClientService.checkConnectionStatus(
      realConfig.refreshToken
    );

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
          customerCount: customersResponse.data?.length || 0,
          customers: customersResponse.data || [],
        },
        checkConnectionStatus: {
          success: statusResponse.success,
          connected: statusResponse.data?.connected,
          hasValidTokens: statusResponse.data?.hasValidTokens,
          hasCustomerAccess: statusResponse.data?.hasCustomerAccess,
          customerId: statusResponse.data?.customerId,
          customerName: statusResponse.data?.customerName,
          lastChecked: statusResponse.data?.lastChecked,
          error: statusResponse.error,
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
