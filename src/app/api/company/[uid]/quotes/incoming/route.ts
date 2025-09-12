import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/firebase/server';

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
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get company data to verify it exists and get additional info - Try companies collection first
    let companyDoc = await db.collection('companies').doc(uid).get();
    if (!companyDoc.exists) {
      // Fallback to users collection
      companyDoc = await db.collection('users').doc(uid).get();
      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    const _companyData = companyDoc.data();

    // Get company's service subcategory to filter relevant projects - Try companies collection first
    let companyUserDoc = await db.collection('companies').doc(uid).get();
    if (!companyUserDoc.exists) {
      // Fallback to users collection
      companyUserDoc = await db.collection('users').doc(uid).get();
      if (!companyUserDoc.exists) {
        return NextResponse.json({ error: 'Company user data not found' }, { status: 404 });
      }
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

    // Query for incoming quotes - Optimized to only get quotes for this provider
    let quotesSnapshot;
    try {
      // Get only quotes for this specific provider to improve performance
      quotesSnapshot = await db.collection('quotes').where('providerId', '==', uid).get();
    } catch (error) {
      console.error('Error fetching quotes:', error);
      // Fallback: Get all quotes if the filtered query fails
      quotesSnapshot = await db.collection('quotes').get();
    }

    const quotes: Record<string, unknown>[] = [];

    for (const doc of quotesSnapshot.docs) {
      const quoteData = doc.data();

      // Skip if not for this provider (in case of fallback query)
      if (quoteData.providerId !== uid) {
        continue;
      }

      // Get customer information
      let customerInfo: Record<string, unknown> | null = null;

      // If we have customerUid, get full customer data
      if (quoteData.customerUid) {
        try {
          // First try to get from users collection
          const userDoc = await db.collection('users').doc(quoteData.customerUid).get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData) {
              // Use customerType from quote data directly
              const customerType = quoteData.customerType || 'user';

              customerInfo = {
                name:
                  userData.companyName ||
                  userData.firstName + ' ' + userData.lastName ||
                  quoteData.customerName ||
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
        } catch (error) {
          console.error('Error fetching customer info:', error);
        }
      }

      // If no customerUid or customer not found, try to find customer by email
      if (!customerInfo && quoteData.customerEmail) {
        try {
          const usersSnapshot = await db
            .collection('users')
            .where('email', '==', quoteData.customerEmail)
            .get();

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();

            if (userData) {
              // Use customerType from quote data directly
              const customerType = quoteData.customerType || 'user';

              customerInfo = {
                name:
                  userData.companyName ||
                  userData.firstName + ' ' + userData.lastName ||
                  quoteData.customerName ||
                  'Unbekannter Kunde',
                type: customerType,
                email: userData.email,
                phone: userData.phone || quoteData.customerPhone,
                avatar:
                  userData.step3?.profilePictureURL ||
                  userData.avatar ||
                  userData.profilePictureURL ||
                  null,
                uid: userDoc.id,
              };
            }
          }
        } catch (error) {
          console.error('Error fetching customer by email:', error);
        }
      }

      // If no customerUid or customer not found, use the basic info from quote
      if (!customerInfo) {
        customerInfo = {
          name: quoteData.customerName || 'Unbekannter Kunde',
          type: quoteData.customerType || 'user', // Use customerType from quote data
          email: quoteData.customerEmail || '',
          phone: quoteData.customerPhone || '',
          avatar: null,
          uid: quoteData.customerUid || null,
        };
      }

      // Check if this company has already submitted a response/proposal
      let hasResponse = false;
      let responseData: Record<string, unknown> | null = null;
      let proposalStatus: string | null = null;

      try {
        // First check subcollection proposals (new format)
        const proposalsSnapshot = await db
          .collection('quotes')
          .doc(doc.id)
          .collection('proposals')
          .where('providerId', '==', uid)
          .get();

        if (!proposalsSnapshot.empty) {
          hasResponse = true;
          responseData = proposalsSnapshot.docs[0].data();
          proposalStatus = (responseData as { status?: string })?.status || null; // Get proposal status
        } else {
          // Fallback: Check old proposals collection
          const oldProposalsSnapshot = await db
            .collection('proposals')
            .where('quoteId', '==', doc.id)
            .where('providerId', '==', uid)
            .get();

          if (!oldProposalsSnapshot.empty) {
            hasResponse = true;
            responseData = oldProposalsSnapshot.docs[0].data();
            proposalStatus = (responseData as { status?: string })?.status || null;
          }
        }
      } catch (error) {
        console.error('Error checking proposals:', error);
      }

      // Determine actual status based on proposal status and payment
      let actualStatus = quoteData.status || 'pending';

      // Priority 1: Use proposal status if available
      if (proposalStatus) {
        if (proposalStatus === 'accepted') {
          // Check if payment is complete
          if (quoteData.payment?.status === 'paid') {
            actualStatus = 'accepted';
          } else {
            actualStatus = 'accepted'; // Still show as accepted even if payment pending
          }
        } else if (proposalStatus === 'declined' || proposalStatus === 'rejected') {
          actualStatus = 'declined';
        } else if (proposalStatus === 'pending' && hasResponse) {
          actualStatus = 'responded';
        }
      } else if (hasResponse && actualStatus === 'pending') {
        actualStatus = 'responded';
      }

      // Build the quote object
      const quote = {
        id: doc.id,
        title: quoteData.projectTitle || quoteData.title || 'Kein Titel',
        description: quoteData.projectDescription || quoteData.description || '',
        serviceCategory: quoteData.projectCategory || quoteData.serviceCategory || '',
        serviceSubcategory: quoteData.projectSubcategory || quoteData.serviceSubcategory || '',
        projectType: 'fixed_price', // Default for quotes
        status: actualStatus,
        budgetRange: quoteData.budgetRange || 'Nicht angegeben',
        deadline: quoteData.preferredStartDate || quoteData.deadline,
        location: quoteData.location || '',
        urgency: quoteData.urgency || 'normal',
        estimatedDuration: quoteData.estimatedDuration || '',
        hasResponse: hasResponse,
        response: responseData,
        payment: quoteData.payment || null, // Include payment info
        proposalStatus: proposalStatus, // Include proposal status
        customer: customerInfo,
        customerType: customerInfo.type,
        customerUid: customerInfo.uid,
        createdAt: quoteData.createdAt?.toDate
          ? quoteData.createdAt.toDate()
          : new Date(quoteData.createdAt || Date.now()),
      };

      quotes.push(quote);
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
