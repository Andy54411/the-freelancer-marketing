import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';
import { verifyCompanyAccess, authErrorResponse } from '@/lib/apiAuth';

/**
 * GET /api/finapi/transactions
 * Get transactions for a user using the real finAPI SDK Service
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '100');
    const accountIds = searchParams.get('accountIds'); // Optional filter

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 🔐 AUTHENTIFIZIERUNG: Bankdaten sind hochsensibel!
    const authResult = await verifyCompanyAccess(request, userId);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    let companyEmail: string | null = null;

    try {
      // Get company data to retrieve email
      const companyDoc = await db!.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
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

      // Create finAPI service instance
      const finapiService = createFinAPIService();

      // Use getOrCreateUser method to get proper user token (false = don't force creation)
      // Use consistent password generation
      const consistentPassword = `Taskilo_${userId}_2024!`; // Match generateFinapiPassword
      const userData = await finapiService.getOrCreateUser(
        companyEmail,
        consistentPassword,
        userId,
        false
      );
      const userToken = userData.userToken;

      if (userToken) {
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
          const _errorText = await transactionsResponse.text();
        }
      }
    } catch {}

    // For demo purposes, if we have accounts but no transactions,
    // show some sample transactions to demonstrate the UI
    const shouldShowDemoTransactions = false; // Set to true for demo purposes

    if (shouldShowDemoTransactions && companyEmail) {
      const demoTransactions = [
        {
          id: 'demo_tx_1',
          accountId: 3072163,
          amount: -25.5,
          currency: 'EUR',
          purpose: 'Grocery Shopping Demo',
          counterpartName: 'DEMO Supermarket',
          counterpartIban: 'DE89370400440532013002',
          counterpartBic: 'DEMODEDEMDE1',
          counterpartBankName: 'Demo Bank AG',
          counterpartBlz: '37040044',
          bookingDate: '2025-08-29',
          valueDate: '2025-08-29',
          typeCodeZka: 'CARD_PAYMENT',
          typeCodeSwift: 'PMNT',
          sepaPurposeCode: 'CBFF',
          mcCode: '5411', // Grocery Stores
          primanota: '2025089001',
          category: {
            id: 'cat_1',
            name: 'Groceries',
            parentName: 'Operating Expenses'
          },
          labels: [
            { id: 'lbl_1', name: 'Geschäftsausstattung' },
            { id: 'lbl_2', name: 'Steuerlich absetzbar' }
          ],
          isPotentialDuplicate: false,
          isAdjustingEntry: false,
          isNew: false,
          importDate: '2025-08-29T10:30:00Z',
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
          counterpartBic: 'DEMODEDEMDE2',
          counterpartBankName: 'Deutsche Demo Bank',
          counterpartBlz: '50010517',
          bookingDate: '2025-08-28',
          valueDate: '2025-08-28',
          typeCodeZka: 'TRANSFER',
          typeCodeSwift: 'TRAD',
          sepaPurposeCode: 'SALA',
          primanota: '2025088001',
          category: {
            id: 'cat_2',
            name: 'Salary',
            parentName: 'Income'
          },
          labels: [
            { id: 'lbl_3', name: 'Regelmäßig' },
            { id: 'lbl_4', name: 'Gehalt' }
          ],
          isPotentialDuplicate: false,
          isAdjustingEntry: false,
          isNew: false,
          importDate: '2025-08-28T08:15:00Z',
          isDemoData: true,
        },
        {
          id: 'demo_tx_3',
          accountId: 3072163,
          amount: -150.0,
          currency: 'EUR',
          purpose: 'Office Rent - Duplicate Check',
          counterpartName: 'DEMO Landlord',
          counterpartIban: 'DE89370400440532013004',
          counterpartBic: 'DEMODEDEMDE3',
          counterpartBankName: 'Commerzbank Demo',
          counterpartBlz: '76040061',
          bookingDate: '2025-08-27',
          valueDate: '2025-08-27',
          typeCodeZka: 'STANDING_ORDER',
          sepaPurposeCode: 'RENT',
          primanota: '2025087002',
          category: {
            id: 'cat_3',
            name: 'Office Expenses',
          },
          labels: [
            { id: 'lbl_5', name: 'Bürokosten' },
            { id: 'lbl_6', name: 'Monatlich' }
          ],
          isPotentialDuplicate: true, // DUPLIKAT-WARNUNG
          isAdjustingEntry: false,
          isNew: true,
          importDate: '2025-08-27T14:20:00Z',
          isDemoData: true,
        },
        {
          id: 'demo_tx_4',
          accountId: 3072163,
          amount: 45.0,
          currency: 'EUR',
          purpose: 'Correction: Wrong booking amount',
          counterpartName: 'DEMO Bank',
          counterpartIban: 'DE89370400440532013001',
          counterpartBic: 'DEMODEDEMDE0',
          counterpartBankName: 'Demo Bank AG',
          bookingDate: '2025-08-26',
          valueDate: '2025-08-26',
          typeCodeZka: 'ADJUSTMENT',
          sepaPurposeCode: 'ADJM',
          primanota: '2025086003',
          category: {
            id: 'cat_4',
            name: 'Bank Adjustments',
          },
          labels: [
            { id: 'lbl_7', name: 'Korrektur' }
          ],
          isPotentialDuplicate: false,
          isAdjustingEntry: true, // KORREKTUR-BUCHUNG
          isNew: false,
          importDate: '2025-08-26T16:45:00Z',
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
