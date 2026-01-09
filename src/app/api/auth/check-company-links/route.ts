import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/firebase/server';

/**
 * API-Route die beim Login aufgerufen wird
 * Prüft ob es pending Firmenverknüpfungen für die E-Mail des Users gibt
 * und aktiviert diese automatisch
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Auth Token aus Header holen
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Token verifizieren
    let decodedToken;
    try {
      if (!adminAuth) {
        return NextResponse.json(
          { success: false, error: 'Auth nicht verfügbar' },
          { status: 500 }
        );
      }
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email?.toLowerCase().trim();

    if (!userEmail) {
      return NextResponse.json({
        success: true,
        linkedCompanies: [],
        message: 'Keine E-Mail im Token',
      });
    }

    // Hole bestehende linkedCompanies vom User
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return NextResponse.json({
        success: true,
        linkedCompanies: [],
        message: 'User nicht gefunden',
      });
    }

    const userData = userSnap.data();
    const linkedCompanies = userData?.linkedCompanies ?? [];
    const existingCompanyIds = new Set(linkedCompanies.map((c: { companyId: string }) => c.companyId));

    // Suche nach allen Companies die diesen User als Mitarbeiter mit pending dashboardAccess haben
    const companiesSnap = await db.collection('companies').get();
    
    const newLinks: Array<{
      companyId: string;
      companyName: string;
      employeeId: string;
      role: 'mitarbeiter';
      linkedAt: string;
    }> = [];

    for (const companyDoc of companiesSnap.docs) {
      // Skip wenn bereits verknüpft
      if (existingCompanyIds.has(companyDoc.id)) {
        continue;
      }

      // Suche nach Mitarbeiter mit dieser E-Mail und pending dashboardAccess
      const employeesRef = db
        .collection('companies')
        .doc(companyDoc.id)
        .collection('employees');
      
      const employeesSnap = await employeesRef.get();

      for (const empDoc of employeesSnap.docs) {
        const empData = empDoc.data();
        const empEmail = empData.email?.toLowerCase().trim();

        // Prüfe ob E-Mail match und dashboardAccess pending ist
        // authUid wird beim Erstellen des Zugangs gesetzt, also prüfen wir ob die E-Mail matcht
        // und der authUid bereits dem aktuellen User entspricht (normaler Login) 
        // ODER ob noch kein authUid gesetzt ist (Legacy-Fall)
        if (
          empEmail === userEmail &&
          empData.dashboardAccess?.enabled
        ) {
          // Wenn authUid bereits gesetzt und es dieser User ist, nehmen wir die bestehenden Permissions
          if (empData.dashboardAccess?.authUid === userId) {
            const companyData = companyDoc.data();
            const companyName = companyData?.step2?.companyName ?? companyData?.companyName ?? 'Unbekannte Firma';

            // Diese Firma ist bereits korrekt verknüpft, füge sie hinzu falls noch nicht in der Liste
            const newLink = {
              companyId: companyDoc.id,
              companyName,
              employeeId: empDoc.id,
              role: 'mitarbeiter' as const,
              linkedAt: empData.dashboardAccess?.createdAt ?? new Date().toISOString(),
              permissions: empData.dashboardAccess?.permissions,
            };

            if (!existingCompanyIds.has(companyDoc.id)) {
              newLinks.push(newLink);
              linkedCompanies.push(newLink);
            }
          }
        }
      }
    }

    // Wenn neue Verknüpfungen gefunden wurden, User aktualisieren
    if (newLinks.length > 0) {
      await userRef.update({
        linkedCompanies,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      linkedCompanies,
      newlyLinked: newLinks.length,
      message: newLinks.length > 0 
        ? `${newLinks.length} neue Firmenverknüpfung(en) aktiviert.`
        : 'Keine neuen Verknüpfungen gefunden.',
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
