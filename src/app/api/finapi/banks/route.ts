import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';

/**
 * GET /api/finapi/banks
 * List available banks for finAPI integration from real finAPI endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const includeTestBanks = searchParams.get('includeTestBanks') === 'true';

    console.log('🏛️ Getting banks list from finAPI', { search, page, perPage, includeTestBanks });

    // Use the same service as other finAPI endpoints
    const finapiService = createFinAPIService();

    // Get banks from finAPI using the service
    const result = await finapiService.getBanks({
      search: search || undefined,
      page,
      perPage,
      includeTestBanks,
    });

    console.log(`✅ Retrieved ${result.banks?.length || 0} banks from finAPI`);

    return NextResponse.json({
      success: true,
      banks: result.banks || [],
      totalCount: result.paging?.totalCount || 0,
      page: result.paging?.page || page,
      perPage: result.paging?.perPage || perPage,
      totalPages: result.paging?.pageCount || 0,
      search,
      source: 'finapi_service',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Banks API error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get banks from finAPI',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
