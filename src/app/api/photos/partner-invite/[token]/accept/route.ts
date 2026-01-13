import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Partner-Einladung annehmen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { email } = body;

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
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Diese Einladung ist abgelaufen' },
        { status: 410 }
      );
    }

    // Prüfen ob bereits angenommen
    if (data.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Diese Einladung wurde bereits angenommen' },
        { status: 409 }
      );
    }

    // Prüfen ob E-Mail übereinstimmt
    if (email && email.toLowerCase() !== data.partnerEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Diese Einladung wurde an eine andere E-Mail-Adresse gesendet' },
        { status: 403 }
      );
    }

    // Einladung annehmen
    await doc.ref.update({
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedByEmail: email,
    });

    // Partner-Sharing-Beziehung erstellen
    await db.collection('photo_partner_shares').add({
      user1Email: data.senderEmail,
      user1Name: data.senderName,
      user2Email: data.partnerEmail,
      user2Name: data.partnerName,
      startDate: data.startDate,
      includeAllPhotos: data.includeAllPhotos,
      inviteId: doc.id,
      status: 'active',
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Einladung angenommen',
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
