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

    // Parse state to check for popup mode or manager token
    // Format: companyId|popup or manager_token or just companyId
    let companyId = state;
    let isPopup = false;
    let isManagerToken = false;

    if (state === 'manager_token') {
      isManagerToken = true;
    } else if (state.includes('|popup')) {
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
      
      if (isManagerToken) {
        return new NextResponse(
          `<html><body><h1>Fehler beim Token-Austausch</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      
      const redirectUrl = `${baseUrl}/dashboard/company/${companyId}/taskilo-advertising/google-ads?error=token_exchange_failed`;

      if (isPopup) {
        return new NextResponse(
          `<html><body><script>window.opener.postMessage({ type: 'GOOGLE_ADS_OAUTH_ERROR', error: 'Token exchange failed' }, '*'); window.close();</script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Wenn Manager-Token, zeige ihn an
    if (isManagerToken) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Ads Manager Token</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              h1 {
                color: #14ad9f;
                margin-top: 0;
              }
              .token-box {
                background: #f8f9fa;
                border: 2px solid #14ad9f;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                word-break: break-all;
                font-family: monospace;
                font-size: 14px;
              }
              .instructions {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
              }
              code {
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Google Ads Manager Token erhalten</h1>
              
              <div class="instructions">
                <strong>📝 Fügen Sie diesen Token zu Ihrer .env.local hinzu:</strong>
              </div>

              <div class="token-box">
                GOOGLE_ADS_REFRESH_TOKEN="${tokenData.refresh_token}"
              </div>

              <div class="instructions">
                <strong>⚠️ Wichtig:</strong>
                <ul>
                  <li>Starten Sie den Development-Server neu</li>
                  <li>Dieser Token ermöglicht das Versenden von Manager-Einladungen</li>
                </ul>
              </div>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
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
