/**
 * Debug API to check user in Firebase Auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin, db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'test@test.de';

    if (!admin || !db) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Also check users collection
    const userDocByUid = await db.collection('users').doc(userRecord.uid).get();

    return NextResponse.json({
      success: true,
      authUser: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      firestoreUserExists: userDocByUid.exists,
      firestoreUserData: userDocByUid.exists ? {
        id: userDocByUid.id,
        email: userDocByUid.data()?.email,
        firstName: userDocByUid.data()?.firstName,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
