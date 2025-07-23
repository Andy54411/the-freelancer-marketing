// API Route für Newsletter-Management mit Double-Opt-In
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsNewsletterManager } from '@/lib/google-workspace';
import { createPendingSubscription } from '@/lib/newsletter-double-opt-in';

// DSGVO-konforme Newsletter-Anmeldung mit Double-Opt-In
export async function POST(request: NextRequest) {
  try {
    const { email, name, preferences, source, consentGiven } = await request.json();

    // Für öffentliche Anmeldungen (Footer) speichern wir DSGVO-konform in Firestore
    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Validierung der E-Mail-Adresse
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    // DSGVO: Einverständnis muss explizit gegeben werden
    if (consentGiven !== true) {
      return NextResponse.json(
        {
          error: 'Einverständnis zur Datenverarbeitung erforderlich (DSGVO)',
        },
        { status: 400 }
      );
    }

    // IP-Adresse und User-Agent für DSGVO-Dokumentation
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Erstelle Newsletter-Anmeldung mit Double-Opt-In
    console.log('Newsletter API - Starte Anmeldung:', { email, name, source, consentGiven });

    const result = await createPendingSubscription(email, {
      name,
      source: source || 'website',
      preferences,
      ipAddress,
      userAgent,
    });

    console.log('Newsletter API - Ergebnis:', result);
    if (result.success) {
      console.log('Double-Opt-In Newsletter-Anmeldung erstellt:', {
        email,
        name: name || 'Unbekannt',
        source: source || 'Website',
        token: result.token?.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
        ipAddress,
        consentGiven: true,
      });

      return NextResponse.json({
        success: true,
        message:
          'Bestätigungs-E-Mail wurde versendet! Bitte prüfen Sie Ihr E-Mail-Postfach und bestätigen Sie Ihre Anmeldung.',
        requiresConfirmation: true,
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || 'Fehler bei der Anmeldung',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Newsletter API Fehler - Vollständiger Error:', error);
    console.error(
      'Newsletter API Fehler - Error Message:',
      error instanceof Error ? error.message : 'Unbekannter Fehler'
    );
    console.error(
      'Newsletter API Fehler - Error Stack:',
      error instanceof Error ? error.stack : 'Kein Stack verfügbar'
    );
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
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
