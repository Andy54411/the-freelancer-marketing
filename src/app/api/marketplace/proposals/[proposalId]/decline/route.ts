/**
 * API zum Ablehnen eines Marktplatz-Angebots
 * 
 * POST /api/marketplace/proposals/[proposalId]/decline
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyApiAuth } from '@/lib/apiAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }
    const userId = authResult.userId;

    const { db } = await import('@/firebase/server');
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();
    const { projectId, reason } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId ist erforderlich' },
        { status: 400 }
      );
    }

    // Projekt laden und Berechtigung prüfen
    const projectRef = db.collection('project_requests').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    if (projectData?.customerUid !== userId && projectData?.createdBy !== userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Proposal laden
    const proposalRef = db.collection('proposals').doc(proposalId);
    const proposalDoc = await proposalRef.get();

    if (!proposalDoc.exists) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const proposalData = proposalDoc.data();
    
    // Prüfen ob Proposal zum Projekt gehört
    if (proposalData?.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Angebot gehört nicht zu diesem Projekt' },
        { status: 400 }
      );
    }

    // Prüfen ob bereits bearbeitet
    if (proposalData?.status !== 'pending') {
      return NextResponse.json(
        { error: 'Angebot wurde bereits bearbeitet' },
        { status: 400 }
      );
    }

    // Proposal ablehnen
    await proposalRef.update({
      status: 'declined',
      declinedAt: Timestamp.now(),
      declinedBy: userId,
      declineReason: reason || null,
      updatedAt: Timestamp.now(),
    });

    // Benachrichtigung an den Anbieter senden
    if (proposalData?.companyId) {
      try {
        await db.collection('notifications').add({
          userId: proposalData.companyId,
          type: 'proposal_declined',
          title: 'Angebot abgelehnt',
          message: `Ihr Angebot für das Projekt "${projectData?.title || 'Unbekannt'}" wurde leider abgelehnt.`,
          data: {
            projectId,
            proposalId,
            action: 'view_proposals',
          },
          read: false,
          createdAt: Timestamp.now(),
        });
      } catch {
        // Benachrichtigung ist optional
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Angebot wurde abgelehnt',
      proposalId,
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
