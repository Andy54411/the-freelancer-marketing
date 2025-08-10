// Google Ads Test Account Creator
// Erstellt Test Manager Account für Development und Testing

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Google Ads Test Account Setup Guide',
      instructions: [
        {
          step: 1,
          title: 'Google Ads Test Manager Account erstellen',
          description: 'Besuchen Sie ads.google.com und erstellen Sie einen neuen Manager Account',
          url: 'https://ads.google.com',
          details: [
            'Wählen Sie "Manager Account" als Account-Typ',
            'Verwenden Sie eine Test-Email-Adresse',
            'Setzen Sie den Account auf "Test Modus"',
          ],
        },
        {
          step: 2,
          title: 'Test Client Account erstellen',
          description: 'Erstellen Sie unter dem Manager Account Test Client Accounts',
          details: [
            'Manager Account → "Accounts" → "Create Account"',
            'Account Type: "Client Account"',
            'Währung: EUR (Deutschland)',
            'Zeitzone: Europe/Berlin',
            'Account Name: "Test Account für Taskilo"',
          ],
        },
        {
          step: 3,
          title: 'Google Ads API Zugang konfigurieren',
          description: 'Verbinden Sie die Test Accounts mit der Taskilo Platform',
          details: [
            'Gehen Sie zu Google Ads → Einstellungen → API-Zugang',
            'Developer Token Status sollte "Test Account Access" anzeigen',
            'Kopieren Sie die Customer IDs der Test Accounts',
            'Fügen Sie diese in Taskilo hinzu über die Google Ads Integration',
          ],
        },
        {
          step: 4,
          title: 'Test Campaign erstellen',
          description: 'Testen Sie die Campaign Creation mit Test Accounts',
          details: [
            'Verwenden Sie niedrige Budgets (1-10€)',
            'Keywords: Verwenden Sie "test" im Keyword-Namen',
            'Anzeigen: Markieren Sie Headlines mit [TEST]',
            'URLs: Verwenden Sie Test-Domains oder localhost',
          ],
        },
      ],
      resources: {
        googleAdsTestAccounts:
          'https://developers.google.com/google-ads/api/docs/concepts/test-accounts',
        googleAdsApiAccess: 'https://developers.google.com/google-ads/api/docs/first-call/overview',
        taskiloGoogleAdsIntegration: `/dashboard/company/${companyId}/google-ads/settings`,
      },
      benefits: [
        '✅ Keine echten Kosten',
        '✅ Vollständige API-Funktionalität',
        '✅ Sichere Testing-Umgebung',
        '✅ Keine Auswirkungen auf echte Accounts',
        '✅ Developer Token funktioniert ohne Einschränkungen',
      ],
      warnings: [
        '⚠️ Test Accounts zeigen keine echten Impressions/Klicks',
        '⚠️ Anzeigen werden nicht real ausgeliefert',
        '⚠️ Performance-Daten sind simuliert',
        '⚠️ Regelmäßige Bereinigung erforderlich',
      ],
      nextSteps: {
        createTestAccount: 'Erstellen Sie einen Google Ads Test Manager Account',
        configureIntegration: `Konfigurieren Sie die Integration unter /dashboard/company/${companyId}/google-ads/settings`,
        testCampaignCreation: 'Testen Sie Campaign Creation in Test Mode',
        applyForBasicAccess: 'Beantragen Sie Basic Access für echte Kampagnen',
      },
    });
  } catch (error: any) {
    console.error('❌ Test account guide error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate test account guide',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
