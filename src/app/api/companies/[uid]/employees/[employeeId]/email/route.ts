import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    uid: string;
    employeeId: string;
  }>;
}

// PATCH - Aktualisiert die E-Mail eines Mitarbeiters direkt
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { uid: companyId, employeeId } = await params;
    const body = await req.json();
    const { email } = body;

    if (!companyId || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Company-ID und Employee-ID sind erforderlich' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail ist erforderlich' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      );
    }

    // Hole Employee-Dokument
    const employeeRef = adminDb
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(employeeId);
    
    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    // Aktualisiere die E-Mail
    await employeeRef.update({
      email: email,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich aktualisiert',
      newEmail: email,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
