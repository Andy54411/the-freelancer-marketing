// Firebase Admin SDK basierte Notification-Erstellung (umgeht Client-Regeln)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Dynamically import Firebase setup to avoid build-time initialization
    const { admin, db } = await import('@/firebase/server');

    // Check if Firebase is properly initialized
    if (!db || !admin) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK nicht verfügbar' },
        { status: 500 }
      );
    }

    const requestData = await request.json();
    const {
      userUid,
      userId,
      ticketId,
      ticketTitle,
      replyAuthor,
      testMessage,
      type,
      title,
      message,
      quoteId,
      link,
      metadata,
    } = requestData;

    const targetUserId = userId || userUid;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'userId erforderlich' }, { status: 400 });
    }

    // Erstelle Notification mit Admin-SDK (umgeht Firestore-Regeln)
    let notification;

    if (type && title && message) {
      // Custom Notification (z.B. für Quote-Tests)
      notification = {
        userId: targetUserId,
        type: type,
        title: title,
        message: message,
        quoteId: quoteId,
        link: link || `/dashboard/company/${targetUserId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: metadata || {},
      };
    } else {
      // Support-Ticket Notification (bestehende Logik)
      notification = {
        userId: targetUserId,
        type: 'support',
        title: 'Support-Ticket Update',
        message:
          testMessage ||
          `${replyAuthor || 'Support Team'} hat auf Ihr Ticket "${ticketTitle || 'Ihr Support-Ticket'}" geantwortet`,
        ticketId: ticketId || 'test-ticket',
        ticketTitle: ticketTitle || 'Support-Ticket',
        link: `/dashboard/company/${targetUserId}/support`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }

    // Verwende Admin-SDK zum Erstellen (umgeht Client-Regeln)
    const docRef = await db!.collection('notifications').add(notification);

    return NextResponse.json({
      success: true,
      message: 'Admin-Notification erfolgreich erstellt',
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
