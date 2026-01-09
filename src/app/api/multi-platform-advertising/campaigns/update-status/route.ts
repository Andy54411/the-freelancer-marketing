import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';
import { db as adminDb, auth as adminAuth, admin } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    // Check if Firebase is available
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Firebase not available' }, { status: 500 });
    }

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(token);
    const _userId = decodedToken.uid;

    const { companyId, campaignId, status }: { 
      companyId: string; 
      campaignId: string; 
      status: 'ENABLED' | 'PAUSED'; 
    } = await req.json();

    if (!companyId || !campaignId || !status) {
      return NextResponse.json({
        success: false,
        error: 'CompanyId, CampaignId und Status sind erforderlich',
      }, { status: 400 });
    }

    // Kampagne aus Firestore abrufen
    const campaignsSnapshot = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('advertising_campaigns')
      .where('id', '==', campaignId)
      .where('platform', '==', 'google-ads')
      .limit(1)
      .get();

    if (campaignsSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Kampagne nicht gefunden',
      }, { status: 404 });
    }

    const campaignDoc = campaignsSnapshot.docs[0];
    const campaignData = campaignDoc.data();

    // Google Ads OAuth Token abrufen
    const connectionDoc = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Keine Google Ads Verbindung gefunden',
      }, { status: 400 });
    }

    const connectionData = connectionDoc.data();
    if (!connectionData?.access_token || !connectionData?.refresh_token) {
      return NextResponse.json({
        success: false,
        error: 'Google Ads Authentifizierung ungültig',
      }, { status: 400 });
    }

    // Google Ads API Client initialisieren
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
      customer_id: campaignData.customerId,
      refresh_token: connectionData.refresh_token,
    });

    // Status in Google Ads aktualisieren
    const updateData = {
      resource_name: campaignData.resource_name,
      status: status === 'ENABLED' ? 2 : 3, // ENABLED : PAUSED
    };

    try {
      await customer.campaigns.update([updateData]);
    } catch (googleAdsError) {
      console.error('Google Ads API error:', googleAdsError);
      return NextResponse.json({
        success: false,
        error: 'Fehler beim Aktualisieren der Kampagne in Google Ads',
        details: googleAdsError instanceof Error ? googleAdsError.message : 'Unbekannter Fehler',
      }, { status: 500 });
    }

    // Status in Firestore aktualisieren
    await campaignDoc.ref.update({
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Kampagnenstatus erfolgreich zu "${status}" geändert`,
      data: {
        campaignId: campaignId,
        newStatus: status,
      },
    });

  } catch (error) {
    console.error('Campaign status update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unerwarteter Fehler beim Aktualisieren des Kampagnenstatus',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}