import { NextRequest, NextResponse } from 'next/server';
import { admin } from '../../../../../firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const adminDb = admin.firestore();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const { feedback } = await request.json();

    console.log('🎯 Order Completion API called:', { orderId, feedback });

    if (!feedback?.trim()) {
      return NextResponse.json(
        { error: 'Arbeitsnachweis erforderlich' },
        { status: 400 }
      );
    }

    // Hole Order-Daten
    const orderDoc = await adminDb.collection('auftraege').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Auftrag nicht gefunden' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data()!;
    
    console.log('📋 Order Data:', {
      status: orderData.status,
      paymentIntentId: orderData.paymentIntentId,
      companyStripeAccountId: orderData.companyStripeAccountId,
      totalAmount: orderData.totalAmount,
    });

    // Prüfe ob Auftrag bereits abgeschlossen
    if (orderData.status === 'completed') {
      return NextResponse.json(
        { error: 'Auftrag bereits abgeschlossen' },
        { status: 400 }
      );
    }

    // Prüfe ob Payment Intent existiert
    if (!orderData.paymentIntentId || !orderData.companyStripeAccountId) {
      return NextResponse.json(
        { error: 'Zahlungsdaten nicht vollständig' },
        { status: 400 }
      );
    }

    const platformFeeAmount = Math.round(orderData.totalAmount * 0.035); // 3.5%
    const payoutAmount = orderData.totalAmount - platformFeeAmount;

    console.log('💰 Payout Calculation:', {
      totalAmount: orderData.totalAmount,
      platformFeeAmount,
      payoutAmount,
    });

    // Geld zur Auszahlung freigeben (Stripe Transfer)
    try {
      const transfer = await stripe.transfers.create({
        amount: payoutAmount,
        currency: 'eur',
        destination: orderData.companyStripeAccountId,
        transfer_group: `order_${orderId}`,
        metadata: {
          orderId,
          type: 'order_completion_payout',
          feedback,
        },
      });

      console.log('✅ Stripe Transfer created:', transfer.id);

      // Update Order Status
      await adminDb.collection('auftraege').doc(orderId).update({
        status: 'completed',
        completedAt: new Date(),
        completionFeedback: feedback,
        transferId: transfer.id,
        payoutAmount,
        platformFeeAmount,
        updatedAt: new Date(),
      });

      console.log('✅ Order updated to completed');

      return NextResponse.json({
        success: true,
        message: 'Auftrag erfolgreich abgeschlossen',
        transferId: transfer.id,
        payoutAmount,
        platformFeeAmount,
      });

    } catch (stripeError: any) {
      console.error('❌ Stripe Transfer Error:', stripeError);
      
      // Auch bei Stripe-Fehler den Auftrag als abgeschlossen markieren
      // aber den Fehler dokumentieren
      await adminDb.collection('auftraege').doc(orderId).update({
        status: 'completed',
        completedAt: new Date(),
        completionFeedback: feedback,
        payoutError: stripeError.message,
        payoutAmount,
        platformFeeAmount,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: false,
        error: 'Auftrag abgeschlossen, aber Auszahlung fehlgeschlagen',
        details: stripeError.message,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Order Completion Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    
    const orderDoc = await adminDb.collection('auftraege').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Auftrag nicht gefunden' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data()!;
    
    return NextResponse.json({
      id: orderId,
      ...orderData,
    });

  } catch (error: any) {
    console.error('❌ Get Order Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error.message },
      { status: 500 }
    );
  }
}
