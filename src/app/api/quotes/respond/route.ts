import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import {
  ProposalSubcollectionService,
  ProposalData,
} from '@/services/ProposalSubcollectionService';
import { ProjectNotificationService } from '@/lib/project-notifications';
import admin from 'firebase-admin';

/**
 * Neue Angebot-Response Struktur verarbeiten
 */
async function handleNewQuoteResponse(request: NextRequest, quoteId: string, response: any) {
  // Token aus Authorization Header extrahieren
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Token validieren und User-Daten abrufen
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // B2B/B2C: Prüfe sowohl users als auch companies Collection
    let userData: any = null;
    let companyUid = uid; // Default fallback
    let companyName = 'Unbekanntes Unternehmen';

    // Erst in users Collection suchen (B2C)
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      userData = userDoc.data();
      companyUid = userData?.companyUid || uid;
      companyName = userData?.companyName || userData?.displayName || 'Unbekanntes Unternehmen';
    } else {
      // Dann in companies Collection suchen (B2B)

      const companyDoc = await db.collection('companies').doc(uid).get();
      if (companyDoc.exists) {
        userData = companyDoc.data();
        companyUid = uid; // Bei companies ist die uid direkt die companyUid
        companyName = userData?.companyName || userData?.name || 'Unbekanntes Unternehmen';
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Quote-Daten abrufen für Notification
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();
    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();
    const customerUid = quoteData?.customerUid;
    const subcategory = quoteData?.serviceSubcategory || quoteData?.title || 'Service';

    // Prüfen ob bereits ein Angebot existiert
    const hasExisting = await ProposalSubcollectionService.hasExistingProposal(quoteId, companyUid);
    if (hasExisting) {
      return NextResponse.json(
        { error: 'Sie haben bereits ein Angebot für diese Anfrage abgegeben' },
        { status: 409 }
      );
    }

    // Response-Daten in Proposal-Format konvertieren
    const proposalData: ProposalData = {
      companyUid,
      providerId: companyUid,
      message: response.message || response.notes || 'Angebot wurde erstellt',
      totalAmount: response.totalAmount || 0,
      currency: response.currency || 'EUR',
      timeline: response.timeline || 'Wird noch definiert',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      // Erweiterte Daten für die neue Struktur
      serviceItems: response.serviceItems || [],
      terms: response.terms || '',
      validUntil: response.validUntil || '',
      additionalNotes: response.notes || '',
    };

    // Erstelle Proposal in Subcollection
    try {
      await ProposalSubcollectionService.createProposal(quoteId, proposalData, response);
    } catch (proposalError) {
      throw proposalError; // Re-throw to be caught by outer try-catch
    }

    // Benachrichtigung an Kunden senden
    if (customerUid) {
      try {
        await ProjectNotificationService.createNewProposalNotification(
          quoteId,
          customerUid,
          companyUid,
          {
            companyName,
            subcategory,
            proposedPrice: proposalData.totalAmount,
            proposedTimeline: proposalData.timeline,
            message: proposalData.message,
          }
        );
      } catch (notificationError) {}
    } else {
    }

    return NextResponse.json({
      success: true,
      message: 'Angebot erfolgreich abgegeben',
      proposalId: companyUid,
      quoteId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Verarbeiten des Angebots',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * Behandelt Ablehnung einer Quote (action: "decline")
 */
async function handleQuoteDecline(request: NextRequest, quoteId: string) {
  // TODO: Implement quote decline logic
  // This could involve creating a decline record, updating quote status, etc.

  return NextResponse.json({
    success: true,
    message: 'Quote erfolgreich abgelehnt',
  });
}

/**
 * API Route zum Antworten auf eine Quote (Angebot abgeben)
 * POST /api/quotes/respond
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Neue Struktur: { quoteId, action, response: { serviceItems, totalAmount, message, ... } }
    const { quoteId, action, response } = body;

    if (action === 'respond' && response) {
      return await handleNewQuoteResponse(request, quoteId, response);
    }

    if (action === 'decline') {
      return await handleQuoteDecline(request, quoteId);
    }

    // Alte Struktur: { quoteId, companyUid, proposedPrice, message, ... }
    const {
      companyUid,
      companyName,
      providerEmail,
      proposedPrice,
      message,
      proposedTimeline,
      availability,
      customerUid,
      subcategory,
    } = body;

    // Validierung der erforderlichen Felder
    if (!quoteId || !companyUid || !companyName || !proposedPrice || !message) {
      return NextResponse.json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
    }

    // Check if company has already submitted a proposal
    const hasExisting = await ProposalSubcollectionService.hasExistingProposal(quoteId, companyUid);
    if (hasExisting) {
      return NextResponse.json(
        { error: 'Sie haben bereits ein Angebot für diese Anfrage abgegeben' },
        { status: 409 }
      );
    }

    // Erstelle Proposal-Daten
    const proposalData: ProposalData = {
      companyUid,
      providerId: companyUid, // Same as companyUid for consistency
      message,
      totalAmount: parseFloat(proposedPrice),
      currency: 'EUR',
      timeline: proposedTimeline || 'Nicht angegeben',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      // Optional fields for backwards compatibility
      terms: availability || 'Sofort verfügbar',
      additionalNotes: `Email: ${providerEmail || 'Nicht angegeben'}`,
    };

    // Erstelle Proposal in Subcollection
    await ProposalSubcollectionService.createProposal(quoteId, proposalData);

    // Sende Benachrichtigung an Kunden (falls customerUid verfügbar)
    if (customerUid) {
      try {
        await ProjectNotificationService.createNewProposalNotification(
          quoteId,
          customerUid,
          companyUid,
          {
            companyName,
            subcategory: subcategory || 'Service',
            proposedPrice: proposalData.totalAmount,
            proposedTimeline: proposalData.timeline,
            message: proposalData.message,
          }
        );
      } catch (notificationError) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Angebot erfolgreich abgegeben',
      proposalId: companyUid,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Abgeben des Angebots',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * API Route um bestehende Angebote zu aktualisieren
 * PUT /api/quotes/respond
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { quoteId, proposalId, status, updateData } = body;

    // Validierung
    if (!quoteId || !proposalId || !status) {
      return NextResponse.json({ error: 'Fehlende erforderliche Felder' }, { status: 400 });
    }

    // Gültige Status-Werte
    const validStatuses = ['accepted', 'declined', 'pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 });
    }

    // Update Proposal Status
    await ProposalSubcollectionService.updateProposalStatus(
      quoteId,
      proposalId,
      status as 'accepted' | 'declined',
      updateData
    );

    // Bei Annahme: Andere Proposals ablehnen
    if (status === 'accepted') {
      await ProposalSubcollectionService.declineOtherProposals(quoteId, proposalId);
    }

    return NextResponse.json({
      success: true,
      message: `Angebot erfolgreich ${status === 'accepted' ? 'angenommen' : 'abgelehnt'}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren des Angebots',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * API Route um Angebote für eine Quote zu laden
 * GET /api/quotes/respond?quoteId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const quoteId = searchParams.get('quoteId');

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID ist erforderlich' }, { status: 400 });
    }

    // Lade alle Proposals für die Quote
    const proposals = await ProposalSubcollectionService.getProposalsForQuote(quoteId);

    return NextResponse.json({
      success: true,
      proposals,
      count: proposals.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Angebote',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
