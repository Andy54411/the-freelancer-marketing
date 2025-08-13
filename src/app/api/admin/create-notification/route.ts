// Sofortige Notification-Erstellung über Admin-API (bypassed Firestore-Regeln)
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/firebase/clients';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

export async function POST(request: NextRequest) {
  try {
    const { userUid, testMessage } = await request.json();

    if (!userUid) {
      return NextResponse.json({ success: false, error: 'userUid erforderlich' }, { status: 400 });
    }

    console.log(`Erstelle sofortige Admin-Notification für User: ${userUid}`);

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

    console.log(`Notification erfolgreich erstellt mit ID: ${docRef.id}`);

    return NextResponse.json({
      success: true,
      message: 'Notification erfolgreich erstellt',
      notificationId: docRef.id,
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Admin-Notification:', error);
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
