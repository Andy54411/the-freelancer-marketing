import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';
import { ProposalSubcollectionService } from '@/services/ProposalSubcollectionService';
import {
  checkAdminApproval,
  createApprovalErrorResponse,
  BLOCKED_ACTIONS,
} from '@/lib/adminApprovalMiddleware';
import admin from 'firebase-admin';

/**
 * API Route zum Bearbeiten von Angebotsanfragen
 * POST /api/quotes/respond
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { quoteId, action, response } = body;

    if (!quoteId || !action) {
      return NextResponse.json({ error: 'Quote ID und Aktion sind erforderlich' }, { status: 400 });
    }

    // Get quote from quotes collection
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebotsanfrage nicht gefunden' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    if (!quoteData) {
      return NextResponse.json({ error: 'Angebotsanfrage-Daten nicht verfügbar' }, { status: 404 });
    }

    // Check providerId authorization
    if (quoteData?.providerId !== decodedToken.uid) {
      return NextResponse.json(
        {
          error: 'Keine Berechtigung für diese Angebotsanfrage',
          debug: {
            userUid: decodedToken.uid,
            providerId: quoteData.providerId,
          },
        },
        { status: 403 }
      );
    }

    // Admin Approval Check - Blockiere nicht freigegebene Firmen
    const approvalResult = await checkAdminApproval(decodedToken.uid);
    if (!approvalResult.isApproved) {
      console.log(
        `Quote response blocked for company ${decodedToken.uid}: ${approvalResult.errorCode}`
      );
      return NextResponse.json(
        {
          ...createApprovalErrorResponse(approvalResult),
          blockedAction: BLOCKED_ACTIONS.QUOTE_RESPOND,
        },
        { status: 403 }
      );
    }

    switch (action) {
      case 'respond':
        if (!response || !response.message) {
          return NextResponse.json(
            { error: 'Antwort-Nachricht ist erforderlich' },
            { status: 400 }
          );
        }

        // Check if company has already submitted a proposal using subcollection
        const hasExistingProposal = await ProposalSubcollectionService.hasExistingProposal(
          quoteId,
          decodedToken.uid
        );

        if (hasExistingProposal) {
          return NextResponse.json(
            { error: 'Sie haben bereits ein Angebot für dieses Projekt abgegeben' },
            { status: 400 }
          );
        }

        // Create new proposal data
        const newProposalData = {
          companyUid: decodedToken.uid,
          message: response.message,
          serviceItems: response.serviceItems || [],
          totalAmount: response.totalAmount || 0,
          currency: response.currency || 'EUR',
          timeline: response.timeline || '',
          terms: response.terms || '',
          additionalNotes: response.additionalNotes || '',
          status: 'pending' as const,
          submittedAt: new Date().toISOString(),
        };

        // Create proposal in subcollection
        await ProposalSubcollectionService.createProposal(quoteId, newProposalData);

        // Bell-Notification an Kunden senden (Provider hat geantwortet)
        if (quoteData?.customerUid) {
          try {
            // Provider-Namen aus der aktuellen Company holen
            let providerName = 'Anbieter';
            const companyDoc = await db.collection('users').doc(decodedToken.uid).get();
            if (companyDoc.exists) {
              const companyData = companyDoc.data();
              providerName = companyData?.companyName || 'Anbieter';
            }

            // Bell Notification
            await QuoteNotificationService.createQuoteResponseNotification(
              quoteId,
              quoteData.customerUid,
              {
                providerName: providerName,
                subcategory: quoteData.serviceSubcategory || quoteData.projectTitle || 'Service',
                estimatedPrice: newProposalData.totalAmount || 0,
                estimatedDuration: newProposalData.timeline || 'Nicht angegeben',
              }
            );

            // Email Notification an Customer
            try {
              // Customer Email aus User-Daten holen
              const userDoc = await db.collection('users').doc(quoteData.customerUid).get();

              if (userDoc.exists) {
                const userData = userDoc.data();
                const customerEmail = userData?.email;

                if (customerEmail) {
                  // Import Email Service
                  const { emailService } = await import('@/lib/resend-email-service');

                  const emailResult = await emailService.sendNewProposalEmail(
                    customerEmail,
                    quoteData.projectTitle || quoteData.serviceSubcategory || 'Ihr Projekt',
                    providerName,
                    response.totalAmount || 0
                  );

                  if (emailResult.success) {
                  } else {
                  }
                } else {
                }
              } else {
              }
            } catch (emailError) {}
          } catch (notificationError) {
            // Notification-Fehler sollten den Response nicht blockieren
          }
        }
        break;

      case 'accept':
        await ProposalSubcollectionService.updateProposalStatus(
          quoteId,
          decodedToken.uid,
          'accepted'
        );
        break;

      case 'decline':
        await ProposalSubcollectionService.updateProposalStatus(
          quoteId,
          decodedToken.uid,
          'declined'
        );
        break;

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }

    // Erfolgsmeldung zurückgeben
    return NextResponse.json({
      success: true,
      message: `Angebotsanfrage erfolgreich ${
        action === 'respond' ? 'beantwortet' : action === 'accept' ? 'angenommen' : 'abgelehnt'
      }`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Bearbeiten der Angebotsanfrage' },
      { status: 500 }
    );
  }
}
