// 🎯 LINKEDIN ADS OAUTH CALLBACK - Multi-Platform Auth Handler

import { NextRequest, NextResponse } from 'next/server';
import { advertisingFirebaseService } from '@/services/firebase/advertisingService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // companyId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/taskilo-advertising?error=oauth_failed&platform=linkedin`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/taskilo-advertising?error=missing_params&platform=linkedin`
      );
    }

    const companyId = state;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/multi-platform-advertising/auth/linkedin/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`LinkedIn token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user profile for account info
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    const profileData = await profileResponse.json();

    // Save credentials to Firestore
    await advertisingFirebaseService.savePlatformCredentials(companyId, 'linkedin', {
      linkedinAccessToken: accessToken,
      linkedinAccountId: profileData.id,
    });

    // Save connection status
    await advertisingFirebaseService.savePlatformConnection(companyId, {
      platform: 'linkedin',
      status: 'connected',
      lastConnected: new Date().toISOString(),
      accountInfo: {
        id: profileData.id,
        name:
          `${profileData.localizedFirstName || ''} ${profileData.localizedLastName || ''}`.trim() ||
          'LinkedIn Account',
        currency: 'USD', // LinkedIn default
        timezone: 'UTC',
      },
    });

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/taskilo-advertising?success=connected&platform=linkedin`
    );
  } catch (error: any) {
    const companyId = new URL(request.url).searchParams.get('state');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/taskilo-advertising?error=connection_failed&platform=linkedin&message=${encodeURIComponent(error.message)}`
    );
  }
}
