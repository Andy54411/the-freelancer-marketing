import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const isPopup = searchParams.get('isPopup') === 'true';

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Missing companyId' }, { status: 400 });
    }

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';

    const redirectUri = `${baseUrl}/api/google-ads/callback`;

    // Encode state to include popup flag if needed
    // Format: companyId|popup or just companyId
    const state = isPopup ? `${companyId}|popup` : companyId;

    // We manually construct the URL here to ensure we have the right params for re-auth
    // The service's generateAuthUrl might be slightly different, let's use it but override state

    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/content', // Merchant Center
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent', // Force consent to get new refresh token
      state: state,
      include_granted_scopes: 'true',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({ success: true, url: authUrl });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
