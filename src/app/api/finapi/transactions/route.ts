import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';

/**
 * GET /api/finapi/transactions
 * Get transactions for a user using the real finAPI SDK Service
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const credentialType = searchParams.get('credentialType') || 'sandbox';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '100');
    const accountIds = searchParams.get('accountIds'); // Optional filter

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('💰 Getting transactions for user:', userId, 'page:', page);

    let companyEmail: string | null = null;

    try {
      // Get company data to retrieve email
      const companyDoc = await db.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        console.log('📭 No company found, returning empty transactions');
        return NextResponse.json({
          success: true,
          data: {
            transactions: [],
            totalCount: 0,
            page,
            perPage,
            hasMore: false,
          },
          source: 'no_company',
          message: 'Company not found.',
          timestamp: new Date().toISOString(),
        });
      }

      const companyData = companyDoc.data();
      companyEmail = companyData?.email;

      if (!companyEmail) {
        console.log('📭 No company email found, returning empty transactions');
        return NextResponse.json({
          success: true,
          data: {
            transactions: [],
            totalCount: 0,
            page,
            perPage,
            hasMore: false,
          },
          source: 'no_email',
          message: 'Company email not found. Please complete your profile.',
          timestamp: new Date().toISOString(),
        });
      }

      console.log('✅ Using company email for transactions:', companyEmail);

      // Create finAPI service instance
      const finapiService = createFinAPIService();

      // Use getOrCreateUser method to get proper user token
      const userData = await finapiService.getOrCreateUser(companyEmail, 'demo123', userId);
      const userToken = userData.userToken;

      if (userToken) {
        console.log('✅ Got user token, fetching transactions...');

        // Build the URL for transactions API
        const url = new URL('https://sandbox.finapi.io/api/v2/transactions');
        url.searchParams.set('view', 'userView'); // Required parameter
        url.searchParams.set('page', page.toString());
        url.searchParams.set('perPage', perPage.toString());

        if (accountIds) {
          url.searchParams.set('accountIds', accountIds);
        }

        // Get transactions from finAPI
        const transactionsResponse = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: 'application/json',
          },
        });

        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          console.log('✅ Found finAPI transactions:', transactionsData.transactions?.length || 0);

          return NextResponse.json({
            success: true,
            data: {
              transactions: transactionsData.transactions || [],
              totalCount: transactionsData.paging?.totalCount || 0,
              page: transactionsData.paging?.page || page,
              perPage: transactionsData.paging?.perPage || perPage,
              hasMore:
                (transactionsData.paging?.page || page) < (transactionsData.paging?.pageCount || 1),
              paging: transactionsData.paging,
            },
            source: 'finapi_live',
            message: `Found ${transactionsData.transactions?.length || 0} transaction(s)`,
            timestamp: new Date().toISOString(),
          });
        } else {
          const errorText = await transactionsResponse.text();
          console.error('❌ finAPI transactions error:', transactionsResponse.status, errorText);
        }
      }
    } catch (finapiError: any) {
      console.error('❌ finAPI transactions error:', finapiError.message);
    }

    console.log('📭 No finAPI transactions found');

    // For demo purposes, if we have accounts but no transactions,
    // show some sample transactions to demonstrate the UI
    const shouldShowDemoTransactions = false; // Set to true for demo purposes

    if (shouldShowDemoTransactions && companyEmail) {
      console.log('🎭 Providing demo transactions for UI demonstration');

      const demoTransactions = [
        {
          id: 'demo_tx_1',
          accountId: 3072163,
          amount: -25.5,
          currency: 'EUR',
          purpose: 'Grocery Shopping Demo',
          counterpartName: 'DEMO Supermarket',
          counterpartIban: 'DE89370400440532013002',
          bookingDate: '2025-08-29',
          valueDate: '2025-08-29',
          typeCodeZka: 'CARD_PAYMENT',
          category: {
            id: 'cat_1',
            name: 'Groceries',
          },
          isNew: false,
          isDemoData: true,
        },
        {
          id: 'demo_tx_2',
          accountId: 3072163,
          amount: 2500.0,
          currency: 'EUR',
          purpose: 'Salary Payment Demo',
          counterpartName: 'DEMO Company',
          counterpartIban: 'DE89370400440532013003',
          bookingDate: '2025-08-28',
          valueDate: '2025-08-28',
          typeCodeZka: 'TRANSFER',
          category: {
            id: 'cat_2',
            name: 'Salary',
          },
          isNew: false,
          isDemoData: true,
        },
      ];

      return NextResponse.json({
        success: true,
        data: {
          transactions: demoTransactions,
          totalCount: demoTransactions.length,
          page,
          perPage,
          hasMore: false,
        },
        source: 'demo_data',
        message: 'Demo transactions (finAPI data will appear after full account synchronization)',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: [],
        totalCount: 0,
        page,
        perPage,
        hasMore: false,
      },
      source: 'finapi_empty',
      message: 'No transactions found. Transactions may take time to appear in the finAPI sandbox.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Transactions error:', error.message);

    return NextResponse.json(
      {
        error: 'Failed to fetch transactions',
        details: error.message,
        source: 'finAPI SDK Service',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
