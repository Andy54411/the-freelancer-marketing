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
    const { userId, correctEmail, companyId, employeeId, searchEmployee } = await request.json();
    
    const { firebaseAdmin, app } = await getFirebaseAdmin();
    const db = firebaseAdmin.firestore(app);
    
    // Search mode - find employee across all locations
    if (searchEmployee) {
      const results: Record<string, unknown>[] = [];
      
      // Check global employees collection (legacy)
      const globalEmpRef = db.collection('employees').doc(searchEmployee);
      const globalEmpDoc = await globalEmpRef.get();
      if (globalEmpDoc.exists) {
        results.push({ location: 'global', id: searchEmployee, data: globalEmpDoc.data() });
      }
      
      // Check company subcollections
      const companiesSnap = await db.collection('companies').get();
      for (const companyDoc of companiesSnap.docs) {
        const empRef = db.collection('companies').doc(companyDoc.id).collection('employees').doc(searchEmployee);
        const empDoc = await empRef.get();
        if (empDoc.exists) {
          results.push({ location: `companies/${companyDoc.id}/employees`, id: searchEmployee, data: empDoc.data() });
        }
      }
      
      return NextResponse.json({ success: true, results });
    }
    
    // If only updating an employee directly
    if (companyId && employeeId && correctEmail) {
      // Try subcollection first
      let empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
      let empDoc = await empRef.get();
      
      // If not found, try global collection (legacy)
      if (!empDoc.exists) {
        empRef = db.collection('employees').doc(employeeId);
        empDoc = await empRef.get();
      }
      
      if (!empDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Employee not found in subcollection or global collection' },
          { status: 404 }
        );
      }
      
      const oldEmail = empDoc.data()?.email;
      await empRef.update({
        email: correctEmail,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      });
      
      return NextResponse.json({
        success: true,
        message: `Employee email updated from ${oldEmail} to ${correctEmail}`,
        data: { companyId, employeeId, oldEmail, newEmail: correctEmail }
      });
    }
    
    if (!userId || !correctEmail) {
      return NextResponse.json(
        { success: false, error: 'userId and correctEmail are required' },
        { status: 400 }
      );
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correctEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    const { firebaseAdmin: fbAdmin, app: fbApp } = await getFirebaseAdmin();
    const auth = fbAdmin.auth(fbApp);
    const db2 = fbAdmin.firestore(fbApp);
    
    // Get current user from Auth
    const currentUser = await auth.getUser(userId);
    const oldEmail = currentUser.email;
    
    // Update Firebase Auth email
    await auth.updateUser(userId, {
      email: correctEmail,
      emailVerified: true,
    });
    
    // Also update Firestore users collection to ensure consistency
    const userRef = db2.collection('users').doc(userId);
    await userRef.update({
      email: correctEmail,
      'profile.email': correctEmail,
      updatedAt: fbAdmin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Also update any employee records that reference this user
    const employeesUpdated: string[] = [];
    
    // Search in all companies for employees with this authUid OR old email
    const companiesSnap = await db2.collection('companies').get();
    
    for (const companyDoc of companiesSnap.docs) {
      const cId = companyDoc.id;
      const employeesRef = db2.collection('companies').doc(cId).collection('employees');
      
      // Find by authUid
      const byAuthUidSnap = await employeesRef.where('appAccess.authUid', '==', userId).get();
      for (const empDoc of byAuthUidSnap.docs) {
        await empDoc.ref.update({
          email: correctEmail,
          updatedAt: fbAdmin.firestore.FieldValue.serverTimestamp(),
        });
        employeesUpdated.push(`${cId}/${empDoc.id}`);
      }
      
      // Find by old email (if different from correct email)
      if (oldEmail && oldEmail !== correctEmail) {
        const byOldEmailSnap = await employeesRef.where('email', '==', oldEmail).get();
        for (const empDoc of byOldEmailSnap.docs) {
          await empDoc.ref.update({
            email: correctEmail,
            updatedAt: fbAdmin.firestore.FieldValue.serverTimestamp(),
          });
          if (!employeesUpdated.includes(`${cId}/${empDoc.id}`)) {
            employeesUpdated.push(`${cId}/${empDoc.id}`);
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Firebase Auth email updated from ${oldEmail} to ${correctEmail}`,
      data: {
        userId,
        oldEmail,
        newEmail: correctEmail,
        firestoreUpdated: true,
        employeesUpdated,
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
