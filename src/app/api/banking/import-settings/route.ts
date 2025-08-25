import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

interface ImportSettings {
  automaticSync: boolean;
  syncFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  categorizeTransactions: boolean;
  reconcileAutomatically: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {

      return NextResponse.json(
        { success: false, error: 'User ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe Firebase-Verbindung
    if (!db) {

      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Lade Einstellungen aus Firestore mit Admin SDK
    const settingsDocRef = db.collection('banking_import_settings').doc(userId);
    const settingsDoc = await settingsDocRef.get();

    if (settingsDoc.exists) {
      const settings = settingsDoc.data() as ImportSettings;

      return NextResponse.json({
        success: true,
        settings: settings
      });
    } else {

      // Standard-Einstellungen zurückgeben
      const defaultSettings: ImportSettings = {
        automaticSync: true,
        syncFrequency: 'DAILY',
        categorizeTransactions: true,
        reconcileAutomatically: false,
      };

      return NextResponse.json({
        success: true,
        settings: defaultSettings
      });
    }
  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der Einstellungen: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, settings } = body;

    if (!userId) {

      return NextResponse.json(
        { success: false, error: 'User ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!settings) {

      return NextResponse.json(
        { success: false, error: 'Einstellungen sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe Firebase-Verbindung
    if (!db) {

      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Validiere Einstellungen
    const validatedSettings: ImportSettings = {
      automaticSync: Boolean(settings.automaticSync),
      syncFrequency: ['HOURLY', 'DAILY', 'WEEKLY'].includes(settings.syncFrequency)
        ? settings.syncFrequency
        : 'DAILY',
      categorizeTransactions: Boolean(settings.categorizeTransactions),
      reconcileAutomatically: Boolean(settings.reconcileAutomatically),
    };

    // Speichere in Firestore mit Admin SDK und Zeitstempel
    const settingsWithTimestamp = {
      ...validatedSettings,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp() // Wird nur beim ersten Mal gesetzt
    };

    const settingsDocRef = db.collection('banking_import_settings').doc(userId);
    await settingsDocRef.set(settingsWithTimestamp, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Einstellungen erfolgreich gespeichert',
      settings: validatedSettings
    });

  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern der Einstellungen: ' + (error as Error).message
      },
      { status: 500 }
    );
  }
}
