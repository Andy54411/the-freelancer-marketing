import { NextRequest, NextResponse } from 'next/server';

/**
 * 🚀 KORREKTER Google Ads OAuth-Flow
 * GET /api/multi-platform-advertising/auth/google-ads
 * 
 * Leitet Benutzer zu Google OAuth weiter, wo sie ihr Google Ads Konto auswählen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'Company ID ist erforderlich'
      }, { status: 400 });
    }

    // Google OAuth-Parameter für Google Ads
    // Verwende die bereits konfigurierte Google Client ID
    const googleClientId = process.env.GOOGLE_CLIENT_ID || 
                           process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
                           '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com';

    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de');

    const googleAuthParams = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: `${baseUrl}/api/multi-platform-advertising/auth/google-ads/callback`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords', // Google Ads Berechtigung
      access_type: 'offline',
      prompt: 'consent',
      state: companyId, // CompanyId für Callback
      include_granted_scopes: 'true'
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${googleAuthParams}`;

    console.log('🔗 Redirecting to Google OAuth:', googleAuthUrl);

    // Weiterleitung zu Google OAuth
    return NextResponse.redirect(googleAuthUrl);

  } catch (error) {
    console.error('❌ Google OAuth redirect failed:', error);
    return NextResponse.json({
      success: false,
      error: 'OAuth-Weiterleitung fehlgeschlagen',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}