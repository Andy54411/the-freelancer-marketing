import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    // Lösche alle Subcollections
    const subcollections = [
      'advertising_connections',
      'integration_requests',
      'auftraege',
      'quotes',
      'invoices',
      'customers',
      'expenses',
      'inventory',
      'timeEntries',
      'chats',
      'notifications',
      'escrowPayments',
    ];

    const batch = db.batch();
    
    // Lösche alle Dokumente in Subcollections
    for (const subcollection of subcollections) {
      const docs = await db
        .collection('companies')
        .doc(companyId)
        .collection(subcollection)
        .get();
      
      docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }

    // Lösche das Hauptdokument
    const companyRef = db.collection('companies').doc(companyId);
    batch.delete(companyRef);

    // Führe alle Löschungen aus
    await batch.commit();

    // Lösche auch den User aus der users Collection (falls vorhanden)
    try {
      const userRef = db.collection('users').doc(companyId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        await userRef.delete();
      }
    } catch (userError) {
      console.warn('User konnte nicht gelöscht werden:', userError);
    }

    return NextResponse.json({
      success: true,
      message: 'Unternehmen erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Unternehmens:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
