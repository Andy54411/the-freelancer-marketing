// /api/admin/b2b-debug - Debug B2B Payment Status im Admin Dashboard
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, where } from 'firebase/firestore';

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

export async function GET(request: NextRequest) {
  try {
    console.log('[B2B Debug API] Fetching B2B payment debug data...');

    // 1. PROVIDER STRIPE ACCOUNT STATUS
    const providerDebugInfo: B2BProviderDebugInfo[] = [];

    // Check FIRMA collection
    const firmaSnapshot = await getDocs(query(collection(db, 'firma'), limit(50)));
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
        totalPayments: 0, // Will be calculated below
      });
    });

    // Check USERS collection with provider data
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('selectedCategory', '!=', null), limit(50))
    );
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.selectedCategory || data.selectedSubcategory) {
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
            data.updatedAt?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString(),
          totalPayments: 0,
        });
      }
    });

    // 2. B2B PAYMENTS STATUS
    const b2bPaymentDebugInfo: B2BPaymentDebugInfo[] = [];

    try {
      const b2bPaymentsSnapshot = await getDocs(
        query(collection(db, 'b2b_payments'), orderBy('createdAt', 'desc'), limit(20))
      );

      for (const paymentDoc of b2bPaymentsSnapshot.docs) {
        const paymentData = paymentDoc.data();

        // Get provider info
        const providerInfo = {
          id: paymentData.providerFirebaseId,
          name: 'Unknown',
          stripeAccountId: paymentData.providerStripeAccountId,
        };
        try {
          const providerDoc = await getDoc(doc(db, 'firma', paymentData.providerFirebaseId));
          if (providerDoc.exists()) {
            const providerData = providerDoc.data();
            providerInfo.name = providerData.companyName || providerData.firmName || 'Firma';
          } else {
            const userDoc = await getDoc(doc(db, 'users', paymentData.providerFirebaseId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              providerInfo.name = userData.userName || userData.displayName || 'User';
            }
          }
        } catch (e) {
          console.log('Provider lookup failed for:', paymentData.providerFirebaseId);
        }

        // Get customer info
        const customerInfo = { id: paymentData.customerFirebaseId, name: 'Unknown' };
        try {
          const customerDoc = await getDoc(doc(db, 'users', paymentData.customerFirebaseId));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            customerInfo.name =
              customerData.userName || customerData.displayName || customerData.email || 'Customer';
          }
        } catch (e) {
          console.log('Customer lookup failed for:', paymentData.customerFirebaseId);
        }

        b2bPaymentDebugInfo.push({
          id: paymentDoc.id,
          projectId: paymentData.projectId,
          projectTitle: paymentData.projectTitle,
          paymentType: paymentData.paymentType,
          status: paymentData.status,
          grossAmount: paymentData.grossAmount || 0,
          platformFee: paymentData.platformFee || 0,
          providerAmount: paymentData.providerAmount || 0,
          currency: paymentData.currency || 'eur',
          createdAt: paymentData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          providerInfo,
          customerInfo,
        });
      }
    } catch (error) {
      console.log('B2B payments collection might not exist yet:', error);
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
  } catch (error: any) {
    console.error('[B2B Debug API] Error:', error);
    return NextResponse.json(
      {
        error: 'B2B Debug data fetch failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
