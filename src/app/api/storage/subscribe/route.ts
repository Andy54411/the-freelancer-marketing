/**
 * Taskilo Storage Subscription API
 * 
 * Erstellt ein Revolut Merchant Abonnement für Speicherplatz-Upgrades.
 * Verwendet den Hetzner-Proxy für alle Revolut API-Aufrufe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callRevolutApiViaProxy } from '@/lib/revolut-hetzner-proxy';

interface SubscriptionRequest {
  userEmail: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
}

interface StoragePlan {
  id: string;
  name: string;
  storageBytes: number;
  priceMonthly: number;
  priceYearly: number;
}

// Valide Speicherpläne
const VALID_PLANS: Record<string, StoragePlan> = {
  basic_100gb: {
    id: 'basic_100gb',
    name: 'Basic 100 GB',
    storageBytes: 100 * 1024 * 1024 * 1024,
    priceMonthly: 1.99,
    priceYearly: 19.99,
  },
  standard_200gb: {
    id: 'standard_200gb',
    name: 'Standard 200 GB',
    storageBytes: 200 * 1024 * 1024 * 1024,
    priceMonthly: 2.99,
    priceYearly: 29.99,
  },
  premium_2tb: {
    id: 'premium_2tb',
    name: 'Premium 2 TB',
    storageBytes: 2 * 1024 * 1024 * 1024 * 1024,
    priceMonthly: 9.99,
    priceYearly: 99.99,
  },
  premium_5tb: {
    id: 'premium_5tb',
    name: 'Premium 5 TB',
    storageBytes: 5 * 1024 * 1024 * 1024 * 1024,
    priceMonthly: 24.99,
    priceYearly: 249.99,
  },
  premium_10tb: {
    id: 'premium_10tb',
    name: 'Premium 10 TB',
    storageBytes: 10 * 1024 * 1024 * 1024 * 1024,
    priceMonthly: 49.99,
    priceYearly: 499.99,
  },
  business_20tb: {
    id: 'business_20tb',
    name: 'Business 20 TB',
    storageBytes: 20 * 1024 * 1024 * 1024 * 1024,
    priceMonthly: 99.99,
    priceYearly: 999.99,
  },
  business_30tb: {
    id: 'business_30tb',
    name: 'Business Pro 30 TB',
    storageBytes: 30 * 1024 * 1024 * 1024 * 1024,
    priceMonthly: 149.99,
    priceYearly: 1499.99,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SubscriptionRequest;
    const { userEmail, planId, billingCycle, amount, currency } = body;

    // Validierung
    if (!userEmail || !planId || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Fehlende Parameter' },
        { status: 400 }
      );
    }

    const plan = VALID_PLANS[planId];
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Ungültiger Plan' },
        { status: 400 }
      );
    }

    // Preis validieren
    const expectedPrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    if (Math.abs(amount - expectedPrice) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Preisabweichung erkannt' },
        { status: 400 }
      );
    }

    // Revolut Payment Link erstellen
    const paymentDescription = `Taskilo ${plan.name} - ${billingCycle === 'yearly' ? 'Jahresabo' : 'Monatsabo'}`;
    
    const paymentData = {
      amount: Math.round(amount * 100), // Revolut erwartet Cents
      currency: currency || 'EUR',
      reference: `storage_${planId}_${userEmail.replace('@', '_at_')}_${Date.now()}`,
      description: paymentDescription,
      customer: {
        email: userEmail,
      },
      metadata: {
        planId,
        billingCycle,
        userEmail,
        storageBytes: plan.storageBytes.toString(),
        type: 'storage_subscription',
      },
      // Callback URLs
      redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/webmail/photos?upgrade=success&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/webmail/photos?upgrade=cancelled`,
    };

    // Revolut Payment Order erstellen
    const result = await callRevolutApiViaProxy<{
      id: string;
      state: string;
      checkout_url: string;
    }>('/orders', {
      method: 'POST',
      body: paymentData,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Zahlungsauftrag konnte nicht erstellt werden',
          details: result.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.data.id,
      checkoutUrl: result.data.checkout_url,
      state: result.data.state,
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Status eines Abonnements abrufen
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const userEmail = searchParams.get('email');

  if (!orderId && !userEmail) {
    return NextResponse.json(
      { success: false, error: 'orderId oder email erforderlich' },
      { status: 400 }
    );
  }

  try {
    if (orderId) {
      // Einzelnen Order abrufen
      const result = await callRevolutApiViaProxy<{
        id: string;
        state: string;
        amount: { value: number; currency: string };
        metadata?: Record<string, string>;
      }>(`/orders/${orderId}`);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        order: result.data,
      });
    }

    // Alle Orders für einen User abrufen
    // TODO: Implementieren wenn Revolut API das unterstützt
    return NextResponse.json({
      success: true,
      subscriptions: [],
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
