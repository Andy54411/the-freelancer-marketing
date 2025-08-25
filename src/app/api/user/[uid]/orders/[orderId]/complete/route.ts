import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { db as adminDb } from '@/firebase/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface OrderCompletionRequest {
  rating?: number;
  review?: string;
  completionNotes?: string;
}

interface OrderData {
  customerFirebaseUid: string;
  selectedAnbieterId: string;
  status: string;
  stripePaymentIntentId?: string;
  paymentIntentId?: string;
  totalAmountPaidByBuyer: number;
  sellerCommissionInCents?: number;
  applicationFeeAmountFromStripe?: number;
  anbieterStripeAccountId: string;
  projectTitle?: string;
  description: string;
  selectedCategory: string;
  selectedSubcategory: string;
  createdAt: any;
  paidAt: any;
}

/**
 * POST: Kunde markiert Auftrag als erledigt
 * Löst automatische Auszahlung an Unternehmen aus
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string; orderId: string } }
) {
  try {
    const { uid, orderId } = params;
    const body: OrderCompletionRequest = await request.json();

    console.log('📋 Order Completion Request:', { uid, orderId, body });

    // 1. Prüfe ob Order existiert und dem User gehört
    const orderRef = doc(db, 'auftraege', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderSnap.data() as OrderData;

    // 2. Validiere dass der User der Auftraggeber ist
    if (orderData.customerFirebaseUid !== uid) {
      return NextResponse.json(
        { error: 'Unauthorized: Not the customer of this order' },
        { status: 403 }
      );
    }

    // 3. Prüfe Status - muss "PROVIDER_COMPLETED" sein (Provider hat geliefert)
    if (orderData.status !== 'PROVIDER_COMPLETED') {
      return NextResponse.json(
        {
          error: `Order must be in 'PROVIDER_COMPLETED' status, current status: ${orderData.status}`,
        },
        { status: 400 }
      );
    }

    // 4. Stripe Transfer zur Auszahlung an Company
    let transferId: string | undefined;

    const paymentIntentId = orderData.stripePaymentIntentId || orderData.paymentIntentId;
    const platformFee =
      orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
    const companyNetAmount = orderData.totalAmountPaidByBuyer - platformFee;

    if (paymentIntentId && orderData.anbieterStripeAccountId) {
      try {
        console.log('💳 Creating Stripe Transfer for order completion:', {
          amount: companyNetAmount,
          destination: orderData.anbieterStripeAccountId,
          paymentIntentId: paymentIntentId,
          platformFee: platformFee,
          totalAmount: orderData.totalAmountPaidByBuyer,
        });

        // Transfer des Netto-Betrags an die Company
        const transfer = await stripe.transfers.create({
          amount: companyNetAmount, // Betrag ohne Platform Fee
          currency: 'eur',
          destination: orderData.anbieterStripeAccountId,
          transfer_group: `ORDER_${orderId}`,
          metadata: {
            orderId: orderId,
            customerUid: uid,
            companyId: orderData.selectedAnbieterId,
            completedBy: 'customer',
            completedAt: new Date().toISOString(),
          },
        });

        transferId = transfer.id;
        console.log('✅ Stripe Transfer created:', transfer.id);
      } catch (stripeError: any) {
        console.error('❌ Stripe Transfer failed:', stripeError);

        // Auch bei Stripe-Fehler den Auftrag als completed markieren
        // Der Transfer kann später manuell nachgeholt werden
        console.log('⚠️ Continuing with order completion despite Stripe error');
      }
    }

    // 5. Update Order Status zu "completed"
    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      completedBy: uid,
      customerRating: body.rating || null,
      customerReview: body.review || '',
      completionNotes: body.completionNotes || '',
      stripeTransferId: transferId || null,
      payoutStatus: transferId ? 'transferred' : 'pending',
      updatedAt: new Date(),
    };

    await updateDoc(orderRef, updateData);

    console.log('✅ Order completed successfully:', orderId);

    return NextResponse.json({
      success: true,
      message: 'Order completed successfully',
      orderId: orderId,
      transferId: transferId,
      payoutStatus: transferId ? 'transferred' : 'pending',
    });
  } catch (error: any) {
    console.error('❌ Order completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete order', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update Order Completion Details (Rating, Review etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { uid: string; orderId: string } }
) {
  try {
    const { uid, orderId } = params;
    const body: Partial<OrderCompletionRequest> = await request.json();

    console.log('📝 Update Order Completion:', { uid, orderId, body });

    // 1. Prüfe ob Order existiert und dem User gehört
    const orderRef = doc(db, 'auftraege', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderSnap.data() as OrderData;

    // 2. Validiere dass der User der Auftraggeber ist
    if (orderData.customerFirebaseUid !== uid) {
      return NextResponse.json(
        { error: 'Unauthorized: Not the customer of this order' },
        { status: 403 }
      );
    }

    // 3. Prüfe Status - muss "completed" sein
    if (orderData.status !== 'completed') {
      return NextResponse.json(
        { error: `Order must be completed to update details, current status: ${orderData.status}` },
        { status: 400 }
      );
    }

    // 4. Update nur die gewünschten Felder
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.rating !== undefined) {
      updateData.customerRating = body.rating;
    }
    if (body.review !== undefined) {
      updateData.customerReview = body.review;
    }
    if (body.completionNotes !== undefined) {
      updateData.completionNotes = body.completionNotes;
    }

    await updateDoc(orderRef, updateData);

    console.log('✅ Order completion details updated:', orderId);

    return NextResponse.json({
      success: true,
      message: 'Order completion details updated',
      orderId: orderId,
    });
  } catch (error: any) {
    console.error('❌ Order completion update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order completion', details: error.message },
      { status: 500 }
    );
  }
}
