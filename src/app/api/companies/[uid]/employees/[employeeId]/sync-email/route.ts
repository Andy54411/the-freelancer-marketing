import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb, auth as adminAuth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    uid: string;
    employeeId: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { uid: companyId, employeeId } = await params;

    if (!companyId || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Company-ID und Employee-ID sind erforderlich' },
        { status: 400 }
      );
    }

    if (!adminDb || !adminAuth) {
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

    const employeeData = employeeDoc.data();
    const authUid = employeeData?.appAccess?.authUid;

    if (!authUid) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter hat keinen verknüpften App-Zugang' },
        { status: 400 }
      );
    }

    // Hole die aktuelle E-Mail aus Firebase Auth
    let currentAuthEmail: string;
    try {
      const authUser = await adminAuth.getUser(authUid);
      currentAuthEmail = authUser.email || '';
    } catch (authError) {
      return NextResponse.json(
        { success: false, error: 'Verknüpfter Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    if (!currentAuthEmail) {
      return NextResponse.json(
        { success: false, error: 'Keine E-Mail im Auth-Account gefunden' },
        { status: 400 }
      );
    }

    // Aktualisiere die E-Mail im Employee-Dokument
    await employeeRef.update({
      email: currentAuthEmail,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'E-Mail erfolgreich synchronisiert',
      newEmail: currentAuthEmail,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
