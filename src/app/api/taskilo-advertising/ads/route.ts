// 🎯 WHITE-LABEL TASKILO ADVERTISING - Ads API
// Vollständige Anzeigen-Verwaltung über Taskilo Interface

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

/**
 * 🎨 GET /api/taskilo-advertising/ads - Anzeigen für White-Label Interface abrufen
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Taskilo Advertising Ads API called');

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const adGroupId = searchParams.get('adGroupId') || undefined;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Hole Google Ads Konfiguration aus Firestore
    const googleAdsSnap = await db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds')
      .get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json(
        {
          error: 'Taskilo Advertising nicht aktiviert',
          action: 'setup_advertising',
          redirect: `/dashboard/company/${companyId}/taskilo-advertising`,
        },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        { error: 'Advertising-Verbindung nicht verfügbar' },
        { status: 400 }
      );
    }

    // Hole verfügbare Customer IDs
    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      accountConfig.refreshToken
    );

    if (!customersResponse.success || !customersResponse.data?.length) {
      return NextResponse.json({ error: 'Keine Advertising-Accounts verfügbar' }, { status: 400 });
    }

    // Verwende ersten verfügbaren Account
    const customerId = customersResponse.data[0].id;

    // Hole Anzeigen über White-Label Service
    const adsResponse = await googleAdsClientService.getAds(
      accountConfig.refreshToken,
      customerId,
      adGroupId
    );

    if (!adsResponse.success) {
      return NextResponse.json(
        {
          error: 'Fehler beim Laden der Anzeigen',
          details: adsResponse.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ads: adsResponse.data,
        account: {
          id: customerId,
          name: customersResponse.data[0].name,
        },
        filters: {
          adGroupId: adGroupId || null,
        },
        // White-Label Branding
        platform: 'Taskilo Advertising',
        feature: 'Anzeigen-Verwaltung',
        capabilities: [
          'Anzeigen erstellen',
          'Performance tracking',
          'A/B Testing',
          'Responsive Search Ads',
          'Text Ads',
        ],
      },
    });
  } catch (error: any) {
    console.error('❌ Taskilo Advertising Ads error:', error);
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * 🎯 POST /api/taskilo-advertising/ads - Neue Anzeige erstellen
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Creating new ad via Taskilo Advertising...');

    const body = await request.json();
    const { companyId, adGroupId, type, headlines, descriptions, finalUrls, displayUrl } = body;

    if (!companyId || !adGroupId || !headlines?.length || !descriptions?.length) {
      return NextResponse.json(
        { error: 'Erforderliche Felder: Company ID, Ad Group ID, Headlines, Descriptions' },
        { status: 400 }
      );
    }

    // TODO: Implement ad creation via Google Ads API
    // This would create ads through the Google Ads Client Library

    return NextResponse.json({
      success: true,
      message: 'Anzeigen-Erstellung über Taskilo Advertising (in Entwicklung)',
      data: {
        platform: 'Taskilo Advertising',
        feature: 'Anzeigen-Erstellung',
        status: 'development',
        preview: {
          type,
          headlines: headlines.slice(0, 3), // Show first 3 headlines
          descriptions: descriptions.slice(0, 2), // Show first 2 descriptions
          finalUrls,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Ad creation error:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der Anzeige',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
