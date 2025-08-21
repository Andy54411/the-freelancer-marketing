import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * EMERGENCY TRANSFER: Manueller Transfer für festsitzende Stripe-Gelder
 * Diese API transferiert pending Balance direkt an Provider Connect Account
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /emergency-transfer] Starting emergency transfer...');

    const body = await request.json();
    const { providerStripeAccountId, amount, orderId, reason } = body;

    console.log('[API /emergency-transfer] Request data:', {
      providerStripeAccountId,
      amount,
      orderId,
      reason
    });

    // Validierung
    if (!providerStripeAccountId || !amount || !orderId) {
      return NextResponse.json(
        { error: 'providerStripeAccountId, amount und orderId sind erforderlich.' },
        { status: 400 }
      );
    }

    // Sicherheitscheck: Maximaler Transfer-Betrag
    const maxAmount = 1000000; // €10,000.00 in Cent
    if (amount > maxAmount) {
      return NextResponse.json(
        { error: `Transfer-Betrag zu hoch. Maximum: €${maxAmount / 100}` },
        { status: 400 }
      );
    }

    try {
      console.log(`[API /emergency-transfer] Creating emergency transfer: ${amount} cents to ${providerStripeAccountId}`);

      // Erstelle Transfer vom Platform Account zum Provider Account
      const transfer = await stripe.transfers.create({
        amount: amount,
        currency: 'eur',
        destination: providerStripeAccountId,
        metadata: {
          orderId,
          type: 'emergency_transfer',
          reason: reason || 'Manual emergency transfer for stuck payments',
          transferDate: new Date().toISOString(),
          emergencyFix: 'true'
        },
        description: `Emergency Transfer für Auftrag ${orderId} - ${reason || 'Manueller Transfer'} (€${(amount / 100).toFixed(2)})`,
      });

      console.log(`[API /emergency-transfer] Successfully created transfer: ${transfer.id}`);

      // Erstelle detaillierte Antwort
      const response = {
        success: true,
        transferId: transfer.id,
        amount: amount,
        amountEur: (amount / 100).toFixed(2),
        providerStripeAccountId,
        orderId,
        reason,
        created: transfer.created,
        description: transfer.description,
        metadata: transfer.metadata
      };

      console.log('[API /emergency-transfer] Transfer completed:', response);
      return NextResponse.json(response);

    } catch (stripeError: any) {
      console.error('[API /emergency-transfer] Stripe error:', stripeError);
      
      return NextResponse.json(
        { 
          error: 'Stripe Transfer fehlgeschlagen',
          details: stripeError.message,
          code: stripeError.code,
          type: stripeError.type
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('[API /emergency-transfer] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler bei Emergency Transfer.' },
      { status: 500 }
    );
  }
}
