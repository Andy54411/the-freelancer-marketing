import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseAuth(): Promise<any> {
  try {
    const firebaseModule = await import('@/firebase/server');

    if (!firebaseModule.auth) {
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getAuth } = await import('firebase-admin/auth');
        return getAuth();
      }
      throw new Error('Firebase auth unavailable');
    }

    return firebaseModule.auth;
  } catch (error) {
    throw new Error('Firebase auth unavailable');
  }
}

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // Get Firebase Auth dynamically
    const auth = await getFirebaseAuth();

    // Die Gültigkeit des Cookies auf 5 Tage setzen.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    (await cookies()).set('__session', sessionCookie, {
      httpOnly: true, // Das Cookie ist nicht über JavaScript auf dem Client zugänglich
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000, // maxAge ist in Sekunden
      path: '/',
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}
