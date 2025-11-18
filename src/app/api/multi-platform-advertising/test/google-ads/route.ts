import { NextRequest, NextResponse } from 'next/server';

/**
 * 🧪 Google Ads API Test Endpoint
 * GET /api/multi-platform-advertising/test/google-ads
 * 
 * Testet ob Google Ads API im Projekt aktiviert ist
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'Company ID required',
      }, { status: 400 });
    }

    // Prüfe Environment Variables
    const config = {
      googleClientId: process.env.GOOGLE_CLIENT_ID ? '✅ Present' : '❌ Missing',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? '✅ Present' : '❌ Missing',
      googleAdsDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? '✅ Present' : '❌ Missing (Optional)',
      baseUrl: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : (process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'),
    };

    // Prüfe installierte Pakete
    let googleAdsApiAvailable = false;
    try {
      await import('google-ads-api');
      googleAdsApiAvailable = true;
    } catch (importError) {
      console.warn('Google Ads API package not available:', importError);
    }

    // OAuth URLs generieren
    const oauthUrl = `/api/multi-platform-advertising/auth/google-ads?companyId=${companyId}`;
    const callbackUrl = `${config.baseUrl}/api/multi-platform-advertising/auth/google-ads/callback`;

    return NextResponse.json({
      success: true,
      message: 'Google Ads API Configuration Test',
      timestamp: new Date().toISOString(),
      config: {
        ...config,
        googleAdsApiPackage: googleAdsApiAvailable ? '✅ Installed' : '❌ Not Available',
      },
      oauth: {
        initUrl: oauthUrl,
        callbackUrl: callbackUrl,
        scopes: [
          'https://www.googleapis.com/auth/adwords',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
      },
      nextSteps: [
        config.googleClientId === '❌ Missing' ? '1. Add GOOGLE_CLIENT_ID to environment' : null,
        config.googleClientSecret === '❌ Missing' ? '2. Add GOOGLE_CLIENT_SECRET to environment' : null,
        '3. Add redirect URI to Google Cloud Console:',
        `   ${callbackUrl}`,
        config.googleAdsDeveloperToken === '❌ Missing (Optional)' ? '4. (Optional) Add GOOGLE_ADS_DEVELOPER_TOKEN for API access' : null,
        '5. Test OAuth flow by clicking "Connect Google Ads"',
      ].filter(Boolean),
    });

  } catch (error) {
    console.error('❌ Google Ads API test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}