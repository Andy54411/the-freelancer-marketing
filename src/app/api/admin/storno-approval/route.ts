import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

/**
 * ADMIN-ONLY STORNO APPROVAL SYSTEM
 * Diese API wird NUR von AWS Admin-Dashboard aufgerufen
 * Verarbeitet Genehmigungen und Ablehnungen von Storno-Anfragen
 */

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    const body = await request.json();
    const {
      stornoRequestId,
      action, // 'approve' oder 'reject'
      adminUserId,
      adminNotes,
      refundAmount, // Bei Teilerstattung
      refundReason,
    } = body;

    // Validierung
    if (!stornoRequestId || !action || !adminUserId) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen: stornoRequestId, action, adminUserId' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Ungültige Aktion - nur approve oder reject erlaubt' },
        { status: 400 }
      );
    }

    // Hole Storno-Anfrage
    const stornoRequestRef = adminDb.collection('storno_requests').doc(stornoRequestId);
    const stornoRequestDoc = await stornoRequestRef.get();

    if (!stornoRequestDoc.exists) {
      return NextResponse.json({ error: 'Storno-Anfrage nicht gefunden' }, { status: 404 });
    }

    const stornoRequestData = stornoRequestDoc.data();

    // Prüfe ob bereits bearbeitet
    if (stornoRequestData?.status !== 'pending' && stornoRequestData?.status !== 'under_review') {
      return NextResponse.json(
        { error: `Storno-Anfrage bereits bearbeitet (Status: ${stornoRequestData?.status})` },
        { status: 409 }
      );
    }

    if (action === 'approve') {
      // GENEHMIGUNG: Führe Rückerstattung durch
      const result = await processStornoApproval(stornoRequestData, refundAmount, refundReason);

      // Update Storno-Anfrage Status
      await stornoRequestRef.update({
        status: 'approved',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        adminNotes: adminNotes || '',
        refundAmount: result.refundAmount,
        refundReason: refundReason || 'Admin-Genehmigung',
        stripeRefundId: result.stripeRefundId,
        completedAt: new Date(),
        lastUpdatedAt: new Date(),
      });

      // Update Provider Score
      await updateProviderScoreForApprovedStorno(stornoRequestData);

      // Update Auftrag Status
      await updateAuftragStatusAfterStorno(stornoRequestData.auftragId, 'STORNIERT_ADMIN');

      return NextResponse.json({
        success: true,
        message: 'Storno-Anfrage genehmigt und Rückerstattung durchgeführt',
        refundAmount: result.refundAmount,
        stripeRefundId: result.stripeRefundId,
        status: 'approved',
      });
    } else {
      // ABLEHNUNG: Keine Rückerstattung
      await stornoRequestRef.update({
        status: 'rejected',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        adminNotes: adminNotes || '',
        rejectionReason: refundReason || 'Storno-Anfrage abgelehnt',
        lastUpdatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Storno-Anfrage abgelehnt',
        status: 'rejected',
      });
    }
  } catch (error: any) {
    console.error('Fehler bei Admin Storno-Genehmigung:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler bei Storno-Genehmigung' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    // GET: Admin Dashboard Overview aller Storno-Anfragen
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const query = adminDb
      .collection('storno_requests')
      .where('status', '==', status)
      .orderBy('requestedAt', 'desc')
      .limit(limit);

    const querySnapshot = await query.get();
    const stornoRequests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Zusätzliche Admin-Statistiken
    const stats = await getStornoAdminStats();

    return NextResponse.json({
      success: true,
      stornoRequests,
      stats,
      total: stornoRequests.length,
    });
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Admin Storno-Übersicht:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Admin-Daten' }, { status: 500 });
  }
}

/**
 * Verarbeite genehmigte Storno-Anfrage mit Stripe Refund
 */
async function processStornoApproval(
  stornoData: any,
  customRefundAmount?: number,
  refundReason?: string
) {
  const paymentIntentId = stornoData.auftragDetails.paymentIntentId;
  const originalAmount = stornoData.auftragDetails.totalAmount;

  if (!paymentIntentId) {
    throw new Error('Keine PaymentIntent ID gefunden');
  }

  // Bestimme Rückerstattungsbetrag (Vollerstattung oder Teilbetrag)
  const refundAmount = customRefundAmount || originalAmount;

  try {
    // Erstelle Stripe Refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        stornoRequestId: stornoData.id,
        auftragId: stornoData.auftragId,
        adminApproval: 'true',
        refundReason: refundReason || 'Admin-genehmigte Stornierung',
      },
    });

    return {
      stripeRefundId: refund.id,
      refundAmount: refundAmount,
      refundStatus: refund.status,
    };
  } catch (stripeError: any) {
    console.error('Stripe Refund Fehler:', stripeError);
    throw new Error(`Stripe Refund fehlgeschlagen: ${stripeError.message}`);
  }
}

/**
 * Update Provider Score nach genehmigtem Storno
 */
async function updateProviderScoreForApprovedStorno(stornoData: any) {
  try {
    if (!adminDb) {
      console.error('Firebase Admin not available for provider score update');
      return;
    }

    const providerId = stornoData.auftragDetails.selectedAnbieterId;

    if (!providerId) return;

    const providerRef = adminDb.collection('users').doc(providerId);
    const providerDoc = await providerRef.get();

    if (providerDoc.exists) {
      const currentScore = providerDoc.data()?.providerScore || {
        stornoRate: 0,
        deliveryDelays: 0,
        customerSatisfaction: 100,
        responseTime: 100,
        overallScore: 100,
        totalOrders: 0,
        approvedStornos: 0,
      };

      // Berechne neue Scores nach 4-Kategorie-System
      const newApprovedStornos = currentScore.approvedStornos + 1;
      const newStornoRate =
        currentScore.totalOrders > 0 ? (newApprovedStornos / currentScore.totalOrders) * 100 : 0;

      // Storno-Rate Impact: 40% Gewichtung
      const stornoRateScore = Math.max(0, 100 - newStornoRate);

      // Berechne neuen Overall Score
      const newOverallScore =
        stornoRateScore * 0.4 + // 40% Storno-Rate
        currentScore.deliveryDelays * 0.3 + // 30% Lieferzeiten
        currentScore.customerSatisfaction * 0.2 + // 20% Kundenzufriedenheit
        currentScore.responseTime * 0.1; // 10% Antwortzeit

      // Auto-Blocking bei Overall Score unter 10%
      const shouldBlock = newOverallScore <= 10;

      await providerRef.update({
        'providerScore.approvedStornos': newApprovedStornos,
        'providerScore.stornoRate': newStornoRate,
        'providerScore.overallScore': newOverallScore,
        'providerScore.lastUpdated': new Date(),

        // Automatisches Blocking bei kritischem Score
        ...(shouldBlock && {
          'account.isBlocked': true,
          'account.blockReason': 'Automatisches Blocking: Provider Score unter 10%',
          'account.blockedAt': new Date(),
          'account.blockType': 'auto_score_critical',
        }),
      });
    }
  } catch (error) {
    console.error('Fehler beim Update des Provider Scores:', error);
  }
}

/**
 * Update Auftrag Status nach Stornierung
 */
async function updateAuftragStatusAfterStorno(auftragId: string, newStatus: string) {
  try {
    if (!adminDb) {
      console.error('Firebase Admin not available for auftrag status update');
      return;
    }

    const auftragRef = adminDb.collection('auftraege').doc(auftragId);
    await auftragRef.update({
      status: newStatus,
      stornoCompletedAt: new Date(),
      lastUpdatedAt: new Date(),
    });
  } catch (error) {
    console.error('Fehler beim Update des Auftrag-Status:', error);
  }
}

/**
 * Admin Dashboard Statistiken
 */
async function getStornoAdminStats() {
  try {
    if (!adminDb) {
      console.error('Firebase Admin not available for admin stats');
      return {
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        totalRequests: 0,
        approvalRate: '0.0',
      };
    }

    const [pendingSnapshot, approvedSnapshot, rejectedSnapshot] = await Promise.all([
      adminDb.collection('storno_requests').where('status', '==', 'pending').get(),
      adminDb.collection('storno_requests').where('status', '==', 'approved').get(),
      adminDb.collection('storno_requests').where('status', '==', 'rejected').get(),
    ]);

    return {
      pendingRequests: pendingSnapshot.size,
      approvedRequests: approvedSnapshot.size,
      rejectedRequests: rejectedSnapshot.size,
      totalRequests: pendingSnapshot.size + approvedSnapshot.size + rejectedSnapshot.size,
      approvalRate:
        approvedSnapshot.size > 0
          ? (
              (approvedSnapshot.size / (approvedSnapshot.size + rejectedSnapshot.size)) *
              100
            ).toFixed(1)
          : '0.0',
    };
  } catch (error) {
    console.error('Fehler beim Abrufen der Admin-Statistiken:', error);
    return {
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalRequests: 0,
      approvalRate: '0.0',
    };
  }
}
