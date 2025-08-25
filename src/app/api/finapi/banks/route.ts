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

    // Get banks directly from finAPI SDK Service - no mock data
    const banks = await finapiService.listBanks(
      search || undefined,
      undefined, // location - not used in current implementation
      page,
      perPage
    );

    // Filter test banks if needed
    let filteredBanks = includeTestBanks
      ? banks
      : banks.filter(
          bank =>
            !bank.name?.toLowerCase().includes('test') && !bank.name?.toLowerCase().includes('demo')
        );

    // In sandbox environment, prioritize working test banks
    filteredBanks = filteredBanks.filter(bank => {
      // For test environment, show only banks with working AIS interfaces
      const hasWorkingAIS = bank.interfaces?.some(
        (iface: any) =>
          (iface.bankingInterface === 'XS2A' || iface.bankingInterface === 'FINTS_SERVER') &&
          iface.isAisSupported === true &&
          iface.health &&
          iface.health > 0
      );

      // Special handling for known working finAPI test banks
      const knownTestBankIds = [280001, 280002, 26579]; // finAPI Test Bank, finAPI Test Redirect Bank, B+S Demobank
      if (knownTestBankIds.includes(bank.id)) {
        return true; // Always include known working test banks
      }

      return hasWorkingAIS;
    });

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
      source: 'finAPI SDK Service v1.0.3 (AIS-filtered)',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {

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
