'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

interface Shift {
  id: string;
  companyId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  department: string;
  notes: string;
  status: string;
  confirmedAt?: string | null;
}

/**
 * GET /api/companies/[uid]/employees/schedule
 * Holt den Dienstplan für einen Mitarbeiter
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
    const weekNumber = searchParams.get('week');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter-ID erforderlich' },
        { status: 400 }
      );
    }

    // Berechne Start/End für die Woche falls angegeben
    let queryStartDate = startDate;
    let queryEndDate = endDate;

    if (weekNumber && !startDate && !endDate) {
      const year = new Date().getFullYear();
      const weekNum = parseInt(weekNumber);
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (weekNum - 1) * 7;
      const startOfWeek = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      
      // Finde den Montag der Woche
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      queryStartDate = startOfWeek.toISOString().split('T')[0];
      queryEndDate = endOfWeek.toISOString().split('T')[0];
    }

    // Falls keine Datumsangaben, nehme aktuelle Woche
    if (!queryStartDate) {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      queryStartDate = monday.toISOString().split('T')[0];
      queryEndDate = sunday.toISOString().split('T')[0];
    }

    let query: FirebaseFirestore.Query = adminDb
      .collection('companies')
      .doc(companyId)
      .collection('shifts')
      .where('employeeId', '==', employeeId);

    if (queryStartDate) {
      query = query.where('date', '>=', queryStartDate);
    }
    if (queryEndDate) {
      query = query.where('date', '<=', queryEndDate);
    }

    const snapshot = await query.orderBy('date', 'asc').get();

    const shifts: Shift[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        companyId: data.companyId || companyId,
        employeeId: data.employeeId || employeeId,
        date: data.date || '',
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        position: data.position || '',
        department: data.department || '',
        notes: data.notes || '',
        status: data.status || 'SCHEDULED',
        confirmedAt: data.confirmedAt || null,
      };
    });

    // Berechne Gesamtarbeitszeit
    const totalMinutes = shifts.reduce((sum, shift) => {
      if (shift.startTime && shift.endTime) {
        const start = new Date(`2000-01-01T${shift.startTime}`);
        const end = new Date(`2000-01-01T${shift.endTime}`);
        return sum + Math.round((end.getTime() - start.getTime()) / 60000);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      success: true,
      shifts,
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate,
      },
      summary: {
        totalShifts: shifts.length,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        confirmedShifts: shifts.filter(s => s.confirmedAt).length,
        pendingShifts: shifts.filter(s => !s.confirmedAt).length,
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
 * POST /api/companies/[uid]/employees/schedule
 * Schichtbestätigung oder Schichttausch-Anfrage
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
    const { action, employeeId, shiftId, targetEmployeeId, reason } = body;

    if (!employeeId || !shiftId) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter-ID und Schicht-ID erforderlich' },
        { status: 400 }
      );
    }

    const shiftRef = adminDb
      .collection('companies')
      .doc(companyId)
      .collection('shifts')
      .doc(shiftId);

    const shiftDoc = await shiftRef.get();

    if (!shiftDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Schicht nicht gefunden' },
        { status: 404 }
      );
    }

    const shiftData = shiftDoc.data();

    if (shiftData?.employeeId !== employeeId) {
      return NextResponse.json(
        { success: false, error: 'Zugriff verweigert' },
        { status: 403 }
      );
    }

    if (action === 'confirm') {
      // Schicht bestätigen
      await shiftRef.update({
        confirmedAt: new Date().toISOString(),
        status: 'CONFIRMED',
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Schicht bestätigt',
      });
    } else if (action === 'request-swap') {
      // Schichttausch anfragen
      if (!targetEmployeeId) {
        return NextResponse.json(
          { success: false, error: 'Zielmitarbeiter erforderlich' },
          { status: 400 }
        );
      }

      const swapRequestData = {
        companyId,
        shiftId,
        requestingEmployeeId: employeeId,
        targetEmployeeId,
        reason: reason || '',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const swapRef = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('shiftSwapRequests')
        .add(swapRequestData);

      // Aktualisiere Schicht-Status
      await shiftRef.update({
        swapRequestId: swapRef.id,
        status: 'SWAP_REQUESTED',
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Schichttausch-Anfrage erstellt',
        swapRequestId: swapRef.id,
      });
    } else if (action === 'decline-swap') {
      // Schichttausch ablehnen (wenn ich das Ziel bin)
      if (!body.swapRequestId) {
        return NextResponse.json(
          { success: false, error: 'Swap-Anfrage-ID erforderlich' },
          { status: 400 }
        );
      }

      const swapRef = adminDb
        .collection('companies')
        .doc(companyId)
        .collection('shiftSwapRequests')
        .doc(body.swapRequestId);

      await swapRef.update({
        status: 'DECLINED',
        declinedAt: new Date().toISOString(),
        updatedAt: new Date(),
      });

      // Setze Schicht-Status zurück
      await shiftRef.update({
        swapRequestId: null,
        status: 'SCHEDULED',
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Schichttausch abgelehnt',
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
