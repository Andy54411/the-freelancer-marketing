import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API zum Loggen von Mitarbeiteraktivitäten
 * POST: Erstellt einen neuen Log-Eintrag
 */
export async function POST(request: NextRequest) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json(
        { success: false, error: 'Server nicht verfügbar' },
        { status: 500 }
      );
    }

    // Auth Token verifizieren
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Token' },
        { status: 401 }
      );
    }

    // Nur Mitarbeiter dürfen ihre Aktivitäten loggen
    if (decodedToken.role !== 'mitarbeiter') {
      return NextResponse.json(
        { success: false, error: 'Nur für Mitarbeiter' },
        { status: 403 }
      );
    }

    const companyId = decodedToken.companyId as string;
    const employeeId = decodedToken.employeeId as string;

    if (!companyId || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Keine Company/Employee ID in Claims' },
        { status: 400 }
      );
    }

    // Request Body parsen
    const body = await request.json();
    const { action, entityType, entityId, entityName, description, metadata } = body;

    if (!action || !entityType || !description) {
      return NextResponse.json(
        { success: false, error: 'Fehlende Pflichtfelder: action, entityType, description' },
        { status: 400 }
      );
    }

    // Mitarbeiter-Daten laden für den Namen
    const employeeRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const employeeSnap = await employeeRef.get();
    
    let employeeName = 'Mitarbeiter';
    let employeeEmail = decodedToken.email || '';
    
    if (employeeSnap.exists) {
      const empData = employeeSnap.data();
      employeeName = `${empData?.firstName || ''} ${empData?.lastName || ''}`.trim() || 'Mitarbeiter';
      employeeEmail = empData?.email || employeeEmail;
    }

    // Log-Eintrag erstellen
    const logRef = db.collection('companies').doc(companyId).collection('employeeActivityLogs');
    const logEntry = {
      employeeId,
      employeeName,
      employeeEmail,
      action,
      entityType,
      entityId: entityId || null,
      entityName: entityName || null,
      description,
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await logRef.add(logEntry);

    return NextResponse.json({
      success: true,
      logId: docRef.id,
      message: 'Aktivität geloggt',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
