import { NextRequest, NextResponse } from 'next/server';

// Dynamic Firebase imports
let firebaseAdmin: typeof import('firebase-admin');
let app: import('firebase-admin').app.App;

async function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    firebaseAdmin = await import('firebase-admin');
    
    try {
      app = firebaseAdmin.app();
    } catch {
      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
      ) {
        app = firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        throw new Error('Firebase Admin configuration not found');
      }
    }
  }
  
  return { firebaseAdmin, app };
}

export async function POST(request: NextRequest) {
  try {
    const { companyCode, authUid, email } = await request.json();
    
    if (!companyCode || !authUid || !email) {
      return NextResponse.json(
        { success: false, error: 'companyCode, authUid und email sind erforderlich' },
        { status: 400 }
      );
    }

    const { firebaseAdmin: fbAdmin, app: fbApp } = await getFirebaseAdmin();
    const db = fbAdmin.firestore(fbApp);
    
    // Prüfe ob die Firma existiert
    const companyRef = db.collection('companies').doc(companyCode);
    const companyDoc = await companyRef.get();
    
    if (!companyDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Firmencode. Bitte prüfen Sie den Code.' },
        { status: 404 }
      );
    }
    
    const companyData = companyDoc.data();
    const companyName = companyData?.companyName || companyData?.name || companyData?.step1?.firmenname || 'Unternehmen';
    
    // Suche den Mitarbeiter anhand der E-Mail
    const employeesRef = db.collection('companies').doc(companyCode).collection('employees');
    const employeeQuery = await employeesRef.where('email', '==', email).limit(1).get();
    
    if (employeeQuery.empty) {
      // Kein Mitarbeiter mit dieser E-Mail gefunden
      return NextResponse.json(
        { 
          success: false, 
          error: `Kein Mitarbeiter mit der E-Mail ${email} bei ${companyName} gefunden. Bitte kontaktieren Sie Ihren Arbeitgeber.` 
        },
        { status: 404 }
      );
    }
    
    const employeeDoc = employeeQuery.docs[0];
    const employeeData = employeeDoc.data();
    
    // Prüfe ob bereits verknüpft
    if (employeeData.appAccess?.authUid && employeeData.appAccess.authUid !== authUid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dieser Mitarbeiter ist bereits mit einem anderen Konto verknüpft.' 
        },
        { status: 400 }
      );
    }
    
    if (employeeData.appAccess?.authUid === authUid && employeeData.appAccess?.registered) {
      return NextResponse.json({
        success: true,
        message: 'Bereits verknüpft',
        data: {
          companyId: companyCode,
          companyName,
          employeeId: employeeDoc.id,
          employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
        }
      });
    }
    
    // Verknüpfe den Mitarbeiter mit dem Auth-Account
    await employeeDoc.ref.update({
      'appAccess.authUid': authUid,
      'appAccess.registered': true,
      'appAccess.registeredAt': fbAdmin.firestore.FieldValue.serverTimestamp(),
      updatedAt: fbAdmin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Aktualisiere auch die User-Collection mit der Firmen-Verknüpfung
    const userRef = db.collection('users').doc(authUid);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const linkedCompanies = userData?.linkedCompanies || [];
      
      // Füge Firma hinzu wenn noch nicht vorhanden
      if (!linkedCompanies.some((c: { companyId: string }) => c.companyId === companyCode)) {
        linkedCompanies.push({
          companyId: companyCode,
          companyName,
          employeeId: employeeDoc.id,
          role: 'employee',
          linkedAt: new Date().toISOString(),
        });
        
        await userRef.update({
          linkedCompanies,
          updatedAt: fbAdmin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Erfolgreich mit ${companyName} verknüpft!`,
      data: {
        companyId: companyCode,
        companyName,
        employeeId: employeeDoc.id,
        employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
