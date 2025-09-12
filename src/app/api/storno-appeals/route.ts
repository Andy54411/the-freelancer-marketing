import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

/**
 * APPEAL PROCESS API
 * Ermöglicht es Providern und Kunden, gegen abgelehnte Storno-Entscheidungen Widerspruch einzulegen
 * Integration mit Contact Form System
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
      type, // 'appeal_rejection' oder 'appeal_partial_refund'
      appealerUid,
      appealerType, // 'customer' oder 'provider'
      reason,
      additionalEvidence,
      contactInfo,
    } = body;

    // Validierung
    if (!stornoRequestId || !type || !appealerUid || !appealerType || !reason) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen: stornoRequestId, type, appealerUid, appealerType, reason' },
        { status: 400 }
      );
    }

    if (!['appeal_rejection', 'appeal_partial_refund'].includes(type)) {
      return NextResponse.json({ error: 'Ungültiger Appeal-Typ' }, { status: 400 });
    }

    if (!['customer', 'provider'].includes(appealerType)) {
      return NextResponse.json({ error: 'Ungültiger Appealer-Typ' }, { status: 400 });
    }

    // Prüfe ob Storno-Anfrage existiert
    const stornoRequestRef = adminDb.collection('storno_requests').doc(stornoRequestId);
    const stornoRequestDoc = await stornoRequestRef.get();

    if (!stornoRequestDoc.exists) {
      return NextResponse.json({ error: 'Storno-Anfrage nicht gefunden' }, { status: 404 });
    }

    const stornoRequestData = stornoRequestDoc.data();

    if (!stornoRequestData) {
      return NextResponse.json({ error: 'Storno-Anfrage-Daten nicht verfügbar' }, { status: 404 });
    }

    // Prüfe ob Appeal berechtigt ist
    const appealValidation = validateAppealEligibility(
      stornoRequestData,
      appealerUid,
      appealerType,
      type
    );
    if (!appealValidation.valid) {
      return NextResponse.json({ error: appealValidation.error }, { status: 400 });
    }

    // Prüfe ob bereits ein Appeal existiert
    const existingAppealQuery = await adminDb
      .collection('storno_appeals')
      .where('stornoRequestId', '==', stornoRequestId)
      .where('appealerUid', '==', appealerUid)
      .where('status', 'in', ['pending', 'under_review'])
      .get();

    if (!existingAppealQuery.empty) {
      return NextResponse.json(
        { error: 'Bereits ein offener Widerspruch für diese Storno-Anfrage vorhanden' },
        { status: 409 }
      );
    }

    // Erstelle Appeal-Eintrag
    const appealRef = adminDb.collection('storno_appeals').doc();
    const appealData = {
      id: appealRef.id,
      stornoRequestId,
      type,
      appealerUid,
      appealerType,
      reason,
      additionalEvidence: additionalEvidence || '',
      contactInfo: contactInfo || {},

      // Storno-Request Details für Kontext
      originalStornoData: {
        auftragId: stornoRequestData.auftragId,
        originalStatus: stornoRequestData.status,
        originalRefundAmount: stornoRequestData.refundAmount,
        originalAdminNotes: stornoRequestData.adminNotes,
        reviewedBy: stornoRequestData.reviewedBy,
        reviewedAt: stornoRequestData.reviewedAt,
      },

      // Appeal Status
      status: 'pending', // pending, under_review, approved, rejected, resolved
      priority: 'normal', // low, normal, high

      // Zeitstempel
      submittedAt: new Date(),
      lastUpdatedAt: new Date(),
      resolvedAt: null,

      // Admin-Felder
      assignedTo: null,
      adminNotes: '',
      resolution: null,
      resolutionReason: '',
    };

    await appealRef.set(appealData);

    // Erstelle Contact Form Ticket für Appeal
    const contactFormResult = await createContactFormTicketForAppeal(appealData, stornoRequestData);

    // Update Storno-Request mit Appeal-Verweis
    await stornoRequestRef.update({
      hasAppeal: true,
      appealId: appealRef.id,
      appealSubmittedAt: new Date(),
      lastUpdatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Widerspruch erfolgreich eingereicht',
      appealId: appealRef.id,
      contactFormTicketId: contactFormResult.ticketId,
      status: 'pending',
      nextSteps: [
        'Ihr Widerspruch wird von unserem Team geprüft',
        'Sie erhalten eine E-Mail mit der Ticket-Nummer',
        'Bearbeitungszeit: 5-7 Werktage',
        'Sie können den Status über Ihr Dashboard verfolgen',
      ],

      estimatedProcessingTime: '5-7 Werktage',
      supportInfo: {
        ticketId: contactFormResult.ticketId,
        email: 'support@taskilo.de',
        phone: '+49 (0) XXX XXX XXX',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Server-Fehler beim Erstellen des Widerspruchs' },
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
    const stornoRequestId = url.searchParams.get('stornoRequestId');
    const appealerUid = url.searchParams.get('appealerUid');
    const status = url.searchParams.get('status');

    let query = adminDb.collection('storno_appeals');

    // Filter anwenden
    if (stornoRequestId) {
      query = query.where('stornoRequestId', '==', stornoRequestId) as any;
    }
    if (appealerUid) {
      query = query.where('appealerUid', '==', appealerUid) as any;
    }
    if (status) {
      query = query.where('status', '==', status) as any;
    }

    const querySnapshot = await query.orderBy('submittedAt', 'desc').limit(20).get();

    const appeals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      appeals,
      total: appeals.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Fehler beim Abrufen der Widersprüche' }, { status: 500 });
  }
}

/**
 * Validiere Appeal-Berechtigung
 */
function validateAppealEligibility(
  stornoData: any,
  appealerUid: string,
  appealerType: string,
  appealType: string
) {
  // Prüfe ob Storno-Anfrage bereits bearbeitet wurde
  if (!['rejected', 'approved'].includes(stornoData.status)) {
    return {
      valid: false,
      error: 'Widerspruch nur gegen abgeschlossene Entscheidungen möglich',
    };
  }

  // Prüfe Berechtigung basierend auf Appealer-Typ
  if (appealerType === 'customer') {
    const customerUid = stornoData.auftragDetails?.kundeId || stornoData.customerDetails?.uid;
    if (customerUid !== appealerUid) {
      return {
        valid: false,
        error: 'Nicht berechtigt - Auftrag gehört nicht zu diesem Kunden',
      };
    }
  } else if (appealerType === 'provider') {
    const providerUid = stornoData.auftragDetails?.selectedAnbieterId;
    if (providerUid !== appealerUid) {
      return {
        valid: false,
        error: 'Nicht berechtigt - Auftrag gehört nicht zu diesem Anbieter',
      };
    }
  }

  // Prüfe Appeal-Typ vs. ursprüngliche Entscheidung
  if (appealType === 'appeal_rejection' && stornoData.status !== 'rejected') {
    return {
      valid: false,
      error: 'Widerspruch gegen Ablehnung nur bei abgelehnten Storno-Anfragen möglich',
    };
  }

  if (appealType === 'appeal_partial_refund' && stornoData.status !== 'approved') {
    return {
      valid: false,
      error: 'Widerspruch gegen Teilerstattung nur bei genehmigten Storno-Anfragen möglich',
    };
  }

  // Prüfe Zeitlimit für Appeals (z.B. 30 Tage)
  const reviewedAt = stornoData.reviewedAt ? new Date(stornoData.reviewedAt.toDate()) : null;
  if (reviewedAt) {
    const daysSinceReview = (Date.now() - reviewedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReview > 30) {
      return {
        valid: false,
        error: 'Widerspruch muss innerhalb von 30 Tagen nach der Entscheidung eingereicht werden',
      };
    }
  }

  return { valid: true };
}

/**
 * Erstelle Contact Form Ticket für Appeal
 */
async function createContactFormTicketForAppeal(appealData: any, stornoData: any) {
  try {
    // Bereite Contact Form Daten vor
    const contactFormData = {
      name: appealData.contactInfo?.name || 'Unbekannt',
      email: appealData.contactInfo?.email || '',
      phone: appealData.contactInfo?.phone || '',
      subject: `Widerspruch gegen Storno-Entscheidung - Auftrag ${stornoData.auftragId}`,
      message: formatAppealMessageForContactForm(appealData, stornoData),
      category: 'storno_appeal',
      priority: 'high',
      metadata: {
        type: 'storno_appeal',
        appealId: appealData.id,
        stornoRequestId: appealData.stornoRequestId,
        auftragId: stornoData.auftragId,
        appealType: appealData.type,
        appealerType: appealData.appealerType,
        appealerUid: appealData.appealerUid,
      },
    };

    // Rufe Contact Form API auf
    const contactFormResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/contact-form`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactFormData),
      }
    );

    if (!contactFormResponse.ok) {
      throw new Error('Contact Form API Fehler');
    }

    const contactFormResult = await contactFormResponse.json();

    return {
      success: true,
      ticketId: contactFormResult.ticketId || 'APPEAL-' + appealData.id.substring(0, 8),
    };
  } catch (error) {
    // Fallback: Generiere Ticket-ID auch bei Fehler
    return {
      success: false,
      ticketId: 'APPEAL-' + appealData.id.substring(0, 8),
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * Formatiere Appeal-Nachricht für Contact Form
 */
function formatAppealMessageForContactForm(appealData: any, stornoData: any) {
  const appealTypeText =
    appealData.type === 'appeal_rejection'
      ? 'Widerspruch gegen Ablehnung der Storno-Anfrage'
      : 'Widerspruch gegen Teilerstattung';

  const appealerTypeText = appealData.appealerType === 'customer' ? 'Kunde' : 'Anbieter';

  return `
AUTOMATISCH GENERIERT - STORNO-WIDERSPRUCH

${appealTypeText}

DETAILS:
- Appeal-ID: ${appealData.id}
- Storno-Request-ID: ${appealData.stornoRequestId}
- Auftrag-ID: ${stornoData.auftragId}
- Einreicher: ${appealerTypeText} (${appealData.appealerUid})
- Appeal-Typ: ${appealData.type}

URSPRÜNGLICHE ENTSCHEIDUNG:
- Status: ${stornoData.status}
- Entschieden am: ${stornoData.reviewedAt || 'Unbekannt'}
- Entschieden von: ${stornoData.reviewedBy || 'Unbekannt'}
- Admin-Notizen: ${stornoData.adminNotes || 'Keine'}
- Erstattungsbetrag: ${stornoData.refundAmount ? stornoData.refundAmount / 100 + ' EUR' : 'Kein'}

BEGRÜNDUNG DES WIDERSPRUCHS:
${appealData.reason}

ZUSÄTZLICHE BELEGE:
${appealData.additionalEvidence || 'Keine zusätzlichen Belege bereitgestellt'}

KONTAKTINFORMATIONEN:
- Name: ${appealData.contactInfo?.name || 'Nicht angegeben'}
- E-Mail: ${appealData.contactInfo?.email || 'Nicht angegeben'}
- Telefon: ${appealData.contactInfo?.phone || 'Nicht angegeben'}

Eingereicht am: ${new Date().toLocaleString('de-DE')}

Bitte prüfen Sie diesen Widerspruch und leiten Sie entsprechende Schritte ein.
  `.trim();
}
