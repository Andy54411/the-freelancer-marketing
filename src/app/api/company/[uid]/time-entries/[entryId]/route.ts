import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

interface RouteParams {
  params: {
    uid: string;
    entryId: string;
  };
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { uid, entryId } = params;

    if (!uid || !entryId) {
      return NextResponse.json(
        { success: false, error: 'Company ID und Entry ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Firebase Admin initialisieren
    if (!db) {
      throw new Error('Firebase Admin konnte nicht initialisiert werden');
    }

    console.log('🗑️ DELETE Time Entry API:', { uid, entryId });

    // Prüfe ob der Zeiteintrag existiert und zur Company gehört
    const entryDoc = await db.collection('timeEntries').doc(entryId).get();
    
    if (!entryDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Zeiteintrag nicht gefunden' },
        { status: 404 }
      );
    }

    const entryData = entryDoc.data();
    
    // Sicherheitsprüfung: Gehört der Eintrag zur angegebenen Company?
    if (entryData?.companyId !== uid) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert, diesen Zeiteintrag zu löschen' },
        { status: 403 }
      );
    }

    // Lösche den Zeiteintrag
    await db.collection('timeEntries').doc(entryId).delete();

    console.log('✅ Zeiteintrag erfolgreich gelöscht:', entryId);

    return NextResponse.json({
      success: true,
      message: 'Zeiteintrag erfolgreich gelöscht',
      deletedEntryId: entryId
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen des Zeiteintrags:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Interner Serverfehler beim Löschen des Zeiteintrags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { uid, entryId } = params;
    const body = await request.json();

    if (!uid || !entryId) {
      return NextResponse.json(
        { success: false, error: 'Company ID und Entry ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Firebase Admin initialisieren
    if (!db) {
      throw new Error('Firebase Admin konnte nicht initialisiert werden');
    }

    console.log('✏️ PUT Time Entry API:', { uid, entryId, body });

    // Prüfe ob der Zeiteintrag existiert und zur Company gehört
    const entryDoc = await db.collection('timeEntries').doc(entryId).get();
    
    if (!entryDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Zeiteintrag nicht gefunden' },
        { status: 404 }
      );
    }

    const entryData = entryDoc.data();
    
    // Sicherheitsprüfung: Gehört der Eintrag zur angegebenen Company?
    if (entryData?.companyId !== uid) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert, diesen Zeiteintrag zu bearbeiten' },
        { status: 403 }
      );
    }

    // Aktualisiere den Zeiteintrag
    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('timeEntries').doc(entryId).update(updateData);

    // Hole die aktualisierten Daten
    const updatedDoc = await db.collection('timeEntries').doc(entryId).get();
    const updatedData = updatedDoc.data();

    console.log('✅ Zeiteintrag erfolgreich aktualisiert:', entryId);

    return NextResponse.json({
      success: true,
      message: 'Zeiteintrag erfolgreich aktualisiert',
      timeEntry: {
        id: entryId,
        ...updatedData
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Zeiteintrags:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Interner Serverfehler beim Aktualisieren des Zeiteintrags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
