import { NextRequest, NextResponse } from 'next/server';

/**
 * finAPI Error Callback Handler
 *
 * Behandlung von fehlgeschlagenen Bank-Verbindungen
 */
export async function GET(request: NextRequest) {
  try {
    console.log('❌ finAPI Error Callback aufgerufen');

    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const userId = searchParams.get('userId');

    console.log('Error Callback Parameters:', { error, errorDescription, userId });

    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bank-Verbindung fehlgeschlagen</title>
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
          max-width: 500px;
        }
        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 { margin: 0 0 1rem 0; }
        p { margin: 0.5rem 0; opacity: 0.9; line-height: 1.5; }
        .error-details {
          background: rgba(0, 0, 0, 0.2);
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
          font-size: 0.9rem;
        }
        .countdown {
          font-weight: bold;
          color: #fff;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">⚠️</div>
        <h1>Bank-Verbindung fehlgeschlagen</h1>
        <p>Die Verbindung zu Ihrer Bank konnte nicht hergestellt werden.</p>
        
        ${
          error || errorDescription
            ? `
        <div class="error-details">
          <strong>Fehlerdetails:</strong><br>
          ${error || 'Unbekannter Fehler'}<br>
          ${errorDescription || ''}
        </div>
        `
            : ''
        }
        
        <p>Mögliche Ursachen:</p>
        <p>• Falsche Anmeldedaten<br>
        • Bank wird nicht unterstützt<br>
        • Temporäre Verbindungsprobleme</p>
        
        <p>Dieses Fenster schließt sich in <span class="countdown" id="countdown">5</span> Sekunden...</p>
      </div>
      
      <script>
        let seconds = 5;
        const countdownEl = document.getElementById('countdown');
        
        const timer = setInterval(() => {
          seconds--;
          countdownEl.textContent = seconds;
          
          if (seconds <= 0) {
            clearInterval(timer);
            
            // Send error message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'BANK_CONNECTION_ERROR',
                error: '${error || 'Bank-Verbindung fehlgeschlagen'}',
                errorDescription: '${errorDescription || ''}'
              }, '*');
            }
            
            window.close();
          }
        }, 1000);
        
        // Also try to close immediately if parent exists
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({
              type: 'BANK_CONNECTION_ERROR',
              error: '${error || 'Bank-Verbindung fehlgeschlagen'}',
              errorDescription: '${errorDescription || ''}'
            }, '*');
          }
          window.close();
        }, 100);
      </script>
    </body>
    </html>`;

    return new NextResponse(errorHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('❌ Callback error handler error:', error);

    return new NextResponse(
      '<html><body><h1>Kritischer Fehler</h1><p>Callback-Handler fehlgeschlagen</p><script>window.close();</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// POST method for additional callback data
export async function POST(request: NextRequest) {
  return GET(request);
}
