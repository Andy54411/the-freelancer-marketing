// Google OAuth Callback Handler für Newsletter-System
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/google-workspace';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Fehler beim OAuth-Flow
    if (error) {
      console.error('Google OAuth Fehler:', error);
      const errorMessage = encodeURIComponent('Google Authentifizierung fehlgeschlagen');
      return NextResponse.redirect(`/dashboard/admin/newsletter?error=${errorMessage}`);
    }

    // Authorization Code fehlt
    if (!code) {
      const errorMessage = encodeURIComponent('Kein Authorization Code erhalten');
      return NextResponse.redirect(`/dashboard/admin/newsletter?error=${errorMessage}`);
    }

    // Access Token abrufen
    const tokens = await getAccessToken(code);

    if (!tokens.access_token) {
      const errorMessage = encodeURIComponent('Fehler beim Erhalt der Access Tokens');
      return NextResponse.redirect(`/dashboard/admin/newsletter?error=${errorMessage}`);
    }

    // Erfolgreiche Authentifizierung - Redirect mit Tokens
    const successUrl = new URL('/dashboard/admin/newsletter', request.url);
    successUrl.searchParams.set('google_auth', 'success');
    successUrl.searchParams.set('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      successUrl.searchParams.set('refresh_token', tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      successUrl.searchParams.set('expiry_date', tokens.expiry_date.toString());
    }

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error('Google Callback Fehler:', error);
    const errorMessage = encodeURIComponent('Interner Server-Fehler bei Google Authentifizierung');
    return NextResponse.redirect(`/dashboard/admin/newsletter?error=${errorMessage}`);
  }
}
