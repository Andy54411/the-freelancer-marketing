import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/revolut/oauth/callback
 * Handle Revolut OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent('Database not available')}`
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Redirect to OAuth success page with error
      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent('Missing code or state')}`
      );
    }

    // Check if this is an admin token refresh request (simple state without pipes)
    const isAdminRefresh = !state.includes('|') && (state === 'refresh_token' || state === 'webhook_registration' || state === 'admin');
    
    let userId: string;
    let companyEmail: string;
    let returnBaseUrl: string;
    
    if (isAdminRefresh) {
      // Admin token refresh - use admin credentials
      userId = 'admin';
      companyEmail = 'andy.staudinger@taskilo.de';
      returnBaseUrl = 'https://taskilo.de';
    } else {
      // Parse state to get user info and return URL (normal user flow)
      const stateParts = state.split('|');
      if (stateParts.length < 3) {
        return NextResponse.redirect(
          `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent('Invalid state parameter')}`
        );
      }

      [userId, companyEmail, returnBaseUrl] = stateParts;
      if (!userId || !companyEmail) {
        return NextResponse.redirect(
          `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent('Missing user data')}`
        );
      }
    }

    // Exchange code for access token
    // WICHTIG: b2b.revolut.com/api/1.0/auth/token ist der korrekte Endpunkt!
    const tokenUrl =
      process.env.REVOLUT_ENVIRONMENT === 'production'
        ? 'https://b2b.revolut.com/api/1.0/auth/token'
        : 'https://sandbox-b2b.revolut.com/api/1.0/auth/token';

    const clientId = process.env.REVOLUT_CLIENT_ID;
    const redirectUri = 'https://taskilo.de/api/revolut/oauth/callback';

    // Create JWT for client authentication
    const jwt = await import('jsonwebtoken');

    // Load private key - prefer environment variable over file (for Vercel deployment)
    let privateKey: string;
    if (process.env.REVOLUT_PRIVATE_KEY) {
      privateKey = process.env.REVOLUT_PRIVATE_KEY;
    } else {
      // Fallback to file system (local development)
      const fs = await import('fs');
      const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH || './certs/revolut/private.key';
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    }

    const now = Math.floor(Date.now() / 1000);
    // WICHTIG: iss muss 'taskilo.de' sein (wie in Revolut Dashboard konfiguriert)
    // aud muss 'https://revolut.com' sein
    const clientAssertion = jwt.default.sign(
      {
        iss: 'taskilo.de',
        sub: clientId,
        aud: 'https://revolut.com',
        iat: now,
        exp: now + 300,
      },
      privateKey,
      {
        algorithm: 'RS256',
        header: {
          alg: 'RS256',
          typ: 'JWT',
        },
      }
    );

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: clientAssertion,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();

      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent(`Token exchange failed: ${errorText}`)}`
      );
    }

    const tokenData = await tokenResponse.json();

    // For admin refresh, show the tokens directly (not stored in company doc)
    if (isAdminRefresh) {
      // Show tokens to admin - these need to be manually added to .env.local and Vercel
      const successUrl = new URL('https://taskilo.de/revolut/oauth-success');
      successUrl.searchParams.set('success', 'admin_token_received');
      successUrl.searchParams.set('access_token', tokenData.access_token);
      if (tokenData.refresh_token) {
        successUrl.searchParams.set('refresh_token', tokenData.refresh_token);
      }
      successUrl.searchParams.set('expires_in', String(tokenData.expires_in || 0));
      successUrl.searchParams.set('info', 'Bitte diese Tokens in .env.local und Vercel speichern');
      
      return NextResponse.redirect(successUrl.toString());
    }

    // Store connection in Firestore (normal user flow)
    const connectionId = `revolut_${Date.now()}`;
    const connectionData = {
      provider: 'revolut',
      connectionId: connectionId,
      authData: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scope: tokenData.scope,
      },
      userEmail: companyEmail,
      createdAt: new Date(),
      lastSync: new Date(),
      isActive: true,
    };

    await db
      .collection('companies')
      .doc(userId)
      .update({
        [`revolut_connections.${connectionId}`]: connectionData,
      });

    // Redirect to OAuth success page that will communicate with parent window
    const finalRedirectUrl = returnBaseUrl.includes('localhost')
      ? `${returnBaseUrl}/revolut/oauth-success?success=revolut_connected&connectionId=${connectionId}`
      : `https://taskilo.de/revolut/oauth-success?success=revolut_connected&connectionId=${connectionId}`;

    return NextResponse.redirect(finalRedirectUrl);
  } catch (error: any) {
    return NextResponse.redirect(
      `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent(`Callback failed: ${error.message}`)}`
    );
  }
}
