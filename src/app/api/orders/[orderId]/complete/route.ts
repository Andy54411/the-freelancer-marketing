/**
 * Order Complete API Route
 * 
 * PATCH - Auftrag als abgeschlossen markieren und Escrow-Freigabe initiieren
 * GET - Order-Details abrufen
 * 
 * Ersetzt die alte Stripe-basierte Implementierung durch das Escrow/Revolut-System.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    // Dynamically import Firebase setup to avoid build-time initialization
    const { admin } = await import('@/firebase/server');

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

    // Prüfe Berechtigung (Anbieter oder Kunde)
    const isProvider = orderData.selectedAnbieterId === authResult.userId;
    const isCustomer = orderData.customerFirebaseUid === authResult.userId;
    
    if (!isProvider && !isCustomer) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    // Prüfe ob Auftrag bereits abgeschlossen
    if (orderData.status === 'completed') {
      return NextResponse.json({ error: 'Auftrag bereits abgeschlossen' }, { status: 400 });
    }

    // Berechne Beträge
    const totalAmount = orderData.totalAmount || orderData.betrag || 0;
    const platformFeePercent = 10; // 10% Taskilo Provision
    const platformFeeAmount = Math.round(totalAmount * (platformFeePercent / 100) * 100) / 100;
    const payoutAmount = Math.round((totalAmount - platformFeeAmount) * 100) / 100;

    // Update Order Status - Escrow-basiert
    await adminDb.collection('auftraege').doc(orderId).update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completionFeedback: feedback,
      // Escrow Status
      escrowStatus: 'pending_release', // Warte auf Clearing-Periode
      payoutStatus: 'clearing',
      payoutAmount,
      platformFeeAmount,
      platformFeePercent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Prüfe ob Escrow existiert und aktualisiere ihn
    const escrowQuery = await adminDb
      .collection('escrows')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (!escrowQuery.empty) {
      const escrowDoc = escrowQuery.docs[0];
      await escrowDoc.ref.update({
        status: 'held',
        clearingEndsAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 Tage Clearing
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Auftrag erfolgreich abgeschlossen - Auszahlung nach Clearing-Periode',
      payoutAmount,
      platformFeeAmount,
      payoutStatus: 'clearing',
      clearingDays: 14,
    });
  } catch (error) {
    console.error('[Order Complete] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    // Dynamically import Firebase setup to avoid build-time initialization
    const { admin } = await import('@/firebase/server');

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

    // Prüfe Berechtigung
    const isProvider = orderData.selectedAnbieterId === authResult.userId;
    const isCustomer = orderData.customerFirebaseUid === authResult.userId;
    
    if (!isProvider && !isCustomer) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        ...orderData,
      },
    });
  } catch (error) {
    console.error('[Order GET] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
