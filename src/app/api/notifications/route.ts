import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const data = await req.json();
    const { userId, type, title, message, link, isRead = false } = data;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userId, type, title und message sind erforderlich' },
        { status: 400 }
      );
    }

    // Globale Benachrichtigung erstellen
    const notificationData = {
      userId,
      type,
      title,
      message,
      link: link || null,
      isRead,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await db.collection('notifications').add(notificationData);

    return NextResponse.json({
      success: true,
      notificationId: docRef.id,
      message: 'Globale Benachrichtigung erfolgreich erstellt',
    });
  } catch {
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Erstellen der Benachrichtigung' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId ist erforderlich' }, { status: 400 });
    }

    // Benachrichtigungen für User abrufen
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Abrufen der Benachrichtigungen' },
      { status: 500 }
    );
  }
}
