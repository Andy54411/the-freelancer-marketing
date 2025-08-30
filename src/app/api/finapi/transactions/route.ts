import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';

/**
 * GET /api/finapi/transactions
 * Get transactions for a user using the new finAPI SDK Service
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const credentialType = searchParams.get('credentialType') || 'sandbox';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '100');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('💰 Getting transactions for user:', userId, 'page:', page);

    // For now, we'll simulate transaction data since we need to implement
    // the full user authentication and bank connection flow
    // This will be replaced with actual finAPI calls once connections are established

    const mockTransactions = [
      {
        id: 'tx_1',
        accountId: 'account_1',
        amount: -25.5,
        currency: 'EUR',
        purpose: 'Grocery Shopping',
        counterpartName: 'REWE Supermarket',
        counterpartIban: 'DE89370400440532013002',
        bookingDate: '2025-08-29',
        valueDate: '2025-08-29',
        typeCodeZka: 'CARD_PAYMENT',
        category: {
          id: 'cat_1',
          name: 'Groceries',
        },
        isNew: false,
      },
      {
        id: 'tx_2',
        accountId: 'account_1',
        amount: 2500.0,
        currency: 'EUR',
        purpose: 'Salary Payment',
        counterpartName: 'Taskilo GmbH',
        counterpartIban: 'DE89370400440532013003',
        bookingDate: '2025-08-28',
        valueDate: '2025-08-28',
        typeCodeZka: 'TRANSFER',
        category: {
          id: 'cat_2',
          name: 'Salary',
        },
        isNew: false,
      },
      {
        id: 'tx_3',
        accountId: 'account_1',
        amount: -89.99,
        currency: 'EUR',
        purpose: 'Online Purchase',
        counterpartName: 'Amazon Germany',
        counterpartIban: 'DE89370400440532013004',
        bookingDate: '2025-08-27',
        valueDate: '2025-08-27',
        typeCodeZka: 'CARD_PAYMENT',
        category: {
          id: 'cat_3',
          name: 'Shopping',
        },
        isNew: false,
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        transactions: mockTransactions,
        totalCount: mockTransactions.length,
        page,
        perPage,
        hasMore: false,
      },
      source: 'finAPI SDK Service Mock',
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
