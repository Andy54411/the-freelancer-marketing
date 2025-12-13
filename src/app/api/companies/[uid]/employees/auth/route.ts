'use server';

import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db as adminDb } from '@/firebase/server';
import { z } from 'zod';

// Validation Schema für Employee Login
const employeeLoginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
});

// Validation Schema für Employee Registration
const employeeRegisterSchema = z.object({
  employeeId: z.string().min(1, 'Mitarbeiter-ID erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  pin: z.string().length(6, 'PIN muss 6 Zeichen haben').optional(),
});

/**
 * POST /api/companies/[uid]/employees/auth
 * Authentifiziert einen Mitarbeiter und erstellt einen Login-Token
 * 
 * Der Mitarbeiter muss:
 * 1. In der Firestore-Collection `companies/{uid}/employees` existieren
 * 2. Ein Auth-Account in Firebase haben (wird beim ersten Login erstellt)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'register') {
      return handleEmployeeRegistration(companyId, body);
    } else if (action === 'login') {
      return handleEmployeeLogin(companyId, body);
    } else if (action === 'verify-pin') {
      return handlePinVerification(companyId, body);
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
        error: error instanceof Error ? error.message : 'Interner Serverfehler'
      },
      { status: 500 }
    );
  }
}

/**
 * Registriert einen Mitarbeiter für den App-Zugang
 */
async function handleEmployeeRegistration(companyId: string, body: unknown) {
  if (!adminDb || !adminAuth) {
    return NextResponse.json(
      { success: false, error: 'Firebase-Services nicht verfügbar' },
      { status: 500 }
    );
  }

  const validation = employeeRegisterSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.errors[0].message },
      { status: 400 }
    );
  }

  const { employeeId, email, password, pin } = validation.data;

  // 1. Prüfe ob Mitarbeiter existiert
  const employeeDoc = await adminDb
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .doc(employeeId)
    .get();

  if (!employeeDoc.exists) {
    return NextResponse.json(
      { success: false, error: 'Mitarbeiter nicht gefunden' },
      { status: 404 }
    );
  }

  const employeeData = employeeDoc.data();
  
  // 2. Prüfe ob E-Mail übereinstimmt
  if (employeeData?.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: 'E-Mail stimmt nicht mit Mitarbeiterdaten überein' },
      { status: 400 }
    );
  }

  // 3. Prüfe ob schon registriert
  if (employeeData?.appAccess?.registered) {
    return NextResponse.json(
      { success: false, error: 'Mitarbeiter bereits registriert' },
      { status: 400 }
    );
  }

  try {
    // 4. Erstelle Firebase Auth Account
    let authUser;
    try {
      // Prüfe ob User mit dieser E-Mail existiert
      authUser = await adminAuth.getUserByEmail(email);
    } catch {
      // User existiert nicht, erstelle neuen
      authUser = await adminAuth.createUser({
        email,
        password,
        displayName: `${employeeData?.firstName} ${employeeData?.lastName}`,
        disabled: false,
      });
    }

    // 5. Setze Custom Claims für Mitarbeiter-Rolle
    await adminAuth.setCustomUserClaims(authUser.uid, {
      role: 'employee',
      companyId,
      employeeId,
    });

    // 6. Aktualisiere Mitarbeiter-Dokument mit App-Zugang
    await employeeDoc.ref.update({
      appAccess: {
        registered: true,
        authUid: authUser.uid,
        pin: pin || null,
        registeredAt: new Date().toISOString(),
        lastLogin: null,
        permissions: {
          timeTracking: true,
          schedule: true,
          absenceRequest: true,
          documents: false, // Standardmäßig deaktiviert
        },
      },
      updatedAt: new Date(),
    });

    // 7. Erstelle Custom Token für sofortigen Login
    const customToken = await adminAuth.createCustomToken(authUser.uid, {
      role: 'employee',
      companyId,
      employeeId,
    });

    return NextResponse.json({
      success: true,
      message: 'Registrierung erfolgreich',
      customToken,
      employee: {
        id: employeeId,
        firstName: employeeData?.firstName,
        lastName: employeeData?.lastName,
        email: employeeData?.email,
        position: employeeData?.position,
        department: employeeData?.department,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registrierung fehlgeschlagen'
      },
      { status: 500 }
    );
  }
}

/**
 * Validiert Mitarbeiter-Login und gibt Token zurück
 */
async function handleEmployeeLogin(companyId: string, body: unknown) {
  if (!adminDb || !adminAuth) {
    return NextResponse.json(
      { success: false, error: 'Firebase-Services nicht verfügbar' },
      { status: 500 }
    );
  }

  const validation = employeeLoginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.errors[0].message },
      { status: 400 }
    );
  }

  const { email } = validation.data;

  // 1. Finde Mitarbeiter anhand der E-Mail
  const employeesSnapshot = await adminDb
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (employeesSnapshot.empty) {
    return NextResponse.json(
      { success: false, error: 'Mitarbeiter nicht gefunden' },
      { status: 404 }
    );
  }

  const employeeDoc = employeesSnapshot.docs[0];
  const employeeData = employeeDoc.data();

  // 2. Prüfe ob App-Zugang aktiviert
  if (!employeeData?.appAccess?.registered) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'App-Zugang nicht aktiviert. Bitte kontaktieren Sie Ihren Arbeitgeber.',
        requiresRegistration: true,
        employeeId: employeeDoc.id,
      },
      { status: 403 }
    );
  }

  // 3. Prüfe ob Mitarbeiter aktiv
  if (!employeeData?.isActive) {
    return NextResponse.json(
      { success: false, error: 'Mitarbeiterkonto deaktiviert' },
      { status: 403 }
    );
  }

  try {
    // 4. Erstelle Custom Token für Login
    const customToken = await adminAuth.createCustomToken(employeeData.appAccess.authUid, {
      role: 'employee',
      companyId,
      employeeId: employeeDoc.id,
    });

    // 5. Aktualisiere letzten Login
    await employeeDoc.ref.update({
      'appAccess.lastLogin': new Date().toISOString(),
      updatedAt: new Date(),
    });

    // 6. Lade Unternehmensdaten
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    const companyData = companyDoc.data();

    return NextResponse.json({
      success: true,
      customToken,
      employee: {
        id: employeeDoc.id,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email,
        position: employeeData.position,
        department: employeeData.department,
        avatar: employeeData.avatar,
        permissions: employeeData.appAccess.permissions,
      },
      company: {
        id: companyId,
        name: companyData?.companyName || companyData?.displayName || 'Unbekannt',
        logo: companyData?.logo,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login fehlgeschlagen'
      },
      { status: 500 }
    );
  }
}

/**
 * Verifiziert PIN für schnellen Zugang (z.B. Zeitstempel-Terminal)
 */
async function handlePinVerification(companyId: string, body: { employeeId?: string; pin?: string }) {
  if (!adminDb || !adminAuth) {
    return NextResponse.json(
      { success: false, error: 'Firebase-Services nicht verfügbar' },
      { status: 500 }
    );
  }

  const { employeeId, pin } = body;

  if (!employeeId || !pin) {
    return NextResponse.json(
      { success: false, error: 'Mitarbeiter-ID und PIN erforderlich' },
      { status: 400 }
    );
  }

  const employeeDoc = await adminDb
    .collection('companies')
    .doc(companyId)
    .collection('employees')
    .doc(employeeId)
    .get();

  if (!employeeDoc.exists) {
    return NextResponse.json(
      { success: false, error: 'Mitarbeiter nicht gefunden' },
      { status: 404 }
    );
  }

  const employeeData = employeeDoc.data();

  if (employeeData?.appAccess?.pin !== pin) {
    return NextResponse.json(
      { success: false, error: 'Ungültige PIN' },
      { status: 401 }
    );
  }

  // Erstelle Custom Token
  const customToken = await adminAuth.createCustomToken(employeeData.appAccess.authUid, {
    role: 'employee',
    companyId,
    employeeId,
    pinLogin: true,
  });

  return NextResponse.json({
    success: true,
    customToken,
    employee: {
      id: employeeId,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
    },
  });
}

/**
 * GET /api/companies/[uid]/employees/auth
 * Gibt Informationen zum Mitarbeiter-Login zurück
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
    
    // Lade Unternehmensdaten für Login-Screen
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    
    if (!companyDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data();

    return NextResponse.json({
      success: true,
      company: {
        id: companyId,
        name: companyData?.companyName || companyData?.displayName,
        logo: companyData?.logo,
        primaryColor: companyData?.branding?.primaryColor || '#14ad9f',
      },
      loginMethods: {
        emailPassword: true,
        pin: companyData?.settings?.employeeLogin?.pinEnabled ?? true,
        qrCode: companyData?.settings?.employeeLogin?.qrCodeEnabled ?? false,
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
