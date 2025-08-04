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

    // Use the finAPI SDK Service to get banks
    const banks = await finapiService.listBanks(
      search || undefined,
      search || undefined, // Also search in location
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
