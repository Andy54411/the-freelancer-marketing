import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID ist erforderlich',
        },
        { status: 400 }
      );
    }

    // Prüfe direkt in Firebase, ob Google Ads Integration existiert
    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    // Prüfe in der korrekten Collection: advertising_connections
    const integrationDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json({
        success: true,
        hasAccessToken: false,
        isConnected: false,
      });
    }

    const data = integrationDoc.data();
    
    // 🔒 KRITISCH: OHNE Manager-Link = KEINE Verbindung!
    const hasManagerLink = data?.managerApproved === true && data?.managerLinkStatus === 'ACTIVE';
    const hasAccessToken = !!(data?.oauth?.access_token || data?.accessToken || data?.access_token);

    // Wenn keine Accounts gespeichert sind, versuche sie live zu laden
    let availableAccounts = data?.availableAccounts || [];

    if (hasAccessToken && availableAccounts.length === 0) {
      try {
        const refreshToken =
          data?.oauth?.refresh_token || data?.refreshToken || data?.refresh_token;
        if (refreshToken) {
          const { googleAdsClientService } = await import('@/services/googleAdsClientService');
          const accountsResponse =
            await googleAdsClientService.getAccessibleCustomers(refreshToken);

          if (accountsResponse.success && accountsResponse.data) {
            availableAccounts = accountsResponse.data.map(acc => ({
              customerId: acc.id,
              accountName: acc.name,
              currency: acc.currency,
              accountStatus: acc.status,
              isManager: acc.manager,
            }));

            // Speichere die Accounts für später
            await integrationDoc.ref.update({ availableAccounts });
          }
        }
      } catch (fetchError) {
        console.error('Failed to fetch accounts live:', fetchError);
      }
    }

    return NextResponse.json({
      success: true,
      hasAccessToken,
      isConnected: hasManagerLink, // NUR verbunden wenn Manager-Link AKTIV
      connectedAt: data?.connectedAt || data?.connected_at,
      customerId: data?.customerId || data?.customer_id,
      status: data?.status,
      accountName: data?.accountName,
      availableAccounts: availableAccounts,
      managerApproved: data?.managerApproved || false,
      managerLinkStatus: data?.managerLinkStatus || 'PENDING',
      requiresManagerLink: data?.requiresManagerLink !== false,
      testTokenMode: data?.testTokenMode || false,
      manualVerificationRequired: data?.manualVerificationRequired || false,
    });
  } catch (error) {
    console.error('Fehler beim Prüfen der Google Ads Integration:', error);
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();
    const { customerId, accountName } = body;

    if (!companyId || !customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID und Customer ID sind erforderlich',
        },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    const docRef = db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads');

    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine Verbindung gefunden',
        },
        { status: 404 }
      );
    }

    // Update connection with selected account
    // 🔒 SICHERHEITS-CHECK: Manager Account Verknüpfung prüfen
    const MANAGER_ID = '655-923-8498';

    // Wir brauchen den Refresh Token für den Check
    const data = doc.data();
    const refreshToken = data?.oauth?.refresh_token || data?.refreshToken || data?.refresh_token;

    if (refreshToken) {
      const { googleAdsClientService } = await import('@/services/googleAdsClientService');
      const linkCheck = await googleAdsClientService.isLinkedToManager(
        refreshToken,
        customerId,
        MANAGER_ID
      );

      // Wenn wir nicht verifizieren können (Test Token), versuche trotzdem Einladung zu senden
      // Falls die Einladung fehlschlägt, zeige klare Anweisungen für manuelle Verknüpfung
      if (!linkCheck.canVerify) {
        console.warn(
          `⚠️ Cannot verify manager link: ${linkCheck.reason} - attempting to send invitation anyway`
        );
      }

      // Wenn nicht verknüpft (oder nicht verifizierbar), versuche Einladung zu senden
      if (!linkCheck.linked || !linkCheck.canVerify) {
        // ✅ NEUE METHODE: Taskilo Manager sendet Einladung an Kunden
        const invitationResult = await googleAdsClientService.sendManagerInvitationFromManager(
          customerId
        );

        if (invitationResult.success) {
          // Einladung erfolgreich gesendet
          await docRef.update({
            customerId: customerId,
            accountName: accountName || `Google Ads Account ${customerId}`,
            status: 'pending_link',
            managerLinkStatus: 'PENDING',
            selectedAt: new Date().toISOString(),
          });

          return NextResponse.json({
            success: true,
            message: 'Verknüpfungsanfrage gesendet. Bitte akzeptieren Sie die Einladung in Ihrem Google Ads Account.',
            status: 'pending_link',
          });
        } else {
          // Einladung fehlgeschlagen - erlaube manuelle Verknüpfung
          console.error('Failed to send invitation:', invitationResult.error);
          
          await docRef.update({
            customerId: customerId,
            accountName: accountName || `Google Ads Account ${customerId}`,
            status: 'requires_manual_link',
            managerApproved: false,
            managerLinkStatus: 'REQUIRES_MANUAL_LINK',
            testTokenMode: !linkCheck.canVerify,
            manualVerificationRequired: true,
            invitationError: invitationResult.error?.message,
            selectedAt: new Date().toISOString(),
          });

          return NextResponse.json({
            success: true,
            message: `Account ausgewählt, aber automatische Verknüpfung fehlgeschlagen. Bitte verknüpfen Sie Ihren Google Ads Account (${customerId}) MANUELL mit dem Taskilo Manager Account (${MANAGER_ID}):\n\n1. Öffnen Sie ads.google.com\n2. Gehen Sie zu Einstellungen → Kontozugriff\n3. Klicken Sie auf "Manager-Konto verknüpfen"\n4. Geben Sie die Manager-ID ein: ${MANAGER_ID}\n5. Senden Sie die Einladung`,
            status: 'requires_manual_link',
            requiresManualLink: true,
          });
        }
      }

      // Wenn verknüpft, setze managerApproved auf true
      await docRef.update({
        managerApproved: true,
        managerLinkStatus: 'ACTIVE',
      });
    }

    await docRef.update({
      customerId: customerId,
      accountName: accountName || `Google Ads Account ${customerId}`,
      status: 'connected',
      accountStatus: 'ENABLED', // Assume enabled if selected
      selectedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Account erfolgreich ausgewählt',
    });
  } catch (error) {
    console.error('Fehler beim Speichern der Account-Auswahl:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Interner Serverfehler',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update Manager Approval Status (für Debugging/Admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();
    const { managerApproved, managerLinkStatus, status } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    const docRef = db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads');

    const updateData: Record<string, unknown> = {};
    if (typeof managerApproved === 'boolean') {
      updateData.managerApproved = managerApproved;
    }
    if (managerLinkStatus) {
      updateData.managerLinkStatus = managerLinkStatus;
    }
    if (status) {
      updateData.status = status;
    }

    await docRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Status aktualisiert',
      updated: updateData,
    });
  } catch (error) {
    console.error('Fehler beim Update:', error);
    return NextResponse.json(
      { success: false, error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}
