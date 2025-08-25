import { NextRequest, NextResponse } from 'next/server';
import { storeBankConnection } from '@/lib/bank-connection-storage';
import { finapiService } from '@/lib/finapi-sdk-service';

/**
 * finAPI Success Callback Handler
 *
 * Automatische Speicherung der Bank-Verbindung nach erfolgreichem WebForm
 */
export async function GET(request: NextRequest) {
  try {

    const searchParams = request.nextUrl.searchParams;

    // finAPI WebForm kann verschiedene Parameter senden - checke alle möglichen
    const bankConnectionId =
      searchParams.get('bankConnectionId') || searchParams.get('connectionId');
    const userId = searchParams.get('userId');
    const webFormId = searchParams.get('webFormId');

    if (!bankConnectionId || !userId) {

      return new NextResponse(
        '<html><body><h1>Fehler</h1><p>Fehlende Parameter</p><script>window.close();</script></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get finAPI user token for data retrieval - use consistent credentials
    const finapiUserId = `tsk_${userId.slice(0, 28)}`.slice(0, 36); // Consistent ID
    const userPassword = `TaskiloPass_${userId.slice(0, 10)}!2024`; // Consistent password

    const userToken = await finapiService.getUserToken(finapiUserId, userPassword);

    // Get bank connection details

    const bankConnection = await finapiService.getBankConnection(userToken, bankConnectionId);

    if (!bankConnection) {

      return new NextResponse(
        '<html><body><h1>Fehler</h1><p>Bank-Verbindung nicht gefunden</p><script>window.close();</script></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get accounts for this connection

    const accounts = await finapiService.getAccounts(userToken);
    const connectionAccounts = accounts.filter(
      acc => acc.bankConnectionId === parseInt(bankConnectionId)
    );

    // Store bank connection in Firestore - use correct interface

    const bankData = {
      finapiConnectionId: bankConnection.id?.toString() || bankConnectionId,
      bankId: bankConnection.bank?.id?.toString() || 'unknown',
      bankName: bankConnection.bank?.name || 'Unbekannte Bank',
      bankCode: bankConnection.bank?.blz || '',
      bic: bankConnection.bank?.bic || '',
      connectionStatus: 'active' as const,
      accountsCount: connectionAccounts.length, // Correct property name
      lastSync: new Date(), // Correct property name
      finapiUserId: finapiUserId, // Required property
      webFormId: webFormId || undefined,
      interfaces: [], // Simplified - will be handled separately
    };

    await storeBankConnection(userId, bankData);

    // Return success page that closes automatically
    const successHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bank erfolgreich verbunden</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #14ad9f 0%, #129488 100%);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 { margin: 0 0 1rem 0; }
        p { margin: 0.5rem 0; opacity: 0.9; }
        .countdown {
          font-weight: bold;
          color: #fff;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✅</div>
        <h1>Bank erfolgreich verbunden!</h1>
        <p><strong>${bankConnection.bank?.name || 'Bank'}</strong> wurde zu Ihrem Konto hinzugefügt.</p>
        <p>${connectionAccounts.length} Konten gefunden</p>
        <p>Dieses Fenster schließt sich in <span class="countdown" id="countdown">3</span> Sekunden...</p>
      </div>

      <script>
        let seconds = 3;
        const countdownEl = document.getElementById('countdown');

        const timer = setInterval(() => {
          seconds--;
          countdownEl.textContent = seconds;

          if (seconds <= 0) {
            clearInterval(timer);

            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'BANK_CONNECTION_SUCCESS',
                bankConnectionId: '${bankConnectionId}',
                bankName: '${bankConnection.bank?.name || 'Bank'}',
                accountCount: ${connectionAccounts.length}
              }, '*');
            }

            window.close();
          }
        }, 1000);

        // Also try to close immediately if parent exists
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({
              type: 'BANK_CONNECTION_SUCCESS',
              bankConnectionId: '${bankConnectionId}',
              bankName: '${bankConnection.bank?.name || 'Bank'}',
              accountCount: ${connectionAccounts.length}
            }, '*');
          }
          window.close();
        }, 100);
      </script>
    </body>
    </html>`;

    return new NextResponse(successHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {

    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fehler beim Speichern</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 { margin: 0 0 1rem 0; }
        p { margin: 0.5rem 0; opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">❌</div>
        <h1>Fehler beim Speichern</h1>
        <p>Die Bank-Verbindung konnte nicht gespeichert werden.</p>
        <p>Bitte versuchen Sie es erneut.</p>
      </div>

      <script>
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({
              type: 'BANK_CONNECTION_ERROR',
              error: 'Fehler beim Speichern der Bank-Verbindung'
            }, '*');
          }
          window.close();
        }, 3000);
      </script>
    </body>
    </html>`;

    return new NextResponse(errorHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// POST method for additional callback data
export async function POST(request: NextRequest) {
  return GET(request);
}
