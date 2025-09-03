import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { ProposalSubcollectionService } from '@/services/ProposalSubcollectionService';

/**
 * API Route für Customer Quote Details
 * GET /api/user/[uid]/quotes/received/[quoteId]
 */
export async function GET(
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

    // Check if user is authorized to access this quote
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Get the project request - try project_requests first, then quotes
    let projectRef = db.collection('project_requests').doc(quoteId);
    let projectDoc = await projectRef.get();
    let isQuotesCollection = false;

    if (!projectDoc.exists) {
      // Check if it might be in the quotes collection instead
      projectRef = db.collection('quotes').doc(quoteId);
      projectDoc = await projectRef.get();
      isQuotesCollection = true;

      if (!projectDoc.exists) {
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
      }
    }

    const projectData = projectDoc.data();

    // Check if user owns this project
    if (projectData?.customerUid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Projekt' }, { status: 403 });
    }

    // Enhance proposals with company information using subcollections
    const enhancedProposals: any[] = [];

    if (isQuotesCollection) {
      // Get proposals from subcollection for quotes collection
      const proposals = await ProposalSubcollectionService.getProposalsForQuote(quoteId);

      for (const proposal of proposals) {
        // Get company information
        let companyInfo = {
          companyName: 'Unbekanntes Unternehmen',
          companyEmail: null,
          companyPhone: null,
          companyLogo: null,
        };

        try {
          // Try companies collection first for comprehensive data
          const companiesDoc = await db.collection('companies').doc(proposal.companyUid).get();

          if (companiesDoc.exists) {
            const companyData = companiesDoc.data();
            companyInfo = {
              companyName:
                companyData?.companyName ||
                companyData?.step2?.companyName ||
                'Unbekanntes Unternehmen',
              companyEmail: companyData?.email || companyData?.step1?.email || null,
              companyPhone:
                companyData?.companyPhoneNumber || companyData?.step1?.phoneNumber || null,
              companyLogo: companyData?.step3?.profilePictureURL || null,
            };
          } else {
            // Fallback to users collection for legacy data
            const userDoc = await db.collection('users').doc(proposal.companyUid).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              companyInfo = {
                companyName:
                  userData?.companyName ||
                  (userData?.firstName && userData?.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : 'Unbekanntes Unternehmen'),
                companyEmail: userData?.email || null,
                companyPhone: userData?.phone || null,
                companyLogo: userData?.logo || userData?.avatar || null,
              };
            }
          }
        } catch (error) {
          // Company not found, use defaults
        }

        enhancedProposals.push({
          ...proposal,
          ...companyInfo,
          submittedAt: proposal.submittedAt
            ? new Date(proposal.submittedAt).toISOString()
            : new Date().toISOString(),
        });
      }
    } else {
      // Handle legacy project_requests collection with proposals array
      if (projectData?.proposals) {
        for (let i = 0; i < projectData.proposals.length; i++) {
          const proposal = projectData.proposals[i];

          // Get company information
          let companyInfo = {
            companyName: 'Unbekanntes Unternehmen',
            companyEmail: null,
            companyPhone: null,
            companyLogo: null,
          };

          try {
            // Try companies collection first for comprehensive data
            const companiesDoc = await db.collection('companies').doc(proposal.companyUid).get();

            if (companiesDoc.exists) {
              const companyData = companiesDoc.data();
              companyInfo = {
                companyName:
                  companyData?.companyName ||
                  companyData?.step2?.companyName ||
                  'Unbekanntes Unternehmen',
                companyEmail: companyData?.email || companyData?.step1?.email || null,
                companyPhone:
                  companyData?.companyPhoneNumber || companyData?.step1?.phoneNumber || null,
                companyLogo: companyData?.step3?.profilePictureURL || null,
              };
            } else {
              // Fallback to users collection for legacy data
              const userDoc = await db.collection('users').doc(proposal.companyUid).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                companyInfo = {
                  companyName:
                    userData?.companyName ||
                    (userData?.firstName && userData?.lastName
                      ? `${userData.firstName} ${userData.lastName}`
                      : 'Unbekanntes Unternehmen'),
                  companyEmail: userData?.email || null,
                  companyPhone: userData?.phone || null,
                  companyLogo: userData?.logo || userData?.avatar || null,
                };
              }
            }
          } catch (error) {
            // Company not found, use defaults
          }

          enhancedProposals.push({
            ...proposal,
            ...companyInfo,
            submittedAt: proposal.submittedAt?.toDate
              ? proposal.submittedAt.toDate().toISOString()
              : proposal.submittedAt
                ? new Date(proposal.submittedAt).toISOString()
                : new Date().toISOString(),
          });
        }
      }
    } // Build budget information
    let budgetRangeText = 'Nicht angegeben';

    if (isQuotesCollection) {
      // Handle quotes collection budget format
      budgetRangeText = projectData?.budgetRange || 'Nicht angegeben';
    } else {
      // Handle legacy project_requests collection budget format
      if (projectData?.budgetAmount && projectData?.budgetAmount > 0) {
        if (projectData?.maxBudget && projectData?.maxBudget !== projectData?.budgetAmount) {
          budgetRangeText = `${projectData.budgetAmount.toLocaleString('de-DE')} - ${projectData.maxBudget.toLocaleString('de-DE')} €`;
        } else {
          budgetRangeText = `${projectData.budgetAmount.toLocaleString('de-DE')} €`;
        }
      }
    }

    const quote = {
      id: projectDoc.id,
      title: isQuotesCollection
        ? projectData?.projectTitle || projectData?.title || 'Ohne Titel'
        : projectData?.title || 'Ohne Titel',
      description: isQuotesCollection
        ? projectData?.projectDescription || projectData?.description || ''
        : projectData?.description || '',
      serviceCategory: isQuotesCollection
        ? projectData?.projectCategory || projectData?.serviceCategory || ''
        : projectData?.serviceCategory || '',
      serviceSubcategory: isQuotesCollection
        ? projectData?.projectSubcategory || projectData?.serviceSubcategory || ''
        : projectData?.serviceSubcategory || '',
      budget: {
        amount: projectData?.budgetAmount || 0,
        max: projectData?.maxBudget || 0,
        currency: 'EUR',
      },
      budgetRange: budgetRangeText,
      timeline: projectData?.timeline || '',
      startDate: projectData?.startDate || null,
      endDate: projectData?.endDate || null,
      location: projectData?.location || null,
      proposals: enhancedProposals,
      status: projectData?.status || 'open',
      createdAt: projectData?.createdAt?.toDate
        ? projectData.createdAt.toDate().toISOString()
        : projectData?.createdAt
          ? new Date(projectData.createdAt).toISOString()
          : new Date().toISOString(),
      customerUid: projectData?.customerUid,
    };

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Laden der Quote-Details' }, { status: 500 });
  }
}
