import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';
import { BanksApi, createConfiguration, ServerConfiguration } from 'finapi-client';

// Get all available banks in finAPI
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { searchParams } = new URL(req.url);
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const server = new ServerConfiguration(baseUrl, {});

    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });

    const banksApi = new BanksApi(configuration);

    // Get banks - using search to get demo banks for sandbox
    const banks = await banksApi.getAndSearchAllBanks(
      undefined, // ids
      'demo', // search term to find demo banks in sandbox
      undefined, // isSupported
      undefined, // pinsAreVolatile
      undefined, // supportedDataSources
      undefined, // location
      undefined, // isTestBank
      undefined, // page
      20 // perPage - limit to 20 banks
    );

    console.log('Banks retrieved:', banks.banks?.length || 0);

    return NextResponse.json({
      banks:
        banks.banks?.map(bank => ({
          id: bank.id,
          name: bank.name,
          bic: bank.bic,
          blz: bank.blz,
          location: bank.location,
          isTestBank: bank.isTestBank,
        })) || [],
      totalCount: banks.banks?.length || 0,
    });
  } catch (error) {
    console.error('finAPI get banks error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to get banks',
          details: error.message,
          type: 'BANKS_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
