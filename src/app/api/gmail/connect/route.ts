import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid'); // companyId
    const userId = searchParams.get('userId'); // Die tatsächliche User-ID (kann Mitarbeiter sein)

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
    }

    // Scopes für Gmail + Drive + Photos Zugriff
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send', // E-Mails senden
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive.readonly', // Google Drive Dateien lesen
      'https://www.googleapis.com/auth/photoslibrary.readonly', // Google Photos lesen
    ];

    // State enthält sowohl companyId als auch userId (getrennt durch "|")
    const stateData = userId && userId !== uid ? `${uid}|${userId}` : uid;

    // Erstelle Google Auth URL mit korrektiger Redirect URI
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: stateData, // CompanyId und optional UserId als State parameter
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