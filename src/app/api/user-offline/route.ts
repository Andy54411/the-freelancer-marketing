// src/app/api/user-offline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Check if database is properly configured
    if (!admin.database) {
      console.warn(
        '[USER-OFFLINE] Realtime Database not available - Firebase Database URL may be missing'
      );
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

    console.log(`[USER-OFFLINE] Set user ${userId} offline via beforeunload`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[USER-OFFLINE ERROR]', error);
    return NextResponse.json(
      { success: true, warning: 'Offline status update failed' },
      { status: 200 }
    );
  }
}
