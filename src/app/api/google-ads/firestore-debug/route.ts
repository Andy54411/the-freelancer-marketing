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
    console.error('[Google Ads Firestore Debug] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Google Ads configurations',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE METHOD FOR RESET
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID is required for deletion',
        },
        { status: 400 }
      );
    }

    console.log(`[Google Ads Reset] Deleting configuration for company: ${companyId}`);

    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    // Check if exists first
    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json({
        success: true,
        message: 'No Google Ads configuration found to delete',
        companyId,
      });
    }

    const oldData = googleAdsSnap.data();
    console.log(`[Google Ads Reset] Found configuration:`, {
      hasLinkedAccounts: !!oldData?.linkedAccounts,
      accountCount: oldData?.linkedAccounts?.length || 0,
      lastSync: oldData?.lastSync,
      status: oldData?.status,
    });

    // Delete the document
    await googleAdsDocRef.delete();

    console.log(`[Google Ads Reset] Successfully deleted configuration for company: ${companyId}`);

    return NextResponse.json({
      success: true,
      message: 'Google Ads configuration deleted successfully',
      companyId,
      deletedPath: `companies/${companyId}/integrations/googleAds`,
      oldData: {
        accountCount: oldData?.linkedAccounts?.length || 0,
        lastSync: oldData?.lastSync,
      },
    });
  } catch (error) {
    console.error('[Google Ads Reset] Error deleting configuration:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete Google Ads configuration',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
