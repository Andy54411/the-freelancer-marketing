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
      console.error('Auth-Fehler:', authError);
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    // Check if user is authorized to access this quote
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
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

    // Enhance proposals with company information
    const enhancedProposals = [];
    if (projectData?.proposals) {
      for (const proposal of projectData.proposals) {
        // Get company information
        let companyInfo = {
          companyName: 'Unbekanntes Unternehmen',
          companyEmail: null,
          companyPhone: null,
          companyLogo: null,
        };

        try {
          // First try companies collection
          const companyDoc = await db.collection('companies').doc(proposal.companyUid).get();
          if (companyDoc.exists) {
            const companyData = companyDoc.data();
            companyInfo = {
              companyName: companyData?.companyName || 'Unbekanntes Unternehmen',
              companyEmail: companyData?.email || null,
              companyPhone: companyData?.phone || null,
              companyLogo: companyData?.logo || null,
            };
          } else {
            // Try users collection
            const userDoc = await db.collection('users').doc(proposal.companyUid).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              companyInfo = {
                companyName:
                  userData?.companyName ||
                  userData?.firstName + ' ' + userData?.lastName ||
                  'Unbekanntes Unternehmen',
                companyEmail: userData?.email || null,
                companyPhone: userData?.phone || null,
                companyLogo: userData?.avatar || null,
              };
            }
          }
        } catch (error) {
          console.error('Fehler beim Laden der Company-Daten:', error);
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
    console.error('Fehler beim Laden der Quote-Details:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Quote-Details' }, { status: 500 });
  }
}
