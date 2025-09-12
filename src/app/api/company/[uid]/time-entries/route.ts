import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * API Route für Zeiteinträge einer Company
 * GET /api/company/[uid]/time-entries
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid: companyId } = await params;
    const { searchParams } = new URL(request.url);

    // Optional: Filter nach Projekt-ID
    const projectId = searchParams.get('projectId');

    // Basis-Query für alle Zeiteinträge der Company
    let query = db.collection('timeEntries').where('companyId', '==', companyId);

    // Optional: Filter nach Projekt
    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }

    const snapshot = await query.get();

    const timeEntries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Konvertiere Firestore Timestamps zu ISO Strings
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        startTime: data.startTime?.toDate?.()?.toISOString() || data.startTime,
        endTime: data.endTime?.toDate?.()?.toISOString() || data.endTime,
      } as any; // Temporärer Fix für TypeScript
    });

    // Berechne Zusammenfassungen
    const totalEntries = timeEntries.length;
    const totalDuration = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalHours = Math.round((totalDuration / 60) * 100) / 100; // Minuten zu Stunden

    // Gruppiere nach Projekt
    const projectBreakdown: Record<string, any> = {};
    timeEntries.forEach(entry => {
      const projId = entry.projectId || 'no-project';
      if (!projectBreakdown[projId]) {
        projectBreakdown[projId] = {
          projectId: projId,
          projectName: entry.projectName || 'Kein Projekt',
          totalEntries: 0,
          totalDuration: 0,
          totalHours: 0,
          entries: [],
        };
      }

      projectBreakdown[projId].totalEntries++;
      projectBreakdown[projId].totalDuration += entry.duration || 0;
      projectBreakdown[projId].totalHours =
        Math.round((projectBreakdown[projId].totalDuration / 60) * 100) / 100;
      projectBreakdown[projId].entries.push(entry);
    });

    return NextResponse.json({
      success: true,
      count: totalEntries,
      totalDuration,
      totalHours,
      timeEntries,
      projectBreakdown,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load time entries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
