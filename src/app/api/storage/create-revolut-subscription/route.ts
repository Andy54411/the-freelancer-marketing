/**
 * Storage Subscription mit Revolut Merchant Subscription API
 * 
 * Erstellt ein monatliches Abo für Cloud-Speicher Upgrade
 * Nutzt Revolut Subscriptions API für wiederkehrende Zahlungen
 * 
 * Flow:
 * 1. Plan Variation ID aus Firestore Config laden (oder bei Revolut erstellen)
 * 2. Customer bei Revolut erstellen/finden
 * 3. Subscription erstellen mit Setup Order
 * 4. Kunde zur Checkout-Seite weiterleiten
 */

import { NextResponse, type NextRequest } from 'next/server';
import { admin } from '@/firebase/server';
import { z } from 'zod';

const REVOLUT_API_VERSION = '2025-10-16';
const REVOLUT_API_KEY = process.env.REVOLUT_MERCHANT_API_KEY;

function getRevolutConfig() {
  const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
  return {
    apiKey: REVOLUT_API_KEY,
    // Neue Subscription API
    baseUrl: isProduction
      ? 'https://merchant.revolut.com/api'
      : 'https://sandbox-merchant.revolut.com/api',
    // Legacy API 1.0 (für Customers und Orders)
    legacyBaseUrl: isProduction
      ? 'https://merchant.revolut.com/api/1.0'
      : 'https://sandbox-merchant.revolut.com/api/1.0',
  };
}

// Revolut Subscription API Request Helper (neue API)
async function revolutRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const config = getRevolutConfig();
  
  if (!config.apiKey) {
    return { success: false, error: 'Revolut API Key nicht konfiguriert' };
  }

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.message || `Revolut API Fehler: ${response.status}` 
      };
    }

    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Netzwerkfehler' 
    };
  }
}

// Revolut Legacy API Request Helper (1.0 - für Customers und Orders)
async function revolutLegacyRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const config = getRevolutConfig();
  
  if (!config.apiKey) {
    return { success: false, error: 'Revolut API Key nicht konfiguriert' };
  }

  try {
    const response = await fetch(`${config.legacyBaseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: data.message || `Revolut API Fehler: ${response.status}` 
      };
    }

    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Netzwerkfehler' 
    };
  }
}

// Storage Plans mit Preisen in Cents (monatlich)
const STORAGE_PLANS = {
  '1gb': { name: '1 GB Cloud-Speicher', storage: 1 * 1024 * 1024 * 1024, priceEurCents: 99 },
  '10gb': { name: '10 GB Cloud-Speicher', storage: 10 * 1024 * 1024 * 1024, priceEurCents: 299 },
  '30gb': { name: '30 GB Cloud-Speicher', storage: 30 * 1024 * 1024 * 1024, priceEurCents: 599 },
  '50gb': { name: '50 GB Cloud-Speicher', storage: 50 * 1024 * 1024 * 1024, priceEurCents: 999 },
  '100gb': { name: '100 GB Cloud-Speicher', storage: 100 * 1024 * 1024 * 1024, priceEurCents: 1499 },
  'unlimited': { name: 'Unlimited Cloud-Speicher', storage: Number.MAX_SAFE_INTEGER, priceEurCents: 1990 },
};

type StoragePlanId = keyof typeof STORAGE_PLANS;

const StorageSubscriptionSchema = z.object({
  planId: z.enum(['1gb', '10gb', '30gb', '50gb', '100gb', 'unlimited']),
  companyId: z.string().min(1),
  email: z.string().email(),
  companyName: z.string().min(1),
});

/**
 * Holt oder erstellt Storage Subscription Plans bei Revolut
 * Speichert Plan Variation IDs in Firestore
 */
async function getOrCreateStoragePlanVariationId(
  planId: StoragePlanId
): Promise<{ success: boolean; variationId?: string; error?: string }> {
  const db = admin.firestore();
  const configRef = db.collection('revolut_config').doc('storage_plans');
  
  // Prüfe ob Plan bereits existiert
  const configDoc = await configRef.get();
  const existingPlans = configDoc.exists ? configDoc.data() : null;
  
  if (existingPlans?.[planId]?.variationId) {
    return { success: true, variationId: existingPlans[planId].variationId };
  }

  // Plan bei Revolut erstellen
  const plan = STORAGE_PLANS[planId];
  const result = await revolutRequest<{
    id: string;
    variations: Array<{ id: string }>;
  }>('/subscription-plans', 'POST', {
    name: `Taskilo ${plan.name}`,
    variations: [
      {
        phases: [{
          ordinal: 1,
          cycle_duration: 'P1M', // Monatlich
          amount: plan.priceEurCents,
          currency: 'EUR',
        }],
      },
    ],
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const variationId = result.data.variations[0]?.id;
  if (!variationId) {
    return { success: false, error: 'Keine Variation ID erhalten' };
  }

  // Speichere in Firestore
  await configRef.set({
    [planId]: {
      planId: result.data.id,
      variationId,
      name: plan.name,
      priceEurCents: plan.priceEurCents,
      storage: plan.storage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  return { success: true, variationId };
}

/**
 * Erstellt oder findet einen Revolut Customer
 */
async function getOrCreateRevolutCustomer(
  email: string,
  fullName: string
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  // Suche nach existierendem Customer
  const searchResult = await revolutLegacyRequest<Array<{ id: string; email: string }>>(
    `/customers?email=${encodeURIComponent(email)}`
  );

  if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
    const existingCustomer = searchResult.data[0];
    if (existingCustomer) {
      return { success: true, customerId: existingCustomer.id };
    }
  }

  // Erstelle neuen Customer
  const createResult = await revolutLegacyRequest<{ id: string }>('/customers', 'POST', {
    email,
    full_name: fullName,
  });

  if (createResult.success && createResult.data) {
    return { success: true, customerId: createResult.data.id };
  }

  return { success: false, error: createResult.error };
}

export async function POST(request: NextRequest) {
  if (!REVOLUT_API_KEY) {
    return NextResponse.json(
      { error: 'Storage Subscription Service nicht verfügbar' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    const validation = StorageSubscriptionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { planId, companyId, email, companyName } = validation.data;
    const plan = STORAGE_PLANS[planId];
    const db = admin.firestore();

    // 0. Prüfen ob Company existiert
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        { error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    // 1. Plan Variation ID holen/erstellen
    const planResult = await getOrCreateStoragePlanVariationId(planId);
    if (!planResult.success || !planResult.variationId) {
      return NextResponse.json(
        { error: planResult.error || 'Plan konnte nicht erstellt werden' },
        { status: 500 }
      );
    }

    // 2. Revolut Customer erstellen/finden
    const customerResult = await getOrCreateRevolutCustomer(email, companyName);
    if (!customerResult.success || !customerResult.customerId) {
      return NextResponse.json(
        { error: customerResult.error || 'Kunde konnte nicht erstellt werden' },
        { status: 500 }
      );
    }

    // 3. Lokale Subscription-ID generieren
    const localSubscriptionId = `storage_${companyId}_${Date.now()}`;
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${companyId}/settings?view=storage&subscription_id=${localSubscriptionId}`;

    // 4. Revolut Subscription erstellen
    const subscriptionResult = await revolutRequest<{
      id: string;
      setup_order_id?: string;
      state: string;
    }>('/subscriptions', 'POST', {
      customer_id: customerResult.customerId,
      plan_variation_id: planResult.variationId,
      setup_order_redirect_url: redirectUrl,
      external_reference: localSubscriptionId,
    });

    if (!subscriptionResult.success || !subscriptionResult.data) {
      return NextResponse.json(
        { error: subscriptionResult.error || 'Subscription konnte nicht erstellt werden' },
        { status: 500 }
      );
    }

    // 5. Checkout URL vom Setup Order holen
    let checkoutUrl: string | undefined;
    if (subscriptionResult.data.setup_order_id) {
      const orderResult = await revolutLegacyRequest<{ checkout_url: string }>(
        `/orders/${subscriptionResult.data.setup_order_id}`
      );
      if (orderResult.success && orderResult.data?.checkout_url) {
        checkoutUrl = orderResult.data.checkout_url;
      }
    }

    // 6. Subscription in Firestore speichern
    const subscriptionRef = db
      .collection('companies')
      .doc(companyId)
      .collection('storage_subscriptions')
      .doc(localSubscriptionId);

    await subscriptionRef.set({
      localId: localSubscriptionId,
      revolutSubscriptionId: subscriptionResult.data.id,
      revolutCustomerId: customerResult.customerId,
      setupOrderId: subscriptionResult.data.setup_order_id,
      planId,
      planName: plan.name,
      storage: plan.storage,
      priceEurCents: plan.priceEurCents,
      paymentProvider: 'revolut',
      billingCycle: 'monthly',
      status: 'pending_payment', // Wird aktiv nach Checkout
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Auch Company-Dokument aktualisieren
    await companyRef.update({
      pendingStorageSubscription: {
        subscriptionId: localSubscriptionId,
        planId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    return NextResponse.json({
      url: checkoutUrl,
      subscriptionId: localSubscriptionId,
      revolutSubscriptionId: subscriptionResult.data.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
