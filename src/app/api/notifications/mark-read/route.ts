/**
 * API-Route zum Markieren von Benachrichtigungen als gelesen
 * Ermöglicht Benutzern, ihre eigenen Benachrichtigungen als gelesen zu markieren
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Firebase Admin initialisieren
if (!getApps().length) {
  try {
    // Versuche die service-account.json zu lesen
    const serviceAccountPath = join(process.cwd(), 'firebase_functions', 'service-account.json');
    const serviceAccountData = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    initializeApp({
      credential: cert(serviceAccountData as ServiceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    // Fallback mit Umgebungsvariablen (falls im Production-Environment)
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        } as ServiceAccount),
      });
    } else {
      throw new Error(
        'Firebase Admin initialization failed: No service account or environment variables found'
      );
    }
  }
}

const db = getFirestore();

export async function PATCH(request: NextRequest) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: 'Benachrichtigungs-ID ist erforderlich' }, { status: 400 });
    }

    // Auth-Token aus Header extrahieren
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Fehlende oder ungültige Autorisierung' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Token verifizieren
      const decodedToken = await getAuth().verifyIdToken(token);
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

      console.log(
        `✅ Benachrichtigung ${notificationId} als gelesen markiert für Benutzer ${userId}`
      );

      return NextResponse.json({
        success: true,
        message: 'Benachrichtigung als gelesen markiert',
      });
    } catch (authError) {
      console.error('Auth-Fehler:', authError);
      return NextResponse.json({ error: 'Ungültiges Auth-Token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Fehler beim Markieren der Benachrichtigung:', error);
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
    // Auth-Token aus Header extrahieren
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Fehlende oder ungültige Autorisierung' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Token verifizieren
      const decodedToken = await getAuth().verifyIdToken(token);
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

      console.log(
        `✅ ${snapshot.size} Benachrichtigungen als gelesen markiert für Benutzer ${userId}`
      );

      return NextResponse.json({
        success: true,
        message: `${snapshot.size} Benachrichtigungen als gelesen markiert`,
        marked: snapshot.size,
      });
    } catch (authError) {
      console.error('Auth-Fehler:', authError);
      return NextResponse.json({ error: 'Ungültiges Auth-Token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Fehler beim Markieren aller Benachrichtigungen:', error);
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
