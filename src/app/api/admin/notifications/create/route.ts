// Firebase Admin SDK basierte Notification-Erstellung (umgeht Client-Regeln)
import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialisiere Firebase Admin SDK falls noch nicht geschehen
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

export async function POST(request: NextRequest) {
  try {
    const { userUid, ticketId, ticketTitle, replyAuthor, testMessage } = await request.json();

    if (!userUid) {
      return NextResponse.json({ success: false, error: 'userUid erforderlich' }, { status: 400 });
    }

    console.log(`Erstelle Admin-SDK Notification für User: ${userUid}`);

    // Erstelle Notification mit Admin-SDK (umgeht Firestore-Regeln)
    const notification = {
      userId: userUid,
      type: 'support',
      title: 'Support-Ticket Update',
      message:
        testMessage ||
        `${replyAuthor || 'Support Team'} hat auf Ihr Ticket "${ticketTitle || 'Ihr Support-Ticket'}" geantwortet`,
      ticketId: ticketId || 'test-ticket',
      ticketTitle: ticketTitle || 'Support-Ticket',
      link: `/dashboard/company/${userUid}/support`,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Verwende Admin-SDK zum Erstellen (umgeht Client-Regeln)
    const docRef = await db.collection('notifications').add(notification);

    console.log(`Admin-Notification erfolgreich erstellt mit ID: ${docRef.id}`);

    return NextResponse.json({
      success: true,
      message: 'Admin-Notification erfolgreich erstellt',
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
