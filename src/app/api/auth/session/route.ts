import { NextResponse } from 'next/server';
import { auth } from '@/firebase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

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
    console.error('Session Login Error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}
