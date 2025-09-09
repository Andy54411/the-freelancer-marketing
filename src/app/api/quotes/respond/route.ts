import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import {
  ProposalSubcollectionService,
  ProposalData,
} from '@/services/ProposalSubcollectionService';
import { ProjectNotificationService } from '@/lib/project-notifications';

/**
 * API Route zum Antworten auf eine Quote (Angebot abgeben)
 * POST /api/quotes/respond
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      quoteId,
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
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Benachrichtigung-Fehler sollten die Hauptfunktion nicht blockieren
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Angebot erfolgreich abgegeben',
      proposalId: companyUid,
    });
  } catch (error) {
    console.error('Error submitting proposal:', error);

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
    console.error('Error updating proposal:', error);

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
    console.error('Error loading proposals:', error);

    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Angebote',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
