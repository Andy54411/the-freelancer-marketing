import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { admin, db } from '@/firebase/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
    }

    // Scopes für Gmail Zugriff
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    // Erstelle Google Auth URL mit korrektiger Redirect URI
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: uid, // CompanyId als State parameter
      prompt: 'consent'
    });

    console.log('🔄 Redirecting to Google OAuth:', authUrl);
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('Gmail Connect Fehler:', error);
    
    // Zur Error-Seite mit Fehlermeldung
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid') || '';
    const errorUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${uid}/email-integration?error=connection_failed`;
    return NextResponse.redirect(errorUrl);
  }
}