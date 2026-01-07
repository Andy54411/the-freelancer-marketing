import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  accessToken: z.string().min(1, 'Access Token erforderlich'),
  phoneNumberId: z.string().min(1, 'Phone Number ID erforderlich'),
  phoneNumber: z.string().optional()
});

/**
 * Speichert WhatsApp Business API Credentials
 * 
 * Der Kunde hat seine Nummer bei Meta verifiziert und gibt uns:
 * - Access Token (von Meta Business Manager)
 * - Phone Number ID (von Meta Business Manager)
 */
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
    const { companyId, accessToken, phoneNumberId, phoneNumber } = requestSchema.parse(body);

    // Teste die Credentials indem wir die Phone Number Info abrufen
    try {
      const testResponse = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
      );

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        return NextResponse.json(
          {
            success: false,
            error: 'Ungültige Credentials',
            details: errorData.error?.message || 'Access Token oder Phone Number ID ist falsch',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }

      const phoneData = await testResponse.json();

      // Speichere Credentials in Firestore
      await db
        .collection('companies')
        .doc(companyId)
        .collection('whatsappConnection')
        .doc('current')
        .set({
          companyId,
          accessToken,
          phoneNumberId,
          phoneNumber: phoneNumber || phoneData.display_phone_number,
          verifiedName: phoneData.verified_name,
          isConnected: true,
          connectedAt: new Date().toISOString(),
          status: 'active'
        });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp erfolgreich verbunden!',
        phoneNumber: phoneData.display_phone_number,
        verifiedName: phoneData.verified_name
      });

    } catch (apiError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fehler beim Testen der Credentials',
          details: apiError instanceof Error ? apiError.message : 'Meta API nicht erreichbar',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validierungsfehler',
          details: error.errors[0]?.message,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.error('[WhatsApp Save Credentials] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern der Credentials',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
