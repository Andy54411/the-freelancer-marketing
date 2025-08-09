// ✅ Google Ads Firestore Debug API
// Zeigt alle gespeicherten Google Ads Konfigurationen in Firestore

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (companyId) {
      // Spezifische Company prüfen
      const googleAdsDocRef = db
        .collection('companies')
        .doc(companyId)
        .collection('integrations')
        .doc('googleAds');

      const googleAdsSnap = await googleAdsDocRef.get();

      return NextResponse.json({
        success: true,
        companyId,
        exists: googleAdsSnap.exists,
        data: googleAdsSnap.exists ? googleAdsSnap.data() : null,
        path: `companies/${companyId}/integrations/googleAds`,
      });
    } else {
      // Alle Companies mit Google Ads Integration auflisten
      const companiesRef = db.collection('companies');
      const companiesSnap = await companiesRef.get();

      const googleAdsConfigs: Array<{
        companyId: string;
        data: any;
        path: string;
      }> = [];

      for (const companyDoc of companiesSnap.docs) {
        const googleAdsDocRef = companyDoc.ref.collection('integrations').doc('googleAds');
        const googleAdsSnap = await googleAdsDocRef.get();

        if (googleAdsSnap.exists) {
          googleAdsConfigs.push({
            companyId: companyDoc.id,
            data: googleAdsSnap.data(),
            path: `companies/${companyDoc.id}/integrations/googleAds`,
          });
        }
      }

      return NextResponse.json({
        success: true,
        totalCompanies: companiesSnap.size,
        googleAdsConfigs,
        count: googleAdsConfigs.length,
      });
    }
  } catch (error) {
    console.error('Firestore Debug Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
