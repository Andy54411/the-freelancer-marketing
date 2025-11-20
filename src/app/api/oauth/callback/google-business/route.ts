import { NextRequest, NextResponse } from 'next/server';

// GET Route für direkten Browser-Callback
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    // Fehler-Message für Popup
    let errorMessage = 'OAuth-Fehler aufgetreten';
    switch (error) {
      case 'access_denied':
        errorMessage =
          'Zugriff verweigert. Sie haben die Berechtigung für Google Business Profile nicht erteilt.';
        break;
      case 'invalid_request':
        errorMessage = 'Ungültige Anfrage. Bitte versuchen Sie es erneut.';
        break;
      default:
        errorMessage = `OAuth-Fehler: ${error}`;
        break;
    }

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Fehler</title>
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h2 style="color: #ef4444;">Verbindung fehlgeschlagen</h2>
            <p>${errorMessage}</p>
            <p style="color: #666; font-size: 14px;">Dieses Fenster wird automatisch geschlossen...</p>
          </div>
          <script>
            // Fehler-Message an Parent-Fenster senden
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_ERROR',
                error: '${errorMessage}'
              }, window.location.origin);
            }
            // COOP-sicheres Schließen
            setTimeout(() => {
              try {
                try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; }
              } catch (e) {
                document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>';
              }
            }, 3000);
          </script>
        </body>
      </html>
    `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }

  if (!code || !state) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Fehler</title>
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h2 style="color: #ef4444;">Verbindung fehlgeschlagen</h2>
            <p>Fehlende Parameter im OAuth-Callback.</p>
            <p style="color: #666; font-size: 14px;">Dieses Fenster wird automatisch geschlossen...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_ERROR',
                error: 'Fehlende Parameter im OAuth-Callback.'
              }, window.location.origin);
            }
            setTimeout(() => { 
              try { 
                try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; } 
              } catch (e) { 
                document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; 
              } 
            }, 3000);
          </script>
        </body>
      </html>
    `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }

  // State parsen um companyId zu extrahieren
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Fehler</title></head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h2 style="color: #ef4444;">Verbindung fehlgeschlagen</h2>
            <p>Ungültiger State-Parameter. Bitte versuchen Sie es erneut.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: 'Ungültiger State-Parameter.' }, window.location.origin);
            }
            setTimeout(() => { try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; } }, 3000);
          </script>
        </body>
      </html>
    `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const { companyId } = stateData;

  if (!companyId) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Fehler</title></head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h2 style="color: #ef4444;">Verbindung fehlgeschlagen</h2>
            <p>Ungültiger State-Parameter. Bitte versuchen Sie es erneut.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: 'Ungültiger State-Parameter.' }, window.location.origin);
            }
            setTimeout(() => { try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; } }, 3000);
          </script>
        </body>
      </html>
    `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback/google-business`;

    if (!clientId || !clientSecret) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Fehler</title></head>
          <body>
            <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
              <h2 style="color: #ef4444;">Konfigurationsfehler</h2>
              <p>OAuth ist nicht korrekt konfiguriert.</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: 'OAuth ist nicht korrekt konfiguriert.' }, window.location.origin);
              }
              setTimeout(() => { try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; } }, 3000);
            </script>
          </body>
        </html>
      `,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Access Token anfordern
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Fehler</title></head>
          <body>
            <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
              <h2 style="color: #ef4444;">Verbindung fehlgeschlagen</h2>
              <p>Token-Austausch fehlgeschlagen. Bitte versuchen Sie es erneut.</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: 'Token-Austausch fehlgeschlagen. Bitte versuchen Sie es erneut.' }, window.location.origin);
              }
              setTimeout(() => { try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; } }, 3000);
            </script>
          </body>
        </html>
      `,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokenData = await tokenResponse.json();

    // Token in Firestore speichern - mit Firebase Admin SDK (umgeht Firestore-Regeln)
    try {
      const { db } = await import('@/firebase/server');

      if (!db) {
        throw new Error('Firebase Admin DB nicht verfügbar');
      }

      await db
        .collection('companies')
        .doc(companyId)
        .collection('integrations')
        .doc('google-business')
        .set({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
          scope: tokenData.scope,
          token_type: tokenData.token_type,
          connected_at: new Date(),
          status: 'connected',
        });

      console.log('✅ OAuth Token erfolgreich in Firestore gespeichert für Company:', companyId);
    } catch (firestoreError: any) {
      console.error('❌ Firestore Admin Write Error:', firestoreError);
      throw new Error(`Firestore Admin Fehler: ${firestoreError.message || 'Unbekannter Fehler'}`);
    }

    // Erfolgreiche Popup-Schließung mit Success-Message
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Success</title>
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h2 style="color: #14ad9f;">Erfolgreich verbunden!</h2>
            <p>Google Business Profile wurde erfolgreich verbunden.</p>
            <p style="color: #666; font-size: 14px;">Dieses Fenster wird automatisch geschlossen...</p>
          </div>
          <script>
            // Erfolg-Message an Parent-Fenster senden
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_SUCCESS',
                success: true
              }, window.location.origin);
            }
            // Versuche Fenster zu schließen (COOP-sicher)
            setTimeout(() => {
              try {
                try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; }
              } catch (e) {
                // Falls COOP das Schließen blockiert, zeige eine Anweisung
                document.body.innerHTML = '<div style=\"text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;\"><h2 style=\"color: #14ad9f;\">Erfolgreich verbunden!</h2><p>Sie können dieses Fenster jetzt schließen.</p></div>';
              }
            }, 2000);
          </script>
        </body>
      </html>
    `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);

    // Detailliertere Fehlerbehandlung
    let errorMessage = 'callback_failed';
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      if (error.message.includes('fetch')) {
        errorMessage = 'network_error';
      } else if (error.message.includes('Firestore') || error.message.includes('firebase')) {
        errorMessage = 'database_error';
      }
    }

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Fehler</title></head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h2 style="color: #ef4444;">Verbindung fehlgeschlagen</h2>
            <p>${errorMessage}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: '${errorMessage}' }, window.location.origin);
            }
            setTimeout(() => { try { window.close(); } catch (e) { document.body.innerHTML += '<p><strong>Sie können dieses Fenster jetzt schließen.</strong></p>'; } }, 3000);
          </script>
        </body>
      </html>
    `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
