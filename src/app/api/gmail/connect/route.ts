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
    const popup = searchParams.get('popup'); // Wenn true, wird Callback als Popup behandelt

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
    }

    // Scopes für Gmail + Drive + Photos Picker + Kontakte Zugriff
    // WICHTIG: photoslibrary.readonly wurde am 31.03.2025 von Google entfernt!
    // Stattdessen: photospicker.mediaitems.readonly für die neue Picker API
    // KRITISCH: https://mail.google.com/ ist nötig für PERMANENTES Löschen von E-Mails!
    const scopes = [
      'https://mail.google.com/', // VOLLZUGRIFF - nötig für permanentes Löschen!
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send', // E-Mails senden
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/drive.readonly', // Google Drive Dateien lesen
      'https://www.googleapis.com/auth/photospicker.mediaitems.readonly', // Google Photos Picker (neue API ab 2025)
      'https://www.googleapis.com/auth/contacts.readonly', // Google Kontakte lesen für Autovervollständigung
    ];

    // State enthält companyId, optional userId und popup-Flag (getrennt durch "|")
    // Format: "companyId" oder "companyId|userId" oder "companyId||popup" oder "companyId|userId|popup"
    let stateData = uid;
    if (userId && userId !== uid) {
      stateData = `${uid}|${userId}`;
    }
    if (popup === 'true') {
      stateData = stateData.includes('|') ? `${stateData}|popup` : `${uid}||popup`;
    }

    // Erstelle Google Auth URL mit korrektiger Redirect URI
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: stateData, // CompanyId und optional UserId als State parameter
      prompt: 'consent', // KRITISCH: Immer neue Genehmigung anfordern
      include_granted_scopes: false, // KRITISCH: Alte Scopes NICHT inkludieren - nur die neuen!
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