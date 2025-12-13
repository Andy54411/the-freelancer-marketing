'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

interface AbsenceRequest {
  id: string;
  companyId: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  halfDay: boolean;
  reason: string;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

interface VacationBalance {
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  year: number;
}

/**
 * GET /api/companies/[uid]/employees/absence
 * Holt Abwesenheitsanträge und Urlaubskonto
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
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter-ID erforderlich' },
        { status: 400 }
      );
    }

    // Hole Abwesenheitsanträge
    let query: FirebaseFirestore.Query = adminDb
      .collection('companies')
      .doc(companyId)
      .collection('absenceRequests')
      .where('employeeId', '==', employeeId);

    if (type) {
      query = query.where('type', '==', type);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    // Filter nach Jahr
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    query = query.where('startDate', '>=', yearStart).where('startDate', '<=', yearEnd);

    const snapshot = await query.orderBy('startDate', 'desc').get();

    const requests: AbsenceRequest[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        companyId: data.companyId || companyId,
        employeeId: data.employeeId || employeeId,
        type: data.type || 'VACATION',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        days: data.days || 0,
        halfDay: data.halfDay || false,
        reason: data.reason || '',
        status: data.status || 'PENDING',
        approvedBy: data.approvedBy || null,
        approvedAt: data.approvedAt || null,
        rejectionReason: data.rejectionReason || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    // Hole Urlaubskonto
    const employeeDoc = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(employeeId)
      .get();

    const employeeData = employeeDoc.data();
    const vacationEntitlement = employeeData?.vacationDays || employeeData?.urlaubstage || 30;

    // Berechne genutzte und ausstehende Urlaubstage
    const approvedVacationDays = requests
      .filter(r => r.type === 'VACATION' && r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.days, 0);

    const pendingVacationDays = requests
      .filter(r => r.type === 'VACATION' && r.status === 'PENDING')
      .reduce((sum, r) => sum + r.days, 0);

    const vacationBalance: VacationBalance = {
      totalDays: vacationEntitlement,
      usedDays: approvedVacationDays,
      pendingDays: pendingVacationDays,
      availableDays: vacationEntitlement - approvedVacationDays - pendingVacationDays,
      year: parseInt(year),
    };

    // Gruppiere nach Typ
    const byType = {
      vacation: requests.filter(r => r.type === 'VACATION'),
      sick: requests.filter(r => r.type === 'SICK'),
      unpaid: requests.filter(r => r.type === 'UNPAID'),
      special: requests.filter(r => r.type === 'SPECIAL'),
      other: requests.filter(r => !['VACATION', 'SICK', 'UNPAID', 'SPECIAL'].includes(r.type)),
    };

    return NextResponse.json({
      success: true,
      requests,
      vacationBalance,
      byType,
      summary: {
        total: requests.length,
        pending: requests.filter(r => r.status === 'PENDING').length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        rejected: requests.filter(r => r.status === 'REJECTED').length,
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
 * POST /api/companies/[uid]/employees/absence
 * Erstellt einen neuen Abwesenheitsantrag
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
    const { 
      employeeId, 
      type, 
      startDate, 
      endDate, 
      halfDay,
      reason, 
      attachmentUrl 
    } = body;

    if (!employeeId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Pflichtfelder fehlen: employeeId, type, startDate, endDate' },
        { status: 400 }
      );
    }

    // Validiere Typ
    const validTypes = ['VACATION', 'SICK', 'UNPAID', 'SPECIAL', 'HOMEOFFICE', 'TRAINING'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Ungültiger Typ. Erlaubt: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Berechne Arbeitstage
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Halbtag-Korrektur
    const days = halfDay ? workingDays - 0.5 : workingDays;

    // Prüfe Urlaubskonto bei Urlaubsantrag
    if (type === 'VACATION') {
      const employeeDoc = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('employees')
        .doc(employeeId)
        .get();

      const employeeData = employeeDoc.data();
      const vacationEntitlement = employeeData?.vacationDays || employeeData?.urlaubstage || 30;

      // Hole bestehende genehmigte/ausstehende Urlaubsanträge
      const year = start.getFullYear();
      const existingSnapshot = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('absenceRequests')
        .where('employeeId', '==', employeeId)
        .where('type', '==', 'VACATION')
        .where('status', 'in', ['APPROVED', 'PENDING'])
        .where('startDate', '>=', `${year}-01-01`)
        .where('startDate', '<=', `${year}-12-31`)
        .get();

      const usedDays = existingSnapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().days || 0);
      }, 0);

      if (usedDays + days > vacationEntitlement) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Nicht genügend Urlaubstage verfügbar. Verfügbar: ${vacationEntitlement - usedDays}, Angefragt: ${days}` 
          },
          { status: 400 }
        );
      }
    }

    // Erstelle Antrag
    const requestData = {
      companyId,
      employeeId,
      type,
      startDate,
      endDate,
      days,
      halfDay: halfDay || false,
      reason: reason || '',
      attachmentUrl: attachmentUrl || null,
      status: type === 'SICK' ? 'APPROVED' : 'PENDING', // Krankmeldungen werden automatisch genehmigt
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('absenceRequests')
      .add(requestData);

    return NextResponse.json({
      success: true,
      message: type === 'SICK' 
        ? 'Krankmeldung erfasst' 
        : 'Abwesenheitsantrag erstellt und wartet auf Genehmigung',
      request: {
        id: docRef.id,
        ...requestData,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Fehler beim Erstellen'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/companies/[uid]/employees/absence
 * Aktualisiert einen Abwesenheitsantrag (z.B. Stornierung)
 */
export async function PATCH(
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
    const { requestId, employeeId, action, reason } = body;

    if (!requestId || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Antrags-ID und Mitarbeiter-ID erforderlich' },
        { status: 400 }
      );
    }

    const requestRef = adminDb
      .collection('companies')
      .doc(companyId)
      .collection('absenceRequests')
      .doc(requestId);

    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Antrag nicht gefunden' },
        { status: 404 }
      );
    }

    const requestData = requestDoc.data();

    if (requestData?.employeeId !== employeeId) {
      return NextResponse.json(
        { success: false, error: 'Zugriff verweigert' },
        { status: 403 }
      );
    }

    if (action === 'cancel') {
      // Nur ausstehende Anträge können storniert werden
      if (requestData?.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Nur ausstehende Anträge können storniert werden' },
          { status: 400 }
        );
      }

      await requestRef.update({
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason || 'Vom Mitarbeiter storniert',
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Antrag storniert',
      });
    } else if (action === 'update') {
      // Nur ausstehende Anträge können aktualisiert werden
      if (requestData?.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Nur ausstehende Anträge können bearbeitet werden' },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.reason !== undefined) updateData.reason = body.reason;
      if (body.attachmentUrl !== undefined) updateData.attachmentUrl = body.attachmentUrl;

      await requestRef.update(updateData);

      return NextResponse.json({
        success: true,
        message: 'Antrag aktualisiert',
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
        error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren'
      },
      { status: 500 }
    );
  }
}
