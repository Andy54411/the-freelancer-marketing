// ✅ PHASE 1: Google Ads OAuth2 Authorization Endpoint
// Startet den OAuth-Flow für Account-Verknüpfung

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/services/googleAdsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/google-ads/callback`;
    const authUrl = googleAdsService.generateAuthUrl(companyId, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
    });
  } catch (error) {
    console.error('Google Ads Auth Error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Google Ads authorization' },
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
    const authUrl = googleAdsService.generateAuthUrl(companyId, redirectUri);

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
