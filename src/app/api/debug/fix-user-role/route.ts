import { NextRequest, NextResponse } from 'next/server';
import { admin, db } from '@/firebase/server';

/**
 * Debug und Fix Firebase Auth Custom Claims
 * Setzt die korrekte Rolle für einen Benutzer
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, role } = await request.json();

    if (!uid || !role) {
      return NextResponse.json({ error: 'UID and role required' }, { status: 400 });
    }

    console.log('🔧 Setting custom claims for user:', uid, 'role:', role);

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { role });

    // Auch in Firestore speichern
    await db.collection('users').doc(uid).set({ user_type: role }, { merge: true });

    console.log('✅ Custom claims and user document updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Custom claims updated successfully',
      uid,
      role,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to set custom claims:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set custom claims',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check current custom claims
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID required' }, { status: 400 });
    }

    // Get user's custom claims
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};

    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    return NextResponse.json({
      success: true,
      uid,
      auth: {
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        customClaims,
      },
      firestore: {
        exists: userDoc.exists,
        data: userData,
      },
      recommendations: [
        'If customClaims.role is missing or incorrect, use POST to fix it',
        'Make sure user_type in Firestore matches the role in custom claims',
      ],
    });
  } catch (error) {
    console.error('Failed to get user info:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user info',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
