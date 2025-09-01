import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * API Route für einzelne Projekte
 * GET /api/company/[uid]/projects/[projectId] - Einzelnes Projekt laden
 * PUT /api/company/[uid]/projects/[projectId] - Projekt aktualisieren
 * DELETE /api/company/[uid]/projects/[projectId] - Projekt löschen
 */

// GET - Einzelnes Projekt laden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; projectId: string }> }
) {
  try {
    const { uid: companyId, projectId } = await params;

    if (!companyId || !projectId) {
      return NextResponse.json(
        { error: 'Company ID und Project ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Projekt aus Firestore laden
    const projectDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('projects')
      .doc(projectId)
      .get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const project = {
      id: projectDoc.id,
      ...projectData,
      // Firestore Timestamps zu ISO Strings konvertieren
      createdAt: projectData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: projectData?.updatedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('🚨 Error loading project:', error);
    return NextResponse.json({ error: 'Projekt konnte nicht geladen werden' }, { status: 500 });
  }
}

// PUT - Projekt aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; projectId: string }> }
) {
  try {
    const { uid: companyId, projectId } = await params;
    const body = await request.json();

    if (!companyId || !projectId) {
      return NextResponse.json(
        { error: 'Company ID und Project ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Aktualisierte Projekt-Daten vorbereiten
    const updateData = {
      ...body,
      updatedAt: Timestamp.now(),
      // Numerische Werte konvertieren
      budget: body.budget ? Number(body.budget) : undefined,
      spent: body.spent ? Number(body.spent) : undefined,
      hourlyRate: body.hourlyRate ? Number(body.hourlyRate) : undefined,
      estimatedHours: body.estimatedHours ? Number(body.estimatedHours) : undefined,
      trackedHours: body.trackedHours ? Number(body.trackedHours) : undefined,
      progress: body.progress ? Number(body.progress) : undefined,
    };

    // Undefined Werte entfernen
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Projekt in Firestore aktualisieren
    await db
      .collection('companies')
      .doc(companyId)
      .collection('projects')
      .doc(projectId)
      .update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Projekt erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('🚨 Error updating project:', error);
    return NextResponse.json(
      { error: 'Projekt konnte nicht aktualisiert werden' },
      { status: 500 }
    );
  }
}

// DELETE - Projekt löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; projectId: string }> }
) {
  try {
    const { uid: companyId, projectId } = await params;

    if (!companyId || !projectId) {
      return NextResponse.json(
        { error: 'Company ID und Project ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Projekt aus Firestore löschen
    await db.collection('companies').doc(companyId).collection('projects').doc(projectId).delete();

    return NextResponse.json({
      success: true,
      message: 'Projekt erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('🚨 Error deleting project:', error);
    return NextResponse.json({ error: 'Projekt konnte nicht gelöscht werden' }, { status: 500 });
  }
}
