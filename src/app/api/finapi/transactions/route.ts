import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';
import { TransactionsApi, createConfiguration, ServerConfiguration } from 'finapi-client';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  counterpartName: string;
  counterpartIban: string;
  bankBookingDate: string;
  valueDate: string;
  finapiBookingDate: string;
  accountId: string;
  categoryId?: number;
  categoryName?: string;
  isNew: boolean;
}

async function handleFinAPITransactionsRequest(
  token: string,
  searchParams?: URLSearchParams,
  credentialType: 'sandbox' | 'admin' = 'sandbox'
) {
  try {
    // Extract query parameters
    const accountIds = searchParams?.get('accountIds')?.split(',') || undefined;
    const minBankBookingDate = searchParams?.get('minBankBookingDate') || undefined;
    const maxBankBookingDate = searchParams?.get('maxBankBookingDate') || undefined;
    const page = parseInt(searchParams?.get('page') || '1');
    const perPage = parseInt(searchParams?.get('perPage') || '50');

    // Get correct base URL
    const baseUrl = getFinApiBaseUrl(credentialType);

    // finAPI SDK Configuration
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });

    const transactionsApi = new TransactionsApi(configuration);

    console.log(`Using finAPI SDK for transactions request with ${credentialType} environment`);

    // finAPI Transactions Request mit SDK (using correct SDK syntax)
    const transactionsResponse = await transactionsApi.getAndSearchAllTransactions(
      'userView', // view - REQUIRED parameter
      undefined, // ids
      undefined, // search
      undefined, // counterpart
      undefined, // purpose
      undefined, // currency
      accountIds?.map(id => parseInt(id)), // accountIds as number array
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
      perPage, // perPage
      ['bankBookingDate,desc'] // order - most recent first
    );

    console.log(
      'finAPI SDK transactions request successful, transactions found:',
      transactionsResponse.transactions?.length || 0
    );

    // Transform finAPI transactions to our format
    const transformedTransactions: Transaction[] =
      transactionsResponse.transactions?.map(transaction => ({
        id: transaction.id?.toString() || '',
        amount: transaction.amount || 0,
        currency: transaction.currency || 'EUR',
        purpose: transaction.purpose || 'Keine Beschreibung',
        counterpartName: transaction.counterpartName || 'Unbekannt',
        counterpartIban: transaction.counterpartIban || '',
        bankBookingDate: transaction.bankBookingDate || '',
        valueDate: transaction.valueDate || '',
        finapiBookingDate: transaction.finapiBookingDate || '',
        accountId: transaction.accountId?.toString() || '',
        categoryId: transaction.category?.id,
        categoryName: transaction.category?.name,
        isNew: transaction.isNew || false,
      })) || [];

    return NextResponse.json({
      success: true,
      transactions: transformedTransactions,
      total: transactionsResponse.transactions?.length || 0,
      paging: transactionsResponse.paging,
      finapi_raw: transactionsResponse, // For debugging
    });
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
  const credentialType =
    (url.searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

  return handleFinAPITransactionsRequest(token, url.searchParams, credentialType);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, credentialType = 'sandbox' } = body;

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required in request body' }, { status: 401 });
    }

    const url = new URL(req.url);
    return handleFinAPITransactionsRequest(access_token, url.searchParams, credentialType);
  } catch (error) {
    console.error('POST finAPI transactions error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
