import { NextRequest, NextResponse } from 'next/server';
import { TransactionsApi, createConfiguration, ServerConfiguration } from 'finapi-client';

async function handleFinAPITransactionsRequest(token: string, searchParams?: URLSearchParams) {
  try {
    // Extract query parameters
    const accountIds = searchParams?.get('accountIds') || undefined;
    const minBankBookingDate = searchParams?.get('minBankBookingDate') || undefined;
    const maxBankBookingDate = searchParams?.get('maxBankBookingDate') || undefined;
    const page = parseInt(searchParams?.get('page') || '1');
    const perPage = parseInt(searchParams?.get('perPage') || '20');

    // finAPI SDK Configuration
    const server = new ServerConfiguration('https://sandbox.finapi.io', {});
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });

    const transactionsApi = new TransactionsApi(configuration);

    console.log('Using finAPI SDK for transactions request');

    // finAPI Transactions Request mit SDK
    const transactionsResponse = await transactionsApi.getAndSearchAllTransactions(
      'userView', // view - REQUIRED parameter
      undefined, // ids
      undefined, // search
      undefined, // counterpart
      undefined, // purpose
      undefined, // currency
      accountIds?.split(',').map(id => parseInt(id)), // accountIds
      minBankBookingDate, // minBankBookingDate
      maxBankBookingDate, // maxBankBookingDate
      undefined, // minFinapiBookingDate
      undefined, // maxFinapiBookingDate
      undefined, // minAmount
      undefined, // maxAmount
      undefined, // direction
      undefined, // labelIds
      undefined, // categoryIds
      undefined, // includeChildCategories
      undefined, // isNew
      undefined, // isPotentialDuplicate
      undefined, // isAdjustingEntry
      undefined, // minImportDate
      undefined, // maxImportDate
      page, // page
      perPage // perPage
    );

    console.log('finAPI SDK transactions request successful');

    return NextResponse.json(transactionsResponse);
  } catch (error) {
    console.error('finAPI SDK transactions error:', error);

    // Enhanced error handling for finAPI SDK
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch transactions',
          details: error.message,
          type: 'SDK_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const url = new URL(req.url);

  return handleFinAPITransactionsRequest(token, url.searchParams);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token } = body;

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required in request body' }, { status: 401 });
    }

    const url = new URL(req.url);
    return handleFinAPITransactionsRequest(access_token, url.searchParams);
  } catch (error) {
    console.error('POST finAPI transactions error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
