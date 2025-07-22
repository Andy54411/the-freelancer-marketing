// API Route für Google Workspace Newsletter-Management
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsNewsletterManager } from '@/lib/google-workspace';

// Vereinfachter Endpunkt für öffentliche Newsletter-Anmeldungen
export async function POST(request: NextRequest) {
  try {
    const { email, name, preferences, source } = await request.json();

    // Für öffentliche Anmeldungen (Footer) verwenden wir Service Account Credentials
    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Validierung der E-Mail-Adresse
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    // Service Account für öffentliche Anmeldungen
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!serviceAccountEmail || !serviceAccountKey) {
      console.error('Google Service Account nicht konfiguriert');
      return NextResponse.json({ error: 'Newsletter-Service nicht verfügbar' }, { status: 503 });
    }

    // Für jetzt speichern wir in einer einfachen Liste (kann später erweitert werden)
    // TODO: Implementierung mit Service Account oder anderer Speichermethode

    // Temporäre Lösung: Log für Admin-Review
    console.log('Newsletter-Anmeldung:', {
      email,
      name: name || 'Unbekannt',
      source: source || 'Website',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Newsletter-Anmeldung erfolgreich!',
    });
  } catch (error) {
    console.error('Newsletter API Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

// Admin-Endpunkt mit Google Workspace Integration
export async function PUT(request: NextRequest) {
  try {
    const { action, email, name, preferences, accessToken, refreshToken, spreadsheetId } =
      await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access Token erforderlich' }, { status: 401 });
    }

    const sheetsManager = new GoogleSheetsNewsletterManager(accessToken, refreshToken);

    switch (action) {
      case 'subscribe':
        if (!email) {
          return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
        }

        const result = await sheetsManager.addSubscriber(
          spreadsheetId || process.env.GOOGLE_SHEETS_NEWSLETTER_ID!,
          email,
          name,
          preferences
        );

        return NextResponse.json(result);

      case 'getSubscribers':
        const subscribers = await sheetsManager.getSubscribers(
          spreadsheetId || process.env.GOOGLE_SHEETS_NEWSLETTER_ID!
        );

        return NextResponse.json({ success: true, subscribers });

      case 'createSpreadsheet':
        const createResult = await sheetsManager.createNewsletterSpreadsheet();
        return NextResponse.json(createResult);

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }
  } catch (error) {
    console.error('Newsletter API Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const spreadsheetId = searchParams.get('spreadsheetId');

    if (!accessToken) {
      return NextResponse.json({ error: 'Access Token erforderlich' }, { status: 401 });
    }

    const sheetsManager = new GoogleSheetsNewsletterManager(accessToken, refreshToken || undefined);
    const subscribers = await sheetsManager.getSubscribers(
      spreadsheetId || process.env.GOOGLE_SHEETS_NEWSLETTER_ID!
    );

    return NextResponse.json({ success: true, subscribers });
  } catch (error) {
    console.error('Newsletter GET API Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
