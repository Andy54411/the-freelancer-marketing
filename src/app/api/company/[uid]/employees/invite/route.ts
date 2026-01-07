import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/firebase/server';
import { z } from 'zod';
import { ResendEmailService } from '@/lib/resend-email-service';
import { SeatService } from '@/services/subscription/SeatService';

// Interface für LinkedCompany
interface LinkedCompany {
  companyId: string;
  companyName: string;
  role: string;
  permissions: {
    overview: boolean;
    personal: boolean;
    employees: boolean;
    shiftPlanning: boolean;
    timeTracking: boolean;
    absences: boolean;
    evaluations: boolean;
    orders: boolean;
    quotes: boolean;
    invoices: boolean;
    customers: boolean;
    calendar: boolean;
    workspace: boolean;
    finance: boolean;
    expenses: boolean;
    inventory: boolean;
    settings: boolean;
  };
}

// Permissions Schema (wiederverwendbar)
const permissionsSchema = z.object({
  overview: z.boolean().default(true),
  personal: z.boolean().default(false),
  employees: z.boolean().default(false),
  shiftPlanning: z.boolean().default(true),
  timeTracking: z.boolean().default(true),
  absences: z.boolean().default(true),
  evaluations: z.boolean().default(false),
  orders: z.boolean().default(false),
  quotes: z.boolean().default(false),
  invoices: z.boolean().default(false),
  customers: z.boolean().default(false),
  calendar: z.boolean().default(true),
  workspace: z.boolean().default(true),
  finance: z.boolean().default(false),
  expenses: z.boolean().default(false),
  inventory: z.boolean().default(false),
  settings: z.boolean().default(true),
});

// Zod Schema für Dashboard-Zugang erstellen
const createDashboardAccessSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID ist erforderlich'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben'),
  permissions: permissionsSchema.optional(),
});

// Standard-Berechtigungen für neue Mitarbeiter
const defaultPermissions = {
  overview: true,
  personal: false,
  employees: false,
  shiftPlanning: true,
  timeTracking: true,
  absences: true,
  evaluations: false,
  orders: false,
  quotes: false,
  invoices: false,
  customers: false,
  calendar: true,
  workspace: true,
  finance: false,
  expenses: false,
  inventory: false,
  settings: true,
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json(
        { success: false, error: 'Server-Dienste nicht verfügbar' },
        { status: 500 }
      );
    }

    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID fehlt' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = createDashboardAccessSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { employeeId, password, permissions } = validation.data;

    // Prüfe ob die Firma existiert
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Firma nicht gefunden' },
        { status: 404 }
      );
    }

    // SEAT-LIMIT PRÜFEN
    // Nur prüfen wenn es sich um einen neuen Dashboard-Zugang handelt
    const employeeRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const employeeSnap = await employeeRef.get();
    const existingEmployeeData = employeeSnap.data();
    
    const hasExistingAccess = existingEmployeeData?.dashboardAccess?.enabled === true;
    
    if (!hasExistingAccess) {
      // Neuer Dashboard-Zugang - Seat-Verfügbarkeit prüfen
      const seatCheck = await SeatService.checkSeatAvailable(companyId);
      
      if (!seatCheck.available) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Seat-Limit erreicht (${seatCheck.currentUsed}/${seatCheck.totalSeats}). Bitte buchen Sie zusätzliche Nutzer-Plätze unter Einstellungen → Module & Seats.`,
            code: 'SEAT_LIMIT_REACHED',
            upgradeRequired: true,
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // Hole den Mitarbeiter
    if (!employeeSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    const employeeData = existingEmployeeData;

    if (!employeeData) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiterdaten nicht verfügbar' },
        { status: 404 }
      );
    }

    // Wenn Dashboard-Zugang existiert, alten Auth User löschen und neu erstellen
    if (employeeData.dashboardAccess?.authUid) {
      try {
        await adminAuth.deleteUser(employeeData.dashboardAccess.authUid);
      } catch {
        // User existiert vielleicht nicht mehr - ignorieren
      }
    }

    // Prüfe ob eine E-Mail vorhanden ist
    if (!employeeData.email) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter hat keine E-Mail-Adresse hinterlegt' },
        { status: 400 }
      );
    }

    const employeeEmail = employeeData.email.toLowerCase().trim();
    const employeeName = `${employeeData.firstName} ${employeeData.lastName}`;
    const companyData = companySnap.data();
    const companyName = companyData?.step2?.companyName ?? companyData?.companyName ?? 'Ihr Arbeitgeber';

    // Prüfe ob bereits ein Firebase Auth User mit dieser E-Mail existiert
    let authUid: string;
    let userAlreadyExisted = false;

    try {
      const existingUser = await adminAuth.getUserByEmail(employeeEmail);
      // User existiert bereits - verknüpfen
      authUid = existingUser.uid;
      userAlreadyExisted = true;
    } catch {
      // User existiert nicht - neu erstellen
      try {
        const newUser = await adminAuth.createUser({
          email: employeeEmail,
          password: password,
          displayName: employeeName,
          emailVerified: true, // Admin-erstellte Accounts sind verifiziert
        });
        authUid = newUser.uid;
      } catch (createError) {
        const errorMessage = createError instanceof Error ? createError.message : 'Unbekannter Fehler';
        return NextResponse.json(
          { success: false, error: `Fehler beim Erstellen des Accounts: ${errorMessage}` },
          { status: 500 }
        );
      }
    }

    // WICHTIG: Custom Claims für Firebase Auth Token setzen
    // Das stellt sicher, dass der Mitarbeiter nach dem Login korrekt weitergeleitet wird
    // Custom Claims enthalten: role, companyId, employeeId
    try {
      await adminAuth.setCustomUserClaims(authUid, { 
        role: 'mitarbeiter',
        companyId,
        employeeId,
      });
    } catch (claimError) {
      console.error('Failed to set custom claims:', claimError);
    }

    // Aktualisiere NUR den Mitarbeiter in der Company-Subcollection mit dem Dashboard-Zugang
    // KEINE Daten in der users Collection speichern!
    await employeeRef.update({
      dashboardAccess: {
        enabled: true,
        authUid,
        createdAt: new Date().toISOString(),
        permissions: permissions ?? defaultPermissions,
      },
      updatedAt: new Date(),
    });

    // E-Mail an den Mitarbeiter senden
    const emailService = ResendEmailService.getInstance();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taskilo.de';
    const loginUrl = `${baseUrl}/login`;

    const emailResult = await emailService.sendEmail({
      from: 'Taskilo <noreply@taskilo.de>',
      to: [employeeEmail],
      subject: `Ihre Zugangsdaten für ${companyName}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Ihr Dashboard-Zugang</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hallo ${employeeName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${companyName}</strong> hat Ihnen Zugang zum Firmen-Dashboard freigeschaltet.
            </p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Ihre Zugangsdaten:</p>
              <p style="margin: 0 0 5px 0;"><strong>E-Mail:</strong> ${employeeEmail}</p>
              <p style="margin: 0;"><strong>Passwort:</strong> ${password}</p>
            </div>
            
            <p style="font-size: 14px; color: #dc2626; margin-bottom: 20px;">
              Bitte ändern Sie Ihr Passwort nach dem ersten Login.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background: #0d9488; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Jetzt einloggen
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Diese E-Mail wurde automatisch von Taskilo versendet.</p>
          </div>
        </body>
        </html>
      `,
      textContent: `
Hallo ${employeeName},

${companyName} hat Ihnen Zugang zum Firmen-Dashboard freigeschaltet.

Ihre Zugangsdaten:
E-Mail: ${employeeEmail}
Passwort: ${password}

Bitte ändern Sie Ihr Passwort nach dem ersten Login.

Jetzt einloggen: ${loginUrl}

Mit freundlichen Grüßen,
Ihr Taskilo Team
      `.trim(),
    });

    return NextResponse.json({
      success: true,
      authUid,
      userAlreadyExisted,
      employeeName,
      employeeEmail,
      companyName,
      emailSent: emailResult.success,
      emailError: emailResult.error,
      message: userAlreadyExisted 
        ? 'Dashboard-Zugang aktiviert. Der Mitarbeiter kann sich mit seinem bestehenden Account einloggen.'
        : 'Dashboard-Zugang erstellt. Der Mitarbeiter hat seine Zugangsdaten per E-Mail erhalten.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// PATCH: Berechtigungen nachträglich ändern
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const { uid: companyId } = await params;
    const body = await request.json();
    
    const updateSchema = z.object({
      employeeId: z.string().min(1, 'Mitarbeiter-ID fehlt'),
      permissions: permissionsSchema,
    });

    const validatedData = updateSchema.parse(body);
    const { employeeId, permissions } = validatedData;

    // Hole den Mitarbeiter
    const employeeRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const employeeSnap = await employeeRef.get();

    if (!employeeSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    const employeeData = employeeSnap.data();
    const authUid = employeeData?.dashboardAccess?.authUid;

    if (!authUid) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter hat keinen Dashboard-Zugang' },
        { status: 400 }
      );
    }

    // Update Berechtigungen NUR im Mitarbeiter-Dokument (Company Subcollection)
    await employeeRef.update({
      'dashboardAccess.permissions': permissions,
      'dashboardAccess.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Berechtigungen wurden aktualisiert',
      permissions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validierungsfehler', details: error.errors },
        { status: 400 }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren der Berechtigungen',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET: Prüfe Status aller Mitarbeiter mit Dashboard-Zugang
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID fehlt' },
        { status: 400 }
      );
    }

    // Hole alle Mitarbeiter mit Dashboard-Zugang
    const employeesRef = db.collection('companies').doc(companyId).collection('employees');
    const employeesSnap = await employeesRef.get();

    const dashboardAccess = employeesSnap.docs
      .filter(docSnap => docSnap.data().dashboardAccess?.enabled)
      .map(docSnap => {
        const data = docSnap.data();
        return {
          employeeId: docSnap.id,
          employeeName: `${data.firstName} ${data.lastName}`,
          email: data.email,
          enabled: data.dashboardAccess?.enabled ?? false,
          authUid: data.dashboardAccess?.authUid,
          createdAt: data.dashboardAccess?.createdAt,
          lastLogin: data.dashboardAccess?.lastLogin,
          permissions: data.dashboardAccess?.permissions,
        };
      });

    return NextResponse.json({
      success: true,
      employees: dashboardAccess,
      total: dashboardAccess.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen der Dashboard-Zugänge',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// DELETE: Dashboard-Zugang zurücksetzen (für Neuerstellung)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json(
        { success: false, error: 'Server-Dienste nicht verfügbar' },
        { status: 500 }
      );
    }

    const { uid: companyId } = await params;
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter-ID fehlt' },
        { status: 400 }
      );
    }

    // Hole den Mitarbeiter
    const employeeRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const employeeSnap = await employeeRef.get();

    if (!employeeSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    const employeeData = employeeSnap.data();
    const authUid = employeeData?.dashboardAccess?.authUid;

    // Lösche den Firebase Auth User wenn vorhanden
    if (authUid) {
      try {
        await adminAuth.deleteUser(authUid);
      } catch (deleteError) {
        // User existiert vielleicht nicht mehr - ignorieren
        console.log('Firebase Auth User konnte nicht gelöscht werden:', deleteError);
      }
    }

    // Setze dashboardAccess zurück
    await employeeRef.update({
      dashboardAccess: {
        enabled: false,
        authUid: null,
        permissions: null,
        createdAt: null,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Dashboard-Zugang wurde zurückgesetzt. Der Mitarbeiter kann jetzt neu eingeladen werden.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Zurücksetzen des Dashboard-Zugangs',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
