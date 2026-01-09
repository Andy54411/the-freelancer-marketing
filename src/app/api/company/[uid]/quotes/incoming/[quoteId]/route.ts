import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> },
  _companyId: string
) {
  const { uid, quoteId } = await params;
  try {
    if (!db || !auth) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    // Inhaber ODER Mitarbeiter dieser Company dürfen zugreifen
    const isOwner = decodedToken.uid === uid;
    const isEmployee = decodedToken.role === 'mitarbeiter' && decodedToken.companyId === uid;
    
    if (!isOwner && !isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try to get the quote from quotes collection
    const quoteDoc = await db
      .collection('companies')
      .doc(uid)
      .collection('quotes')
      .doc(quoteId)
      .get();

    if (quoteDoc.exists) {
      const quoteData = quoteDoc.data();
      // Verify this quote belongs to this provider
      if (quoteData?.providerId !== uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const projectData = quoteDoc.data();

    // Get customer information based on customerUid
    let customerInfo: any = null;

    if (projectData?.customerUid) {
      try {
        // First try to get from users collection
        const userDoc = await db!.collection('users').doc(projectData.customerUid).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData) {
            // Use customerType from quote data directly
            const customerType = projectData.customerType || 'user';

            customerInfo = {
              name:
                userData.companyName ||
                userData.firstName + ' ' + userData.lastName ||
                projectData.customerName ||
                'Unbekannter Kunde',
              type: customerType,
              email: userData.email,
              phone: userData.phone,
              avatar:
                userData.step3?.profilePictureURL ||
                userData.avatar ||
                userData.profilePictureURL ||
                null,
              uid: userDoc.id,
            };
          }
        }
      } catch {}
    }

    // If no customerUid or customer not found, use the basic info from quote data
    if (!customerInfo) {
      customerInfo = {
        name: projectData?.customerName || 'Unbekannter Kunde',
        type: projectData?.customerType || 'user', // Use customerType from quote data
        email: projectData?.customerEmail || '',
        phone: projectData?.customerPhone || '',
        avatar: null,
        uid: projectData?.customerUid || null,
      };
    }

    // Debug: Log customer info to see what type is being set

    // Handle different collection structures
    let finalStatus = 'pending';
    let hasResponse = false;
    let responseData: any = null;

    // Check subcollection for proposals first (new structure)
    try {
      const subcollectionSnapshot = await db
        .collection('companies')
        .doc(uid)
        .collection('quotes')
        .doc(quoteId)
        .collection('proposals')
        .where('providerId', '==', uid)
        .get();

      if (!subcollectionSnapshot.empty) {
        hasResponse = true;
        responseData = subcollectionSnapshot.docs[0].data();
        finalStatus = 'responded';
      } else {
      }
    } catch {}

    // Fallback: Check main proposals collection (old structure)
    if (!hasResponse) {
      try {
        const proposalsSnapshot = await db
          .collection('proposals')
          .where('quoteId', '==', quoteId)
          .where('providerId', '==', uid)
          .get();

        if (!proposalsSnapshot.empty) {
          hasResponse = true;
          responseData = proposalsSnapshot.docs[0].data();
          finalStatus = 'responded';
        }
      } catch {}
    }

    // Use actual status from quote if available
    finalStatus = projectData?.status || finalStatus;

    // Build budget information
    let budgetInfo: any = null;
    let budgetRangeText = 'Nicht angegeben';

    // Use budgetRange field from quotes collection
    budgetRangeText = projectData?.budgetRange || 'Nicht angegeben';
    if (projectData?.budgetRange) {
      budgetInfo = { budgetRange: projectData.budgetRange };
    }

    // Build the quote object
    const quote = {
      id: quoteId,
      title: projectData?.projectTitle || projectData?.title || 'Kein Titel',
      description: projectData?.projectDescription || projectData?.description || '',
      serviceCategory: projectData?.projectCategory || projectData?.serviceCategory || '',
      serviceSubcategory: projectData?.projectSubcategory || projectData?.serviceSubcategory || '',
      projectType: projectData?.projectType || 'fixed_price',
      status: finalStatus,
      budget: budgetInfo,
      budgetRange: budgetRangeText,
      timeline: projectData?.timeline,
      startDate: projectData?.startDate,
      endDate: projectData?.endDate,
      deadline: projectData?.preferredStartDate || projectData?.deadline,
      location: projectData?.location,
      postalCode: projectData?.postalCode,
      urgency: projectData?.urgency || 'normal',
      estimatedDuration: projectData?.estimatedDuration,
      preferredStartDate: projectData?.preferredStartDate,
      additionalNotes: projectData?.additionalNotes,
      customer: customerInfo,
      createdAt:
        projectData?.createdAt?.toDate?.() || new Date(projectData?.createdAt || Date.now()),
      hasResponse: hasResponse,
      response: responseData,
      customerUid: projectData?.customerUid,
      customerCompanyUid: projectData?.customerCompanyUid,
      platform: projectData?.platform || 'taskilo',
      source: projectData?.source || 'website',
      updatedAt:
        projectData?.updatedAt?.toDate?.() || new Date(projectData?.updatedAt || Date.now()),
    };

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
