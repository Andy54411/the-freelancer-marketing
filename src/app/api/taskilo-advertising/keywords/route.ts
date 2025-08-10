// 🎯 WHITE-LABEL TASKILO ADVERTISING - Keywords API
// Vollständige Keyword-Verwaltung über Taskilo Interface

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

/**
 * 📋 GET /api/taskilo-advertising/keywords - Keywords für White-Label Interface abrufen
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Taskilo Advertising Keywords API called');

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
          error: 'Google Ads nicht verknüpft',
          action: 'connect_google_ads',
          redirect: `/dashboard/company/${companyId}/taskilo-advertising`,
        },
        { status: 404 }
      );
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json({ error: 'Google Ads Token nicht verfügbar' }, { status: 400 });
    }

    // Hole verfügbare Customer IDs
    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      accountConfig.refreshToken
    );

    if (!customersResponse.success || !customersResponse.data?.length) {
      return NextResponse.json({ error: 'Keine Google Ads Accounts verfügbar' }, { status: 400 });
    }

    // Verwende ersten verfügbaren Account
    const customerId = customersResponse.data[0].id;

    // Hole Keywords über White-Label Service
    const keywordsResponse = await googleAdsClientService.getKeywords(
      accountConfig.refreshToken,
      customerId,
      adGroupId
    );

    if (!keywordsResponse.success) {
      return NextResponse.json(
        {
          error: 'Fehler beim Laden der Keywords',
          details: keywordsResponse.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        keywords: keywordsResponse.data,
        account: {
          id: customerId,
          name: customersResponse.data[0].name,
        },
        filters: {
          adGroupId: adGroupId || null,
        },
        // White-Label Branding
        platform: 'Taskilo Advertising',
        feature: 'Keyword Management',
      },
    });
  } catch (error: any) {
    console.error('❌ Taskilo Advertising Keywords error:', error);
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
 * 🎯 POST /api/taskilo-advertising/keywords - Neues Keyword erstellen
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Creating new keyword via Taskilo Advertising...');

    const body = await request.json();
    const { companyId, adGroupId, keyword, matchType, cpc, finalUrl } = body;

    if (!companyId || !adGroupId || !keyword) {
      return NextResponse.json(
        { error: 'Company ID, Ad Group ID und Keyword sind erforderlich' },
        { status: 400 }
      );
    }

    // TODO: Implement keyword creation
    // This would integrate with Google Ads API to create keywords

    return NextResponse.json({
      success: true,
      message: 'Keyword-Erstellung über Taskilo Advertising (in Entwicklung)',
      data: {
        platform: 'Taskilo Advertising',
        feature: 'Keyword Creation',
        status: 'development',
      },
    });
  } catch (error: any) {
    console.error('❌ Keyword creation error:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen des Keywords',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
