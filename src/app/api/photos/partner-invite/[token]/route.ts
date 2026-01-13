import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Partner-Einladung abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbankverbindung nicht verfügbar' },
        { status: 500 }
      );
    }

    // Einladung suchen
    const snapshot = await db
      .collection('photo_partner_invites')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Einladung nicht gefunden' },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Prüfen ob abgelaufen
    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
    const isExpired = new Date() > expiresAt;

    if (isExpired && data.status === 'pending') {
      // Status auf expired setzen
      await doc.ref.update({ status: 'expired' });
      data.status = 'expired';
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: doc.id,
        senderEmail: data.senderEmail,
        senderName: data.senderName,
        partnerEmail: data.partnerEmail,
        partnerName: data.partnerName,
        startDate: data.startDate,
        includeAllPhotos: data.includeAllPhotos,
        status: data.status,
        expiresAt: expiresAt.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
