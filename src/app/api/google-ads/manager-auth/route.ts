import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/google-ads/callback'
);

export async function GET(_request: NextRequest) {
  const scopes = ['https://www.googleapis.com/auth/adwords'];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    login_hint: 'a.staudinger32@gmail.com',
    state: 'manager_token', // Marker dass das für Manager-Token ist
  });

  return NextResponse.redirect(authUrl);
}
