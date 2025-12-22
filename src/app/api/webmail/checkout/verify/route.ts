import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session-ID fehlt' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'subscription'],
    });

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { success: false, error: 'Zahlung nicht abgeschlossen' },
        { status: 400 }
      );
    }

    const lineItem = session.line_items?.data[0];
    const subscription = session.subscription as Stripe.Subscription | null;

    return NextResponse.json({
      success: true,
      session: {
        customerEmail: session.customer_email || session.customer_details?.email || '',
        planName: lineItem?.description || session.metadata?.planId || 'Webmail Tarif',
        amount: session.amount_total || 0,
        interval: subscription?.items?.data[0]?.price?.recurring?.interval || 'month',
        planId: session.metadata?.planId || '',
        status: session.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Session konnte nicht verifiziert werden',
        details: message,
      },
      { status: 500 }
    );
  }
}
