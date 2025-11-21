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
    // Prüfe auf OAuth-Token (gespeichert unter oauth.access_token)
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
      isConnected: hasAccessToken,
      connectedAt: data?.connectedAt || data?.connected_at,
      customerId: data?.customerId || data?.customer_id,
      status: data?.status,
      accountName: data?.accountName,
      availableAccounts: availableAccounts,
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
    const MANAGER_ID = '578-822-9684';

    // Wir brauchen den Refresh Token für den Check
    const data = doc.data();
    const refreshToken = data?.oauth?.refresh_token || data?.refreshToken || data?.refresh_token;

    if (refreshToken) {
      const { googleAdsClientService } = await import('@/services/googleAdsClientService');
      const isLinked = await googleAdsClientService.isLinkedToManager(
        refreshToken,
        customerId,
        MANAGER_ID
      );

      if (!isLinked) {
        return NextResponse.json(
          {
            success: false,
            error: 'ACCOUNT_NOT_LINKED',
            message: `Der ausgewählte Account ist nicht mit dem Taskilo Verwaltungskonto (${MANAGER_ID}) verknüpft. Bitte verknüpfen Sie den Account zuerst.`,
          },
          { status: 400 }
        );
      }

      // Wenn verknüpft, setze managerApproved auf true
      await docRef.update({
        managerApproved: true,
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
