import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

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
      console.error('[User Quote Detail API] Auth-Fehler:', authError);
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    console.log('[User Quote Detail API] Request for user:', uid, 'quote:', quoteId);

    // Check if user is authorized to access this quote
    if (decodedToken.uid !== uid) {
      console.log('[User Quote Detail API] User not authorized:', decodedToken.uid, 'vs', uid);
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Get the project request
    console.log('[User Quote Detail API] Looking for project in project_requests:', quoteId);
    const projectRef = db.collection('project_requests').doc(quoteId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      console.log('[User Quote Detail API] Project not found in project_requests:', quoteId);
      // Check if it might be in the quotes collection instead
      const quoteRef = db.collection('quotes').doc(quoteId);
      const quoteDoc = await quoteRef.get();

      if (!quoteDoc.exists) {
        console.log('[User Quote Detail API] Quote also not found in quotes collection:', quoteId);
        return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
      } else {
        console.log('[User Quote Detail API] Found in quotes collection instead');
        // TODO: Handle quotes collection format
        return NextResponse.json(
          { error: 'Quote in falscher Collection gefunden - Development needed' },
          { status: 500 }
        );
      }
    }

    const projectData = projectDoc.data();
    console.log('[User Quote Detail API] Project data found:', {
      id: projectDoc.id,
      customerUid: projectData?.customerUid,
      title: projectData?.title,
      proposals: projectData?.proposals?.length || 0,
    });

    // Check if user owns this project
    if (projectData?.customerUid !== uid) {
      console.log(
        '[User Quote Detail API] User does not own project:',
        projectData?.customerUid,
        'vs',
        uid
      );
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Projekt' }, { status: 403 });
    }

    // Enhance proposals with company information
    const enhancedProposals: any[] = [];
    console.log(
      '[User Quote Detail API] Processing proposals:',
      projectData?.proposals?.length || 0
    );

    if (projectData?.proposals) {
      for (let i = 0; i < projectData.proposals.length; i++) {
        const proposal = projectData.proposals[i];
        console.log(`[User Quote Detail API] Processing proposal ${i + 1}:`, {
          companyUid: proposal.companyUid,
          status: proposal.status,
          price: proposal.price,
        });

        // Get company information
        let companyInfo = {
          companyName: 'Unbekanntes Unternehmen',
          companyEmail: null,
          companyPhone: null,
          companyLogo: null,
        };

        try {
          // Try users collection for company data
          console.log(`[User Quote Detail API] Looking up company: ${proposal.companyUid}`);
          const companyDoc = await db.collection('users').doc(proposal.companyUid).get();
          if (companyDoc.exists) {
            const companyData = companyDoc.data();
            console.log(`[User Quote Detail API] Found company data:`, {
              companyName: companyData?.companyName,
              firstName: companyData?.firstName,
              lastName: companyData?.lastName,
              email: companyData?.email,
            });
            companyInfo = {
              companyName:
                companyData?.companyName ||
                (companyData?.firstName && companyData?.lastName
                  ? `${companyData.firstName} ${companyData.lastName}`
                  : 'Unbekanntes Unternehmen'),
              companyEmail: companyData?.email || null,
              companyPhone: companyData?.phone || null,
              companyLogo: companyData?.logo || companyData?.avatar || null,
            };
          } else {
            console.log(`[User Quote Detail API] Company not found: ${proposal.companyUid}`);
          }
        } catch (error) {
          console.error('❌ [User Quote Detail API] Fehler beim Laden der Company-Daten:', error);
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

        console.log(`[User Quote Detail API] Enhanced proposal ${i + 1}:`, {
          companyName: companyInfo.companyName,
          status: proposal.status,
        });
      }
    }

    console.log(`[User Quote Detail API] Total enhanced proposals: ${enhancedProposals.length}`);

    // Build budget information
    let budgetRangeText = 'Nicht angegeben';
    if (projectData?.budgetAmount && projectData?.budgetAmount > 0) {
      if (projectData?.maxBudget && projectData?.maxBudget !== projectData?.budgetAmount) {
        budgetRangeText = `${projectData.budgetAmount.toLocaleString('de-DE')} - ${projectData.maxBudget.toLocaleString('de-DE')} €`;
      } else {
        budgetRangeText = `${projectData.budgetAmount.toLocaleString('de-DE')} €`;
      }
    }

    const quote = {
      id: projectDoc.id,
      title: projectData?.title || 'Ohne Titel',
      description: projectData?.description || '',
      serviceCategory: projectData?.serviceCategory || '',
      serviceSubcategory: projectData?.serviceSubcategory || '',
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
    console.error('❌ [User Quote Detail API] Fehler beim Laden der Quote-Details:', error);
    console.error('❌ [User Quote Detail API] Error stack:', error.stack);
    console.error('❌ [User Quote Detail API] Error message:', error.message);
    return NextResponse.json({ error: 'Fehler beim Laden der Quote-Details' }, { status: 500 });
  }
}
