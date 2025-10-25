import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const querySchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich')
});

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    const { companyId: validatedCompanyId } = querySchema.parse({
      companyId
    });

    // Lade aktuelle Verbindung aus Firestore (admin SDK)
    const connectionDoc = await db
      .collection('companies')
      .doc(validatedCompanyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({
        phoneNumber: '',
        isConnected: false,
        qrCode: null,
        connectedAt: null
      });
    }

    const data = connectionDoc.data();
    
    // Prüfe ob QR-Code abgelaufen ist
    if (data?.expiresAt && new Date(data.expiresAt) < new Date()) {
      return NextResponse.json({
        phoneNumber: data.phoneNumber || '',
        isConnected: data.isConnected || false,
        qrCode: null,
        connectedAt: data.connectedAt || null
      });
    }

    return NextResponse.json({
      phoneNumber: data?.phoneNumber || '',
      isConnected: data?.isConnected || false,
      qrCode: data?.qrCode || null,
      connectedAt: data?.connectedAt || null
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
        error: 'Fehler beim Laden der Verbindung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
