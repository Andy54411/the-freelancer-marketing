import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(req: NextRequest, companyId: string) {
  try {
    const { paymentIntentId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'PaymentIntent ID required' }, { status: 400 });
    }

    // Search for this PaymentIntent in proposals
    const quotesSnapshot = await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .get();
    const results: any[] = [];

    for (const quoteDoc of quotesSnapshot.docs) {
      const quoteData = quoteDoc.data();

      // Check subcollection
      const proposalsSnapshot = await quoteDoc.ref.collection('proposals').get();

      for (const proposalDoc of proposalsSnapshot.docs) {
        const proposalData = proposalDoc.data();

        if (proposalData.paymentIntentId === paymentIntentId) {
          results.push({
            type: 'subcollection',
            quoteId: quoteDoc.id,
            proposalId: proposalDoc.id,
            status: proposalData.status,
            paymentIntentId: proposalData.paymentIntentId,
            quoteData: {
              customerUid: quoteData.customerUid,
              title: quoteData.title,
              status: quoteData.status,
            },
            proposalData,
          });
        }
      }
    }

    // Also check orders collection for existing orders
    const ordersSnapshot = await db
      .collection('auftraege')
      .where('paymentIntentId', '==', paymentIntentId)
      .get();

    const existingOrders = ordersSnapshot.docs.map(doc => ({
      orderId: doc.id,
      status: doc.data().status,
      payoutStatus: doc.data().payoutStatus,
      createdAt: doc.data().createdAt,
    }));

    return NextResponse.json({
      success: true,
      paymentIntentId,
      foundProposals: results,
      existingOrders,
      message: `Found ${results.length} proposals and ${existingOrders.length} existing orders`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
