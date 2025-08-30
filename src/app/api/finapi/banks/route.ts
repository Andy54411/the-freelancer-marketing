import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { finapIMockService } from '@/lib/finapi-mock-service';

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

    // Create finAPI service instance
    const finapiService = createFinAPIService();

    // Get banks directly from finAPI SDK Service - no mock data
    const banks = await finapiService.listBanks(includeTestBanks, perPage);

    // Apply search filter if provided
    let filteredBanks = banks;
    if (search) {
      filteredBanks = banks.filter(
        bank =>
          bank.name?.toLowerCase().includes(search.toLowerCase()) ||
          bank.bic?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter test banks if needed (already handled in listBanks call)
    if (!includeTestBanks) {
      filteredBanks = filteredBanks.filter(
        bank =>
          !bank.name?.toLowerCase().includes('test') && !bank.name?.toLowerCase().includes('demo')
      );
    }

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
    console.error('❌ Banks API error:', error);

    // Temporärer Mock-Fallback für bessere UX während finAPI-Ausfällen
    if (process.env.NODE_ENV === 'development' || process.env.FINAPI_MOCK_FALLBACK === 'true') {
      console.log('🎭 Using mock banks as fallback during finAPI outage');

      const mockBanks = finapIMockService.getMockBanks();

      // Transform mock banks to expected format
      const transformedBanks = mockBanks.map(bank => ({
        id: bank.id,
        name: bank.name,
        bic: `${bank.blz}XXX`,
        blz: bank.blz,
        location: bank.location,
        isTestBank: bank.isTestBank,
        loginHint: bank.loginHint,
        interfaces: [
          {
            bankingInterface: 'XS2A',
            isAisSupported: true,
            health: 100,
          },
        ],
      }));

      return NextResponse.json({
        success: true,
        data: {
          banks: transformedBanks,
          totalResults: transformedBanks.length,
          page: 1,
          perPage: 20,
          hasMore: false,
        },
        mode: 'mock_fallback',
        source: 'Mock Data - finAPI service temporarily unavailable',
        timestamp: new Date().toISOString(),
        isMockData: true,
      });
    }

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
