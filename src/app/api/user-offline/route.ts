// src/app/api/user-offline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    let userId: string;

    // Unterstütze sowohl JSON als auch FormData (für sendBeacon)
    const contentType = req.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const { userId: jsonUserId } = await req.json();
      userId = jsonUserId;
    } else {
      // FormData (sendBeacon)
      const formData = await req.formData();
      userId = formData.get('userId') as string;
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Check if database is properly configured
    if (!admin.database) {
      return NextResponse.json({ success: true, warning: 'Database not available' });
    }

    // Setze Benutzer offline in Realtime Database (server-side)
    const realtimeDb = admin.database();
    const userPresenceRef = realtimeDb.ref(`presence/${userId}`);

    await userPresenceRef.set({
      isOnline: false,
      lastSeen: admin.database.ServerValue.TIMESTAMP,
      status: 'offline',
    });

    return NextResponse.json({ success: true });
  } catch {
    // Immer success zurückgeben, um Client-Fehler zu vermeiden
    return NextResponse.json(
      { success: true, warning: 'Offline status update failed' },
      { status: 200 }
    );
  }
}
