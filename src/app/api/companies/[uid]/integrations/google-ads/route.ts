import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'Company ID ist erforderlich'
      }, { status: 400 });
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
        isConnected: false
      });
    }

    const data = integrationDoc.data();
    // Prüfe auf OAuth-Token (gespeichert unter oauth.access_token)
    const hasAccessToken = !!(data?.oauth?.access_token || data?.accessToken || data?.access_token);

    return NextResponse.json({
      success: true,
      hasAccessToken,
      isConnected: hasAccessToken,
      connectedAt: data?.connectedAt || data?.connected_at,
      customerId: data?.customerId || data?.customer_id,
      status: data?.status,
      accountName: data?.accountName
    });

  } catch (error) {
    console.error('Fehler beim Prüfen der Google Ads Integration:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}