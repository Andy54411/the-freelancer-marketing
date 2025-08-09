// ✅ Google Ads Reset API
// Löscht die gespeicherte Google Ads Konfiguration für einen Neustart

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID is required',
        },
        { status: 400 }
      );
    }

    console.log(`[Google Ads Reset] Resetting configuration for company: ${companyId}`);

    // Google Ads Konfiguration löschen
    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    // Prüfen ob Konfiguration existiert
    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json({
        success: true,
        message: 'No Google Ads configuration found to reset',
        companyId,
      });
    }

    const oldData = googleAdsSnap.data();
    console.log(`[Google Ads Reset] Found existing configuration:`, {
      hasLinkedAccounts: !!oldData?.linkedAccounts,
      accountCount: oldData?.linkedAccounts?.length || 0,
      lastSync: oldData?.lastSync,
      status: oldData?.status,
    });

    // Komplett löschen
    await googleAdsDocRef.delete();

    console.log(
      `[Google Ads Reset] Successfully deleted Google Ads configuration for company: ${companyId}`
    );

    return NextResponse.json({
      success: true,
      message: 'Google Ads configuration successfully reset',
      companyId,
      deletedData: {
        hadLinkedAccounts: !!oldData?.linkedAccounts,
        accountCount: oldData?.linkedAccounts?.length || 0,
        previousStatus: oldData?.status,
        lastSync: oldData?.lastSync,
      },
    });
  } catch (error) {
    console.error('[Google Ads Reset] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset Google Ads configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Use POST method to reset Google Ads configuration',
      usage: 'POST /api/google-ads/reset?companyId=YOUR_COMPANY_ID',
    },
    { status: 405 }
  );
}
