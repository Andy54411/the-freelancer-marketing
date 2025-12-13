import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb, auth as adminAuth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

interface ConfirmEmailRequest {
  token: string;
  userId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ConfirmEmailRequest = await req.json();
    const { token, userId } = body;

    if (!token || !userId) {
      return NextResponse.json(
        { success: false, error: 'Token und User-ID sind erforderlich' },
        { status: 400 }
      );
    }

    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { success: false, error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      );
    }

    // Hole User-Dokument und prüfe Token
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const emailChangeRequest = userData?.emailChangeRequest;

    if (!emailChangeRequest) {
      return NextResponse.json(
        { success: false, error: 'Keine E-Mail-Änderung angefordert' },
        { status: 400 }
      );
    }

    // Prüfe Token
    if (emailChangeRequest.token !== token) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Token' },
        { status: 400 }
      );
    }

    // Prüfe Ablaufzeit
    const expiresAt = new Date(emailChangeRequest.expiresAt);
    if (expiresAt < new Date()) {
      // Lösche abgelaufene Anfrage
      await adminDb.collection('users').doc(userId).update({
        emailChangeRequest: FieldValue.delete(),
      });
      return NextResponse.json(
        { success: false, error: 'Der Bestätigungslink ist abgelaufen. Bitte fordern Sie eine neue E-Mail-Änderung an.' },
        { status: 400 }
      );
    }

    const newEmail = emailChangeRequest.newEmail;

    // Aktualisiere E-Mail in Firebase Auth
    try {
      await adminAuth.updateUser(userId, {
        email: newEmail,
        emailVerified: true,
      });
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : 'Unbekannter Fehler';
      return NextResponse.json(
        { success: false, error: `Fehler beim Aktualisieren der E-Mail in Auth: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Aktualisiere E-Mail in Firestore
    await adminDb.collection('users').doc(userId).update({
      email: newEmail,
      'profile.email': newEmail,
      emailChangeRequest: FieldValue.delete(),
      emailChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'E-Mail-Adresse erfolgreich geändert',
      newEmail,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
