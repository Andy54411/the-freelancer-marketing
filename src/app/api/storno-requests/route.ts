import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

/**
 * ADMIN-ONLY STORNO REQUEST SYSTEM
 * Diese API verwaltet Storno-Anfragen, die NUR von Admins genehmigt werden können
 * Keine automatischen Rückerstattungen - alle Storni müssen manuell überprüft werden
 */

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    const body = await request.json();
    const { auftragId, requestedBy, requestType, reason, customerDetails } = body;

    // Validierung der Eingaben
    if (!auftragId || !requestedBy || !requestType || !reason) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen: auftragId, requestedBy, requestType, reason' },
        { status: 400 }
      );
    }

    // Prüfe ob Auftrag existiert
    const auftragRef = adminDb.collection('auftraege').doc(auftragId);
    const auftragDoc = await auftragRef.get();

    if (!auftragDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const auftragData = auftragDoc.data();

    // Prüfe ob bereits eine Storno-Anfrage für diesen Auftrag existiert
    const existingRequestQuery = await adminDb
      .collection('storno_requests')
      .where('auftragId', '==', auftragId)
      .where('status', 'in', ['pending', 'under_review'])
      .get();

    if (!existingRequestQuery.empty) {
      return NextResponse.json(
        { error: 'Bereits eine offene Storno-Anfrage für diesen Auftrag vorhanden' },
        { status: 409 }
      );
    }

    // Berechne Rückerstattungsbetrag
    const totalAmount = auftragData?.totalAmountPaidByBuyer || 0;
    const platformFee = auftragData?.sellerCommissionInCents || 0;
    const netAmount = totalAmount - platformFee;

    // Erstelle Storno-Anfrage
    const stornoRequestRef = adminDb.collection('storno_requests').doc();
    const stornoRequestData = {
      id: stornoRequestRef.id,
      auftragId,
      requestedBy, // 'customer' oder 'provider'
      requestType, // 'full_refund', 'partial_refund', 'dispute'
      reason,
      customerDetails: customerDetails || null,

      // Auftragsinformationen
      auftragDetails: {
        kundeId: auftragData?.kundeId || auftragData?.customerFirebaseUid,
        selectedAnbieterId: auftragData?.selectedAnbieterId,
        projectTitle: auftragData?.projectTitle || auftragData?.description,
        totalAmount,
        platformFee,
        netAmount,
        paymentIntentId: auftragData?.paymentIntentId,
        status: auftragData?.status,
        createdAt: auftragData?.createdAt,
      },

      // Storno-Status
      status: 'pending', // pending, under_review, approved, rejected, completed
      priority: 'normal', // low, normal, high, urgent

      // Zeitstempel
      requestedAt: new Date(),
      lastUpdatedAt: new Date(),
      reviewedAt: null,
      completedAt: null,

      // Admin-Felder
      reviewedBy: null,
      adminNotes: '',
      refundAmount: null,
      refundReason: '',

      // Provider Scoring Auswirkungen
      affectsProviderScore: true,
      providerScoreImpact: {
        stornoRate: true,
        penaltyPoints: requestType === 'dispute' ? 10 : 5,
      },
    };

    await stornoRequestRef.set(stornoRequestData);

    // WICHTIG: Update Provider Storno Statistics (für automatisches Blocking bei 90%)
    if (auftragData?.selectedAnbieterId) {
      await updateProviderStornoStats(auftragData.selectedAnbieterId, auftragId);
    }

    // Erstelle Admin-Ticket für AWS-System (Cross-Platform Integration)
    await createAdminTicketForStornoRequest(stornoRequestRef.id, stornoRequestData);

    return NextResponse.json({
      success: true,
      message: 'Storno-Anfrage erfolgreich erstellt - wird von Admin überprüft',
      stornoRequestId: stornoRequestRef.id,
      status: 'pending',
      estimatedProcessingTime: '24-48 Stunden',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Erstellen der Storno-Anfrage' },
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

    const url = new URL(request.url);
    const auftragId = url.searchParams.get('auftragId');
    const status = url.searchParams.get('status');
    const requestedBy = url.searchParams.get('requestedBy');

    let query = adminDb.collection('storno_requests');

    // Filter anwenden
    if (auftragId) {
      query = query.where('auftragId', '==', auftragId) as any;
    }
    if (status) {
      query = query.where('status', '==', status) as any;
    }
    if (requestedBy) {
      query = query.where('requestedBy', '==', requestedBy) as any;
    }

    const querySnapshot = await query.orderBy('requestedAt', 'desc').limit(50).get();

    const stornoRequests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      stornoRequests,
      total: stornoRequests.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler beim Abrufen der Storno-Anfragen' }, { status: 500 });
  }
}

/**
 * Update Provider Storno Statistics für automatisches Blocking
 */
async function updateProviderStornoStats(providerId: string, auftragId: string) {
  try {
    if (!adminDb) {
      return;
    }

    const providerRef = adminDb.collection('users').doc(providerId);
    const providerDoc = await providerRef.get();

    if (providerDoc.exists) {
      const currentStats = providerDoc.data()?.stornoStats || {
        totalOrders: 0,
        stornoRequests: 0,
        approvedStornos: 0,
        stornoRate: 0,
        lastCalculated: new Date(),
      };

      // Berechne neue Storno-Rate
      const newStornoRequests = currentStats.stornoRequests + 1;
      const newStornoRate =
        currentStats.totalOrders > 0 ? (newStornoRequests / currentStats.totalOrders) * 100 : 0;

      // Auto-Blocking bei 90% Storno-Rate
      const shouldBlock = newStornoRate >= 90;

      await providerRef.update({
        'stornoStats.stornoRequests': newStornoRequests,
        'stornoStats.stornoRate': newStornoRate,
        'stornoStats.lastCalculated': new Date(),
        'stornoStats.lastStornoAuftragId': auftragId,

        // Automatisches Blocking
        ...(shouldBlock && {
          'account.isBlocked': true,
          'account.blockReason': 'Automatisches Blocking: Storno-Rate über 90%',
          'account.blockedAt': new Date(),
          'account.blockType': 'auto_storno_rate',
        }),
      });
    }
  } catch (error) {}
}

/**
 * Erstelle AWS Admin Ticket für Cross-Platform Integration
 */
async function createAdminTicketForStornoRequest(stornoRequestId: string, stornoData: any) {
  try {
    // Diese Funktion wird später implementiert für AWS-Integration
    // Sendet Webhook an AWS Admin-System mit Storno-Details

    const webhookData = {
      type: 'storno_request_created',
      stornoRequestId,
      auftragId: stornoData.auftragId,
      requestedBy: stornoData.requestedBy,
      reason: stornoData.reason,
      amount: stornoData.auftragDetails.totalAmount,
      priority: stornoData.priority,
      createdAt: stornoData.requestedAt,
    };

    // TODO: Implementiere AWS Webhook Call
  } catch (error) {}
}
