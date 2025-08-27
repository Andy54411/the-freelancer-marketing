import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { ProposalSubcollectionService } from '@/services/ProposalSubcollectionService';
import admin from 'firebase-admin';

/**
 * API Route für Customer Quote Response (Accept/Decline)
 * POST /api/user/[uid]/quotes/received/[quoteId]/respond
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;

  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentifizierung erforderlich' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (authError) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    // Check if user is authorized
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { proposalId, action } = body;

    if (!proposalId || !action) {
      return NextResponse.json(
        { error: 'Proposal ID und Aktion sind erforderlich' },
        { status: 400 }
      );
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }

    // Get the project request
    const projectRef = db.collection('project_requests').doc(quoteId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Check if user owns this project
    if (projectData?.customerUid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Projekt' }, { status: 403 });
    }

    // Find the proposal using subcollection
    const proposal = await ProposalSubcollectionService.getProposal(quoteId, proposalId);

    if (!proposal) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    // Check if proposal is still pending
    if (proposal.status !== 'pending') {
      return NextResponse.json({ error: 'Angebot wurde bereits bearbeitet' }, { status: 400 });
    }

    if (action === 'accept') {
      // Accept proposal using subcollection service (this also declines all other proposals)
      await ProposalSubcollectionService.updateProposalStatus(quoteId, proposalId, 'accepted');

      // TODO: Send notifications to companies
      // TODO: Create contract/payment process

      return NextResponse.json({
        success: true,
        message: 'Angebot erfolgreich angenommen',
      });
    } else {
      // Decline this proposal using subcollection service
      await ProposalSubcollectionService.updateProposalStatus(quoteId, proposalId, 'declined');

      // Check if all proposals are declined
      const allProposals = await ProposalSubcollectionService.getProposalsForQuote(quoteId);
      const allDeclined = allProposals.every(p => p.status === 'declined');

      await projectRef.update({
        ...(allDeclined && { status: 'no_suitable_offers' }),
        updatedAt: new Date().toISOString(),
      });

      // TODO: Send notification to company about declined proposal

      return NextResponse.json({
        success: true,
        message: 'Angebot abgelehnt',
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Bearbeiten des Angebots' }, { status: 500 });
  }
}
