import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Multi-Tenant Google Ads OAuth für Kunden-Konten
    // Verwende die Web Client ID die für localhost konfiguriert sein könnte
    const taskiloGoogleClientId = process.env.GOOGLE_CLIENT_ID || 
                                  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
                                  '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com';
    
    if (!taskiloGoogleClientId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Google Client ID fehlt',
          message: 'Bitte GOOGLE_CLIENT_ID in .env.local setzen'
        },
        { status: 500 }
      );
    }

    // Für Development: localhost, für Production: taskilo.de
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de');
    
    const redirectUri = `${baseUrl}/api/google-ads/callback`;
    
    // OAuth-Scopes für Gmail (funktioniert bereits)
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid'
    ].join(' ');
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${taskiloGoogleClientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&state=${companyId}&access_type=offline&prompt=consent`;

    // DIREKTE WEITERLEITUNG statt JSON Response
    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('Fehler bei Google Ads Auth:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei Google Ads Authorization',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}