/**
 * Test Revolut Subscription Flow
 * 
 * Testet den kompletten Workflow:
 * 1. Revolut Plans initialisieren (falls nicht vorhanden)
 * 2. Customer erstellen
 * 3. Subscription erstellen
 * 4. Checkout URL generieren
 */

import { NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

// Revolut API Config
const REVOLUT_API_VERSION = '2025-10-16';

function getRevolutConfig() {
  const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
  return {
    apiKey: process.env.REVOLUT_MERCHANT_API_KEY,
    // Neue Subscription API (mit Version Header)
    baseUrl: isProduction
      ? 'https://merchant.revolut.com/api'
      : 'https://sandbox-merchant.revolut.com/api',
    // Legacy API (mit 1.0 im Pfad)
    legacyBaseUrl: isProduction
      ? 'https://merchant.revolut.com/api/1.0'
      : 'https://sandbox-merchant.revolut.com/api/1.0',
  };
}

// Neue Subscription API mit Version Header
async function revolutRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const config = getRevolutConfig();
  
  if (!config.apiKey) {
    return { success: false, error: 'REVOLUT_MERCHANT_API_KEY nicht konfiguriert' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseText = await response.text();
    let data: T | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response ist kein JSON
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseText || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return { success: true, data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Netzwerkfehler',
    };
  }
}

// Legacy API (1.0) für Customers - ohne Version Header
async function revolutLegacyRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const config = getRevolutConfig();
  
  if (!config.apiKey) {
    return { success: false, error: 'REVOLUT_MERCHANT_API_KEY nicht konfiguriert' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${config.legacyBaseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseText = await response.text();
    let data: T | undefined;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // Response ist kein JSON
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseText || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return { success: true, data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Netzwerkfehler',
    };
  }
}

export async function POST() {
  const results: {
    step: string;
    success: boolean;
    data?: unknown;
    error?: string;
    duration?: number;
  }[] = [];

  const startTime = Date.now();

  // Step 1: Prüfe Revolut API Verbindung (Subscription API)
  const step1Start = Date.now();
  const config = getRevolutConfig();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Verwende die Subscription API (nicht Legacy)
    const response = await fetch(`${config.baseUrl}/subscription-plans`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const pingSuccess = response.ok;
    results.push({
      step: '1. Revolut API Verbindung testen',
      success: pingSuccess,
      data: pingSuccess ? { message: 'Verbindung OK', status: response.status } : undefined,
      error: pingSuccess ? undefined : `HTTP ${response.status}`,
      duration: Date.now() - step1Start,
    });

    if (!pingSuccess) {
      return NextResponse.json({
        success: false,
        message: 'Revolut API nicht erreichbar',
        results,
        totalDuration: Date.now() - startTime,
        config: {
          environment: process.env.REVOLUT_ENVIRONMENT,
          apiKeyConfigured: !!process.env.REVOLUT_MERCHANT_API_KEY,
          apiKeyPrefix: process.env.REVOLUT_MERCHANT_API_KEY?.substring(0, 10) + '...',
        },
      });
    }
  } catch (error) {
    results.push({
      step: '1. Revolut API Verbindung testen',
      success: false,
      error: error instanceof Error ? error.message : 'Netzwerkfehler',
      duration: Date.now() - step1Start,
    });
    
    return NextResponse.json({
      success: false,
      message: 'Revolut API Netzwerkfehler',
      results,
      totalDuration: Date.now() - startTime,
    });
  }

  // Step 2: Prüfe ob Plans existieren in Firestore
  const step2Start = Date.now();
  let existingPlans: {
    promail?: { planId?: string; monthlyId?: string; yearlyId?: string };
    businessmail?: { planId?: string; monthlyId?: string; yearlyId?: string };
    createdAt?: Date;
  } | null = null;
  
  try {
    if (adminDb) {
      const planDoc = await adminDb.collection('settings').doc('revolutPlans').get();
      if (planDoc.exists) {
        const data = planDoc.data();
        if (data) {
          existingPlans = data as {
            promail?: { planId?: string; monthlyId?: string; yearlyId?: string };
            businessmail?: { planId?: string; monthlyId?: string; yearlyId?: string };
            createdAt?: Date;
          };
        }
      }
    }
  } catch (error) {
    results.push({
      step: '2. Firestore Plans pruefen',
      success: false,
      error: error instanceof Error ? error.message : 'Firestore Fehler',
      duration: Date.now() - step2Start,
    });
    
    return NextResponse.json({
      success: false,
      message: 'Firestore Fehler',
      results,
      totalDuration: Date.now() - startTime,
    });
  }

  if (existingPlans) {
    results.push({
      step: '2. Revolut Plans pruefen',
      success: true,
      data: { message: 'Plans bereits in Firestore vorhanden', plans: existingPlans },
      duration: Date.now() - step2Start,
    });
  } else {
    // Plans bei Revolut erstellen
    const promailResult = await revolutRequest<{
      id: string;
      variations: Array<{ id: string }>;
    }>('/subscription-plans', 'POST', {
      name: 'Taskilo ProMail',
      variations: [
        { phases: [{ ordinal: 1, cycle_duration: 'P1M', amount: 299, currency: 'EUR' }] },
        { phases: [{ ordinal: 1, cycle_duration: 'P1Y', amount: 2990, currency: 'EUR' }] },
      ],
    });

    if (!promailResult.success) {
      results.push({
        step: '2. ProMail Plan erstellen',
        success: false,
        error: promailResult.error,
        duration: Date.now() - step2Start,
      });
      
      return NextResponse.json({
        success: false,
        message: 'ProMail Plan Erstellung fehlgeschlagen',
        results,
        totalDuration: Date.now() - startTime,
      });
    }

    const businessResult = await revolutRequest<{
      id: string;
      variations: Array<{ id: string }>;
    }>('/subscription-plans', 'POST', {
      name: 'Taskilo BusinessMail',
      variations: [
        { phases: [{ ordinal: 1, cycle_duration: 'P1M', amount: 499, currency: 'EUR' }] },
        { phases: [{ ordinal: 1, cycle_duration: 'P1Y', amount: 4990, currency: 'EUR' }] },
      ],
    });

    if (!businessResult.success) {
      results.push({
        step: '2. BusinessMail Plan erstellen',
        success: false,
        error: businessResult.error,
        duration: Date.now() - step2Start,
      });
      
      return NextResponse.json({
        success: false,
        message: 'BusinessMail Plan Erstellung fehlgeschlagen',
        results,
        totalDuration: Date.now() - startTime,
      });
    }

    // Speichere in Firestore
    const plans = {
      promail: {
        planId: promailResult.data?.id,
        monthlyId: promailResult.data?.variations[0]?.id,
        yearlyId: promailResult.data?.variations[1]?.id,
      },
      businessmail: {
        planId: businessResult.data?.id,
        monthlyId: businessResult.data?.variations[0]?.id,
        yearlyId: businessResult.data?.variations[1]?.id,
      },
      createdAt: new Date(),
    };

    if (adminDb) {
      await adminDb.collection('settings').doc('revolutPlans').set(plans);
    }

    existingPlans = plans;
    results.push({
      step: '2. Revolut Plans erstellen',
      success: true,
      data: { message: 'Plans erstellt und in Firestore gespeichert', plans },
      duration: Date.now() - step2Start,
    });
  }

  // Step 3: Teste Customer Erstellung (Legacy API)
  const step3Start = Date.now();
  const testEmail = `test-${Date.now()}@taskilo.de`;
  const testName = 'Test Kunde Workflow';
  
  const customerResult = await revolutLegacyRequest<{ id: string }>('/customers', 'POST', {
    email: testEmail,
    full_name: testName,
  });

  results.push({
    step: '3. Revolut Customer erstellen',
    success: customerResult.success,
    data: customerResult.success ? { 
      email: testEmail,
      customerId: customerResult.data?.id,
    } : undefined,
    error: customerResult.error,
    duration: Date.now() - step3Start,
  });

  if (!customerResult.success) {
    return NextResponse.json({
      success: false,
      message: 'Customer Erstellung fehlgeschlagen',
      results,
      totalDuration: Date.now() - startTime,
    });
  }

  // Step 4: Teste Subscription Erstellung
  const step4Start = Date.now();
  const localSubscriptionId = `SUB-TEST-${Date.now()}`;
  
  // Hole die monthlyId vom promail Plan
  const planVariationId = existingPlans?.promail?.monthlyId;
  
  if (!planVariationId) {
    results.push({
      step: '4. Subscription erstellen',
      success: false,
      error: 'Keine Plan Variation ID gefunden',
      duration: Date.now() - step4Start,
    });
    
    return NextResponse.json({
      success: false,
      message: 'Plan Variation ID fehlt',
      results,
      totalDuration: Date.now() - startTime,
    });
  }

  const subscriptionResult = await revolutRequest<{
    id: string;
    setup_order_id?: string;
  }>('/subscriptions', 'POST', {
    customer_id: customerResult.data?.id,
    plan_variation_id: planVariationId,
    setup_order_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/webmail/pricing/success?subscription_id=${localSubscriptionId}`,
    external_reference: localSubscriptionId,
  });

  let checkoutUrl: string | undefined;
  
  if (subscriptionResult.success && subscriptionResult.data?.setup_order_id) {
    // Orders sind in der Legacy API (1.0)
    const orderResult = await revolutLegacyRequest<{ checkout_url: string }>(
      `/orders/${subscriptionResult.data.setup_order_id}`
    );
    checkoutUrl = orderResult.data?.checkout_url;
  }

  results.push({
    step: '4. Subscription erstellen',
    success: subscriptionResult.success,
    data: subscriptionResult.success ? {
      subscriptionId: subscriptionResult.data?.id,
      setupOrderId: subscriptionResult.data?.setup_order_id,
      checkoutUrl,
    } : undefined,
    error: subscriptionResult.error,
    duration: Date.now() - step4Start,
  });

  // Zusammenfassung
  const allSuccess = results.every(r => r.success);
  
  return NextResponse.json({
    success: allSuccess,
    message: allSuccess 
      ? 'Alle Tests erfolgreich! Checkout URL kann verwendet werden.'
      : 'Einige Tests fehlgeschlagen',
    results,
    totalDuration: Date.now() - startTime,
    checkoutUrl,
    nextStep: checkoutUrl 
      ? `Oeffne diese URL im Browser um die Zahlung zu testen: ${checkoutUrl}`
      : undefined,
  });
}

export async function GET() {
  // Zeige aktuellen Status
  let plans: Record<string, unknown> | null = null;
  let subscriptionCount = 0;
  let invoiceCount = 0;

  try {
    if (adminDb) {
      const planDoc = await adminDb.collection('settings').doc('revolutPlans').get();
      if (planDoc.exists) {
        plans = planDoc.data() as Record<string, unknown>;
      }

      const subsSnapshot = await adminDb.collection('webmailSubscriptions').count().get();
      subscriptionCount = subsSnapshot.data().count;

      const invoicesSnapshot = await adminDb.collection('webmailInvoices').count().get();
      invoiceCount = invoicesSnapshot.data().count;
    }
  } catch {
    // Ignore errors
  }

  return NextResponse.json({
    success: true,
    status: {
      revolutPlansConfigured: !!plans,
      plans,
      totalSubscriptions: subscriptionCount,
      totalInvoices: invoiceCount,
    },
    config: {
      environment: process.env.REVOLUT_ENVIRONMENT,
      apiKeyConfigured: !!process.env.REVOLUT_MERCHANT_API_KEY,
      webhookSecretConfigured: !!process.env.REVOLUT_WEBHOOK_SECRET,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    },
  });
}
