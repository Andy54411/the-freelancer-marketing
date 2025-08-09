// Temporary test endpoint to debug Google Ads API calls
import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Google Ads API calls...');

    // Create test OAuth config (you'd normally get this from the OAuth flow)
    const testConfig = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: 'test-refresh-token',
      accessToken: 'test-access-token',
      tokenExpiry: new Date(),
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    };

    console.log('🔧 Config validation:', {
      hasClientId: !!testConfig.clientId,
      hasClientSecret: !!testConfig.clientSecret,
      hasDeveloperToken: !!testConfig.developerToken,
    });

    // Test the getAccessibleCustomers call
    const customersResponse =
      await googleAdsClientService.getAccessibleCustomers('test-refresh-token');

    return NextResponse.json({
      success: true,
      testType: 'Google Ads API Call Test',
      configValidation: {
        hasClientId: !!testConfig.clientId,
        hasClientSecret: !!testConfig.clientSecret,
        hasDeveloperToken: !!testConfig.developerToken,
      },
      apiResponse: {
        success: customersResponse.success,
        error: customersResponse.error,
        customerCount: customersResponse.data?.length || 0,
        customers: customersResponse.data || [],
      },
    });
  } catch (error) {
    console.error('❌ Test error:', error);
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
