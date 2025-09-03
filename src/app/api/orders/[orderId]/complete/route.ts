import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    // Dynamically import Firebase setup to avoid build-time initialization
    const { admin } = await import('../../../../../firebase/server');

    // Check if Firebase is properly initialized
    if (!admin) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const adminDb = admin.firestore();
    const { orderId } = await params;
    const { feedback } = await request.json();

    if (!feedback?.trim()) {
      return NextResponse.json({ error: 'Arbeitsnachweis erforderlich' }, { status: 400 });
    }

    // Hole Order-Daten
    const orderDoc = await adminDb.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    // Prüfe ob Auftrag bereits abgeschlossen
    if (orderData.status === 'completed') {
      return NextResponse.json({ error: 'Auftrag bereits abgeschlossen' }, { status: 400 });
    }

    // Prüfe ob Payment Intent existiert
    if (!orderData.paymentIntentId || !orderData.companyStripeAccountId) {
      return NextResponse.json({ error: 'Zahlungsdaten nicht vollständig' }, { status: 400 });
    }

    const platformFeeAmount = Math.round(orderData.totalAmount * 0.035); // 3.5%
    const payoutAmount = orderData.totalAmount - platformFeeAmount;

    // ✅ CONTROLLED PAYOUT: Markiere für manuelle Auszahlung statt automatischer Transfer

    // Update Order Status für kontrollierte Auszahlung
    await adminDb.collection('auftraege').doc(orderId).update({
      status: 'completed',
      completedAt: new Date(),
      completionFeedback: feedback,
      payoutStatus: 'available_for_payout', // 🎯 Für manuellen Payout markieren
      payoutAmount,
      platformFeeAmount,
      updatedAt: new Date(),
    });

    // ✅ CONTROLLED PAYOUT: Markiere für manuelle Auszahlung statt automatischer Transfer

    // Update Order Status für kontrollierte Auszahlung
    await adminDb.collection('auftraege').doc(orderId).update({
      status: 'completed',
      completedAt: new Date(),
      completionFeedback: feedback,
      payoutStatus: 'available_for_payout', // 🎯 Für manuellen Payout markieren
      payoutAmount,
      platformFeeAmount,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Auftrag erfolgreich abgeschlossen - Auszahlung über Dashboard verfügbar',
      payoutAmount,
      platformFeeAmount,
      payoutStatus: 'available_for_payout',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    // Dynamically import Firebase setup to avoid build-time initialization
    const { admin } = await import('../../../../../firebase/server');

    // Check if Firebase is properly initialized
    if (!admin) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const adminDb = admin.firestore();
    const { orderId } = await params;

    const orderDoc = await adminDb.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    return NextResponse.json({
      id: orderId,
      ...orderData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error.message },
      { status: 500 }
    );
  }
}
