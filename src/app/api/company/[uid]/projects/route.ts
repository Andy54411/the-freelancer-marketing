import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * API Route für Projekte eines Unternehmens
 * GET /api/company/[uid]/projects - Alle Projekte laden
 * POST /api/company/[uid]/projects - Neues Projekt erstellen
 */

// GET - Alle Projekte eines Unternehmens laden
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // Projekte aus der companies/{companyId}/projects Collection laden
    const projectsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('projects')
      .orderBy('createdAt', 'desc')
      .get();

    const projects = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Firestore Timestamps zu ISO Strings konvertieren
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      startDate: doc.data().startDate || null,
      endDate: doc.data().endDate || null,
    }));

    return NextResponse.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Projekte konnten nicht geladen werden' }, { status: 500 });
  }
}

// POST - Neues Projekt erstellen
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID ist erforderlich' }, { status: 400 });
    }

    // Validierung der erforderlichen Felder
    if (!body.name || !body.client) {
      return NextResponse.json(
        { error: 'Projektname und Kunde sind erforderlich' },
        { status: 400 }
      );
    }

    // Neues Projekt-Dokument erstellen
    const projectData = {
      name: body.name,
      description: body.description || '',
      client: body.client,
      status: body.status || 'planning',
      budget: Number(body.budget) || 0,
      spent: Number(body.spent) || 0,
      hourlyRate: Number(body.hourlyRate) || 50,
      estimatedHours: Number(body.estimatedHours) || 0,
      trackedHours: Number(body.trackedHours) || 0,
      startDate: body.startDate || '',
      endDate: body.endDate || '',
      progress: Number(body.progress) || 0,
      teamMembers: body.teamMembers || [],
      tags: body.tags || [],
      companyId: companyId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Projekt in Firestore speichern
    const projectRef = await db
      .collection('companies')
      .doc(companyId)
      .collection('projects')
      .add(projectData);

    // Erstelltes Projekt zurückgeben
    const createdProject = {
      id: projectRef.id,
      ...projectData,
      // Timestamps zu ISO Strings konvertieren
      createdAt: projectData.createdAt.toDate().toISOString(),
      updatedAt: projectData.updatedAt.toDate().toISOString(),
    };

    return NextResponse.json({
      success: true,
      project: createdProject,
      message: 'Projekt erfolgreich erstellt',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Projekt konnte nicht erstellt werden' }, { status: 500 });
  }
}
