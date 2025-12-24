/**
 * Revolut Subscription Webhook Handler
 * 
 * Verarbeitet Subscription Events:
 * - SUBSCRIPTION_ACTIVATED: Zahlung erfolgreich, Subscription aktivieren
 * - SUBSCRIPTION_PAYMENT_COMPLETED: Monatliche Zahlung erfolgreich
 * - SUBSCRIPTION_CANCELLED: Subscription gekündigt
 * 
 * Bei unbekannten Subscriptions wird automatisch ein Sync durchgeführt
 */

import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import { Timestamp as AdminTimestamp, FieldValue } from 'firebase-admin/firestore';
import { WebmailSubscriptionService } from '@/services/webmail/WebmailSubscriptionService';
import { z } from 'zod';

const REVOLUT_API_KEY = process.env.REVOLUT_MERCHANT_API_KEY;
const REVOLUT_API_VERSION = '2025-10-16';
const REVOLUT_ENVIRONMENT = process.env.REVOLUT_ENVIRONMENT || 'sandbox';

function getBaseUrl() {
  return REVOLUT_ENVIRONMENT === 'production'
    ? 'https://merchant.revolut.com/api'
    : 'https://sandbox-merchant.revolut.com/api';
}

const RevolutEventSchema = z.object({
  event: z.string(),
  order_id: z.string().optional(),
  subscription_id: z.string().optional(),
  customer_id: z.string().optional(),
  external_reference: z.string().optional(),
  timestamp: z.string(),
});

async function findSubscriptionByRevolutId(revolutSubscriptionId: string) {
  if (!adminDb) return null;
  
  const snapshot = await adminDb.collection('webmailSubscriptions')
    .where('revolutSubscriptionId', '==', revolutSubscriptionId)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ref: doc.ref, data: doc.data() };
}

async function updateSubscription(subscriptionId: string, data: Record<string, unknown>) {
  if (!adminDb) return;
  await adminDb.collection('webmailSubscriptions').doc(subscriptionId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Synchronisiert eine einzelne Subscription von Revolut nach Firestore
 */
async function syncSubscriptionFromRevolut(subscriptionId: string): Promise<boolean> {
  if (!adminDb || !REVOLUT_API_KEY) return false;

  try {
    // Hole Subscription von Revolut
    const subResponse = await fetch(`${getBaseUrl()}/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });

    if (!subResponse.ok) return false;
    const sub = await subResponse.json();

    // Hole Plan-Details
    const planResponse = await fetch(`${getBaseUrl()}/subscription-plans/${sub.plan_id}`, {
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });
    
    let planName = 'Unbekannt';
    let priceGross = 0;
    let billingInterval: 'monthly' | 'yearly' = 'monthly';
    
    if (planResponse.ok) {
      const plan = await planResponse.json();
      planName = plan.name;
      const variation = plan.variations?.find((v: { id: string }) => v.id === sub.plan_variation_id);
      if (variation?.phases?.[0]) {
        priceGross = variation.phases[0].amount / 100;
        billingInterval = variation.phases[0].cycle_duration === 'P1Y' ? 'yearly' : 'monthly';
      }
    }

    // Hole Customer-Details
    let customerEmail = sub.customer_email || 'Unbekannt';
    let customerName = 'Unbekannt';
    
    if (sub.customer_id) {
      const legacyUrl = REVOLUT_ENVIRONMENT === 'production'
        ? 'https://merchant.revolut.com/api/1.0'
        : 'https://sandbox-merchant.revolut.com/api/1.0';
      
      const custResponse = await fetch(`${legacyUrl}/customers/${sub.customer_id}`, {
        headers: { 'Authorization': `Bearer ${REVOLUT_API_KEY}` },
      });
      
      if (custResponse.ok) {
        const customer = await custResponse.json();
        customerEmail = customer.email || customerEmail;
        customerName = customer.full_name || customerName;
      }
    }

    // Speichere in Firestore
    const docRef = adminDb.collection('webmailSubscriptions').doc(sub.id);
    await docRef.set({
      id: sub.id,
      revolutSubscriptionId: sub.id,
      revolutCustomerId: sub.customer_id,
      revolutPlanId: sub.plan_id,
      revolutVariationId: sub.plan_variation_id,
      customerEmail,
      customerName,
      userId: sub.metadata?.userId || null,
      companyId: sub.metadata?.companyId || null,
      planId: sub.plan_id,
      planName,
      priceGross,
      billingInterval,
      status: sub.state.toLowerCase(),
      currentPeriodStart: sub.current_period_start 
        ? AdminTimestamp.fromDate(new Date(sub.current_period_start)) 
        : null,
      currentPeriodEnd: sub.current_period_end 
        ? AdminTimestamp.fromDate(new Date(sub.current_period_end)) 
        : null,
      nextBillingDate: sub.next_billing_date 
        ? AdminTimestamp.fromDate(new Date(sub.next_billing_date)) 
        : null,
      createdAt: sub.created_at 
        ? AdminTimestamp.fromDate(new Date(sub.created_at)) 
        : AdminTimestamp.now(),
      syncedAt: FieldValue.serverTimestamp(),
      syncSource: 'revolut-webhook',
    }, { merge: true });

    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parseResult = RevolutEventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const event = parseResult.data;

    // Bei jedem Event: Prüfe ob Subscription existiert, wenn nicht -> sync
    if (event.subscription_id) {
      const existingSub = await findSubscriptionByRevolutId(event.subscription_id);
      if (!existingSub) {
        // Subscription nicht in Firestore -> automatisch synchronisieren
        await syncSubscriptionFromRevolut(event.subscription_id);
      }
    }

    switch (event.event) {
      case 'SUBSCRIPTION_ACTIVATED': {
        // Subscription wurde aktiviert (erste Zahlung erfolgreich)
        if (!event.subscription_id) break;
        
        let sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (!sub) {
          // Falls immer noch nicht gefunden, nochmal sync versuchen
          await syncSubscriptionFromRevolut(event.subscription_id);
          sub = await findSubscriptionByRevolutId(event.subscription_id);
        }
        
        if (sub) {
          await updateSubscription(sub.id, {
            status: 'active',
            activatedAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_COMPLETED': {
        // Monatliche Zahlung erfolgreich
        if (!event.subscription_id) break;
        
        let sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (!sub) {
          await syncSubscriptionFromRevolut(event.subscription_id);
          sub = await findSubscriptionByRevolutId(event.subscription_id);
        }
        
        if (sub) {
          // Berechne Abrechnungsperiode (1. des Monats bis Ende des Monats)
          const now = new Date();
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          
          // Erstelle Rechnung für diese Periode
          await WebmailSubscriptionService.createInvoiceForSubscription(sub.id, periodStart, periodEnd);
          
          await updateSubscription(sub.id, {
            lastPaymentAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_FAILED': {
        // Zahlung fehlgeschlagen
        if (!event.subscription_id) break;
        
        let sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (!sub) {
          await syncSubscriptionFromRevolut(event.subscription_id);
          sub = await findSubscriptionByRevolutId(event.subscription_id);
        }
        
        if (sub) {
          await updateSubscription(sub.id, {
            paymentFailedAt: FieldValue.serverTimestamp(),
            status: 'payment_failed',
          });
        }
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        // Subscription gekündigt
        if (!event.subscription_id) break;
        
        let sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (!sub) {
          await syncSubscriptionFromRevolut(event.subscription_id);
          sub = await findSubscriptionByRevolutId(event.subscription_id);
        }
        
        if (sub) {
          await updateSubscription(sub.id, {
            status: 'cancelled',
            cancelledAt: FieldValue.serverTimestamp(),
          });
        }
        break;
      }
    }

    return NextResponse.json({ success: true, event: event.event });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}
