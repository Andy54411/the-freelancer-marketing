import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

/**
 * WhatsApp Token-Erneuerung
 *
 * Generiert einen neuen Long-Lived Token (60 Tage)
 * oder zeigt Anweisungen für permanenten System User Token.
 *
 * GET: Status und Anweisungen
 * POST: Token manuell erneuern mit neuem Token
 */

// GET: Zeige Token-Status und Erneuerungsmöglichkeiten
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json(
      { success: false, error: 'companyId ist erforderlich' },
      { status: 400 }
    );
  }

  if (!isFirebaseAvailable() || !db) {
    return NextResponse.json(
      { success: false, error: 'Firebase nicht verfügbar' },
      { status: 500 }
    );
  }

  try {
    // Hole aktuelle Verbindung
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Keine WhatsApp-Verbindung gefunden',
        instructions: {
          step1: 'Gehe zu Meta Business Manager: https://business.facebook.com/settings/system-users',
          step2: 'Erstelle einen System User mit Admin-Rechten',
          step3: 'Generiere einen Token mit den Berechtigungen: whatsapp_business_management, whatsapp_business_messaging',
          step4: 'Speichere den Token über POST /api/whatsapp/renew-token',
        },
      });
    }

    const connection = connectionDoc.data();

    // Teste ob der aktuelle Token noch funktioniert
    let tokenStatus = 'unbekannt';
    let tokenExpiry: string | null = null;

    try {
      const debugResponse = await fetch(
        `https://graph.facebook.com/v18.0/debug_token?input_token=${connection?.accessToken}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
      );
      const debugData = await debugResponse.json();

      if (debugData.data) {
        tokenStatus = debugData.data.is_valid ? 'gültig' : 'abgelaufen';
        if (debugData.data.expires_at) {
          tokenExpiry = new Date(debugData.data.expires_at * 1000).toISOString();
        }
      }
    } catch {
      tokenStatus = 'Fehler beim Prüfen';
    }

    return NextResponse.json({
      success: true,
      connection: {
        phoneNumber: connection?.phoneNumber,
        phoneNumberId: connection?.phoneNumberId,
        wabaId: connection?.wabaId,
        connectedAt: connection?.connectedAt,
        tokenLastUpdated: connection?.tokenLastUpdated,
      },
      tokenStatus,
      tokenExpiry,
      instructions: tokenStatus !== 'gültig' ? {
        step1: 'Gehe zu Meta Business Manager: https://business.facebook.com/settings/system-users',
        step2: 'Erstelle oder wähle einen System User mit Admin-Rechten',
        step3: 'Klicke auf "Tokens generieren" und wähle deine WhatsApp App',
        step4: 'Aktiviere die Berechtigungen: whatsapp_business_management, whatsapp_business_messaging',
        step5: 'Wähle "Nie ablaufend" als Ablaufzeit',
        step6: 'Kopiere den Token und sende ihn per POST an diese API',
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Fehler beim Prüfen', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST: Token erneuern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, newAccessToken, attemptAutoRenew } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId ist erforderlich' },
        { status: 400 }
      );
    }

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 500 }
      );
    }

    // Hole aktuelle Verbindung
    const connectionRef = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current');

    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Keine WhatsApp-Verbindung gefunden' },
        { status: 404 }
      );
    }

    const connection = connectionDoc.data();

    // Option 1: Neuer Token wurde manuell bereitgestellt
    if (newAccessToken) {
      // Validiere den neuen Token
      const validateResponse = await fetch(
        `https://graph.facebook.com/v18.0/${connection?.phoneNumberId}?access_token=${newAccessToken}`
      );

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        return NextResponse.json(
          {
            success: false,
            error: 'Der neue Token ist ungültig',
            details: errorData.error?.message,
          },
          { status: 400 }
        );
      }

      // Token ist gültig - speichern
      await connectionRef.update({
        accessToken: newAccessToken,
        tokenLastUpdated: new Date().toISOString(),
        tokenType: 'manual',
      });

      return NextResponse.json({
        success: true,
        message: 'Token erfolgreich aktualisiert',
        tokenLastUpdated: new Date().toISOString(),
      });
    }

    // Option 2: Versuche automatische Erneuerung (Long-Lived Token)
    if (attemptAutoRenew && connection?.accessToken) {
      try {
        const renewResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&` +
          `client_id=${process.env.META_APP_ID}&` +
          `client_secret=${process.env.META_APP_SECRET}&` +
          `fb_exchange_token=${connection.accessToken}`
        );

        const renewData = await renewResponse.json();

        if (renewData.access_token) {
          // Erfolgreich erneuert!
          await connectionRef.update({
            accessToken: renewData.access_token,
            tokenLastUpdated: new Date().toISOString(),
            tokenType: 'long-lived',
            tokenExpiresAt: renewData.expires_in
              ? new Date(Date.now() + renewData.expires_in * 1000).toISOString()
              : null,
          });

          return NextResponse.json({
            success: true,
            message: 'Token erfolgreich auf Long-Lived Token erneuert',
            expiresIn: renewData.expires_in,
          });
        }

        // Token konnte nicht automatisch erneuert werden
        return NextResponse.json({
          success: false,
          error: 'Automatische Erneuerung fehlgeschlagen',
          details: renewData.error?.message,
          solution: 'Bitte erstelle einen neuen Token manuell über Meta Business Manager',
          instructions: {
            url: 'https://business.facebook.com/settings/system-users',
            permissions: ['whatsapp_business_management', 'whatsapp_business_messaging'],
          },
        });
      } catch (renewError) {
        return NextResponse.json({
          success: false,
          error: 'Automatische Erneuerung fehlgeschlagen',
          details: renewError instanceof Error ? renewError.message : String(renewError),
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Bitte gib einen neuen Token an oder setze attemptAutoRenew auf true',
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erneuern des Tokens',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
