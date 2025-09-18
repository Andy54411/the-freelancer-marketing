import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Try to import Firebase Admin, with fallback
let adminDb: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require('@/firebase/server');
  adminDb = db;
} catch {
  // Fallback initialization using environment variable
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: 'https://tilvo-f142f-default-rtdb!.europe-west1.firebasedatabase.app',
        });
      }
    }
    adminDb = admin.firestore();
  } catch (fallbackError) {}
}

// Initialize Stripe
const _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
    const { uid, orderId } = await params;
    const body: OrderCompletionRequest = await request.json();

    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    // 1. Prüfe ob Order existiert und dem User gehört
    const orderRef = adminDb.collection('auftraege').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
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

    // 4. Markiere Geld als verfügbar für Auszahlung (KEINE automatische Auszahlung)
    const paymentIntentId = orderData.paymentIntentId || orderData.stripePaymentIntentId;
    const platformFee =
      orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
    const companyNetAmount = orderData.totalAmountPaidByBuyer - platformFee;

    // 5. Update Order Status zu "ABGESCHLOSSEN"
    const updateData: any = {
      status: 'ABGESCHLOSSEN',
      completedAt: new Date(),
      completedBy: uid,
      customerRating: body.rating || null,
      customerReview: body.review || '',
      completionNotes: body.completionNotes || '',
      payoutStatus: 'available_for_payout', // Verfügbar für manuelle Auszahlung
      updatedAt: new Date(),
    };

    await orderRef.update(updateData);

    // 6. Erstelle Payout-Eintrag für verfügbares Guthaben
    const payoutRef = adminDb.collection('payouts').doc();
    await payoutRef.set({
      orderId: orderId,
      providerId: orderData.selectedAnbieterId,
      customerId: orderData.customerFirebaseUid,
      amount: companyNetAmount,
      currency: 'EUR',
      status: 'pending',
      createdAt: new Date(),
      orderCompletedAt: new Date(),
      stripeAccountId: orderData.anbieterStripeAccountId,
      description: `Auszahlung für Auftrag ${orderData.projectTitle || orderData.description || 'Dienstleistung'}`,
      category: orderData.selectedCategory,
      subcategory: orderData.selectedSubcategory,
    });

    return NextResponse.json({
      success: true,
      message: 'Order completed successfully',
      orderId: orderId,
      payoutStatus: 'available_for_payout',
      payoutAmount: companyNetAmount / 100, // Amount in EUR
      note: 'Funds available for manual payout from company dashboard',
    });
  } catch (error: any) {
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
    const { uid, orderId } = await params;
    const body: Partial<OrderCompletionRequest> = await request.json();

    // 1. Prüfe ob Order existiert und dem User gehört
    const orderRef = adminDb.collection('auftraege').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
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

    // 3. Prüfe Status - muss "ABGESCHLOSSEN" sein
    if (orderData.status !== 'ABGESCHLOSSEN') {
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

    await orderRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Order completion details updated',
      orderId: orderId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update order completion', details: error.message },
      { status: 500 }
    );
  }
}
