// src/app/api/get-user-details/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(): Promise<any> {
  try {
    // Dynamically import Firebase services
    const firebaseModule = await import('@/firebase/server');

    // Check if we have valid db service
    if (!firebaseModule.db) {
      console.error('Firebase database not initialized properly');
      // Try to get from admin if needed
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
      }
      throw new Error('Firebase database unavailable');
    }

    return firebaseModule.db;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw new Error('Firebase database unavailable');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    const userDetails: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
      company?: any;
      exists: boolean;
      error?: string;
    }[] = [];

    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          userDetails.push({
            id: userId,
            firstName: userData?.firstName || 'Unknown',
            lastName: userData?.lastName || 'Unknown',
            email: userData?.email || 'Unknown',
            role: userData?.role || 'Unknown',
            company: userData?.company || null,
            exists: true,
          });
        } else {
          userDetails.push({
            id: userId,
            exists: false,
            error: 'User not found',
          });
        }
      } catch (error) {
        userDetails.push({
          id: userId,
          exists: false,
          error: 'Fetch error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      users: userDetails,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'uid parameter required' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb();

    // Try users collection first
    let userDoc = await db.collection('users').doc(uid).get();
    let userData: any = null;
    let source = 'users';

    if (userDoc.exists) {
      userData = userDoc.data();
    } else {
      // Fallback: try companies collection
      userDoc = await db.collection('companies').doc(uid).get();
      if (userDoc.exists) {
        userData = userDoc.data();
        source = 'companies';
      }
    }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: uid,
        firstName: userData?.firstName || userData?.companyName || 'Unknown',
        lastName: userData?.lastName || '',
        email: userData?.email || 'Unknown',
        role: userData?.role || userData?.userType || 'Unknown',
        company: userData?.company || null,
        exists: true,
        source,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
