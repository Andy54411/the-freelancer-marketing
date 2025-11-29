import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/google-ads/manager-callback'
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Kein Authorization Code erhalten' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

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
              <strong>📝 Nächster Schritt:</strong><br>
              Fügen Sie diesen Refresh Token zu Ihrer <code>.env.local</code> Datei hinzu:
            </div>

            <div class="token-box">
              <strong>GOOGLE_ADS_REFRESH_TOKEN=</strong>${tokens.refresh_token}
            </div>

            <div class="instructions">
              <strong>⚠️ Wichtig:</strong>
              <ul>
                <li>Starten Sie den Development-Server neu nach dem Hinzufügen</li>
                <li>Bewahren Sie diesen Token sicher auf</li>
                <li>Dieser Token wird verwendet, um Einladungen vom Manager-Account zu senden</li>
              </ul>
            </div>

            <p><strong>Manager Account ID:</strong> 655-923-8498</p>
            <p><strong>Email:</strong> a.staudinger32@gmail.com</p>
          </div>
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
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Token-Austausch',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
