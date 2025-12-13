import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { GoogleAdsClientService } from '@/services/googleAdsClientService';

/**
 * POST - Retry sending manager invitation
 * Versucht erneut, eine Einladung vom Taskilo Manager Account an den Kunden-Account zu senden
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
    // OAuth Tokens sind unter data.oauth gespeichert
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

    // Versuche erneut, die Einladung zu senden
    // Verwende den User-Refresh-Token, da dieser Zugriff auf den Manager-Account hat
    const googleAdsService = new GoogleAdsClientService();
    const invitationResult = await googleAdsService.sendManagerInvitationFromManager(customerId, refreshToken);

    if (invitationResult.success) {
      // Update den Status
      await docRef.update({
        status: 'pending_link',
        managerLinkStatus: 'PENDING',
        lastInvitationAttempt: new Date().toISOString(),
        invitationError: null,
      });

      return NextResponse.json({
        success: true,
        message: 'Verknüpfungsanfrage erfolgreich gesendet. Bitte akzeptieren Sie die Einladung in Ihrem Google Ads Account.',
        status: 'pending_link',
      });
    } else {
      // Prüfe auf spezifische Fehler
      const error = invitationResult.error;
      const errorMessage = typeof error === 'object' ? error?.message : error;
      const isTestTokenError = errorMessage?.includes('approved for use with test accounts');
      const isAlreadyLinked = errorMessage?.includes('ALREADY_EXISTS') || errorMessage?.includes('already linked');

      if (isAlreadyLinked) {
        // Prüfe ob tatsächlich verknüpft
        await docRef.update({
          status: 'pending_link',
          managerLinkStatus: 'PENDING',
          lastInvitationAttempt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: 'Eine Verknüpfungsanfrage existiert bereits. Bitte prüfen Sie Ihren Google Ads Account.',
          status: 'pending_link',
          alreadyExists: true,
        });
      }

      if (isTestTokenError) {
        // Test Token kann keine Production Accounts einladen
        await docRef.update({
          status: 'requires_manual_link',
          managerLinkStatus: 'REQUIRES_MANUAL_LINK',
          testTokenMode: true,
          invitationError: 'Test Developer Token - Manuelle Verknüpfung erforderlich',
          lastInvitationAttempt: new Date().toISOString(),
        });

        return NextResponse.json({
          success: false,
          error: 'Der Developer Token hat nur Test-Zugriff. Bitte verknüpfen Sie Ihren Account manuell.',
          status: 'requires_manual_link',
          requiresManualLink: true,
          isTestTokenError: true,
        });
      }

      // Allgemeiner Fehler
      await docRef.update({
        status: 'requires_manual_link',
        managerLinkStatus: 'REQUIRES_MANUAL_LINK',
        invitationError: errorMessage,
        lastInvitationAttempt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: false,
        error: errorMessage || 'Fehler beim Senden der Einladung',
        status: 'requires_manual_link',
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
