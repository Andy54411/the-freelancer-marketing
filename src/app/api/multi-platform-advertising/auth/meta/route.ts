import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Meta (Facebook) OAuth-Redirect für Company
    const metaAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=YOUR_META_APP_ID&redirect_uri=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/multi-platform-advertising/auth/meta/callback`
    )}&state=${companyId}&scope=ads_management,ads_read,business_management`;

    return NextResponse.json({
      success: true,
      authUrl: metaAuthUrl,
      message: 'Meta Ads Authorization URL generiert',
    });
  } catch (error) {
    console.error('Fehler bei Meta Auth:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei Meta Authorization',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}