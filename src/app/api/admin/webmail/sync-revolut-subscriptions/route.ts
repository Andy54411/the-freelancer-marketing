/**
 * Sync Revolut Subscriptions to Firestore
 * 
 * Holt alle aktiven Subscriptions von Revolut und synchronisiert sie mit Firestore
 */

import { NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const REVOLUT_API_KEY = process.env.REVOLUT_MERCHANT_API_KEY;
const REVOLUT_API_VERSION = '2025-10-16';
const REVOLUT_ENVIRONMENT = process.env.REVOLUT_ENVIRONMENT || 'sandbox';

function getBaseUrl() {
  return REVOLUT_ENVIRONMENT === 'production'
    ? 'https://merchant.revolut.com/api'
    : 'https://sandbox-merchant.revolut.com/api';
}

interface RevolutSubscription {
  id: string;
  state: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'PAUSED';
  customer_id: string;
  customer_email?: string;
  plan_id: string;
  plan_variation_id: string;
  billing_anchor_date: string;
  current_period_start: string;
  current_period_end: string;
  next_billing_date?: string;
  created_at: string;
  cancelled_at?: string;
  metadata?: Record<string, string>;
}

interface RevolutCustomer {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
}

interface RevolutPlan {
  id: string;
  name: string;
  variations: Array<{
    id: string;
    phases: Array<{
      cycle_duration: string;
      amount: number;
      currency: string;
    }>;
  }>;
}

async function revolutRequest<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!REVOLUT_API_KEY) {
    return { success: false, error: 'Revolut API Key nicht konfiguriert' };
  }

  try {
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
  }
}

export async function POST() {
  if (!adminDb) {
    return NextResponse.json({ success: false, error: 'Datenbank nicht verfügbar' }, { status: 500 });
  }

  try {
    // 1. Hole alle Subscriptions von Revolut
    const subsResult = await revolutRequest<{ subscriptions: RevolutSubscription[] }>('/subscriptions');
    if (!subsResult.success || !subsResult.data) {
      return NextResponse.json({ 
        success: false, 
        error: subsResult.error || 'Fehler beim Laden der Subscriptions',
      }, { status: 500 });
    }

    const subscriptions = subsResult.data.subscriptions || [];

    // 2. Hole alle Plans für Namen
    const plansResult = await revolutRequest<{ subscription_plans: RevolutPlan[] }>('/subscription-plans');
    const plans = plansResult.data?.subscription_plans || [];
    const planMap = new Map<string, RevolutPlan>();
    plans.forEach(p => planMap.set(p.id, p));

    // 3. Hole Customer-Details für E-Mails (Legacy API)
    const customerMap = new Map<string, RevolutCustomer>();
    const customerIds = [...new Set(subscriptions.map(s => s.customer_id))];
    
    for (const customerId of customerIds) {
      try {
        const custResponse = await fetch(
          `${REVOLUT_ENVIRONMENT === 'production' 
            ? 'https://merchant.revolut.com/api/1.0' 
            : 'https://sandbox-merchant.revolut.com/api/1.0'}/customers/${customerId}`,
          {
            headers: {
              'Authorization': `Bearer ${REVOLUT_API_KEY}`,
            },
          }
        );
        if (custResponse.ok) {
          const custData = await custResponse.json();
          customerMap.set(customerId, custData);
        }
      } catch {
        // Ignore customer fetch errors
      }
    }

    // 4. Synchronisiere mit Firestore
    const batch = adminDb.batch();
    let synced = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const customer = customerMap.get(sub.customer_id);
        const plan = planMap.get(sub.plan_id);
        
        // Finde Preis aus Variation
        let priceGross = 0;
        let billingInterval: 'monthly' | 'yearly' = 'monthly';
        
        if (plan) {
          const variation = plan.variations.find(v => v.id === sub.plan_variation_id);
          if (variation && variation.phases[0]) {
            priceGross = variation.phases[0].amount / 100; // Cent zu Euro
            billingInterval = variation.phases[0].cycle_duration === 'P1Y' ? 'yearly' : 'monthly';
          }
        }

        const docRef = adminDb.collection('webmailSubscriptions').doc(sub.id);
        
        const subscriptionData = {
          id: sub.id,
          revolutSubscriptionId: sub.id,
          revolutCustomerId: sub.customer_id,
          revolutPlanId: sub.plan_id,
          revolutVariationId: sub.plan_variation_id,
          
          // Kunde
          customerEmail: sub.customer_email || customer?.email || sub.metadata?.email || 'Unbekannt',
          customerName: customer?.full_name || sub.metadata?.companyName || 'Unbekannt',
          userId: sub.metadata?.userId || sub.metadata?.companyId || null,
          companyId: sub.metadata?.companyId || null,
          
          // Plan
          planId: sub.plan_id,
          planName: plan?.name || 'Unbekannt',
          priceGross,
          billingInterval,
          
          // Status
          status: sub.state.toLowerCase() as 'active' | 'cancelled' | 'expired' | 'past_due' | 'paused',
          
          // Zeiträume - sichere Timestamp-Konvertierung
          currentPeriodStart: sub.current_period_start 
            ? Timestamp.fromDate(new Date(sub.current_period_start)) 
            : null,
          currentPeriodEnd: sub.current_period_end 
            ? Timestamp.fromDate(new Date(sub.current_period_end)) 
            : null,
          nextBillingDate: sub.next_billing_date 
            ? Timestamp.fromDate(new Date(sub.next_billing_date)) 
            : null,
          createdAt: sub.created_at 
            ? Timestamp.fromDate(new Date(sub.created_at)) 
            : Timestamp.now(),
          cancelledAt: sub.cancelled_at 
            ? Timestamp.fromDate(new Date(sub.cancelled_at)) 
            : null,
          
          // Metadata
          metadata: sub.metadata || {},
          
          // Sync-Info
          syncedAt: FieldValue.serverTimestamp(),
          syncSource: 'revolut',
        };

        batch.set(docRef, subscriptionData, { merge: true });
        synced++;
      } catch (error) {
        errors.push(`${sub.id}: ${error instanceof Error ? error.message : 'Fehler'}`);
      }
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${synced} Subscriptions synchronisiert`,
      total: subscriptions.length,
      synced,
      errors: errors.length > 0 ? errors : undefined,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        state: s.state,
        customerEmail: s.customer_email || customerMap.get(s.customer_id)?.email,
        planName: planMap.get(s.plan_id)?.name,
      })),
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

export async function GET() {
  // Zeige aktuellen Sync-Status
  if (!adminDb) {
    return NextResponse.json({ success: false, error: 'Datenbank nicht verfügbar' }, { status: 500 });
  }

  try {
    const snapshot = await adminDb.collection('webmailSubscriptions').get();
    const subscriptions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
