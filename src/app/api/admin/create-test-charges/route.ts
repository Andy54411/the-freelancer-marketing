// src/app/api/admin/create-test-charges/route.ts
// 🧪 TEST CHARGES API - Erstellt Test-Zahlungen um available balance zu generieren

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Test-Karten für verschiedene Szenarien
const TEST_CARDS = {
  SUCCESS: 'pm_card_visa', // Standard erfolgreiche Karte
  SUCCESS_DEBIT: 'pm_card_visa_debit', // Debit-Karte
  AVAILABLE_BALANCE: '4000000000000077', // Spezielle Karte für available balance
  DECLINE_GENERIC: 'pm_card_chargeDeclined',
  INSUFFICIENT_FUNDS: 'pm_card_chargeDeclinedInsufficientFunds',
};

interface TestChargeRequest {
  amount?: number; // Betrag in Cents
  connectAccountId?: string; // Connect Account ID
  count?: number; // Anzahl der Charges
  cardType?: keyof typeof TEST_CARDS;
  description?: string;
}

interface BalanceInfo {
  type: 'connect_account' | 'platform';
  accountId?: string;
  available: Stripe.Balance.Available[];
  pending: Stripe.Balance.Pending[];
}

interface ChargeResult {
  chargeNumber: number;
  paymentIntentId: string;
  amount: number;
  status: string;
  connectAccount: string;
  cardUsed: keyof typeof TEST_CARDS;
}

interface ChargeError {
  chargeNumber: number;
  error: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: TestChargeRequest = await req.json();
    
    const {
      amount = 10000, // Default: €100.00
      connectAccountId,
      count = 1,
      cardType = 'AVAILABLE_BALANCE',
      description = 'Test charge for balance generation'
    } = body;

    console.log('[TEST-CHARGES] Creating test charges:', {
      amount,
      connectAccountId,
      count,
      cardType,
    });

    const results: ChargeResult[] = [];
    const errors: ChargeError[] = [];

    // Erstelle die angegebene Anzahl von Test-Charges
    for (let i = 0; i < count; i++) {
      try {
        console.log(`[TEST-CHARGES] Creating charge ${i + 1}/${count}`);

        // Verwende spezielle Test-Karte für available balance
        let paymentMethod;
        if (cardType === 'AVAILABLE_BALANCE') {
          // Erstelle PaymentMethod mit der speziellen Test-Karte
          paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
              number: TEST_CARDS.AVAILABLE_BALANCE,
              exp_month: 12,
              exp_year: 2030,
              cvc: '123',
            },
          });
        } else {
          paymentMethod = { id: TEST_CARDS[cardType] };
        }

        // Erstelle PaymentIntent
        const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
          amount,
          currency: 'eur',
          payment_method: paymentMethod.id,
          confirm: true,
          return_url: 'https://taskilo.de/payment/success',
          description: `${description} #${i + 1}`,
          metadata: {
            test_charge: 'true',
            purpose: 'balance_generation',
            created_by: 'test_charges_api',
          },
        };

        // Wenn Connect Account angegeben, Charge direkt dort erstellen
        if (connectAccountId) {
          paymentIntentParams.transfer_data = {
            destination: connectAccountId,
          };
          paymentIntentParams.application_fee_amount = Math.floor(amount * 0.05); // 5% Platform Fee
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        results.push({
          chargeNumber: i + 1,
          paymentIntentId: paymentIntent.id,
          amount,
          status: paymentIntent.status,
          connectAccount: connectAccountId || 'platform',
          cardUsed: cardType,
        });

        console.log(`[TEST-CHARGES] Charge ${i + 1} created: ${paymentIntent.id}`);

        // Kleine Pause zwischen Charges
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (chargeError) {
        const errorMessage = chargeError instanceof Error ? chargeError.message : String(chargeError);
        console.error(`[TEST-CHARGES] Error creating charge ${i + 1}:`, errorMessage);
        
        errors.push({
          chargeNumber: i + 1,
          error: errorMessage,
        });
      }
    }

    // Nach Charge-Erstellung, aktualisierte Balance abrufen
    let balanceInfo: BalanceInfo | null = null;
    try {
      if (connectAccountId) {
        const balance = await stripe.balance.retrieve({
          stripeAccount: connectAccountId,
        });
        balanceInfo = {
          type: 'connect_account',
          accountId: connectAccountId,
          available: balance.available,
          pending: balance.pending,
        };
      } else {
        const balance = await stripe.balance.retrieve();
        balanceInfo = {
          type: 'platform',
          available: balance.available,
          pending: balance.pending,
        };
      }
    } catch (balanceError) {
      console.error('[TEST-CHARGES] Error retrieving balance:', balanceError);
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} test charges created successfully`,
      summary: {
        totalCharges: count,
        successfulCharges: results.length,
        failedCharges: errors.length,
        totalAmount: results.length * amount,
        totalAmountFormatted: `€${(results.length * amount / 100).toFixed(2)}`,
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
      balanceAfter: balanceInfo,
      recommendations: [
        'Wait a few minutes for charges to be processed',
        'Check balance again using /api/admin/platform-stats',
        'Retry failed transfers using /api/admin/retry-failed-transfers',
      ],
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[TEST-CHARGES] API Error:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test charges',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // GET zeigt verfügbare Test-Karten und aktuelle Balance
  try {
    const { searchParams } = new URL(req.url);
    const connectAccountId = searchParams.get('connectAccountId');

    // Aktuelle Balance abrufen
    let currentBalance;
    if (connectAccountId) {
      currentBalance = await stripe.balance.retrieve({
        stripeAccount: connectAccountId,
      });
    } else {
      currentBalance = await stripe.balance.retrieve();
    }

    return NextResponse.json({
      success: true,
      info: 'Test Charges API - Creates test payments to generate available balance',
      currentBalance: {
        available: currentBalance.available,
        pending: currentBalance.pending,
        accountType: connectAccountId ? 'connect_account' : 'platform',
        accountId: connectAccountId || 'platform',
      },
      availableTestCards: {
        AVAILABLE_BALANCE: {
          number: '4000000000000077',
          description: 'Creates available balance immediately',
          recommended: true,
        },
        SUCCESS: {
          number: 'pm_card_visa',
          description: 'Standard successful payment',
        },
        SUCCESS_DEBIT: {
          number: 'pm_card_visa_debit',
          description: 'Successful debit card payment',
        },
      },
      usage: {
        POST: '/api/admin/create-test-charges',
        parameters: {
          amount: 'Amount in cents (default: 10000 = €100)',
          connectAccountId: 'Optional: Target Connect Account ID',
          count: 'Number of charges to create (default: 1)',
          cardType: 'Test card type (default: AVAILABLE_BALANCE)',
          description: 'Charge description',
        },
      },
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get balance info',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
