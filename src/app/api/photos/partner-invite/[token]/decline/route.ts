import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Partner-Einladung ablehnen
export async function POST(
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

    // Einladung ablehnen
    await doc.ref.update({
      status: 'declined',
      declinedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Einladung abgelehnt',
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
