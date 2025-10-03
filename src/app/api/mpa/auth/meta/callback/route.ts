// 🎯 META ADS OAUTH CALLBACK - Multi-Platform Auth Handler

import { NextRequest, NextResponse } from 'next/server';
import { MetaAdsService } from '@/services/platform-services/metaAdsService';
import { advertisingFirebaseService } from '@/services/firebase/advertisingService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // companyId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/taskilo-advertising?error=oauth_failed&platform=meta`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/taskilo-advertising?error=missing_params&platform=meta`
      );
    }

    const companyId = state;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/multi-platform-advertising/auth/meta/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Meta token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info and ad accounts
    const [userResponse, adAccountsResponse] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`),
      fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${accessToken}`
      ),
    ]);

    if (!userResponse.ok || !adAccountsResponse.ok) {
      throw new Error('Failed to fetch Meta user info or ad accounts');
    }

    const userData = await userResponse.json();
    const adAccountsData = await adAccountsResponse.json();

    // Use first available ad account
    const firstAdAccount = adAccountsData.data?.[0];
    if (!firstAdAccount) {
      throw new Error('No Meta ad accounts found');
    }

    const adAccountId = firstAdAccount.id.replace('act_', '');

    // Save credentials to Firestore
    await advertisingFirebaseService.savePlatformCredentials(companyId, 'meta', {
      metaAccessToken: accessToken,
      metaAdAccountId: adAccountId,
    });

    // Save connection status
    await advertisingFirebaseService.savePlatformConnection(companyId, {
      platform: 'meta',
      status: 'connected',
      lastConnected: new Date().toISOString(),
      accountInfo: {
        id: adAccountId,
        name: firstAdAccount.name || 'Meta Ad Account',
        currency: firstAdAccount.currency || 'EUR',
        timezone: firstAdAccount.timezone_name || 'Europe/Berlin',
      },
    });

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/taskilo-advertising?success=connected&platform=meta`
    );
  } catch (error: any) {
    const companyId = new URL(request.url).searchParams.get('state');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/taskilo-advertising?error=connection_failed&platform=meta&message=${encodeURIComponent(error.message)}`
    );
  }
}
