import { NextRequest, NextResponse } from 'next/server';
import { FinAPIClientManager } from '@/lib/finapi-client-manager';
import type { BankAccount } from '@/types';

// GET /api/finapi/accounts - Get all accounts for authenticated user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const bankConnectionIds = searchParams
      .get('bankConnectionIds')
      ?.split(',')
      .map(Number)
      .filter(Boolean);

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    // Get accounts with filters
    const response = await clientManager.accounts.getAndSearchAllAccounts(
      undefined, // ids
      undefined, // search
      undefined, // accountTypes
      bankConnectionIds,
      undefined, // minBalance
      undefined, // maxBalance
      page,
      perPage,
      undefined // order
    );

    console.log('Accounts retrieved:', response.accounts?.length || 0);

    // Transform finAPI accounts to our BankAccount interface
    const transformedAccounts: BankAccount[] =
      response.accounts?.map((account, index) => ({
        id: account.id?.toString() || `finapi_${index}`,
        accountName: account.accountName || `Konto ${account.id}`,
        iban: account.iban || '',
        bankName: `finAPI Bank ${account.id}`,
        accountNumber: account.accountNumber || '',
        balance: account.balance || 0,
        availableBalance: account.balance || 0,
        currency: account.accountCurrency || 'EUR',
        accountType: mapFinAPIAccountType(account.accountType),
        isDefault: index === 0,
      })) || [];

    return NextResponse.json({
      success: true,
      data: response.accounts,
      accounts: transformedAccounts,
      finapi_accounts:
        response.accounts?.map(account => ({
          id: account.id,
          accountName: account.accountName,
          iban: account.iban,
          accountNumber: account.accountNumber,
          subAccountNumber: account.subAccountNumber,
          balance: account.balance,
          overdraft: account.overdraft,
          overdraftLimit: account.overdraftLimit,
          accountCurrency: account.accountCurrency,
          accountType: account.accountType,
          isNew: account.isNew,
          bankConnectionId: account.bankConnectionId,
        })) || [],
      totalCount: response.accounts?.length || 0,
    });
  } catch (error: any) {
    console.error('finAPI accounts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get accounts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/accounts - Create or update account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, action } = body;

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const clientManager = new FinAPIClientManager(token);

    if (action === 'delete' && accountId) {
      // Delete account
      await clientManager.accounts.deleteAccount(accountId);

      return NextResponse.json({
        success: true,
        message: 'Account deleted successfully',
      });
    }

    if (action === 'get' && accountId) {
      // Get specific account
      const account = await clientManager.accounts.getAccount(accountId);

      return NextResponse.json({
        success: true,
        data: account,
      });
    }

    if (action === 'edit' && accountId) {
      // Edit account
      const { accountName } = body;

      const updatedAccount = await clientManager.accounts.editAccount(accountId, {
        accountName,
      });

      return NextResponse.json({
        success: true,
        data: updatedAccount,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('finAPI accounts POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process account request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to map finAPI account types
function mapFinAPIAccountType(
  type: any
): 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'LOAN' {
  const typeStr = String(type).toUpperCase();

  if (typeStr.includes('CHECKING') || typeStr.includes('GIRO')) return 'CHECKING';
  if (typeStr.includes('SAVINGS') || typeStr.includes('SPAR')) return 'SAVINGS';
  if (typeStr.includes('CREDIT') || typeStr.includes('KREDITKARTE')) return 'CREDIT_CARD';
  if (typeStr.includes('INVESTMENT') || typeStr.includes('DEPOT')) return 'INVESTMENT';
  if (typeStr.includes('LOAN') || typeStr.includes('KREDIT')) return 'LOAN';

  return 'CHECKING'; // Default fallback
}
