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

    // LinkedIn OAuth-Redirect für Company
    const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_LINKEDIN_CLIENT_ID&redirect_uri=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/multi-platform-advertising/auth/linkedin/callback`
    )}&state=${companyId}&scope=r_ads,r_ads_reporting,rw_ads`;

    return NextResponse.json({
      success: true,
      authUrl: linkedinAuthUrl,
      message: 'LinkedIn Authorization URL generiert',
    });
  } catch (error) {
    console.error('Fehler bei LinkedIn Auth:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei LinkedIn Authorization',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}