import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const query = searchParams.get('q');

    if (!companyId || !query) {
      return NextResponse.json({
        success: false,
        error: 'CompanyId und Suchbegriff (q) sind erforderlich',
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
    let loginCustomerId: string | undefined = undefined;

    if (!refreshToken) {
      const managerToken = process.env.GOOGLE_ADS_MANAGER_REFRESH_TOKEN || process.env.GOOGLE_ADS_REFRESH_TOKEN;
      if (managerToken) {
        refreshToken = managerToken;
        loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '655-923-8498';
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

    console.log(`[AudienceSearch] Searching for: ${query}`);

    // Deterministic translation map for common German terms
    // Google Ads API only supports English segment names
    // We map German terms to MULTIPLE English synonyms (pipe-separated) for broader REGEXP matching
    const GERMAN_TO_ENGLISH_MAPPING: Record<string, string> = {
      // Marketing & Business
      'werbung': 'Advertising|Marketing|Promotion|Ad Services',
      'marketing': 'Marketing|Advertising|Brand|Business Services',
      'business': 'Business|Corporate|Enterprise|Management',
      'verkauf': 'Sales|Retail|Shopping|Commerce',
      'handel': 'Retail|Trade|Commerce|Shopping',
      'dienstleistung': 'Services|Consulting|Support',
      'beratung': 'Consulting|Advisory|Services',
      
      // Shopping & Retail (The user saw many of these)
      'einkauf': 'Shopping|Retail|Shoppers|Buyers|Sales',
      'einkaufen': 'Shopping|Retail|Shoppers|Fashion',
      'shoppen': 'Shopping|Retail|Fashion|Apparel',
      'schnäppchen': 'Bargain|Deals|Discount|Sale',
      'angebot': 'Offer|Deal|Discount|Sale',
      'black friday': 'Black Friday|Shopping|Deals',
      'weihnachten': 'Christmas|Holiday|Gift|Shopping',
      
      // Real Estate
      'immobilien': 'Real Estate|Property|Home|House|Apartment|Residential',
      'haus': 'Home|House|Real Estate|Garden|DIY',
      'wohnung': 'Apartment|Real Estate|Rent|Residential',
      'umzug': 'Moving|Relocation|Home',
      
      // Finance
      'finanzen': 'Finance|Banking|Investment|Credit|Money',
      'bank': 'Banking|Finance|Credit|Loans',
      'kredit': 'Credit|Loans|Mortgage|Finance',
      'aktien': 'Stocks|Investment|Trading|Market',
      'versicherung': 'Insurance|Protection|Financial',
      
      // Lifestyle & Food
      'essen': 'Food|Dining|Cooking|Baking|Grocery|Restaurant',
      'trinken': 'Drinks|Beverage|Coffee|Tea|Alcohol',
      'lebensmittel': 'Grocery|Food|Supermarket|Cooking',
      'kochen': 'Cooking|Food|Recipes|Kitchen',
      'backen': 'Baking|Food|Cooking',
      'backwaren': 'Baked Goods|Bread|Bakery|Food',
      'restaurant': 'Restaurant|Dining|Food|Eating Out',
      
      // Travel
      'reise': 'Travel|Tourism|Hotel|Flight|Vacation',
      'reisen': 'Travel|Tourism|Hotel|Flight|Vacation',
      'urlaub': 'Vacation|Travel|Holiday|Trip',
      'hotel': 'Hotel|Accommodation|Travel',
      
      // Auto
      'auto': 'Autos|Vehicles|Cars|Automotive',
      'autos': 'Autos|Vehicles|Cars|Automotive',
      'fahrzeug': 'Vehicles|Autos|Transport',
      'kfz': 'Vehicles|Autos|Cars',
      
      // Tech
      'technologie': 'Technology|Tech|Computers|Software|Electronics',
      'computer': 'Computers|Laptops|Hardware|PC',
      'software': 'Software|Apps|Development|SaaS',
      'handy': 'Mobile|Phone|Smartphone|Electronics',
      
      // Health & Beauty
      'gesundheit': 'Health|Wellness|Medical|Fitness',
      'fitness': 'Fitness|Gym|Sports|Workout',
      'sport': 'Sports|Fitness|Athletics|Outdoor',
      'kosmetik': 'Beauty|Cosmetics|Makeup|Skincare',
      'beauty': 'Beauty|Cosmetics|Salon|Spa',
      
      // Family
      'familie': 'Family|Parents|Children|Kids',
      'kinder': 'Children|Kids|Baby|Toys',
      'baby': 'Baby|Infant|Maternity|Parents',
      'eltern': 'Parents|Family|Maternity',
      
      // Jobs & Education
      'job': 'Jobs|Employment|Career|Recruitment',
      'jobs': 'Jobs|Employment|Career|Hiring',
      'karriere': 'Career|Jobs|Professional|Business',
      'bildung': 'Education|University|School|Training',
      'studium': 'University|College|Education|Student',
      'student': 'Student|University|Education',
      
      // News & Media
      'nachrichten': 'News|Media|Current Events|Politics',
      'unterhaltung': 'Entertainment|Movies|Music|TV',
      'musik': 'Music|Audio|Concert|Streaming',
      'film': 'Movies|Cinema|Film|Entertainment',
      'gaming': 'Games|Gaming|Video Games|Esports',
    };

    const normalizedQuery = query.toLowerCase().trim();
    const translatedQuery = GERMAN_TO_ENGLISH_MAPPING[normalizedQuery] || query;

    if (translatedQuery !== query) {
      console.log(`[AudienceSearch] Translated '${query}' to '${translatedQuery}'`);
    }
    
    // Direct search without AI expansion or translation
    const result = await googleAdsClientService.searchAudienceSegments(
      refreshToken,
      customerId,
      translatedQuery,
      loginCustomerId
    );
    
    if (!result.success) {
        const errorMessage = result.error?.message || JSON.stringify(result.error) || 'Google Ads API Error';
        throw new Error(errorMessage);
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Raw audience search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Fehler bei der Suche',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
