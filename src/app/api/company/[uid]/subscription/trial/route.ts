/**
 * Start Trial API
 * 
 * Startet eine 7-Tage kostenlose Testphase fuer ein Unternehmen
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformSubscriptionService, TaskiloPlanId } from '@/services/subscription/PlatformSubscriptionService';
import { db } from '@/firebase/server';
import { z } from 'zod';

const StartTrialSchema = z.object({
  planId: z.enum(['business']), // Nur Business hat Trial
  billingInterval: z.enum(['monthly', 'yearly']).default('monthly'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    // Unternehmen pruefen
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfuegbar' },
        { status: 500 }
      );
    }

    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data()!;

    // Pruefe ob bereits eine Trial genutzt wurde
    if (companyData.trialUsed) {
      return NextResponse.json(
        { success: false, error: 'Die kostenlose Testphase wurde bereits genutzt' },
        { status: 400 }
      );
    }

    // Request Body validieren
    const body = await request.json();
    const validation = StartTrialSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Ungueltige Eingabedaten', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { planId, billingInterval } = validation.data;

    // Trial starten
    const result = await PlatformSubscriptionService.startTrial({
      companyId,
      userId: companyData.userId || companyId,
      planId: planId as TaskiloPlanId,
      billingInterval,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: result.subscriptionId,
      message: 'Ihre 7-Tage Testphase wurde erfolgreich gestartet',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET - Pruefe ob Trial verfuegbar ist
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfuegbar' },
        { status: 500 }
      );
    }

    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data()!;
    const subscription = await PlatformSubscriptionService.getSubscriptionSummary(companyId);

    return NextResponse.json({
      success: true,
      trialAvailable: !companyData.trialUsed,
      trialUsed: companyData.trialUsed || false,
      currentSubscription: subscription ? {
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        isTrialing: subscription.isTrialing,
        trialEndsAt: subscription.trialEndsAt?.toISOString(),
        daysRemaining: subscription.daysRemaining,
      } : null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
