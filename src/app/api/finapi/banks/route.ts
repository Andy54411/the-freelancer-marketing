import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  AuthorizationApi,
  BanksApi,
  createConfiguration,
  ServerConfiguration,
} from 'finapi-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const includeTestBanks = searchParams.get('includeTestBanks') === 'true';
    const credentialType = (searchParams.get('credentialType') || 'sandbox') as 'sandbox' | 'admin';

    // Get Taskilo's finAPI credentials
    const baseUrl = getFinApiBaseUrl(credentialType);
    const taskiloCredentials = getFinApiCredentials(credentialType);

    if (!taskiloCredentials.clientId || !taskiloCredentials.clientSecret) {
      return NextResponse.json(
        { error: 'Taskilo finAPI credentials not configured' },
        { status: 500 }
      );
    }

    // Get Taskilo's client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const authConfig = createConfiguration({ baseServer: server });
    const authApi = new AuthorizationApi(authConfig);

    const clientToken = await authApi.getToken(
      'client_credentials',
      taskiloCredentials.clientId,
      taskiloCredentials.clientSecret
    );

    // Use Taskilo's token to search banks
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const banksApi = new BanksApi(configuration);

    // Search banks with all parameters
    const response = await banksApi.getAndSearchAllBanks(
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
    const { bankId, credentialType = 'sandbox' } = body;

    if (!bankId) {
      return NextResponse.json({ success: false, error: 'Bank ID is required' }, { status: 400 });
    }

    // Get Taskilo's finAPI credentials
    const baseUrl = getFinApiBaseUrl(credentialType as 'sandbox' | 'admin');
    const taskiloCredentials = getFinApiCredentials(credentialType as 'sandbox' | 'admin');

    if (!taskiloCredentials.clientId || !taskiloCredentials.clientSecret) {
      return NextResponse.json(
        { error: 'Taskilo finAPI credentials not configured' },
        { status: 500 }
      );
    }

    // Get Taskilo's client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const authConfig = createConfiguration({ baseServer: server });
    const authApi = new AuthorizationApi(authConfig);

    const clientToken = await authApi.getToken(
      'client_credentials',
      taskiloCredentials.clientId,
      taskiloCredentials.clientSecret
    );

    // Use Taskilo's token to get bank details
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const banksApi = new BanksApi(configuration);

    // Get specific bank details
    const bank = await banksApi.getBank(bankId);

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
