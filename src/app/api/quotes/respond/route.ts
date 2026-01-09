import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import {
  ProposalSubcollectionService,
  ProposalData,
} from '@/services/ProposalSubcollectionService';
import { ProjectNotificationService } from '@/lib/project-notifications';
import admin from 'firebase-admin';

interface ResponseData {
  message?: string;
  notes?: string;
  totalAmount?: number;
  currency?: string;
  timeline?: string;
  serviceItems?: Array<{
    title: string;
    description: string;
    price?: number;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  terms?: string;
  validUntil?: string;
}

interface UserData {
  companyUid?: string;
  companyName?: string;
  displayName?: string;
  name?: string;
}

/**
 * UNIFIED: Prüft ob das Projekt in project_requests existiert
 * Gibt projectData zurück wenn gefunden, sonst null
 */
async function getProjectFromUnifiedCollection(projectId: string): Promise<FirebaseFirestore.DocumentData | null> {
  const projectDoc = await db!.collection('project_requests').doc(projectId).get();
  if (projectDoc.exists) {
    return { id: projectDoc.id, ...projectDoc.data() };
  }
  return null;
}

/**
 * UNIFIED: Neue Angebot-Response Struktur verarbeiten
 * Unterstützt sowohl project_requests (unified) als auch legacy quotes
 */
async function handleNewQuoteResponse(
  request: NextRequest,
  quoteId: string,
  response: ResponseData,
  companyId: string
) {
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
    let userData: UserData | null = null;
    let companyUid = uid; // Default fallback
    let companyName = 'Unbekanntes Unternehmen';

    // Erst in users Collection suchen (B2C)
    const userDoc = await db!.collection('users').doc(uid).get();
    if (userDoc.exists) {
      userData = userDoc.data() as UserData;
      companyUid = userData?.companyUid || uid;
      companyName = userData?.companyName || userData?.displayName || 'Unbekanntes Unternehmen';
    } else {
      // Dann in companies Collection suchen (B2B)
      const companyDoc = await db!.collection('companies').doc(uid).get();
      if (companyDoc.exists) {
        userData = companyDoc.data() as UserData;
        companyUid = uid; // Bei companies ist die uid direkt die companyUid
        companyName = userData?.companyName || userData?.name || 'Unbekanntes Unternehmen';
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // UNIFIED: Prüfe zuerst ob das Projekt in project_requests existiert
    const unifiedProject = await getProjectFromUnifiedCollection(quoteId);
    
    let customerUid: string | undefined;
    let subcategory: string;
    let isUnifiedProject = false;

    if (unifiedProject) {
      // UNIFIED: Projekt ist in project_requests
      isUnifiedProject = true;
      customerUid = unifiedProject.customerData?.uid || unifiedProject.customerUid;
      subcategory = unifiedProject.subcategory || unifiedProject.serviceSubcategory || unifiedProject.title || 'Service';
      
      // Prüfen ob bereits ein Angebot existiert (in project_requests subcollection)
      const hasExisting = await ProposalSubcollectionService.hasExistingProposalForProject(quoteId, companyUid);
      if (hasExisting) {
        return NextResponse.json(
          { error: 'Sie haben bereits ein Angebot für diese Anfrage abgegeben' },
          { status: 409 }
        );
      }
    } else {
      // LEGACY: Fallback auf quotes Collection
      const quoteDoc = await db!
        .collection('companies')
        .doc(companyId)
        .collection('quotes')
        .doc(quoteId)
        .get();
      if (!quoteDoc.exists) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }

      const quoteData = quoteDoc.data();
      customerUid = quoteData?.customerUid;
      subcategory = quoteData?.serviceSubcategory || quoteData?.title || 'Service';

      // Prüfen ob bereits ein Angebot existiert (legacy)
      const hasExisting = await ProposalSubcollectionService.hasExistingProposal(quoteId, companyUid, companyId);
      if (hasExisting) {
        return NextResponse.json(
          { error: 'Sie haben bereits ein Angebot für diese Anfrage abgegeben' },
          { status: 409 }
        );
      }
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

    // Erstelle Proposal in entsprechender Subcollection
    if (isUnifiedProject) {
      // UNIFIED: Nutze createProposalForProject
      await ProposalSubcollectionService.createProposalForProject(quoteId, proposalData, response as Record<string, unknown>);
    } else {
      // LEGACY: Nutze createProposal
      await ProposalSubcollectionService.createProposal(quoteId, proposalData, companyId, response);
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
      } catch {
        // Notification-Fehler still behandeln
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Angebot erfolgreich abgegeben',
      proposalId: companyUid,
      quoteId,
      isUnifiedProject,
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
async function handleQuoteDecline(_quoteId: string, _companyId: string) {
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

    // Neue Struktur: { quoteId, action, response: { serviceItems, totalAmount, message, ... }, companyId }
    const { quoteId, action, response, companyId } = body;

    if (action === 'respond' && response && companyId) {
      return await handleNewQuoteResponse(request, quoteId, response, companyId);
    }

    if (action === 'decline' && companyId) {
      return await handleQuoteDecline(quoteId, companyId);
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

    // UNIFIED: Prüfe zuerst ob das Projekt in project_requests existiert
    const unifiedProject = await getProjectFromUnifiedCollection(quoteId);
    const targetCompanyId = companyId || companyUid;
    let isUnifiedProject = false;

    if (unifiedProject) {
      // UNIFIED: Prüfe ob bereits ein Proposal existiert
      isUnifiedProject = true;
      const hasExisting = await ProposalSubcollectionService.hasExistingProposalForProject(quoteId, companyUid);
      if (hasExisting) {
        return NextResponse.json(
          { error: 'Sie haben bereits ein Angebot für diese Anfrage abgegeben' },
          { status: 409 }
        );
      }
    } else {
      // LEGACY: Check in quotes subcollection
      const hasExisting = await ProposalSubcollectionService.hasExistingProposal(quoteId, companyUid, targetCompanyId);
      if (hasExisting) {
        return NextResponse.json(
          { error: 'Sie haben bereits ein Angebot für diese Anfrage abgegeben' },
          { status: 409 }
        );
      }
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

    // Erstelle Proposal in entsprechender Subcollection
    if (isUnifiedProject) {
      // UNIFIED: Nutze createProposalForProject
      await ProposalSubcollectionService.createProposalForProject(quoteId, proposalData);
    } else {
      // LEGACY: Nutze createProposal
      await ProposalSubcollectionService.createProposal(quoteId, proposalData, targetCompanyId);
    }

    // Sende Benachrichtigung an Kunden (falls customerUid verfügbar)
    const targetCustomerUid = isUnifiedProject 
      ? (unifiedProject?.customerData?.uid || unifiedProject?.customerUid)
      : customerUid;
      
    if (targetCustomerUid) {
      try {
        await ProjectNotificationService.createNewProposalNotification(
          quoteId,
          targetCustomerUid,
          companyUid,
          {
            companyName,
            subcategory: subcategory || (isUnifiedProject ? unifiedProject?.subcategory : 'Service') || 'Service',
            proposedPrice: proposalData.totalAmount,
            proposedTimeline: proposalData.timeline,
            message: proposalData.message,
          }
        );
      } catch {
        // Notification-Fehler still behandeln
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Angebot erfolgreich abgegeben',
      proposalId: companyUid,
      isUnifiedProject,
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

    const { quoteId, proposalId, status, updateData, companyId } = body;

    // Validierung
    if (!quoteId || !proposalId || !status || !companyId) {
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
      companyId,
      updateData
    );

    // Bei Annahme: Andere Proposals ablehnen
    if (status === 'accepted') {
      await ProposalSubcollectionService.declineOtherProposals(quoteId, proposalId, companyId);
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
 * GET /api/quotes/respond?quoteId=xxx&companyId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const quoteId = searchParams.get('quoteId');
    const companyId = searchParams.get('companyId');

    if (!quoteId || !companyId) {
      return NextResponse.json({ error: 'Quote ID und Company ID sind erforderlich' }, { status: 400 });
    }

    // Lade alle Proposals für die Quote
    const proposals = await ProposalSubcollectionService.getProposalsForQuote(quoteId, companyId);

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
