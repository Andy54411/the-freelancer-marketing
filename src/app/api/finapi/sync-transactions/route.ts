import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';

/**
 * POST /api/finapi/sync-transactions
 * Force synchronization of transactions from finAPI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, credentialType } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔄 Force syncing transactions for user:', userId);

    try {
      // Get company data to retrieve email
      const companyDoc = await db.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      const companyData = companyDoc.data();
      const companyEmail = companyData?.email;

      if (!companyEmail) {
        return NextResponse.json({ error: 'Company email not found' }, { status: 400 });
      }

      console.log('✅ Using company email for sync:', companyEmail);

      // Create finAPI service instance
      const finapiService = createFinAPIService();

      // Sync all bank data including transactions
      const bankData = await finapiService.syncUserBankData(companyEmail, userId);

      console.log('✅ Sync completed:', {
        connections: bankData.connections.length,
        accounts: bankData.accounts.length,
        transactions: bankData.transactions.length,
      });

      return NextResponse.json({
        success: true,
        data: {
          connectionsCount: bankData.connections.length,
          accountsCount: bankData.accounts.length,
          transactionsCount: bankData.transactions.length,
          transactions: bankData.transactions.slice(0, 10), // Show first 10 for preview
        },
        message: `Synchronization completed: ${bankData.transactions.length} transactions found`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Sync error:', error.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to sync transactions',
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Sync transactions error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync transactions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
