/**
 * Company Subscription API
 * 
 * Ruft Subscription-Details und Transaktionen fuer ein Unternehmen ab
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformSubscriptionService, TASKILO_PLANS } from '@/services/subscription/PlatformSubscriptionService';
import { db } from '@/firebase/server';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoiceUrl?: string;
  paymentMethod?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    // Subscription-Summary abrufen
    const summary = await PlatformSubscriptionService.getSubscriptionSummary(companyId);

    // Transaktionen aus Firestore laden
    let transactions: Transaction[] = [];
    if (db) {
      try {
        const transactionsSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('subscriptionTransactions')
          .orderBy('date', 'desc')
          .limit(20)
          .get();

        transactions = transactionsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date?.toDate?.()?.toISOString() || data.date,
            description: data.description || 'Abonnement-Zahlung',
            amount: data.amount || 0,
            status: data.status || 'pending',
            invoiceUrl: data.invoiceUrl,
            paymentMethod: data.paymentMethod,
          };
        });
      } catch {
        // Keine Transaktionen oder Collection existiert nicht
      }
    }

    // Wenn keine Subscription, zeige Free Plan
    if (!summary) {
      const freePlan = TASKILO_PLANS.free;
      return NextResponse.json({
        success: true,
        subscription: {
          planId: 'free',
          planName: freePlan.name,
          status: 'active',
          statusLabel: 'Kostenlos',
          billingInterval: 'monthly',
          priceGross: 0,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          daysRemaining: 365,
          isTrialing: false,
          features: [...freePlan.features],
        },
        transactions,
      });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        ...summary,
        currentPeriodStart: summary.currentPeriodStart.toISOString(),
        currentPeriodEnd: summary.currentPeriodEnd.toISOString(),
        trialEndsAt: summary.trialEndsAt?.toISOString(),
        nextBillingDate: summary.nextBillingDate?.toISOString(),
        lastPaymentDate: summary.lastPaymentDate?.toISOString(),
      },
      transactions,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
