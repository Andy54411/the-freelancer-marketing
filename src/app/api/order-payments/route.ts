import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * API: Suche alle Payment Intents für einen bestimmten Auftrag
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId ist erforderlich' }, { status: 400 });
    }

    // Alle Payment Intents durchsuchen
    const allPayments: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore && allPayments.length < 500) {
      const params: any = {
        limit: 100,
        expand: ['data.charges.data.transfer'],
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const paymentIntents = await stripe.paymentIntents.list(params);

      // Filter nach orderId
      const orderPayments = paymentIntents.data.filter(pi => pi.metadata?.orderId === orderId);

      allPayments.push(...orderPayments);

      hasMore = paymentIntents.has_more;
      if (paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // Berechne Totals
    const succeededPayments = allPayments.filter(pi => pi.status === 'succeeded');
    const totalAmount = succeededPayments.reduce((sum, pi) => sum + pi.amount, 0);

    // Organisiere nach Typ
    const paymentsByDescription = allPayments.reduce((acc: any, pi) => {
      const desc = pi.description || 'Unbekannt';
      if (!acc[desc]) {
        acc[desc] = {
          payments: [],
          totalAmount: 0,
          succeededCount: 0,
        };
      }
      acc[desc].payments.push(pi);
      if (pi.status === 'succeeded') {
        acc[desc].totalAmount += pi.amount;
        acc[desc].succeededCount++;
      }
      return acc;
    }, {});

    const formattedPayments = allPayments
      .map(pi => ({
        id: pi.id,
        amount: pi.amount,
        amountEur: (pi.amount / 100).toFixed(2),
        currency: pi.currency,
        created: new Date(pi.created * 1000).toISOString(),
        status: pi.status,
        description: pi.description,
        metadata: pi.metadata,
        transferId: pi.charges?.data?.[0]?.transfer?.id || null,
        transferAmount: pi.charges?.data?.[0]?.transfer?.amount || null,
      }))
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return NextResponse.json({
      success: true,
      orderId,
      totalPayments: allPayments.length,
      succeededPayments: succeededPayments.length,
      totalAmount: totalAmount,
      totalAmountEur: (totalAmount / 100).toFixed(2),
      paymentsByDescription,
      payments: formattedPayments,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Order Payments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
