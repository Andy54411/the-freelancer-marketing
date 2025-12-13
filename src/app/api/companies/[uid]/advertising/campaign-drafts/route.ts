import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET - Liste alle Kampagnenentwuerfe fuer eine Company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    // Lade Kampagnenentwuerfe aus der Subcollection
    const draftsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('campaign_drafts')
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();

    const drafts = draftsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      drafts,
      count: drafts.length,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Kampagnenentwuerfe:', error);
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

/**
 * POST - Neuen Kampagnenentwurf erstellen oder aktualisieren
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    const {
      id,
      name,
      type,
      objective,
      budget,
      step,
      stepName,
      data,
    } = body;

    const now = new Date().toISOString();

    const draftData = {
      name: name || 'Unbenannter Entwurf',
      type: type || 'PERFORMANCE_MAX',
      objective: objective || '',
      budget: budget || null,
      step: step || 1,
      stepName: stepName || 'Ziel auswaehlen',
      data: data || {},
      updatedAt: now,
    };

    let draftId = id;

    if (id) {
      // Bestehenden Entwurf aktualisieren
      await db
        .collection('companies')
        .doc(companyId)
        .collection('campaign_drafts')
        .doc(id)
        .update(draftData);
    } else {
      // Neuen Entwurf erstellen
      const docRef = await db
        .collection('companies')
        .doc(companyId)
        .collection('campaign_drafts')
        .add({
          ...draftData,
          createdAt: now,
        });
      draftId = docRef.id;
    }

    return NextResponse.json({
      success: true,
      message: id ? 'Entwurf aktualisiert' : 'Entwurf erstellt',
      draftId,
    });
  } catch (error) {
    console.error('Fehler beim Speichern des Kampagnenentwurfs:', error);
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
