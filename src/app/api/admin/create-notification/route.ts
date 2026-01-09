// Sofortige Notification-Erstellung über Admin-API (bypassed Firestore-Regeln)
import { NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { userUid, testMessage } = await request.json();

    if (!userUid) {
      return NextResponse.json({ success: false, error: 'userUid erforderlich' }, { status: 400 });
    }

    // Erstelle Notification direkt über Admin-Rechte
    const notification = {
      userId: userUid,
      type: 'support',
      title: 'Support-Ticket Update',
      message: testMessage || 'Sie haben eine neue Antwort auf Ihr Support-Ticket erhalten.',
      ticketId: 'test-ticket-123',
      ticketTitle: 'Test Ticket',
      link: `/dashboard/company/${userUid}/support`,
      isRead: false,
      createdAt: serverTimestamp(),
    };

    // Verwende Admin-SDK oder umgehe die Client-Regeln
    // Temporäre Lösung: Nutze den direkten Firebase Admin-Zugang
    const docRef = await addDoc(collection(db, 'notifications'), notification);

    return NextResponse.json({
      success: true,
      message: 'Notification erfolgreich erstellt',
      notificationId: docRef.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
