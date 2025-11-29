import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { GoogleAdsClientService } from '@/services/googleAdsClientService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();
    const { customerId } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    // Verbinde existierendes Konto
    if (!customerId) {
      return NextResponse.json({
        success: false,
        requiresTestAccount: true,
        message: `Bitte erstellen Sie zuerst ein Google Ads Test-Konto:\n\n1. Öffnen Sie https://ads.google.com/\n2. Klicken Sie auf "Test-Konto erstellen"\n3. Füllen Sie die Angaben aus:\n   - Kontoname: Taskilo Test\n   - Währung: EUR\n   - Zeitzone: Europe/Berlin\n4. Notieren Sie die Customer ID\n5. Geben Sie die Customer ID hier ein`,
        testAccountUrl: 'https://ads.google.com/aw/overview',
      });
    }

    const googleAdsService = new GoogleAdsClientService();
    const invitationResult = await googleAdsService.sendManagerInvitationFromManager(customerId);

    // PRÜFE ob es ein Production Account ist (Fehler: "only approved for use with test accounts")
    if (!invitationResult.success && 
        invitationResult.error?.message?.includes('only approved for use with test accounts')) {
      
      console.error('[Google Ads] PRODUCTION Account erkannt - Test Developer Token funktioniert nicht!');
      
      return NextResponse.json({
        success: false,
        error: 'PRODUCTION_ACCOUNT_NOT_SUPPORTED',
        message: `❌ Dies ist ein Production Account!\n\nDer Taskilo Test Developer Token funktioniert nur mit Test-Konten.\n\nBitte erstellen Sie ein Test-Konto:\n\n1. Öffnen Sie ads.google.com\n2. Melden Sie sich mit einem NEUEN Google-Konto an\n3. Erstellen Sie ein neues Konto\n4. Verwenden Sie die Customer ID des neuen Test-Kontos\n\nProduction Account ${customerId} kann nicht verwendet werden.`,
        isProductionAccount: true,
        customerId: customerId,
      }, { status: 400 });
    }

    // KEINE automatische Freigabe - immer warten auf echte Verknüpfung
    if (!invitationResult.success) {
      const MANAGER_ID = '655-923-8498';
      
      // Speichere Anfrage als PENDING
      await db
        .collection('companies')
        .doc(companyId)
        .collection('advertising_connections')
        .doc('google-ads')
        .set({
          platform: 'google-ads',
          customerId: customerId,
          managerApproved: false,
          managerLinkStatus: 'PENDING',
          status: 'pending_manual_link',
          connectedAt: new Date().toISOString(),
          invitationSent: false,
          invitationError: invitationResult.error?.message,
        });

      return NextResponse.json({
        success: true,
        requiresManualLink: true,
        message: `Automatische Einladung fehlgeschlagen.\n\nBitte verknüpfen Sie Ihren Google Ads Account MANUELL:\n\n1. Öffnen Sie https://ads.google.com (Account ${customerId})\n2. Gehen Sie zu Einstellungen → Kontozugriff → Manager-Konten\n3. Klicken Sie auf "Manager-Konto verknüpfen"\n4. Geben Sie die Manager-ID ein: ${MANAGER_ID}\n5. Senden Sie die Einladung\n\nSobald Taskilo die Einladung akzeptiert hat, können Sie Google Ads nutzen.`,
        managerAccountId: MANAGER_ID,
      });
    }

    // Einladung erfolgreich gesendet - trotzdem PENDING bis akzeptiert
    await db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads')
      .set({
        platform: 'google-ads',
        customerId: customerId,
        managerApproved: false,
        managerLinkStatus: 'PENDING',
        status: 'pending_acceptance',
        connectedAt: new Date().toISOString(),
        invitationSent: true,
        invitationSentAt: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Einladung versendet. Bitte akzeptieren Sie die Verknüpfungsanfrage in Ihrem Google Ads Account.',
    });
  } catch (error) {
    console.error('Fehler beim Verbinden:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei der Verbindung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
