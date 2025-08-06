import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';

/**
 * finAPI Banks API - Powered by SDK Service
 *
 * Lists all available banks in Germany with finAPI integration
 * Uses the finAPI SDK Service for clean, type-safe API calls
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const includeTestBanks = searchParams.get('includeTestBanks') === 'true';

    console.log('🏦 Fetching banks via finAPI SDK Service...');
    console.log('Search params:', { search, page, perPage, includeTestBanks });

    // Test finAPI credentials first
    const credentialTest = await finapiService.testCredentials();
    
    if (!credentialTest.success) {
      console.warn('⚠️ FinAPI credentials not working, returning mock banks');
      
      // Return mock banks for development
      const mockBanks = [
        {
          id: 280700240,
          name: 'Deutsche Bank',
          blz: '28070024',
          city: 'Berlin',
          isTestBank: false,
          popularity: 90
        },
        {
          id: 370500000,
          name: 'Sparkasse Köln/Bonn',
          blz: '37050000',
          city: 'Köln',
          isTestBank: false,
          popularity: 85
        },
        {
          id: 12345678,
          name: 'Test Bank (Sandbox)',
          blz: '12345678',
          city: 'Test City',
          isTestBank: true,
          popularity: 50
        }
      ].filter(bank => {
        if (!includeTestBanks && bank.isTestBank) return false;
        if (search && !bank.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });

      return NextResponse.json({
        success: true,
        data: {
          banks: mockBanks,
          totalResults: mockBanks.length,
          page,
          perPage,
          hasMore: false,
        },
        mode: 'mock',
        source: 'Mock Banks (FinAPI Credentials Invalid)',
        timestamp: new Date().toISOString(),
      });
    }

    // Use the finAPI SDK Service to get banks (only if credentials work)
    const banks = await finapiService.listBanks(
      search || undefined,
      undefined, // location - not used in current implementation
      page,
      perPage
    );

    console.log(`✅ Found ${banks.length} banks via SDK`);

    // Filter test banks if needed
    const filteredBanks = includeTestBanks
      ? banks
      : banks.filter(
          bank =>
            !bank.name?.toLowerCase().includes('test') && !bank.name?.toLowerCase().includes('demo')
        );

    return NextResponse.json({
      success: true,
      data: {
        banks: filteredBanks,
        totalResults: filteredBanks.length,
        page,
        perPage,
        hasMore: filteredBanks.length === perPage,
      },
      mode: 'live',
      source: 'finAPI SDK Service v1.0.3',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Banks API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch banks',
        details: error instanceof Error ? error.message : 'Unknown error',
        source: 'finAPI SDK Service',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
