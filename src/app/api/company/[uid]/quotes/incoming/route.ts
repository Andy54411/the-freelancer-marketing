import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

  try {
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);

    } catch (error) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {

      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get company data to verify it exists and get additional info

    const companyDoc = await db.collection('users').doc(uid).get();
    if (!companyDoc.exists) {

      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Get company's service subcategory to filter relevant projects
    const companyUserDoc = await db.collection('users').doc(uid).get();
    if (!companyUserDoc.exists) {

      return NextResponse.json({ error: 'Company user data not found' }, { status: 404 });
    }

    const companyUserData = companyUserDoc.data();
    const selectedSubcategory =
      companyUserData?.onboarding?.selectedSubcategory || companyUserData?.selectedSubcategory;

    if (!selectedSubcategory) {

      return NextResponse.json({
        success: true,
        quotes: [],
        message: 'Keine Subkategorie definiert',
      });
    }

    // Query for project requests

    // Get ALL project requests first, then filter in memory
    // This avoids Firestore index issues and gives us more flexibility
    let projectRequestsSnapshot;
    try {
      // Get all active project requests
      projectRequestsSnapshot = await db
        .collection('project_requests')
        .where('status', 'in', ['open', 'responded', 'accepted', 'active', 'payment_pending'])
        .get();

    } catch (error) {

      // Ultra-simple fallback - get all project_requests
      projectRequestsSnapshot = await db.collection('project_requests').get();

    }

    const quotes: any[] = [];

    for (const doc of projectRequestsSnapshot.docs) {
      const projectData = doc.data();

      // Check if this request is relevant for this company
      let isRelevantForCompany = false;

      // Case 1: Direct assignment - company is specifically selected
      if (
        projectData.selectedProviders &&
        Array.isArray(projectData.selectedProviders) &&
        projectData.selectedProviders.length > 0
      ) {
        const isDirectlySelected = projectData.selectedProviders.some(
          (provider: any) =>
            provider.uid === uid || provider.companyUid === uid || provider.id === uid
        );
        if (isDirectlySelected) {
          isRelevantForCompany = true;

        } else {

        }
      }
      // Case 2: Public request - no specific companies selected, match by subcategory
      else {
        const projectSubcategory = projectData.serviceSubcategory || projectData.subcategory;
        const subcategoryMatches = projectSubcategory === selectedSubcategory;

        if (subcategoryMatches) {
          isRelevantForCompany = true;

        } else {

        }
      }

      // Skip if not relevant for this company
      if (!isRelevantForCompany) {

        continue;
      }

      // Get customer information based on customerUid
      let customerInfo: any = null;

      if (projectData.customerUid) {
        try {
          // First try to get from users collection
          const userDoc = await db.collection('users').doc(projectData.customerUid).get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData) {
              customerInfo = {
                name:
                  userData.companyName ||
                  userData.firstName + ' ' + userData.lastName ||
                  'Unbekannter Kunde',
                type: userData.user_type === 'firma' ? 'company' : 'user',
                email: userData.email,
                phone: userData.phone,
                avatar: userData.avatar || null,
                uid: userDoc.id,
              };
            }
          } else {
            // Customer not found in users collection

          }
        } catch (error) {

        }
      }

      // Check if this company has already submitted a proposal
      const hasResponse =
        projectData.proposals &&
        projectData.proposals.some(proposal => proposal.companyUid === uid);

      // Determine status based on proposals
      let finalStatus = 'pending';
      if (hasResponse) {
        const companyProposal = projectData.proposals.find(p => p.companyUid === uid);
        if (companyProposal?.status === 'accepted') {
          finalStatus = 'accepted';
        } else if (companyProposal?.status === 'declined') {
          finalStatus = 'declined';
        } else {
          finalStatus = 'responded';
        }
      }

      // Build budget information
      let budgetInfo: any = null;
      let budgetRangeText = 'Nicht angegeben';

      if (projectData.budgetAmount && projectData.budgetAmount > 0) {
        budgetInfo = {
          amount: projectData.budgetAmount,
          max: projectData.maxBudget || projectData.budgetAmount,
          currency: 'EUR',
          type: projectData.budgetType || 'project',
        };

        if (projectData.maxBudget && projectData.maxBudget !== projectData.budgetAmount) {
          budgetRangeText = `${projectData.budgetAmount.toLocaleString('de-DE')} - ${projectData.maxBudget.toLocaleString('de-DE')} €`;
        } else {
          budgetRangeText = `${projectData.budgetAmount.toLocaleString('de-DE')} €`;
        }
      } else if (projectData.budget) {
        // Fallback to old budget structure
        budgetInfo = projectData.budget;
        budgetRangeText = projectData.budget;
      }

      quotes.push({
        id: doc.id,
        title: projectData.title || 'Ohne Titel',
        description: projectData.description || '',
        serviceCategory: projectData.serviceCategory || '',
        serviceSubcategory: projectData.serviceSubcategory || '',
        projectType: projectData.projectType || 'project',
        status: finalStatus,
        budget: budgetInfo,
        budgetRange: budgetRangeText,
        timeline: projectData.timeline,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        location: projectData.location,
        postalCode: projectData.postalCode,
        urgency: projectData.urgency,
        estimatedDuration: projectData.estimatedDuration,
        preferredStartDate: projectData.preferredStartDate,
        additionalNotes: projectData.additionalNotes,
        customer: customerInfo || {
          name: projectData.customerName || 'Unbekannter Kunde',
          type: projectData.customerType || 'user',
          email: projectData.customerEmail || null,
          phone: null,
          avatar: null,
          uid: projectData.customerUid,
        },
        createdAt: projectData.createdAt?.toDate?.() || new Date(projectData.createdAt),
        hasResponse: hasResponse,
        proposals: projectData.proposals || [],
        customerUid: projectData.customerUid,
        customerCompanyUid: projectData.customerCompanyUid,
      });
    }

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
