import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import { db as adminDb, auth as adminAuth, admin } from '@/firebase/server';
import { getBiddingStrategy } from '@/services/google-ads-helper';interface CampaignData {
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
    const connectionDoc = await db
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

    // Google Ads API Client initialisieren
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    // Customer ID aus der Verbindung abrufen
    const customerId = connectionData.customer_id;
    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'Google Ads Kunden-ID nicht gefunden.',
      }, { status: 400 });
    }

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: connectionData.refresh_token,
    });

    // Budget erstellen
    const budgetResourceName = `customers/${customerId}/campaignBudgets/${Date.now()}`;
    const budgetData = {
      resource_name: budgetResourceName,
      name: `Budget für ${campaignData.name}`,
      amount_micros: campaignData.budget.dailyBudget * 1000000, // In Mikros konvertieren
      delivery_method: 2, // STANDARD
      explicitly_shared: false,
    };

    try {
      await customer.campaignBudgets.create([budgetData]);
    } catch (budgetError) {
      console.error('Budget creation error:', budgetError);
      return NextResponse.json({
        success: false,
        error: 'Fehler beim Erstellen des Kampagnenbudgets',
        details: budgetError instanceof Error ? budgetError.message : 'Unbekannter Fehler',
      }, { status: 500 });
    }

    // Kampagnentyp-Mapping
    const campaignTypeMapping = {
      'SEARCH': 2, // SEARCH
      'DISPLAY': 3, // DISPLAY
      'SHOPPING': 5, // SHOPPING
      'VIDEO': 6, // VIDEO
      'PERFORMANCE_MAX': 13, // PERFORMANCE_MAX
    };

    // Gebotsstrategie-Mapping
    const getBiddingStrategy = (strategy: CampaignData['biddingStrategy']) => {
      switch (strategy.type) {
        case 'TARGET_CPA':
          return {
            target_cpa: {
              target_cpa_micros: strategy.targetCpa ? strategy.targetCpa * 1000000 : undefined,
            },
          };
        case 'TARGET_ROAS':
          return {
            target_roas: {
              target_roas: strategy.targetRoas,
            },
          };
        case 'MAXIMIZE_CLICKS':
          return { maximize_clicks: {} };
        case 'MAXIMIZE_CONVERSIONS':
          return { maximize_conversions: {} };
        case 'MANUAL_CPC':
          return {
            manual_cpc: {
              enhanced_cpc_enabled: true,
            },
          };
        default:
          return { maximize_clicks: {} };
      }
    };

    // Kampagne erstellen
    const campaignResourceName = `customers/${customerId}/campaigns/${Date.now()}`;
    const campaignCreateData = {
      resource_name: campaignResourceName,
      name: campaignData.name,
      type: campaignTypeMapping[campaignData.type],
      status: campaignData.status === 'ENABLED' ? 2 : 3, // ENABLED : PAUSED
      campaign_budget: budgetResourceName,
      ...getBiddingStrategy(campaignData.biddingStrategy),
      start_date: campaignData.schedule.startDate.replace(/-/g, ''),
      end_date: campaignData.schedule.endDate?.replace(/-/g, ''),
      network_settings: {
        target_google_search: campaignData.type === 'SEARCH',
        target_search_network: campaignData.type === 'SEARCH',
        target_content_network: campaignData.type === 'DISPLAY',
        target_partner_search_network: false,
      },
    };

    let campaignResult;
    try {
      campaignResult = await customer.campaigns.create([campaignCreateData]);
    } catch (campaignError) {
      console.error('Campaign creation error:', campaignError);
      return NextResponse.json({
        success: false,
        error: 'Fehler beim Erstellen der Kampagne',
        details: campaignError instanceof Error ? campaignError.message : 'Unbekannter Fehler',
      }, { status: 500 });
    }

    // Bei Suchnetzwerk-Kampagnen: Anzeigengruppe und Keywords erstellen
    if (campaignData.type === 'SEARCH' && campaignData.targeting.keywords.length > 0) {
      // Anzeigengruppe erstellen
      const adGroupResourceName = `customers/${customerId}/adGroups/${Date.now()}`;
      const adGroupData = {
        resource_name: adGroupResourceName,
        name: `${campaignData.name} - Anzeigengruppe`,
        campaign: campaignResult.results[0].resource_name,
        type: 2, // SEARCH_STANDARD
        status: 2, // ENABLED
        cpc_bid_micros: 1000000, // 1 EUR Standard-Gebot
      };

      try {
        await customer.adGroups.create([adGroupData]);

        // Keywords hinzufügen
        const keywordData = campaignData.targeting.keywords.map((keyword, index) => ({
          resource_name: `customers/${customerId}/adGroupCriteria/${Date.now()}_${index}`,
          ad_group: adGroupResourceName,
          keyword: {
            text: keyword,
            match_type: 3, // BROAD
          },
          status: 2, // ENABLED
        }));

        await customer.adGroupCriteria.create(keywordData);

        // Textanzeigen erstellen
        if (campaignData.ads.length > 0) {
          const adData = campaignData.ads
            .filter(ad => ad.finalUrl && ad.headlines.some(h => h.trim()) && ad.descriptions.some(d => d.trim()))
            .map((ad, index) => ({
              resource_name: `customers/${customerId}/adGroupAds/${Date.now()}_${index}`,
              ad_group: adGroupResourceName,
              status: 2, // ENABLED
              ad: {
                type: 15, // RESPONSIVE_SEARCH_AD
                final_urls: [ad.finalUrl],
                responsive_search_ad: {
                  headlines: ad.headlines
                    .filter(h => h.trim())
                    .map(headline => ({
                      text: headline,
                      pinned_field: 1, // HEADLINE_1
                    })),
                  descriptions: ad.descriptions
                    .filter(d => d.trim())
                    .map(description => ({
                      text: description,
                    })),
                },
              },
            }));

          if (adData.length > 0) {
            await customer.adGroupAds.create(adData);
          }
        }
      } catch (adGroupError) {
        console.error('AdGroup/Keywords creation error:', adGroupError);
        // Kampagne wurde erstellt, aber Anzeigengruppe/Keywords fehlgeschlagen
        // Das ist nicht kritisch - Benutzer kann diese später hinzufügen
      }
    }

    // Kampagne in Firestore speichern
    const campaignFirestoreData = {
      id: campaignResult.results[0].resource_name.split('/').pop(),
      resource_name: campaignResult.results[0].resource_name,
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
    };

    await db
      .collection('companies')
      .doc(companyId)
      .collection('advertising_campaigns')
      .add(campaignFirestoreData);

    return NextResponse.json({
      success: true,
      message: 'Kampagne erfolgreich erstellt',
      data: {
        campaignId: campaignResult.results[0].resource_name.split('/').pop(),
        resourceName: campaignResult.results[0].resource_name,
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