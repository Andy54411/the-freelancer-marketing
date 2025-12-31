import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb, auth as adminAuth, admin } from '@/firebase/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

interface CampaignData {
  name: string;
  type: 'SEARCH' | 'DISPLAY' | 'SHOPPING' | 'VIDEO' | 'PERFORMANCE_MAX';
  status: 'DRAFT' | 'ENABLED' | 'PAUSED';
  budget: {
    dailyBudget: number;
    currency: string;
  };
  biddingStrategy: {
    type: string;
    targetCpa?: number;
    targetRoas?: number;
  };
  targeting: {
    locations: string[];
    languages: string[];
    keywords: string[];
    demographics: {
      ageRanges: string[];
      genders: string[];
    };
  };
  ads: Array<{
    headlines: string[];
    descriptions: string[];
    finalUrl: string;
    displayUrl?: string;
  }>;
  schedule: {
    startDate: string;
    endDate?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        error: 'Datenbank nicht verfügbar',
      }, { status: 500 });
    }

    const { companyId, campaignData }: { companyId: string; campaignData: CampaignData } = await request.json();

    if (!companyId || !campaignData) {
      return NextResponse.json({
        success: false,
        error: 'CompanyId und CampaignData sind erforderlich',
      }, { status: 400 });
    }

    // Validierung der erforderlichen Felder
    if (!campaignData.name?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Kampagnenname ist erforderlich',
      }, { status: 400 });
    }

    if (campaignData.budget.dailyBudget <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Tägliches Budget muss größer als 0 sein',
      }, { status: 400 });
    }

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
        error: 'Keine Google Ads Verbindung gefunden. Bitte verbinden Sie zuerst Ihr Google Ads Konto.',
      }, { status: 400 });
    }

    const connectionData = connectionDoc.data();
    if (!connectionData?.access_token || !connectionData?.refresh_token) {
      return NextResponse.json({
        success: false,
        error: 'Google Ads Authentifizierung ungültig. Bitte verbinden Sie Ihr Konto erneut.',
      }, { status: 400 });
    }

    const customerId = connectionData.customer_id;
    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'Google Ads Kunden-ID nicht gefunden.',
      }, { status: 400 });
    }

    // Verwende den zentralen Service für die Kampagnenerstellung
    const serviceResult = await googleAdsClientService.createComprehensiveCampaign(
      connectionData.refresh_token,
      customerId,
      {
        name: campaignData.name,
        budgetAmountMicros: campaignData.budget.dailyBudget * 1000000,
        advertisingChannelType: campaignData.type,
        biddingStrategyType: campaignData.biddingStrategy.type,
        startDate: campaignData.schedule.startDate,
        endDate: campaignData.schedule.endDate,
        adGroups: [
          {
            name: `${campaignData.name} - Anzeigengruppe 1`,
            cpcBidMicros: 1000000, // 1 EUR Default
            keywords: campaignData.targeting.keywords.map(k => ({
              text: k,
              matchType: 'BROAD'
            })),
            ads: campaignData.ads.map(ad => ({
              headlines: ad.headlines,
              descriptions: ad.descriptions,
              finalUrls: [ad.finalUrl]
            }))
          }
        ],
        targetingOptions: {
          locations: campaignData.targeting.locations,
          languages: campaignData.targeting.languages
        },
        customerAcquisition: campaignData.customerAcquisition
      }
    );

    if (!serviceResult.success || !serviceResult.data) {
      return NextResponse.json({
        success: false,
        error: serviceResult.error?.message || 'Fehler bei der Kampagnenerstellung',
        details: serviceResult.error
      }, { status: 500 });
    }

    // Kampagne in Firestore speichern
    const campaignFirestoreData = {
      id: serviceResult.data.campaignId,
      resource_name: `customers/${customerId}/campaigns/${serviceResult.data.campaignId}`,
      name: campaignData.name,
      type: campaignData.type,
      status: campaignData.status,
      budget: campaignData.budget,
      biddingStrategy: campaignData.biddingStrategy,
      targeting: campaignData.targeting,
      schedule: campaignData.schedule,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      platform: 'google-ads',
      customerId: customerId,
      adGroupIds: serviceResult.data.adGroupIds
    };

    await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('advertising_campaigns')
      .add(campaignFirestoreData);

    return NextResponse.json({
      success: true,
      message: 'Kampagne erfolgreich erstellt',
      data: {
        campaignId: serviceResult.data.campaignId,
        resourceName: campaignFirestoreData.resource_name,
        name: campaignData.name,
        status: campaignData.status,
      },
    });

  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unerwarteter Fehler beim Erstellen der Kampagne',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}