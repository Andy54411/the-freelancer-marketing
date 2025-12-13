'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

interface TimeEntry {
  id: string;
  companyId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  breakTime: number;
  description: string;
  status: string;
  projectName?: string | null;
}

/**
 * GET /api/companies/[uid]/employees/time-entries
 * Holt Zeiteinträge für einen Mitarbeiter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Database nicht verfügbar' },
        { status: 500 }
      );
    }

    const { uid: companyId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    console.log('📋 TimeEntries GET:', { companyId, employeeId, startDate, endDate, status });

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter-ID erforderlich' },
        { status: 400 }
      );
    }

    // Einfache Query ohne orderBy (um Index-Probleme zu vermeiden)
    let query: FirebaseFirestore.Query = adminDb
      .collection('companies')
      .doc(companyId)
      .collection('timeEntries')
      .where('employeeId', '==', employeeId);

    // Nur Date-Filter hinzufügen wenn angegeben
    if (startDate && endDate) {
      query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    console.log('📋 Found documents:', snapshot.docs.length);

    const entries: TimeEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📋 Entry:', doc.id, data);
      return {
        id: doc.id,
        companyId: data.companyId || companyId,
        employeeId: data.employeeId || employeeId,
        date: data.date || '',
        startTime: data.startTime || '',
        endTime: data.endTime || null,
        duration: data.duration || null,
        breakTime: data.breakTime || 0,
        description: data.description || '',
        status: data.status || 'ACTIVE',
        projectName: data.projectName || null,
      };
    });

    // Sortiere im Code statt in Firestore
    entries.sort((a, b) => b.date.localeCompare(a.date));
    
    // Limitiere auf 100
    const limitedEntries = entries.slice(0, 100);

    // Berechne Zusammenfassung
    const totalMinutes = limitedEntries.reduce((sum, entry) => {
      return sum + (entry.duration || 0);
    }, 0);

    const totalBreakMinutes = limitedEntries.reduce((sum, entry) => {
      return sum + (entry.breakTime || 0);
    }, 0);

    console.log('📋 Returning', limitedEntries.length, 'entries');

    return NextResponse.json({
      success: true,
      entries: limitedEntries,
      summary: {
        totalEntries: entries.length,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        totalBreakHours: Math.round((totalBreakMinutes / 60) * 100) / 100,
        workingHours: Math.round(((totalMinutes - totalBreakMinutes) / 60) * 100) / 100,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Fehler beim Laden'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[uid]/employees/time-entries
 * Erstellt einen neuen Zeiteintrag (Clock In/Out)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Database nicht verfügbar' },
        { status: 500 }
      );
    }

    const { uid: companyId } = await params;
    const body = await request.json();
    const { action, employeeId, projectName, description, location } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter-ID erforderlich' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    if (action === 'clock-in') {
      // Prüfe ob bereits eingecheckt
      const activeEntrySnapshot = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('timeEntries')
        .where('employeeId', '==', employeeId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (!activeEntrySnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Es gibt bereits einen aktiven Zeiteintrag' },
          { status: 400 }
        );
      }

      // Erstelle neuen Eintrag
      const entryData = {
        companyId,
        employeeId,
        projectName: projectName || null,
        date: today,
        startTime: currentTime,
        endTime: null,
        duration: null,
        breakTime: 0,
        description: description || '',
        location: location || null,
        category: 'WORK',
        status: 'ACTIVE',
        isManual: false,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('timeEntries')
        .add(entryData);

      return NextResponse.json({
        success: true,
        message: 'Erfolgreich eingestempelt',
        entry: {
          id: docRef.id,
          ...entryData,
        },
      });
    } else if (action === 'clock-out') {
      // Finde aktiven Eintrag
      const activeEntrySnapshot = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('timeEntries')
        .where('employeeId', '==', employeeId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (activeEntrySnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Kein aktiver Zeiteintrag gefunden' },
          { status: 400 }
        );
      }

      const entryDoc = activeEntrySnapshot.docs[0];
      const entryData = entryDoc.data();

      // Berechne Dauer
      const startTime = new Date(`${entryData.date}T${entryData.startTime}`);
      const endTime = now;
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      await entryDoc.ref.update({
        endTime: currentTime,
        duration: durationMinutes,
        status: 'COMPLETED',
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        message: 'Erfolgreich ausgestempelt',
        entry: {
          id: entryDoc.id,
          ...entryData,
          endTime: currentTime,
          duration: durationMinutes,
          status: 'COMPLETED',
        },
        summary: {
          totalMinutes: durationMinutes,
          totalHours: Math.round((durationMinutes / 60) * 100) / 100,
        },
      });
    } else if (action === 'break-start') {
      // Pausenbeginn markieren
      const activeEntrySnapshot = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('timeEntries')
        .where('employeeId', '==', employeeId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (activeEntrySnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Kein aktiver Zeiteintrag gefunden' },
          { status: 400 }
        );
      }

      await activeEntrySnapshot.docs[0].ref.update({
        breakStartTime: currentTime,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        message: 'Pause gestartet',
      });
    } else if (action === 'break-end') {
      // Pausenende markieren
      const activeEntrySnapshot = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('timeEntries')
        .where('employeeId', '==', employeeId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (activeEntrySnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Kein aktiver Zeiteintrag gefunden' },
          { status: 400 }
        );
      }

      const entryDoc = activeEntrySnapshot.docs[0];
      const entryData = entryDoc.data();

      if (!entryData.breakStartTime) {
        return NextResponse.json(
          { success: false, error: 'Keine aktive Pause gefunden' },
          { status: 400 }
        );
      }

      const breakStart = new Date(`${entryData.date}T${entryData.breakStartTime}`);
      const breakEnd = now;
      const breakMinutes = Math.round((breakEnd.getTime() - breakStart.getTime()) / 60000);

      await entryDoc.ref.update({
        breakStartTime: null,
        breakTime: (entryData.breakTime || 0) + breakMinutes,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        message: 'Pause beendet',
        breakMinutes,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Ungültige Aktion' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Fehler beim Speichern'
      },
      { status: 500 }
    );
  }
}
