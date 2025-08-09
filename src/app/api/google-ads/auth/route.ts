// ✅ PHASE 1: Google Ads OAuth2 Authorization Endpoint
// Startet den OAuth-Flow für Account-Verknüpfung

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    console.log('🔐 Google Ads Auth GET Request:', {
      companyId,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      hasClientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
      hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID is required',
          debug: {
            received: { companyId },
            searchParams: Object.fromEntries(searchParams.entries()),
          },
        },
        { status: 400 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/google-ads/callback`;
    console.log('🔐 Generating auth URL for:', { companyId, redirectUri });

    const authUrl = googleAdsClientService.generateAuthUrl(companyId, redirectUri);
    console.log('✅ Auth URL generated successfully, length:', authUrl.length);

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
      debug: {
        companyId,
        redirectUri,
        urlLength: authUrl.length,
        urlPreview: authUrl.substring(0, 100) + '...',
      },
    });
  } catch (error: any) {
    console.error('🔥 Google Ads Auth GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize Google Ads authorization',
        details: error.message,
        debug: {
          errorType: typeof error,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          environmentCheck: {
            hasClientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
            hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
            hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
          },
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, customRedirectUri } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const redirectUri =
      customRedirectUri || `${process.env.NEXT_PUBLIC_BASE_URL}/api/google-ads/callback`;
    const authUrl = googleAdsClientService.generateAuthUrl(companyId, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
    });
  } catch (error) {
    console.error('Google Ads Auth POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Google Ads authorization' },
      { status: 500 }
    );
  }
}
