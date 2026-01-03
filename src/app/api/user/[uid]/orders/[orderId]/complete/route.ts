/**
 * User Order Complete API Route
 * 
 * POST - Auftrag als abgeschlossen markieren (Kunde bestätigt)
 * 
 * Diese Route wird vom OrderCompletionModal verwendet.
 * Erstellt ReviewRequest und sendet Bewertungs-E-Mail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ uid: string; orderId: string }> }
) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { uid, orderId } = await params;

    // Prüfe ob User berechtigt ist
    if (authResult.userId !== uid) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    // Dynamically import Firebase setup to avoid build-time initialization
    const { admin } = await import('@/firebase/server');

    if (!admin) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const adminDb = admin.firestore();
    const { completionNotes } = await request.json();

    // Hole Order-Daten
    const orderDoc = await adminDb.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    // Prüfe ob User der Kunde ist
    const isCustomer = orderData.customerFirebaseUid === uid || orderData.customerId === uid;
    
    if (!isCustomer) {
      return NextResponse.json({ error: 'Nur der Kunde kann den Auftrag abschließen' }, { status: 403 });
    }

    // Prüfe ob Auftrag bereits abgeschlossen
    if (orderData.status === 'completed' || orderData.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Auftrag bereits abgeschlossen' }, { status: 400 });
    }

    // Berechne Beträge
    const totalAmount = orderData.totalAmount || orderData.betrag || orderData.priceInCents / 100 || 0;
    const platformFeePercent = 10; // 10% Taskilo Provision
    const platformFeeAmount = Math.round(totalAmount * (platformFeePercent / 100) * 100) / 100;
    const payoutAmount = Math.round((totalAmount - platformFeeAmount) * 100) / 100;

    // Update Order Status
    await adminDb.collection('auftraege').doc(orderId).update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      completionNotes: completionNotes || '',
      customerConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Escrow Status
      escrowStatus: 'pending_release',
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

    // Erstelle ReviewRequest für E-Mail-Bewertung
    try {
      const { v4: uuidv4 } = await import('uuid');
      const expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 Tage
      );

      // Hole Kundendaten
      const customerDoc = await adminDb.collection('users').doc(uid).get();
      const customerData = customerDoc.exists ? customerDoc.data() : {};
      const customerEmail = customerData?.email || orderData.customerEmail || '';
      const customerName = customerData?.displayName || customerData?.name || orderData.customerName || 'Kunde';

      // Hole Anbieterdaten
      const providerId = orderData.selectedAnbieterId || orderData.providerId;
      const providerDoc = await adminDb.collection('companies').doc(providerId).get();
      const providerData = providerDoc.exists ? providerDoc.data() : {};
      const providerName = providerData?.companyName || providerData?.name || orderData.providerName || 'Anbieter';

      // Erstelle ReviewRequest
      const reviewRequestRef = adminDb.collection('reviewRequests').doc();
      await reviewRequestRef.set({
        orderId,
        customerId: uid,
        customerEmail,
        customerName,
        orderTitle: orderData.serviceTitle || orderData.title || `Auftrag ${orderId.slice(-6)}`,
        providerId,
        providerName,
        
        orderReviewToken: uuidv4(),
        orderReviewSentAt: null,
        orderReviewExpiresAt: expiresAt,
        orderReviewCompletedAt: null,
        orderReviewId: null,
        
        companyReviewToken: uuidv4(),
        companyReviewSentAt: null,
        companyReviewExpiresAt: null,
        companyReviewCompletedAt: null,
        companyReviewId: null,
        
        status: 'pending_order',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Hier könnte man die Bewertungs-E-Mail senden (wird von Cron-Job gemacht)
    } catch (reviewError) {
      console.error('[Order Complete] ReviewRequest Error:', reviewError);
      // Fahre trotzdem fort - Auftrag wurde abgeschlossen
    }

    return NextResponse.json({
      success: true,
      message: 'Auftrag erfolgreich abgeschlossen',
      payoutAmount,
      platformFeeAmount,
      payoutStatus: 'clearing',
      clearingDays: 14,
    });
  } catch (error) {
    console.error('[User Order Complete] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
