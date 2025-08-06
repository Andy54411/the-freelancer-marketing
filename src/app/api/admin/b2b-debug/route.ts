// /api/admin/b2b-debug - Debug B2B Payment Status im Admin Dashboard
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, limit } from 'firebase/firestore';

interface B2BProviderDebugInfo {
  id: string;
  type: 'firma' | 'user';
  companyName?: string;
  userName?: string;
  email?: string;
  stripeAccountId?: string;
  stripeAccountStatus?: 'valid' | 'invalid' | 'missing';
  lastUpdated?: string;
  totalPayments?: number;
  hasActivePayments?: boolean;
}

interface B2BPaymentDebugInfo {
  id: string;
  projectId: string;
  projectTitle: string;
  paymentType: string;
  status: string;
  grossAmount: number;
  platformFee: number;
  providerAmount: number;
  currency: string;
  createdAt: string;
  providerInfo: {
    id: string;
    name: string;
    stripeAccountId: string;
  };
  customerInfo: {
    id: string;
    name: string;
  };
}

export async function GET(_request: NextRequest) {
  try {
    console.log('[B2B Debug API] Fetching B2B payment debug data...');

    // 1. PROVIDER STRIPE ACCOUNT STATUS
    const providerDebugInfo: B2BProviderDebugInfo[] = [];

    try {
      // Check FIRMA collection
      const firmaSnapshot = await getDocs(query(collection(db, 'firma'), limit(10)));
      firmaSnapshot.forEach(doc => {
        const data = doc.data();
        providerDebugInfo.push({
          id: doc.id,
          type: 'firma',
          companyName: data.companyName || data.firmName,
          email: data.email,
          stripeAccountId: data.stripeAccountId,
          stripeAccountStatus: data.stripeAccountId?.startsWith('acct_')
            ? 'valid'
            : data.stripeAccountId
              ? 'invalid'
              : 'missing',
          lastUpdated:
            data.updatedAt?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString(),
          totalPayments: 0,
        });
      });
    } catch (_firmaError) {
      console.log('[B2B Debug API] Firma collection query failed:', _firmaError);
      // No firma fallback data needed - focus on users collection with real providers
    }

    // Check USERS collection with provider data
    try {
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(10)));
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        // Filter for providers (users with categories or skills)
        if (data.selectedCategory || data.selectedSubcategory || data.skills || data.hourlyRate) {
          providerDebugInfo.push({
            id: doc.id,
            type: 'user',
            userName: data.userName || data.displayName,
            email: data.email,
            stripeAccountId: data.stripeAccountId,
            stripeAccountStatus: data.stripeAccountId?.startsWith('acct_')
              ? 'valid'
              : data.stripeAccountId
                ? 'invalid'
                : 'missing',
            lastUpdated:
              data.updatedAt?.toDate?.()?.toISOString() ||
              data.createdAt?.toDate?.()?.toISOString(),
            totalPayments: 0,
          });
        }
      });
    } catch (_userError) {
      console.log('[B2B Debug API] User collection query failed:', _userError);
      // Fallback: Query failed, return empty providers array
    }

    // 2. B2B PAYMENTS STATUS
    const b2bPaymentDebugInfo: B2BPaymentDebugInfo[] = [];

    try {
      const b2bPaymentsSnapshot = await getDocs(query(collection(db, 'b2b_payments'), limit(10)));

      for (const paymentDoc of b2bPaymentsSnapshot.docs) {
        const paymentData = paymentDoc.data();

        // Simplified provider and customer info
        const providerInfo = {
          id: paymentData.providerFirebaseId || 'unknown',
          name: 'Provider Name',
          stripeAccountId: paymentData.providerStripeAccountId || 'N/A',
        };

        const customerInfo = {
          id: paymentData.customerFirebaseId || 'unknown',
          name: 'Customer Name',
        };

        b2bPaymentDebugInfo.push({
          id: paymentDoc.id,
          projectId: paymentData.projectId || 'N/A',
          projectTitle: paymentData.projectTitle || 'Unbekanntes Projekt',
          paymentType: paymentData.paymentType || 'unknown',
          status: paymentData.status || 'unknown',
          grossAmount: paymentData.grossAmount || 0,
          platformFee: paymentData.platformFee || 0,
          providerAmount: paymentData.providerAmount || 0,
          currency: paymentData.currency || 'eur',
          createdAt: paymentData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          providerInfo,
          customerInfo,
        });
      }
    } catch (_error) {
      console.log('[B2B Debug API] B2B payments collection query failed:', _error);
      // Show empty state for B2B payments if no access - no demo data needed
    }

    // 3. SUMMARY STATS
    const validProviders = providerDebugInfo.filter(p => p.stripeAccountStatus === 'valid').length;
    const invalidProviders = providerDebugInfo.filter(
      p => p.stripeAccountStatus === 'invalid'
    ).length;
    const missingProviders = providerDebugInfo.filter(
      p => p.stripeAccountStatus === 'missing'
    ).length;

    const totalB2BPayments = b2bPaymentDebugInfo.length;
    const successfulB2BPayments = b2bPaymentDebugInfo.filter(p => p.status === 'succeeded').length;
    const pendingB2BPayments = b2bPaymentDebugInfo.filter(
      p => p.status === 'pending_payment'
    ).length;
    const failedB2BPayments = b2bPaymentDebugInfo.filter(p => p.status === 'failed').length;

    console.log('[B2B Debug API] Data fetched successfully:', {
      providers: providerDebugInfo.length,
      payments: b2bPaymentDebugInfo.length,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        providers: {
          total: providerDebugInfo.length,
          valid: validProviders,
          invalid: invalidProviders,
          missing: missingProviders,
        },
        payments: {
          total: totalB2BPayments,
          successful: successfulB2BPayments,
          pending: pendingB2BPayments,
          failed: failedB2BPayments,
        },
      },
      data: {
        providers: providerDebugInfo,
        payments: b2bPaymentDebugInfo,
      },
    });
  } catch (error: unknown) {
    console.error('[B2B Debug API] Error:', error);
    return NextResponse.json(
      {
        error: 'B2B Debug data fetch failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
