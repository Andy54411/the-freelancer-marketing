import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * API: Stripe Transfers und Payment Historie abrufen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stripeAccountId = searchParams.get('accountId');
    const orderId = searchParams.get('orderId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'accountId ist erforderlich' }, { status: 400 });
    }

    // 1. Alle Transfers zu diesem Account
    const transfers = await stripe.transfers.list({
      destination: stripeAccountId,
      limit: limit,
      expand: ['data.destination_payment'],
    });

    // 2. Payment Intents mit Charges expandiert
    const paymentIntents = await stripe.paymentIntents.list({
      limit: limit,
      expand: ['data.charges.data.transfer', 'data.latest_charge'],
    });

    // Filter Payment Intents nach orderId falls angegeben
    const relevantPaymentIntents = orderId
      ? paymentIntents.data.filter(pi => pi.metadata?.orderId === orderId)
      : paymentIntents.data;

    // 3. Balance Transactions für detaillierte Historie
    const balanceTransactions = await stripe.balanceTransactions.list({
      limit: limit,
      type: 'transfer',
    });

    // 4. Berechne Totals
    const totalTransferred = transfers.data.reduce((sum, transfer) => sum + transfer.amount, 0);
    const totalPayments = relevantPaymentIntents.reduce(
      (sum, pi) => sum + (pi.amount_received || 0),
      0
    );

    // 5. Organisiere Daten nach Datum
    const transferHistory = transfers.data
      .map(transfer => ({
        id: transfer.id,
        amount: transfer.amount,
        amountEur: (transfer.amount / 100).toFixed(2),
        currency: transfer.currency,
        created: new Date(transfer.created * 1000).toISOString(),
        description: transfer.description,
        metadata: transfer.metadata,
        status: transfer.reversed ? 'reversed' : 'completed',
        orderId: transfer.metadata?.orderId || null,
      }))
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    // Hole separat die Charges für jeden PaymentIntent
    const paymentHistoryWithTransfers = await Promise.all(
      relevantPaymentIntents.map(async pi => {
        let transferId = null;

        try {
          // Hole die Charges für diesen PaymentIntent
          if (pi.latest_charge) {
            const charge = await stripe.charges.retrieve(pi.latest_charge as string);
            if (charge.transfer) {
              transferId =
                typeof charge.transfer === 'string' ? charge.transfer : (charge.transfer as any).id;
            }
          }
        } catch (error) {

        }

        return {
          id: pi.id,
          amount: pi.amount,
          amountEur: (pi.amount / 100).toFixed(2),
          currency: pi.currency,
          created: new Date(pi.created * 1000).toISOString(),
          status: pi.status,
          orderId: pi.metadata?.orderId || null,
          customerId: pi.metadata?.customerId || null,
          description: pi.description,
          transferId: transferId,
        };
      })
    );

    const paymentHistory = paymentHistoryWithTransfers.sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    return NextResponse.json({
      success: true,
      stripeAccountId,
      orderId: orderId || 'all',
      summary: {
        totalTransferred: totalTransferred,
        totalTransferredEur: (totalTransferred / 100).toFixed(2),
        totalPayments: totalPayments,
        totalPaymentsEur: (totalPayments / 100).toFixed(2),
        transferCount: transfers.data.length,
        paymentCount: relevantPaymentIntents.length,
      },
      transfers: transferHistory,
      payments: paymentHistory,
      balanceTransactions: balanceTransactions.data.slice(0, 10).map(bt => ({
        id: bt.id,
        amount: bt.amount,
        amountEur: (bt.amount / 100).toFixed(2),
        type: bt.type,
        created: new Date(bt.created * 1000).toISOString(),
        description: bt.description,
      })),
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Stripe Transfers',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
