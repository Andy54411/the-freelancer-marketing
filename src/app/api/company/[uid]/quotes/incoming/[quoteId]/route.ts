import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { ProjectNotificationService } from '@/lib/project-notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;
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
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the project request document from project_requests collection
    const projectRef = db.collection('project_requests').doc(quoteId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Get customer information based on customerUid
    let customerInfo: any = null;

    if (projectData?.customerUid) {
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
          console.log('[Project Details API] Customer not found in users collection:', projectData.customerUid);
        }
      } catch (error) {
        console.error('[Project Details API] Error fetching customer data:', error);
      }
    }

    // Find the company's proposal if it exists
    const companyProposal = projectData?.proposals?.find(proposal => proposal.companyUid === uid);

    // Determine status based on company's proposal
    let finalStatus = 'pending';
    if (companyProposal) {
      if (companyProposal.status === 'accepted') {
        finalStatus = 'accepted';
      } else if (companyProposal.status === 'declined') {
        finalStatus = 'declined';
      } else {
        finalStatus = 'responded';
      }
    }

    // Build budget information from various budget fields
    let budgetInfo: any = null;
    let budgetRangeText = 'Nicht angegeben';

    if (projectData?.budgetAmount && projectData.budgetAmount > 0) {
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
    } else if (projectData?.budget) {
      // Fallback to old budget structure
      budgetInfo = projectData.budget;
      budgetRangeText = projectData.budget;
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quoteId,
        title: projectData?.title || 'Ohne Titel',
        description: projectData?.description || '',
        serviceCategory: projectData?.serviceCategory || '',
        serviceSubcategory: projectData?.serviceSubcategory || '',
        projectType: projectData?.projectType || 'project',
        status: finalStatus,
        budget: budgetInfo,
        budgetRange: budgetRangeText,
        timeline: projectData?.timeline,
        startDate: projectData?.startDate,
        endDate: projectData?.endDate,
        location: projectData?.location,
        postalCode: projectData?.postalCode,
        urgency: projectData?.urgency,
        estimatedDuration: projectData?.estimatedDuration,
        preferredStartDate: projectData?.preferredStartDate,
        additionalNotes: projectData?.additionalNotes,
        // Additional project details
        isRemote: projectData?.isRemote || false,
        requiredSkills: projectData?.requiredSkills || [],
        subcategoryData: projectData?.subcategoryData || null,
        // Rich service details for display
        serviceDetails: {
          guestCount: projectData?.subcategoryData?.guestCount,
          duration: projectData?.subcategoryData?.duration,
          cuisine: projectData?.subcategoryData?.cuisine,
          accommodation: projectData?.subcategoryData?.accommodation,
          kitchenEquipment: projectData?.subcategoryData?.kitchenEquipment,
          serviceType: projectData?.subcategoryData?.serviceType,
          eventType: projectData?.subcategoryData?.eventType,
          timeframe: projectData?.subcategoryData?.timeframe,
          dietaryRestrictions: projectData?.subcategoryData?.dietaryRestrictions || [],
          cuisineType: projectData?.subcategoryData?.cuisineType || [],
        },
        customer: customerInfo || {
          name: projectData?.customerName || 'Unbekannter Kunde',
          type: projectData?.customerType || 'user',
          email: projectData?.customerEmail || null,
          phone: null,
          avatar: null,
          uid: projectData?.customerUid,
        },
        createdAt: projectData?.createdAt?.toDate?.() || new Date(projectData?.createdAt),
        proposals: projectData?.proposals || [],
        companyProposal: companyProposal,
        hasResponse: !!companyProposal,
        customerUid: projectData?.customerUid,
        customerCompanyUid: projectData?.customerCompanyUid,
      },
    });
  } catch (error) {
    console.error('Error fetching quote details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;

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
      console.error('Error verifying token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, message, proposal } = body;

    if (!action || !['accept', 'decline', 'submit_proposal'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the project request document
    const projectRef = db.collection('project_requests').doc(quoteId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectData = projectDoc.data();

    if (action === 'submit_proposal') {
      // Submit a new proposal for this project
      if (!proposal) {
        return NextResponse.json({ error: 'Proposal data required' }, { status: 400 });
      }

      // Get company information
      const companyDoc = await db.collection('users').doc(uid).get();
      const companyData = companyDoc.exists ? companyDoc.data() : {};

      const newProposal = {
        companyUid: uid,
        companyName: companyData?.companyName || 'Unbekanntes Unternehmen',
        companyLogo: companyData?.logo || null,
        ...proposal,
        submittedAt: new Date(),
        status: 'pending',
      };

      // Add proposal to the project
      const currentProposals = projectData?.proposals || [];
      const existingProposalIndex = currentProposals.findIndex(p => p.companyUid === uid);

      if (existingProposalIndex >= 0) {
        // Update existing proposal
        currentProposals[existingProposalIndex] = newProposal;
      } else {
        // Add new proposal
        currentProposals.push(newProposal);
      }

      await projectRef.update({
        proposals: currentProposals,
        lastUpdated: new Date(),
      });

      // Send Bell-Notification to customer about new proposal
      try {
        if (projectData) {
          await ProjectNotificationService.createNewProposalNotification(
            quoteId, // projectId
            projectData.customerUid, // customerUid
            uid, // companyUid
            {
              customerName: projectData.customerName || 'Kunde',
              companyName: companyData?.companyName || 'Unbekanntes Unternehmen',
              subcategory: projectData.subcategory || projectData.title || 'Projekt',
              proposedPrice: proposal.estimatedPrice,
              proposedTimeline: proposal.timeline,
              message: proposal.message,
            }
          );
        }
        console.log(`✅ Bell-Notification gesendet für neues Angebot: Projekt ${quoteId}`);
      } catch (notificationError) {
        console.error('❌ Fehler beim Senden der Bell-Notification:', notificationError);
        // Angebot trotzdem erfolgreich, auch wenn Notification fehlschlägt
      }

      return NextResponse.json({
        success: true,
        message: 'Proposal submitted successfully',
        proposal: newProposal,
      });
    }

    // Handle accept/decline actions (for when customer decides on proposals)
    if (action === 'accept' || action === 'decline') {
      // This would be used when the customer accepts/declines a proposal
      // For now, just return success
      return NextResponse.json({
        success: true,
        message: `Action ${action} recorded`,
      });
    }
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
