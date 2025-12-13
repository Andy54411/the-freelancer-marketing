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
    const { companyId, employeeId, authUid } = await request.json();
    
    if (!companyId || !employeeId || !authUid) {
      return NextResponse.json(
        { success: false, error: 'companyId, employeeId, and authUid are required' },
        { status: 400 }
      );
    }
    
    const { firebaseAdmin: fbAdmin, app: fbApp } = await getFirebaseAdmin();
    const db = fbAdmin.firestore(fbApp);
    const auth = fbAdmin.auth(fbApp);
    
    // Verify the auth user exists
    const authUser = await auth.getUser(authUid);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Auth user not found' },
        { status: 404 }
      );
    }
    
    // Get the employee document
    const empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const empDoc = await empRef.get();
    
    if (!empDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    const empData = empDoc.data();
    
    // Update employee with auth link
    await empRef.update({
      email: authUser.email,
      'appAccess.authUid': authUid,
      'appAccess.registered': true,
      'appAccess.registeredAt': fbAdmin.firestore.FieldValue.serverTimestamp(),
      updatedAt: fbAdmin.firestore.FieldValue.serverTimestamp(),
    });
    
    return NextResponse.json({
      success: true,
      message: `Employee linked to auth account successfully`,
      data: {
        companyId,
        employeeId,
        authUid,
        authEmail: authUser.email,
        previousEmail: empData?.email,
        employeeName: `${empData?.firstName} ${empData?.lastName}`,
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
