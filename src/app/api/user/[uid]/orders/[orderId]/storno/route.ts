import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

/**
 * CUSTOMER STORNO REQUEST API
 * Ermöglicht es Kunden, Storno-Anfragen für ihre Aufträge zu stellen
 * Alle Anfragen müssen durch Admin-System genehmigt werden
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { uid: string; orderId: string } }
) {
  try {
    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    const { uid, orderId } = await params;
    const body = await request.json();
    const { reason, requestType = 'full_refund', additionalDetails } = body;

    // Validierung
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Bitte geben Sie einen detaillierten Grund an (mindestens 10 Zeichen)' },
        { status: 400 }
      );
    }

    // Prüfe ob Auftrag existiert und dem Kunden gehört
    const auftragRef = adminDb.collection('auftraege').doc(orderId);
    const auftragDoc = await auftragRef.get();

    if (!auftragDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const auftragData = auftragDoc.data();

    // Validiere Kundenbesitz
    if (auftragData?.kundeId !== uid && auftragData?.customerFirebaseUid !== uid) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Auftrag gehört nicht zu diesem Kunden' },
        { status: 403 }
      );
    }

    // Prüfe Auftragsstatus - nur bestimmte Stati erlauben Storno
    const allowedStatuses = [
      'zahlung_erhalten_clearing',
      'anbieter_zugewiesen',
      'PROVIDER_ACCEPTED',
      'IN_PROGRESS',
      'PROVIDER_COMPLETED',
    ];

    if (!allowedStatuses.includes(auftragData?.status)) {
      return NextResponse.json(
        { error: `Stornierung nicht möglich bei Status: ${auftragData?.status}` },
        { status: 400 }
      );
    }

    // Prüfe ob bereits eine Storno-Anfrage existiert
    const existingRequestQuery = await adminDb
      .collection('storno_requests')
      .where('auftragId', '==', orderId)
      .where('status', 'in', ['pending', 'under_review'])
      .get();

    if (!existingRequestQuery.empty) {
      const existingRequest = existingRequestQuery.docs[0].data();
      return NextResponse.json(
        {
          error: 'Bereits eine offene Storno-Anfrage vorhanden',
          existingRequestId: existingRequestQuery.docs[0].id,
          existingStatus: existingRequest.status,
          requestedAt: existingRequest.requestedAt,
        },
        { status: 409 }
      );
    }

    // Hole Kundendetails für bessere Nachverfolgung
    const customerRef = adminDb.collection('users').doc(uid);
    const customerDoc = await customerRef.get();
    const customerData = customerDoc.data();

    // Erstelle Storno-Anfrage über zentrale API
    const stornoRequestData = {
      auftragId: orderId,
      requestedBy: 'customer',
      requestType: requestType,
      reason: reason,
      additionalDetails: additionalDetails || '',
      customerDetails: {
        uid: uid,
        email: customerData?.email || '',
        displayName: customerData?.displayName || '',
        phone: customerData?.phoneNumber || '',
      },
    };

    // Rufe zentrale Storno-Request API auf
    const centralApiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/storno-requests`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stornoRequestData),
      }
    );

    if (!centralApiResponse.ok) {
      const errorData = await centralApiResponse.json();
      return NextResponse.json(
        { error: errorData.error || 'Fehler beim Erstellen der Storno-Anfrage' },
        { status: centralApiResponse.status }
      );
    }

    const centralApiResult = await centralApiResponse.json();

    // Benachrichtige den Provider über die Storno-Anfrage
    await notifyProviderAboutStornoRequest(auftragData, stornoRequestData);

    return NextResponse.json({
      success: true,
      message: 'Storno-Anfrage erfolgreich eingereicht',
      stornoRequestId: centralApiResult.stornoRequestId,
      status: 'pending',
      nextSteps: [
        'Ihre Anfrage wird von unserem Admin-Team geprüft',
        'Sie erhalten eine E-Mail-Bestätigung',
        'Bearbeitungszeit: 24-48 Stunden',
        'Bei Genehmigung erfolgt die Rückerstattung automatisch',
      ],

      estimatedProcessingTime: '24-48 Stunden',
      supportContact: 'Bei Fragen kontaktieren Sie unseren Support',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Erstellen der Storno-Anfrage' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string; orderId: string } }
) {
  try {
    // Check if Firebase is available
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
    }

    const { uid, orderId } = await params;

    // Prüfe ob Auftrag dem Kunden gehört
    const auftragRef = adminDb.collection('auftraege').doc(orderId);
    const auftragDoc = await auftragRef.get();

    if (!auftragDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const auftragData = auftragDoc.data();

    if (auftragData?.kundeId !== uid && auftragData?.customerFirebaseUid !== uid) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    // Hole alle Storno-Anfragen für diesen Auftrag
    const stornoRequestsQuery = await adminDb
      .collection('storno_requests')
      .where('auftragId', '==', orderId)
      .orderBy('requestedAt', 'desc')
      .get();

    const stornoRequests = stornoRequestsQuery.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status,
        requestType: data.requestType,
        reason: data.reason,
        requestedAt: data.requestedAt,
        reviewedAt: data.reviewedAt,
        completedAt: data.completedAt,
        refundAmount: data.refundAmount,
        adminNotes: data.status === 'completed' ? data.adminNotes : null, // Nur bei abgeschlossenen Anfragen
      };
    });

    // Zusätzliche Informationen für Frontend
    const canRequestStorno = getCanRequestStornoInfo(auftragData);

    return NextResponse.json({
      success: true,
      stornoRequests,
      auftragInfo: {
        orderId,
        status: auftragData?.status,
        totalAmount: auftragData?.totalAmountPaidByBuyer,
        canRequestStorno: canRequestStorno.allowed,
        stornoReasons: canRequestStorno.reason,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Storno-Informationen' },
      { status: 500 }
    );
  }
}

/**
 * Prüfe ob Kunde Storno beantragen kann
 */
function getCanRequestStornoInfo(auftragData: any) {
  const allowedStatuses = [
    'zahlung_erhalten_clearing',
    'anbieter_zugewiesen',
    'PROVIDER_ACCEPTED',
    'IN_PROGRESS',
    'PROVIDER_COMPLETED',
  ];

  const currentStatus = auftragData?.status;
  const allowed = allowedStatuses.includes(currentStatus);

  let reason = '';
  if (!allowed) {
    switch (currentStatus) {
      case 'ABGESCHLOSSEN':
        reason = 'Auftrag bereits abgeschlossen - Stornierung nicht mehr möglich';
        break;
      case 'STORNIERT_ADMIN':
        reason = 'Auftrag bereits storniert';
        break;
      case 'draft':
        reason = 'Auftrag noch nicht bezahlt';
        break;
      default:
        reason = `Stornierung bei Status '${currentStatus}' nicht möglich`;
    }
  } else {
    reason = 'Stornierung möglich - wird durch Admin-Team geprüft';
  }

  return { allowed, reason };
}

/**
 * Benachrichtige Provider über Storno-Anfrage
 */
async function notifyProviderAboutStornoRequest(auftragData: any, stornoData: any) {
  try {
  } catch (error) {}
}
