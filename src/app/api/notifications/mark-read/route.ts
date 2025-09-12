/**
 * API-Route zum Markieren von Benachrichtigungen als gelesen
 * Ermöglicht Benutzern, ihre eigenen Benachrichtigungen als gelesen zu markieren
 */

import { NextRequest, NextResponse } from 'next/server';

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseServices(): Promise<{ auth: any; db: any }> {
  try {
    const firebaseModule = await import('@/firebase/server');

    if (!firebaseModule.db) {
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getAuth } = await import('firebase-admin/auth');
        const { getFirestore } = await import('firebase-admin/firestore');
        return {
          auth: getAuth(),
          db: getFirestore(),
        };
      }
      throw new Error('Firebase services unavailable');
    }

    return {
      auth: firebaseModule.auth,
      db: firebaseModule.db,
    };
  } catch (error) {
    throw new Error('Firebase services unavailable');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Benachrichtigungs-ID ist erforderlich' }, { status: 400 });
    }

    // Initialize Firebase services dynamically
    const { auth, db } = await getFirebaseServices();

    // Auth-Token aus Header extrahieren
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Fehlende oder ungültige Autorisierung' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Token verifizieren
      const decodedToken = await auth.verifyIdToken(token);
      const userId = decodedToken.uid;

      // Benachrichtigung abrufen und überprüfen, ob sie dem Benutzer gehört
      const notificationRef = db.collection('notifications').doc(notificationId);
      const notificationDoc = await notificationRef.get();

      if (!notificationDoc.exists) {
        return NextResponse.json({ error: 'Benachrichtigung nicht gefunden' }, { status: 404 });
      }

      const notificationData = notificationDoc.data();

      // Sicherheitsprüfung: Benutzer kann nur seine eigenen Benachrichtigungen markieren
      if (notificationData?.userId !== userId) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diese Benachrichtigung' },
          { status: 403 }
        );
      }

      // Benachrichtigung als gelesen markieren
      await notificationRef.update({
        isRead: true,
        readAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Benachrichtigung als gelesen markiert',
      });
    } catch (authError) {
      return NextResponse.json({ error: 'Ungültiges Auth-Token' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// Zusätzliche Route zum Markieren aller Benachrichtigungen als gelesen
export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase services dynamically
    const { auth, db } = await getFirebaseServices();

    // Auth-Token aus Header extrahieren
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Fehlende oder ungültige Autorisierung' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Token verifizieren
      const decodedToken = await auth.verifyIdToken(token);
      const userId = decodedToken.uid;

      // Alle ungelesenen Benachrichtigungen des Benutzers finden
      const notificationsQuery = db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('isRead', '==', false);

      const snapshot = await notificationsQuery.get();

      if (snapshot.empty) {
        return NextResponse.json({
          success: true,
          message: 'Keine ungelesenen Benachrichtigungen gefunden',
          marked: 0,
        });
      }

      // Batch-Update für bessere Performance
      const batch = db.batch();
      const readAt = new Date().toISOString();

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: readAt,
        });
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `${snapshot.size} Benachrichtigungen als gelesen markiert`,
        marked: snapshot.size,
      });
    } catch (authError) {
      return NextResponse.json({ error: 'Ungültiges Auth-Token' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
