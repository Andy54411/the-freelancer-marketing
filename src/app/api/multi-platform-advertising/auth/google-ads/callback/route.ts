// 🎯 GOOGLE ADS OAUTH CALLBACK - Multi-Platform Auth Handler

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsClientService } from '@/services/googleAdsClientService';
import { advertisingFirebaseService } from '@/services/firebase/advertisingService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // companyId
    const error = searchParams.get('error');

    if (error) {
      console.error('❌ Google Ads OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/taskilo-advertising?error=oauth_failed&platform=google-ads`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/taskilo-advertising?error=missing_params&platform=google-ads`
      );
    }

    const companyId = state;
    const googleAdsService = new GoogleAdsClientService();
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/multi-platform-advertising/auth/google-ads/callback`;

    console.log('🔄 Exchanging Google Ads authorization code for tokens...');

    // Exchange code for tokens
    const tokenResult = await googleAdsService.exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success || !tokenResult.data) {
      throw new Error(tokenResult.error?.message || 'Failed to exchange code for tokens');
    }

    const { access_token, refresh_token } = tokenResult.data;

    // Get accessible customers
    const customersResult = await googleAdsService.getAccessibleCustomers(refresh_token);

    if (!customersResult.success || !customersResult.data || customersResult.data.length === 0) {
      throw new Error('No accessible Google Ads accounts found');
    }

    // Use first available customer
    const firstCustomer = customersResult.data[0];
    const customerId = firstCustomer.id;

    // Test connection
    const customerInfo = await googleAdsService.getCustomerInfo(access_token, customerId);

    if (!customerInfo.success) {
      throw new Error('Failed to retrieve customer information');
    }

    // Save credentials to Firestore
    await advertisingFirebaseService.savePlatformCredentials(companyId, 'google-ads', {
      accessToken: access_token,
      refreshToken: refresh_token,
      customerId: customerId,
    });

    // Save connection status
    await advertisingFirebaseService.savePlatformConnection(companyId, {
      platform: 'google-ads',
      status: 'connected',
      lastConnected: new Date().toISOString(),
      accountInfo: {
        id: customerId,
        name: customerInfo.data?.customer?.descriptiveName || 'Google Ads Account',
        currency: customerInfo.data?.customer?.currency || 'EUR',
        timezone: customerInfo.data?.customer?.timezone || 'Europe/Berlin',
      },
    });

    console.log('✅ Google Ads connection established successfully');

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/taskilo-advertising?success=connected&platform=google-ads`
    );
  } catch (error: any) {
    console.error('❌ Google Ads OAuth callback error:', error);

    const companyId = new URL(request.url).searchParams.get('state');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/taskilo-advertising?error=connection_failed&platform=google-ads&message=${encodeURIComponent(error.message)}`
    );
  }
}
