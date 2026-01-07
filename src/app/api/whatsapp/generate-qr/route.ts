import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  phoneNumber: z.string().min(1, 'Telefonnummer erforderlich'),
});

/**
 * WhatsApp Business Embedded Signup - RICHTIG!
 *
 * JEDER KUNDE verbindet SEINE EIGENE WhatsApp Business Nummer!
 *
 * Flow:
 * 1. Kunde klickt "Verbinden"
 * 2. Facebook Login Popup öffnet sich (Embedded Signup)
 * 3. Kunde wählt SEINE WhatsApp Business Nummer
 * 4. Kunde autorisiert Taskilo App
 * 5. Meta gibt uns Access Token + Phone Number ID für DIESEN KUNDEN
 * 6. Kunde kann mit SEINER Nummer aus Taskilo schreiben!
 *
 * Jeder Kunde = Eigene Nummer = Eigener Access Token!
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase nicht verfügbar',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId, phoneNumber } = requestSchema.parse(body);

    // Prüfe ob Meta App konfiguriert ist
    if (!process.env.NEXT_PUBLIC_META_APP_ID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Meta App nicht konfiguriert',
          details: 'NEXT_PUBLIC_META_APP_ID fehlt in .env',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Speichere Anfrage in Firestore (Status: pending)
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .set({
        companyId,
        phoneNumber,
        isConnected: false,
        setupInitiatedAt: new Date().toISOString(),
        status: 'pending_authorization',
      });

    // Facebook OAuth Dialog URL
    // Der Kunde loggt sich ein und wählt SEINE WhatsApp Business Nummer!
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/callback`;

    // Standard OAuth Dialog (config_id wird nicht mehr verwendet)
    const loginDialogUrl =
      `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=whatsapp_business_management,whatsapp_business_messaging,business_management&` +
      `state=${companyId}&` +
      `display=popup`;

    console.log(`[WhatsApp] Generated signup URL for company ${companyId}`);

    return NextResponse.json({
      success: true,
      phoneNumber,
      signupUrl: loginDialogUrl,
      message: 'Bitte autorisiere deine WhatsApp Business Nummer',
      instructions:
        'Ein Popup öffnet sich. Logge dich mit deinem Facebook/Meta Account ein und wähle deine WhatsApp Business Nummer.',
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validierungsfehler',
          details: error.errors[0]?.message,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktivieren von WhatsApp',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
