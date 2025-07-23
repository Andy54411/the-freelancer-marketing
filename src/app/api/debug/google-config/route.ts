// Debug API für Google Workspace Konfiguration
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = {
      CLIENT_ID: process.env.GOOGLE_WORKSPACE_CLIENT_ID ? 'GESETZT' : 'FEHLT',
      CLIENT_SECRET: process.env.GOOGLE_WORKSPACE_CLIENT_SECRET ? 'GESETZT' : 'FEHLT',
      REDIRECT_URI: process.env.GOOGLE_WORKSPACE_REDIRECT_URI || 'STANDARD WIRD VERWENDET',
      SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'GESETZT' : 'FEHLT',
      SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'GESETZT' : 'FEHLT',
      NEWSLETTER_FROM_EMAIL: process.env.NEWSLETTER_FROM_EMAIL || 'STANDARD WIRD VERWENDET',
      NEWSLETTER_FROM_NAME: process.env.NEWSLETTER_FROM_NAME || 'STANDARD WIRD VERWENDET',
    };

    return NextResponse.json({
      success: true,
      config,
      recommendations: [
        config.CLIENT_ID === 'FEHLT' ? 'GOOGLE_WORKSPACE_CLIENT_ID setzen' : null,
        config.CLIENT_SECRET === 'FEHLT' ? 'GOOGLE_WORKSPACE_CLIENT_SECRET setzen' : null,
        config.SERVICE_ACCOUNT_EMAIL === 'FEHLT' ? 'GOOGLE_SERVICE_ACCOUNT_EMAIL setzen' : null,
        config.SERVICE_ACCOUNT_KEY === 'FEHLT' ? 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY setzen' : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('Google Config Debug Fehler:', error);
    return NextResponse.json({ error: 'Debug fehlgeschlagen' }, { status: 500 });
  }
}
