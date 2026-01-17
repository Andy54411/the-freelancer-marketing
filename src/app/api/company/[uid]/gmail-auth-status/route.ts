import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

async function refreshGoogleTokens(refreshToken: string, clientId: string, clientSecret: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.statusText);
      return null;
    }

    const tokens = await response.json();
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken, // Keep old refresh token if no new one
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
    };
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || uid;
    
    // Check Gmail configuration in emailConfigs subcollection - filtered by userId
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    // Suche nach Config für diesen spezifischen User
    let emailConfigsSnapshot = await db.collection('companies').doc(uid).collection('emailConfigs')
      .where('userId', '==', userId)
      .where('provider', '==', 'gmail')
      .limit(1)
      .get();

    // Fallback: Wenn nicht gefunden, suche nach irgendeiner Gmail-Config für diese Company
    if (emailConfigsSnapshot.empty) {
      console.log('🔍 Keine Config mit userId gefunden, suche nach beliebiger Gmail-Config...');
      emailConfigsSnapshot = await db.collection('companies').doc(uid).collection('emailConfigs')
        .where('provider', '==', 'gmail')
        .limit(1)
        .get();
    }

    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({
        hasConfig: false,
        error: 'Keine Gmail-Konfiguration gefunden für diesen Benutzer',
        userId: userId
      });
    }

    // Get the user-specific Gmail configuration
    const emailConfigDoc = emailConfigsSnapshot.docs[0];
    const gmailConfig = emailConfigDoc.data();
    
    // Debug: Log current tokens
    console.log('🔍 Current Gmail config for company:', uid);
    console.log('📧 Email:', gmailConfig.email);
    console.log('🔑 Has tokens object:', !!gmailConfig.tokens);
    console.log('🔄 Refresh token present:', !!gmailConfig.tokens?.refresh_token);
    console.log('🔑 Access token present:', !!gmailConfig.tokens?.access_token);
    console.log('📊 Current status:', gmailConfig.status);
    console.log('🔐 Token Scopes:', gmailConfig.tokens?.scope || 'KEINE SCOPES GESPEICHERT!');
    
    // Check if we have a refresh token
    const hasRefreshToken = gmailConfig.tokens?.refresh_token && 
                           gmailConfig.tokens.refresh_token !== 'invalid';
    
    console.log('✅ Has valid refresh token:', hasRefreshToken);
    
    let currentTokens = gmailConfig.tokens;
    let status = gmailConfig.status || 'disconnected';
    
    // Prüfe ob der Access Token abgelaufen ist (mit 5 Minuten Puffer)
    const tokenExpiryDate = gmailConfig.tokens?.expiry_date;
    const isTokenExpired = tokenExpiryDate ? (Date.now() > tokenExpiryDate - 5 * 60 * 1000) : true;
    
    console.log('🕐 Token expiry check:', {
      expiryDate: tokenExpiryDate ? new Date(tokenExpiryDate).toISOString() : 'nicht gesetzt',
      isExpired: isTokenExpired,
      now: new Date().toISOString()
    });
    
    // Refresh Token wenn:
    // 1. Status ist disconnected/authentication_required ODER
    // 2. Access Token fehlt/invalid ODER
    // 3. Access Token ist abgelaufen
    const needsRefresh = hasRefreshToken && (
      status === 'disconnected' || 
      status === 'authentication_required' || 
      !gmailConfig.tokens?.access_token || 
      gmailConfig.tokens.access_token === 'invalid' ||
      isTokenExpired
    );
    
    if (needsRefresh) {
      console.log('🔄 Attempting to refresh Gmail tokens for company:', uid);
      
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      console.log('🔧 Google Client ID available:', !!clientId);
      console.log('🔧 Google Client Secret available:', !!clientSecret);
      
      if (clientId && clientSecret) {
        const refreshedTokens = await refreshGoogleTokens(
          gmailConfig.tokens.refresh_token,
          clientId,
          clientSecret
        );
        
        if (refreshedTokens) {
          console.log('✅ Successfully refreshed Gmail tokens');
          
          // KRITISCH: Behalte die originalen Scopes bei! Google gibt sie beim Refresh NICHT zurück!
          const originalScopes = gmailConfig.tokens?.scope || [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
            'https://www.googleapis.com/auth/contacts.readonly',
          ].join(' ');
          
          // Update tokens in emailConfigs subcollection (where they are actually stored!)
          await db.collection('companies').doc(uid).collection('emailConfigs').doc(emailConfigDoc.id).update({
            'tokens.access_token': refreshedTokens.access_token,
            'tokens.refresh_token': refreshedTokens.refresh_token,
            'tokens.expires_in': refreshedTokens.expires_in,
            'tokens.token_type': refreshedTokens.token_type,
            'tokens.expiry_date': Date.now() + (refreshedTokens.expires_in * 1000),
            'tokens.scope': originalScopes, // FIXIERT: Scopes beibehalten!
            'status': 'connected',
            'lastRefresh': new Date().toISOString(),
            'updatedAt': new Date().toISOString(),
          });
          console.log('✅ Tokens in emailConfigs subcollection aktualisiert (mit originalen Scopes)');
          
          currentTokens = {
            ...currentTokens,
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token,
            scope: originalScopes, // FIXIERT: Scopes auch im Response
          };
          status = 'connected';
        } else {
          console.log('❌ Failed to refresh Gmail tokens');
          status = 'authentication_required';
        }
      } else {
        console.log('❌ Missing Google OAuth credentials');
      }
    } else {
      console.log('⏭️ Skipping token refresh:', {
        hasRefreshToken,
        hasAccessToken: !!gmailConfig.tokens?.access_token,
        accessTokenValid: gmailConfig.tokens?.access_token !== 'invalid',
        isTokenExpired,
        status
      });
    }
    
    // Check token validity after potential refresh
    const hasValidTokens = currentTokens?.refresh_token && 
                          currentTokens.refresh_token !== 'invalid' &&
                          currentTokens.access_token &&
                          currentTokens.access_token !== 'invalid';
    
    const isExpired = !hasValidTokens || status === 'authentication_required';
    
    // Prüfe ob Photos-Scope vorhanden ist
    const tokenScopes = currentTokens?.scope || gmailConfig.tokens?.scope || '';
    const hasPhotosScope = tokenScopes.includes('photoslibrary');
    const hasDriveScope = tokenScopes.includes('drive');
    
    console.log('📸 Scope check:', {
      tokenScopes: tokenScopes.substring(0, 100) + '...',
      hasPhotosScope,
      hasDriveScope
    });
    
    return NextResponse.json({
      hasConfig: true,
      email: gmailConfig.email,
      provider: gmailConfig.provider || 'gmail',
      hasTokens: hasValidTokens,
      tokenExpired: isExpired,
      status: status,
      lastError: gmailConfig.lastError,
      needsReauth: isExpired,
      reauthorizeUrl: `/api/company/${uid}/gmail-connect`,
      // Access Token für Drive/Photos Picker
      accessToken: hasValidTokens ? currentTokens?.access_token : null,
      // Scope-Info für Client
      hasPhotosScope,
      hasDriveScope,
      scopeHint: !hasPhotosScope ? 'Für Google Fotos: Gehe zu https://myaccount.google.com/permissions, entferne "Taskilo", dann verbinde Gmail erneut.' : null,
      // Debug info
      debug: {
        hasRefreshTokenInDb: !!gmailConfig.tokens?.refresh_token,
        hasAccessTokenInDb: !!gmailConfig.tokens?.access_token,
        refreshTokenValue: gmailConfig.tokens?.refresh_token ? 'present' : 'missing',
        accessTokenValue: gmailConfig.tokens?.access_token ? 'present' : 'missing',
        originalStatus: gmailConfig.status,
        clientIdAvailable: !!process.env.GOOGLE_CLIENT_ID,
        clientSecretAvailable: !!process.env.GOOGLE_CLIENT_SECRET,
        scopes: tokenScopes
      }
    });
    
  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return NextResponse.json({ error: 'Failed to check auth status' }, { status: 500 });
  }
}