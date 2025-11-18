import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // companyId
    const error = searchParams.get('error');
    
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de');

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

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || 'GOCSPX-dummy',
        redirect_uri: `${baseUrl}/api/google-ads/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/company/${state}/taskilo-advertising/google-ads?error=token_exchange_failed`
      );
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();

    // Store tokens in Firestore
    const connectionData = {
      platform: 'google-ads',
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      userInfo: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
      connectedAt: new Date().toISOString(),
      status: 'connected',
    };

    // Save to Firestore under company's advertising connections
    await setDoc(
      doc(db, 'companies', state, 'advertising_connections', 'google-ads'),
      connectionData
    );

    console.log('✅ Google Ads connection saved for company:', state);

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${baseUrl}/dashboard/company/${state}/taskilo-advertising/google-ads?success=connected&platform=google-ads`
    );

  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    const state = new URL(request.url).searchParams.get('state');
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : 'https://taskilo.de';
    return NextResponse.redirect(
      `${baseUrl}/dashboard/company/${state}/taskilo-advertising/google-ads?error=callback_failed`
    );
  }
}