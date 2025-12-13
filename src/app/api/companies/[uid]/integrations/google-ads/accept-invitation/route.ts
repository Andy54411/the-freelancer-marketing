import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { GoogleAdsClientService } from '@/services/googleAdsClientService';

/**
 * POST - Accept manager invitation
 * Akzeptiert die Einladung vom Taskilo Manager Account
 * Der User muss bereits OAuth-Zugriff auf seinen Google Ads Account haben
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht initialisiert' },
        { status: 503 }
      );
    }

    // Hole die aktuelle Verbindung
    const docRef = db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads');

    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'Keine Google Ads Verbindung gefunden' },
        { status: 404 }
      );
    }

    const data = doc.data();
    const customerId = data?.customerId;
    const refreshToken = data?.oauth?.refresh_token || data?.refreshToken;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Keine Customer ID gefunden' },
        { status: 400 }
      );
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Kein Refresh Token gefunden. Bitte verbinden Sie Ihren Google Ads Account erneut.' },
        { status: 400 }
      );
    }

    // Versuche die Einladung anzunehmen
    const googleAdsService = new GoogleAdsClientService();
    const acceptResult = await googleAdsService.acceptManagerInvitation(customerId, refreshToken);

    if (acceptResult.success) {
      // Update den Status auf connected
      await docRef.update({
        status: 'connected',
        managerLinkStatus: 'ACTIVE',
        managerApproved: true,
        linkedAt: new Date().toISOString(),
        invitationError: null,
      });

      return NextResponse.json({
        success: true,
        message: 'Verkuepfung erfolgreich! Ihr Google Ads Account ist jetzt mit Taskilo verbunden.',
        status: 'connected',
      });
    } else {
      const error = acceptResult.error;
      const errorCode = typeof error === 'object' ? error?.code : 'UNKNOWN';
      const errorMessage = typeof error === 'object' ? error?.message : error;

      // Spezifische Fehlerbehandlung
      if (errorCode === 'NO_PENDING_INVITATION') {
        return NextResponse.json({
          success: false,
          error: errorMessage,
          status: 'requires_invitation',
          needsNewInvitation: true,
        });
      }

      if (errorCode === 'INVALID_LINK_STATUS') {
        return NextResponse.json({
          success: false,
          error: errorMessage,
          status: 'invalid_status',
          details: error,
        });
      }

      return NextResponse.json({
        success: false,
        error: errorMessage || 'Fehler beim Akzeptieren der Einladung',
        status: 'error',
        details: error,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
