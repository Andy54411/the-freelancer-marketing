import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';
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
      console.error('Auth-Fehler:', authError);
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    const body = await request.json();
    const { quoteId, action, response } = body;

    if (!quoteId || !action) {
      return NextResponse.json({ error: 'Quote ID und Aktion sind erforderlich' }, { status: 400 });
    }

    const quoteRef = db.collection('project_requests').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebotsanfrage nicht gefunden' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    console.log('🔍 Debug Quote Data:', {
      quoteId,
      userUid: decodedToken.uid,
      availableFields: Object.keys(quoteData || {}),
      proposalsCount: quoteData?.proposals?.length || 0,
      customerUid: quoteData?.customerUid,
    });

    // Berechtigungs-Check: Company muss in der assignedCompanies Liste sein oder es ist eine offene Anfrage
    // TODO: Prüfen welches Feld für die Berechtigung verwendet wird
    if (quoteData?.assignedCompanies && !quoteData.assignedCompanies.includes(decodedToken.uid)) {
      return NextResponse.json(
        {
          error: 'Keine Berechtigung für diese Angebotsanfrage',
          debug: {
            userUid: decodedToken.uid,
            assignedCompanies: quoteData.assignedCompanies,
          },
        },
        { status: 403 }
      );
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    switch (action) {
      case 'respond':
        if (!response || !response.message) {
          return NextResponse.json(
            { error: 'Antwort-Nachricht ist erforderlich' },
            { status: 400 }
          );
        }

        // Check if company has already submitted a proposal
        const existingProposals = quoteData.proposals || [];
        const existingProposal = existingProposals.find(p => p.companyUid === decodedToken.uid);

        if (existingProposal) {
          return NextResponse.json(
            { error: 'Sie haben bereits ein Angebot für dieses Projekt abgegeben' },
            { status: 400 }
          );
        }

        // Create new proposal
        const newProposal = {
          companyUid: decodedToken.uid,
          message: response.message,
          serviceItems: response.serviceItems || [],
          totalAmount: response.totalAmount || 0,
          currency: response.currency || 'EUR',
          timeline: response.timeline || '',
          terms: response.terms || '',
          additionalNotes: response.additionalNotes || '',
          status: 'pending',
          submittedAt: new Date().toISOString(),
        };

        // Add proposal to the proposals array
        const updatedProposals = [...existingProposals, newProposal];

        updateData.status = 'responded';
        updateData.proposals = updatedProposals;

        // Bell-Notification an Kunden senden (Provider hat geantwortet)
        if (quoteData?.customerUid) {
          try {
            // Provider-Namen aus der aktuellen Company holen
            let providerName = 'Anbieter';
            const companyDoc = await db.collection('companies').doc(decodedToken.uid).get();
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
                estimatedPrice: response.totalAmount || 0,
                estimatedDuration: response.timeline || 'Nicht angegeben',
              }
            );
            console.log(`✅ Quote-Response-Notification gesendet für Quote ${quoteId}`);

            // Email Notification an Customer
            try {
              console.log('🔍 Starting email notification process...');

              // Customer Email aus User-Daten holen
              const userDoc = await db.collection('users').doc(quoteData.customerUid).get();
              console.log('📧 User doc exists:', userDoc.exists);

              if (userDoc.exists) {
                const userData = userDoc.data();
                const customerEmail = userData?.email;
                console.log('📧 Customer email found:', customerEmail ? 'Yes' : 'No');

                if (customerEmail) {
                  console.log('📧 Attempting to send email to:', customerEmail);

                  // Import Email Service
                  const { emailService } = await import('@/lib/resend-email-service');

                  const emailResult = await emailService.sendNewProposalEmail(
                    customerEmail,
                    quoteData.projectTitle || quoteData.serviceSubcategory || 'Ihr Projekt',
                    providerName,
                    response.totalAmount || 0
                  );

                  console.log('📧 Email result:', emailResult);

                  if (emailResult.success) {
                    console.log(`✅ Neues-Angebot-Email gesendet an ${customerEmail}`);
                  } else {
                    console.error(
                      '❌ Fehler beim Senden der Neues-Angebot-Email:',
                      emailResult.error
                    );
                  }
                } else {
                  console.warn('⚠️ Keine E-Mail-Adresse für Customer gefunden');
                }
              } else {
                console.warn(
                  '⚠️ User-Dokument nicht gefunden für customerUid:',
                  quoteData.customerUid
                );
              }
            } catch (emailError) {
              console.error('❌ Fehler bei Neues-Angebot-Email:', emailError);
            }
          } catch (notificationError) {
            console.error('❌ Fehler bei Quote-Response-Notification:', notificationError);
            // Notification-Fehler sollten den Response nicht blockieren
          }
        }
        break;

      case 'accept':
        updateData.status = 'accepted';
        updateData.acceptedAt = new Date().toISOString();
        break;

      case 'decline':
        updateData.status = 'declined';
        updateData.declinedAt = new Date().toISOString();

        // Finde und aktualisiere das entsprechende Proposal im proposals Array
        const existingProposalsForDecline = quoteData?.proposals || [];
        const updatedProposalsForDecline = existingProposalsForDecline.map((proposal: any) => {
          // Finde das Proposal von der aktuellen Company
          if (
            proposal.providerId === decodedToken.uid ||
            proposal.companyId === decodedToken.uid ||
            proposal.companyUid === decodedToken.uid
          ) {
            return {
              ...proposal,
              status: 'declined',
              declinedAt: new Date().toISOString(),
            };
          }
          return proposal;
        });

        updateData.proposals = updatedProposalsForDecline;
        break;

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }

    // Update in Firestore
    await quoteRef.update(updateData);

    // Erfolgsmeldung zurückgeben
    return NextResponse.json({
      success: true,
      message: `Angebotsanfrage erfolgreich ${
        action === 'respond' ? 'beantwortet' : action === 'accept' ? 'angenommen' : 'abgelehnt'
      }`,
    });
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Angebotsanfrage:', error);
    return NextResponse.json(
      { error: 'Fehler beim Bearbeiten der Angebotsanfrage' },
      { status: 500 }
    );
  }
}
