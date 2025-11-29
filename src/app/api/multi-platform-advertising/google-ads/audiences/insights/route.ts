import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const audienceId = searchParams.get('audienceId');

    if (!companyId || !audienceId) {
      return NextResponse.json({
        success: false,
        error: 'CompanyId und AudienceId sind erforderlich',
      }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({
        success: false,
        error: 'Datenbankverbindung nicht verfügbar',
      }, { status: 500 });
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
        error: 'Keine Google Ads Verbindung gefunden.',
      }, { status: 400 });
    }

    const connectionData = connectionDoc.data();
    
    let refreshToken = connectionData?.refresh_token;

    if (!refreshToken) {
      const managerToken = process.env.GOOGLE_ADS_MANAGER_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN;
      if (managerToken) {
        refreshToken = managerToken;
      }
    }

    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'Google Ads Authentifizierung ungültig.',
      }, { status: 400 });
    }

    const customerId = connectionData?.customer_id || connectionData?.customerId;
    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'Google Ads Kunden-ID nicht gefunden.',
      }, { status: 400 });
    }

    const result = await googleAdsClientService.getAudienceInsights(
      refreshToken,
      customerId,
      audienceId
    );
    
    if (!result.success) {
        // Fallback, falls Insights fehlschlagen (z.B. nicht genügend Daten)
        // Wir geben leere Listen zurück, damit das UI nicht bricht
        return NextResponse.json({
            success: true,
            data: {
                relatedSegments: [],
                youtubeCategories: [],
                weeklyImpressions: "Nicht verfügbar",
                description: ""
            }
        });
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Audience insights error:', error);
    return NextResponse.json({
      success: false,
      error: 'Fehler bei den Insights',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
