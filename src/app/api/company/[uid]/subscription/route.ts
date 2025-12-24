/**
 * Company Subscription API (User-facing)
 * 
 * Ruft Subscription-Details fuer das eigene Unternehmen ab
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformSubscriptionService, TASKILO_PLANS } from '@/services/subscription/PlatformSubscriptionService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    // Subscription-Summary abrufen
    const summary = await PlatformSubscriptionService.getSubscriptionSummary(companyId);

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
      });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        planId: summary.planId,
        planName: summary.planName,
        status: summary.status,
        statusLabel: summary.statusLabel,
        billingInterval: summary.billingInterval,
        priceGross: summary.priceGross,
        currentPeriodStart: summary.currentPeriodStart.toISOString(),
        currentPeriodEnd: summary.currentPeriodEnd.toISOString(),
        trialEndsAt: summary.trialEndsAt?.toISOString(),
        daysRemaining: summary.daysRemaining,
        isTrialing: summary.isTrialing,
        nextBillingDate: summary.nextBillingDate?.toISOString(),
        lastPaymentDate: summary.lastPaymentDate?.toISOString(),
        features: summary.features,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
