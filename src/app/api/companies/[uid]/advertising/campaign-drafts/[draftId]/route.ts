import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET - Einzelnen Kampagnenentwurf laden
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; draftId: string }> }
) {
  try {
    const { uid: companyId, draftId } = await params;

    if (!companyId || !draftId) {
      return NextResponse.json(
        { success: false, error: 'Company ID und Draft ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    const draftDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('campaign_drafts')
      .doc(draftId)
      .get();

    if (!draftDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Entwurf nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draftDoc.id,
        ...draftDoc.data(),
      },
    });
  } catch (error) {
    console.error('Fehler beim Laden des Kampagnenentwurfs:', error);
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
 * DELETE - Kampagnenentwurf loeschen
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; draftId: string }> }
) {
  try {
    const { uid: companyId, draftId } = await params;

    if (!companyId || !draftId) {
      return NextResponse.json(
        { success: false, error: 'Company ID und Draft ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    await db
      .collection('companies')
      .doc(companyId)
      .collection('campaign_drafts')
      .doc(draftId)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Entwurf geloescht',
    });
  } catch (error) {
    console.error('Fehler beim Loeschen des Kampagnenentwurfs:', error);
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
 * PATCH - Kampagnenentwurf aktualisieren
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; draftId: string }> }
) {
  try {
    const { uid: companyId, draftId } = await params;
    const body = await request.json();

    if (!companyId || !draftId) {
      return NextResponse.json(
        { success: false, error: 'Company ID und Draft ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    // Nur uebergebene Felder aktualisieren
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.objective !== undefined) updateData.objective = body.objective;
    if (body.budget !== undefined) updateData.budget = body.budget;
    if (body.step !== undefined) updateData.step = body.step;
    if (body.stepName !== undefined) updateData.stepName = body.stepName;
    if (body.data !== undefined) updateData.data = body.data;

    await db
      .collection('companies')
      .doc(companyId)
      .collection('campaign_drafts')
      .doc(draftId)
      .update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Entwurf aktualisiert',
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kampagnenentwurfs:', error);
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
