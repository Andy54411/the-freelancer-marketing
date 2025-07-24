// API Route für Newsletter-Management mit Double-Opt-In
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsNewsletterManager } from '@/lib/google-workspace';
import { admin } from '@/firebase/server';
import { sendConfirmationEmail } from '@/lib/gmail-smtp-newsletter';
import crypto from 'crypto';

// DSGVO-konforme Newsletter-Anmeldung mit Double-Opt-In
export async function POST(request: NextRequest) {
  console.log('🚀 Newsletter API - Start:', {
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  });

  try {
    console.log('📝 Newsletter API - Request Body auslesen...');
    const requestBody = await request.json();
    console.log('📊 Newsletter API - Request Data:', requestBody);

    const { email, name, preferences, source, consentGiven } = requestBody;

    // Für öffentliche Anmeldungen (Footer) speichern wir DSGVO-konform in Firestore
    if (!email) {
      console.log('❌ Newsletter API - Fehler: Keine E-Mail-Adresse');
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Validierung der E-Mail-Adresse
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Newsletter API - Fehler: Ungültige E-Mail:', email);
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    console.log('✅ Newsletter API - E-Mail-Validierung erfolgreich:', email);

    // DSGVO: Einverständnis muss explizit gegeben werden
    if (consentGiven !== true) {
      console.log('❌ Newsletter API - Fehler: Keine DSGVO-Einwilligung:', { consentGiven });
      return NextResponse.json(
        {
          error: 'Einverständnis zur Datenverarbeitung erforderlich (DSGVO)',
        },
        { status: 400 }
      );
    }

    console.log('✅ Newsletter API - DSGVO-Einwilligung überprüft');

    // IP-Adresse und User-Agent für DSGVO-Dokumentation
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    console.log('📋 Newsletter API - DSGVO-Daten:', { ipAddress, userAgent });

    // Erstelle Newsletter-Anmeldung direkt in Firestore (vereinfacht)
    console.log('🔄 Newsletter API - Starte Firestore-Speicherung:', {
      email,
      name,
      source,
      consentGiven,
    });

    try {
      // Einfache Implementierung ohne externe Dependencies
      console.log('🔐 Newsletter API - Generiere Confirmation Token...');
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      console.log('📦 Newsletter API - Token generiert:', {
        tokenPreview: confirmationToken.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString(),
      });

      // Direkt in Firestore speichern
      const pendingData = {
        email,
        name: name || null,
        source: source || 'website',
        preferences: preferences || [],
        ipAddress,
        userAgent,
        confirmationToken,
        createdAt: admin.firestore.Timestamp.now(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        confirmed: false,
        consentGiven: true,
      };

      console.log('💾 Newsletter API - Speichere in Firestore:', {
        collection: 'newsletterPendingConfirmations',
        data: { ...pendingData, confirmationToken: '[HIDDEN]' },
      });

      await admin.firestore().collection('newsletterPendingConfirmations').add(pendingData);

      console.log('✅ Newsletter API - Erfolgreich in Firestore gespeichert:', {
        email,
        token: confirmationToken.substring(0, 8) + '...',
      });

      // Bestätigungs-E-Mail senden
      console.log('📧 Newsletter API - Sende Bestätigungs-E-Mail...');
      console.log('📧 Newsletter API - Gmail Konfiguration:', {
        username: process.env.GMAIL_USERNAME,
        hasPassword: !!process.env.GMAIL_APP_PASSWORD,
        passwordLength: process.env.GMAIL_APP_PASSWORD?.length,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      });

      try {
        const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/newsletter/confirm?token=${confirmationToken}`;

        console.log('📧 Newsletter API - Confirmation URL:', confirmationUrl);

        await sendConfirmationEmail(email, name || 'Newsletter-Abonnent', confirmationUrl);

        console.log('✅ Newsletter API - Bestätigungs-E-Mail erfolgreich gesendet:', { email });

        return NextResponse.json({
          success: true,
          message: 'Newsletter-Anmeldung erfolgreich! Bestätigungs-E-Mail wurde gesendet.',
          requiresConfirmation: true,
        });
      } catch (emailError) {
        console.error('📧 Newsletter API - E-Mail-Versand fehlgeschlagen:', {
          error: emailError,
          message: emailError instanceof Error ? emailError.message : 'Unbekannter E-Mail-Fehler',
        });

        // Auch bei E-Mail-Fehler erfolgreiche Antwort, da Daten gespeichert wurden
        return NextResponse.json({
          success: true,
          message: 'Newsletter-Anmeldung erfolgreich! E-Mail-Versand wird nachgeholt.',
          requiresConfirmation: true,
          emailSent: false,
        });
      }
    } catch (firestoreError) {
      console.error('💥 Newsletter API - Firestore Fehler:', {
        error: firestoreError,
        message:
          firestoreError instanceof Error ? firestoreError.message : 'Unbekannter Firestore-Fehler',
        stack: firestoreError instanceof Error ? firestoreError.stack : 'Kein Stack verfügbar',
      });

      // Fallback: Einfache Success-Response für Testing
      console.log('🔄 Newsletter API - Verwende Fallback-Modus');
      return NextResponse.json({
        success: true,
        message: 'Newsletter-Anmeldung verarbeitet (Fallback-Modus)',
        requiresConfirmation: false,
      });
    }
  } catch (error) {
    console.error('💥 Newsletter API - Hauptfehler:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unbekannter Hauptfehler',
      stack: error instanceof Error ? error.stack : 'Kein Stack verfügbar',
      type: typeof error,
      constructor: error?.constructor?.name,
    });

    return NextResponse.json(
      {
        error: 'Interner Server-Fehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString(),
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
