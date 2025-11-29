import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();
    const { googleAdsEmail, googleAdsCustomerId, managementType, message } = body;

    if (!companyId || !googleAdsEmail || !googleAdsCustomerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID, Google Ads Email und Customer ID sind erforderlich',
        },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase nicht initialisiert');
    }

    // Speichere die Anfrage in Firestore
    const requestData = {
      companyId,
      googleAdsEmail,
      googleAdsCustomerId: googleAdsCustomerId,
      managementType: managementType || 'taskilo',
      message: message || null,
      status: 'pending_approval', // pending_approval, approved, rejected
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
    };

    // Speichere in companies/{companyId}/integration_requests/google-ads
    await db
      .collection('companies')
      .doc(companyId)
      .collection('integration_requests')
      .doc('google-ads')
      .set(requestData);

    // Erstelle eine Notification für Admins
    await db.collection('notifications').add({
      type: 'google_ads_integration_request',
      companyId,
      title: 'Neue Google Ads Integration Anfrage',
      message: `${googleAdsEmail} möchte Google Ads integrieren`,
      data: requestData,
      read: false,
      createdAt: new Date().toISOString(),
      targetAudience: 'admin', // Nur für Admins sichtbar
    });

    // Update company advertising_connections status
    await db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_connections')
      .doc('google-ads')
      .set(
        {
          status: 'pending_approval',
          googleAdsEmail,
          googleAdsCustomerId: googleAdsCustomerId,
          managementType,
          requestedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({
      success: true,
      message: 'Anfrage erfolgreich gesendet',
    });
  } catch (error) {
    console.error('Fehler beim Speichern der Google Ads Anfrage:', error);
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
