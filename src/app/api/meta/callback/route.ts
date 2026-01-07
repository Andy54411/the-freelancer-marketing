/**
 * Meta OAuth Callback
 * 
 * Empfängt den Authorization Code und tauscht ihn gegen einen Access Token
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  if (error) {
    return NextResponse.json({
      success: false,
      error: error,
      error_description: searchParams.get('error_description'),
    }, { status: 400 });
  }
  
  if (!code) {
    return NextResponse.json({
      success: false,
      error: 'Kein Authorization Code erhalten',
    }, { status: 400 });
  }
  
  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`;
    
    // Tausche Code gegen Access Token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `code=${code}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return NextResponse.json({
        success: false,
        error: tokenData.error.message,
      }, { status: 400 });
    }
    
    const accessToken = tokenData.access_token;
    
    // Hole User-Infos
    const meResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
    );
    const meData = await meResponse.json();
    
    // Hole Business Accounts
    const businessResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?fields=id,name,verification_status&access_token=${accessToken}`
    );
    const businessData = await businessResponse.json();
    
    // Generiere Long-Lived Token (60 Tage)
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${appId}&` +
      `client_secret=${appSecret}&` +
      `fb_exchange_token=${accessToken}`
    );
    const longLivedData = await longLivedResponse.json();
    
    // Speichere in Firestore (Admin Config)
    if (isFirebaseAvailable() && db) {
      await db.collection('admin_config').doc('meta_api').set({
        accessToken: longLivedData.access_token || accessToken,
        tokenType: longLivedData.token_type || 'bearer',
        expiresIn: longLivedData.expires_in,
        userId: meData.id,
        userName: meData.name,
        businesses: businessData.data || [],
        updatedAt: new Date().toISOString(),
      });
    }
    
    // Zeige Ergebnis
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Meta API Setup Erfolgreich</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #14ad9f; }
          .success { color: #22c55e; }
          pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; overflow-x: auto; }
          .warning { color: #f59e0b; background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Meta API Setup Erfolgreich!</h1>
          <p class="success">Access Token wurde gespeichert.</p>
          
          <h3>Benutzer:</h3>
          <p><strong>${meData.name}</strong> (ID: ${meData.id})</p>
          
          <h3>Business Accounts:</h3>
          <pre>${JSON.stringify(businessData.data, null, 2)}</pre>
          
          <h3>Token Info:</h3>
          <p>Token Typ: ${longLivedData.token_type || 'bearer'}</p>
          <p>Gültig für: ${longLivedData.expires_in ? Math.round(longLivedData.expires_in / 86400) + ' Tage' : 'Unbekannt'}</p>
          
          <div class="warning">
            <strong>Nächster Schritt:</strong><br>
            Rufe <code>/api/meta/whatsapp/setup</code> auf um WhatsApp einzurichten.
          </div>
          
          <p style="margin-top: 30px;">
            <a href="/dashboard/admin" style="color: #14ad9f;">Zurück zum Admin Dashboard</a>
          </p>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
