import { NextRequest, NextResponse } from 'next/server';
import { FinAPIClientManager } from '@/lib/finapi-client-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const includeTestBanks = searchParams.get('includeTestBanks') === 'true';

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    // Search banks with all parameters
    const response = await clientManager.banks.getAndSearchAllBanks(
      undefined, // ids
      search || 'demo', // search term - default to demo for sandbox
      undefined, // isSupported
      undefined, // pinsAreVolatile
      undefined, // supportedDataSources
      undefined, // location
      includeTestBanks,
      page,
      perPage
    );

    console.log('Banks retrieved:', response.banks?.length || 0);

    return NextResponse.json({
      success: true,
      data: response.banks,
      paging: response.paging,
      banks:
        response.banks?.map(bank => ({
          id: bank.id,
          name: bank.name,
          bic: bank.bic,
          blz: bank.blz,
          location: bank.location,
          city: bank.city,
          isTestBank: bank.isTestBank,
          popularity: bank.popularity,
          interfaces: bank.interfaces,
        })) || [],
      totalCount: response.banks?.length || 0,
    });
  } catch (error: any) {
    console.error('finAPI banks search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search banks',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankId } = body;

    if (!bankId) {
      return NextResponse.json({ success: false, error: 'Bank ID is required' }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    // Get specific bank details
    const bank = await clientManager.banks.getBank(bankId);

    return NextResponse.json({
      success: true,
      data: bank,
    });
  } catch (error: any) {
    console.error('finAPI bank details error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get bank details',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
