import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { finapIMockService } from '@/lib/finapi-mock-service';
import { db } from '@/firebase/server';

/**
 * GET /api/finapi/accounts-enhanced
 * Get bank accounts for a user using the new finAPI SDK Service
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const credentialType = searchParams.get('credentialType') || 'sandbox';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🏦 Getting accounts for user:', userId, 'credentialType:', credentialType);

    try {
      // CRITICAL FIX: Get REAL company email (same as WebForm)
      const companyDoc = await db.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      const companyData = companyDoc.data();
      const companyEmail = companyData?.email;

      if (!companyEmail) {
        console.log('⚠️ No company email found, returning empty result (NO MOCK DATA)');
        return NextResponse.json({
          success: true,
          accounts: [],
          accountsByBank: {},
          totalBalance: 0,
          totalAccounts: 0,
          message: 'Company email not found. Please complete your profile.',
        });
      }

      console.log('✅ Using REAL company email for sync:', companyEmail);

      // Create finAPI service instance
      const finapiService = createFinAPIService();

      // Use the SAME email as WebForm - this is the critical fix!
      const bankData = await finapiService.syncUserBankData(companyEmail, userId);

      if (bankData.accounts && bankData.accounts.length > 0) {
        // Transform accounts to expected format
        const transformedAccounts = bankData.accounts.map((account: any) => ({
          id: account.id,
          accountName: account.accountName || account.name || 'Unbekanntes Konto',
          accountType: account.accountTypeId || account.type || 'CHECKING',
          bankName: account.bankName || 'Unbekannte Bank',
          bankId: account.bankId,
          iban: account.iban,
          accountNumber: account.accountNumber,
          balance: account.balance || 0,
          availableBalance: account.availableBalance || account.balance || 0,
          currency: account.currency || 'EUR',
          lastUpdated: account.lastUpdateTime || new Date().toISOString(),
          isActive: true,
          isDefault: account.isDefault || false,
        }));

        // Group accounts by bank
        const accountsByBank: { [bankName: string]: any[] } = {};
        transformedAccounts.forEach(account => {
          if (!accountsByBank[account.bankName]) {
            accountsByBank[account.bankName] = [];
          }
          accountsByBank[account.bankName].push(account);
        });

        const uniqueBanks = Object.keys(accountsByBank).length;

        return NextResponse.json({
          success: true,
          accounts: transformedAccounts,
          accountsByBank,
          bankCount: uniqueBanks,
          totalCount: transformedAccounts.length,
          source: 'finapi_live',
          lastSync: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        });
      } else {
        // NO MOCK DATA! Return empty result to indicate no connections exist yet
        console.log('📭 No accounts found, returning empty result (NO MOCK DATA)');

        return NextResponse.json({
          success: true,
          accounts: [],
          accountsByBank: {},
          bankCount: 0,
          totalCount: 0,
          source: 'finapi_empty',
          message: 'No bank connections found. Please connect a bank first.',
          lastSync: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (serviceError: any) {
      console.warn('⚠️ finAPI service error, trying mock fallback:', serviceError.message);

      // Temporärer Mock-Fallback für bessere UX während finAPI-Ausfällen
      if (process.env.NODE_ENV === 'development' || process.env.FINAPI_MOCK_FALLBACK === 'true') {
        console.log('🎭 Using mock data as fallback during finAPI outage');

        const mockAccounts = finapIMockService.getMockAccounts();
        const mockSummary = finapIMockService.getMockAccountSummary();

        // Transform mock accounts to expected format
        const transformedAccounts = mockAccounts.map(account => ({
          id: account.id,
          accountName: account.accountName,
          accountType: account.accountType,
          bankName: account.bankName,
          bankId: `mock_bank_${account.bankName.toLowerCase().replace(/\s+/g, '_')}`,
          iban: account.iban,
          accountNumber: account.accountNumber,
          balance: account.balance,
          availableBalance: account.balance,
          currency: account.currency,
          lastUpdated: account.lastSyncDate,
          isActive: true,
          isDefault: false,
        }));

        // Group accounts by bank
        const accountsByBank: { [bankName: string]: any[] } = {};
        transformedAccounts.forEach(account => {
          if (!accountsByBank[account.bankName]) {
            accountsByBank[account.bankName] = [];
          }
          accountsByBank[account.bankName].push(account);
        });

        return NextResponse.json({
          success: true,
          accounts: transformedAccounts,
          accountsByBank,
          bankCount: Object.keys(accountsByBank).length,
          totalCount: transformedAccounts.length,
          totalBalance: mockSummary.totalBalance,
          source: 'mock_fallback',
          message: 'Using demo data - finAPI service temporarily unavailable',
          lastSync: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          isMockData: true,
        });
      }

      // Fallback to empty result if mock is disabled
      return NextResponse.json({
        success: true,
        accounts: [],
        accountsByBank: {},
        bankCount: 0,
        totalCount: 0,
        source: 'finapi_error',
        message: 'finAPI service unavailable. Please try again later.',
        error: serviceError.message,
        lastSync: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('❌ Accounts enhanced error:', error.message);

    return NextResponse.json(
      {
        error: 'Failed to fetch enhanced accounts',
        details: error.message,
        source: 'finAPI SDK Service',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
