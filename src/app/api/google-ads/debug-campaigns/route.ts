// 🐛 Debug Route für Google Ads Campaign Errors

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';
    const customerId = searchParams.get('customerId') || '5267195046';

    console.log('🐛 Debug Campaigns API:', { companyId, customerId });

    // Get Firestore config
    const { db } = await import('@/firebase/server');
    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json({
        error: 'No Google Ads config found',
        step: 'firestore-lookup',
        companyId,
      });
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json({
        error: 'No refresh token found',
        step: 'refresh-token-check',
        hasConfig: !!accountConfig,
        configKeys: accountConfig ? Object.keys(accountConfig) : [],
      });
    }

    // Test 1: Check if we can get accessible customers
    console.log('🐛 Step 1: Testing getAccessibleCustomers...');
    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      accountConfig.refreshToken
    );

    if (!customersResponse.success) {
      return NextResponse.json({
        error: 'Failed to get accessible customers',
        step: 'accessible-customers',
        details: customersResponse.error,
      });
    }

    // Test 2: Test direct campaign query via service
    console.log('🐛 Step 2: Testing getCampaigns via service...');
    const campaignsResult = await googleAdsClientService.getCampaigns(
      accountConfig.refreshToken,
      customerId
    );

    if (!campaignsResult.success) {
      return NextResponse.json({
        error: 'getCampaigns failed',
        step: 'get-campaigns',
        details: campaignsResult.error,
      });
    }

    return NextResponse.json({
      success: true,
      debug: {
        customersFound: customersResponse.data?.length || 0,
        customers: customersResponse.data?.map(c => ({
          id: c.id,
          name: c.name,
          manager: c.manager,
        })),
        targetCustomerId: customerId,
        campaignsFound: campaignsResult.data?.campaigns?.length || 0,
        sampleCampaign: campaignsResult.data?.campaigns?.[0] || null,
      },
    });
  } catch (error: any) {
    console.error('❌ Debug error:', error);

    return NextResponse.json({
      error: 'Debug route failed',
      step: 'general-error',
      details: {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 5),
      },
    });
  }
}
