import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // companyId
    const error = searchParams.get('error');

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';

    if (error) {
      console.error('Google OAuth Error:', error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/company/${state}/taskilo-advertising/google-ads?error=oauth_failed&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/company/${state}/taskilo-advertising/google-ads?error=missing_params`
      );
    }

    if (!db) {
      throw new Error('Firebase Admin not initialized');
    }

    // Parse state to check for popup mode
    // Format: companyId|popup or just companyId
    let companyId = state;
    let isPopup = false;

    if (state.includes('|popup')) {
      const parts = state.split('|');
      companyId = parts[0];
      isPopup = true;
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
        client_secret:
          process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${baseUrl}/api/google-ads/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      const redirectUrl = `${baseUrl}/dashboard/company/${companyId}/taskilo-advertising/google-ads?error=token_exchange_failed`;

      if (isPopup) {
        return new NextResponse(
          `<html><body><script>window.opener.postMessage({ type: 'GOOGLE_ADS_OAUTH_ERROR', error: 'Token exchange failed' }, '*'); window.close();</script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    // Store tokens in Firestore
    const connectionData: any = {
      platform: 'google-ads',
      accessToken: tokenData.access_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      userInfo: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
      connectedAt: new Date().toISOString(),
      status: 'connected',
      scope: tokenData.scope, // Save granted scopes
    };

    // Only update refresh token if provided (it might not be if user re-auths without prompt=consent)
    if (tokenData.refresh_token) {
      connectionData.refreshToken = tokenData.refresh_token;
    }

    // Save to Firestore under company's advertising connections
    // Use merge: true to preserve existing data like customerId
    await db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads')
      .set(connectionData, { merge: true });

    console.log('✅ Google Ads connection saved for company:', companyId);

    if (isPopup) {
      return new NextResponse(
        `<html><body><script>window.opener.postMessage({ type: 'GOOGLE_ADS_OAUTH_SUCCESS' }, '*'); window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${baseUrl}/dashboard/company/${companyId}/taskilo-advertising/google-ads?success=connected&platform=google-ads`
    );
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    const state = new URL(request.url).searchParams.get('state') || '';
    const companyId = state.split('|')[0];
    const isPopup = state.includes('|popup');

    const baseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://taskilo.de';

    if (isPopup) {
      return new NextResponse(
        `<html><body><script>window.opener.postMessage({ type: 'GOOGLE_ADS_OAUTH_ERROR', error: 'Callback failed' }, '*'); window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/company/${companyId}/taskilo-advertising/google-ads?error=callback_failed`
    );
  }
}
