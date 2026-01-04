/**
 * GET /api/revolut/oauth/callback
 * 
 * Handle Revolut OAuth callback via Hetzner Proxy.
 * Der Token-Exchange laeuft ueber Hetzner wegen IP-Whitelist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { exchangeCodeViaProxy } from '@/lib/revolut-hetzner-proxy';

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
      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent('Missing code or state')}`
      );
    }

    // Check if this is an admin token refresh request
    // Admin states: 'admin', 'refresh_token', 'webhook_registration', or any simple string without '|'
    const isAdminRefresh = !state.includes('|') || 
      state === 'refresh_token' || 
      state === 'webhook_registration' || 
      state === 'admin' ||
      state.startsWith('admin');
    
    let userId: string;
    let companyEmail: string;
    let returnBaseUrl: string;
    
    if (isAdminRefresh) {
      userId = 'admin';
      companyEmail = 'andy.staudinger@taskilo.de';
      returnBaseUrl = 'https://taskilo.de';
    } else {
      const stateParts = state.split('|');
      if (stateParts.length < 2) {
        // Fallback: Behandle als Admin-Request wenn Format nicht passt
        userId = 'admin';
        companyEmail = 'andy.staudinger@taskilo.de';
        returnBaseUrl = 'https://taskilo.de';
      } else {
        [userId, companyEmail] = stateParts;
        returnBaseUrl = stateParts[2] || 'https://taskilo.de';
        
        if (!userId || !companyEmail) {
          return NextResponse.redirect(
            `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent('Missing user data in state')}`
          );
        }
      }
    }

    // Exchange code for access token via Hetzner Proxy
    const redirectUri = 'https://taskilo.de/api/revolut/oauth/callback';
    const tokenResult = await exchangeCodeViaProxy(code, redirectUri);

    if (!tokenResult.success) {
      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent(tokenResult.error || 'Token exchange failed')}`
      );
    }

    // For admin refresh, just show success
    if (isAdminRefresh) {
      return NextResponse.redirect(
        `https://taskilo.de/revolut/oauth-success?success=true&token_type=admin&expires_in=${tokenResult.expires_in}`
      );
    }

    // Store tokens for user in Firestore
    try {
      const connectionId = `revolut_${Date.now()}`;
      const connectionData = {
        provider: 'revolut',
        environment: process.env.REVOLUT_ENVIRONMENT || 'production',
        connectionId,
        connectedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (tokenResult.expires_in || 2400) * 1000).toISOString(),
        companyEmail,
      };

      await db.collection('companies').doc(userId).set(
        {
          [`revolut_connections.${connectionId}`]: connectionData,
        },
        { merge: true }
      );
    } catch (storeError) {
      console.error('[Revolut OAuth] Error storing connection:', storeError);
    }

    // Redirect to success page
    const successUrl = new URL(`${returnBaseUrl}/revolut/oauth-success`);
    successUrl.searchParams.set('success', 'true');
    successUrl.searchParams.set('expires_in', String(tokenResult.expires_in));

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.redirect(
      `https://taskilo.de/revolut/oauth-success?error=${encodeURIComponent(message)}`
    );
  }
}
