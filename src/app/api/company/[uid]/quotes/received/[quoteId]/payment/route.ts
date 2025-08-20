import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

// Stripe Initialisierung
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.error('STRIPE_SECRET_KEY ist nicht gesetzt');
    return null;
  }
  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

/**
 * API Route für Quote-Provisions-Zahlungen
 * POST /api/company/[uid]/quotes/received/[quoteId]/payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string; quoteId: string } }
) {
  try {
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe-Konfiguration fehlt' }, { status: 500 });
    }

    const body = await request.json();
    const { action } = body;
    const { uid: companyId, quoteId } = params;

    console.log('[Quote Payment API] Request:', { companyId, quoteId, action });

    // Lade Quote-Details
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Validiere, dass das Angebot angenommen wurde
    if (quoteData?.status !== 'accepted') {
      return NextResponse.json({ error: 'Angebot wurde noch nicht angenommen' }, { status: 400 });
    }

    // Validiere, dass es eine Response mit totalAmount gibt
    if (!quoteData?.response?.totalAmount) {
      return NextResponse.json({ error: 'Angebotssumme nicht gefunden' }, { status: 400 });
    }

    switch (action) {
      case 'create_payment_intent': {
        // Berechne 3,5% Provision
        const totalAmount = parseFloat(quoteData.response.totalAmount);
        const provisionRate = 0.05; // 5% Provision für Taskilo
        const provisionAmount = Math.round(totalAmount * provisionRate * 100); // In Cents

        console.log('[Quote Payment API] Calculating provision:', {
          totalAmount,
          provisionRate,
          provisionAmount: provisionAmount / 100,
        });

        // Erstelle Payment Intent für Provision (ohne Connect Features für Tests)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: provisionAmount,
          currency: 'eur',
          metadata: {
            type: 'quote_provision',
            quoteId: quoteId,
            providerUid: quoteData.providerUid,
            customerUid: companyId,
            totalQuoteAmount: totalAmount.toString(),
            provisionRate: provisionRate.toString(),
          },
          description: `Taskilo Provision (5%) für Angebot #${quoteId}`,
          statement_descriptor_suffix: 'PROVISION',
          // Einfacher Payment Intent ohne Connect Features
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Speichere Payment Intent Referenz
        await quoteRef.update({
          'payment.provisionPaymentIntentId': paymentIntent.id,
          'payment.provisionAmount': provisionAmount / 100,
          'payment.provisionStatus': 'pending',
          'payment.createdAt': new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          provisionAmount: provisionAmount / 100,
        });
      }

      case 'confirm_payment': {
        const { paymentIntentId } = body;

        if (!paymentIntentId) {
          return NextResponse.json({ error: 'Payment Intent ID fehlt' }, { status: 400 });
        }

        // Prüfe Payment Intent Status
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
          // Update Quote mit erfolgreichem Payment
          await quoteRef.update({
            'payment.provisionStatus': 'paid',
            'payment.paidAt': new Date().toISOString(),
            'payment.paymentIntentId': paymentIntentId,
            'contactExchange.readyForExchange': true,
          });

          return NextResponse.json({
            success: true,
            message: 'Provision erfolgreich bezahlt',
          });
        } else {
          return NextResponse.json({ error: 'Zahlung noch nicht abgeschlossen' }, { status: 400 });
        }
      }

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Quote Payment API] Error Details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: { uid: params?.uid, quoteId: params?.quoteId },
    });
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
