import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich')
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase nicht verfügbar',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId } = requestSchema.parse(body);

    // Trenne die WhatsApp-Verbindung
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .set({
        companyId,
        phoneNumber: '',
        isConnected: false,
        qrCode: null,
        disconnectedAt: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp-Verbindung getrennt'
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validierungsfehler',
          details: (error as any).errors[0]?.message || 'Ungültige Eingabe',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Trennen der Verbindung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
