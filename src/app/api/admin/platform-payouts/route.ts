import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET() {
  try {
    // Lade Platform Payouts (Auszahlungen des Hauptkontos)
    const payouts = await stripe.payouts.list({
      limit: 20,
    });

    const formattedPayouts = payouts.data.map(payout => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      created: payout.created,
      arrival_date: payout.arrival_date,
      destination: {
        id: payout.destination,
        bank_name:
          payout.destination && typeof payout.destination === 'object'
            ? (payout.destination as any).bank_name
            : undefined,
        last4:
          payout.destination && typeof payout.destination === 'object'
            ? (payout.destination as any).last4
            : undefined,
      },
    }));

    return NextResponse.json({
      success: true,
      payouts: formattedPayouts,
    });
  } catch (error) {
    console.error('Error fetching platform payouts:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Fehler beim Laden der Platform-Auszahlungen',
      },
      { status: 500 }
    );
  }
}
