import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Direct Firebase initialization using environment variables (like getSingleOrder API)
async function initializeFirebase() {
  console.log('Initializing Firebase for quotes/incoming/[quoteId] API - NO JSON FILES...');

  // If already initialized, return existing instances
  if (admin.apps.length > 0) {
    console.log('Using existing Firebase app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');
    return {
      auth: getAuth(),
      db: getFirestore(),
      admin,
    };
  }

  // Initialize with individual environment variables
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error('Missing Firebase configuration environment variables');
  }

  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      clientEmail,
    }),
    projectId,
    storageBucket: 'tilvo-f142f.firebasestorage.app',
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });

  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');

  console.log('Firebase services initialized successfully for quotes/incoming/[quoteId] API');

  return {
    auth: getAuth(),
    db: getFirestore(),
    admin,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;
  try {
    // Initialize Firebase services dynamically
    const { admin, db } = await initializeFirebase();

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

    // Try to get the quote from quotes collection
    const quoteDoc = await db.collection('quotes').doc(quoteId).get();

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
        const userDoc = await db.collection('users').doc(projectData.customerUid).get();

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
      } catch (error) {
        console.error('Error fetching customer info:', error);
      }
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
    console.log('🔍 Customer Info Debug:', {
      quoteId,
      customerType: projectData?.customerType,
      customerInfoType: customerInfo.type,
      isB2B: projectData?.isB2B,
    });

    // Handle different collection structures
    let finalStatus = 'pending';
    let hasResponse = false;
    let responseData: any = null;

    // Check subcollection for proposals first (new structure)
    try {
      const subcollectionSnapshot = await db
        .collection('quotes')
        .doc(quoteId)
        .collection('proposals')
        .where('providerId', '==', uid)
        .get();

      if (!subcollectionSnapshot.empty) {
        hasResponse = true;
        responseData = subcollectionSnapshot.docs[0].data();
        finalStatus = 'responded';
        console.log('✅ Found proposal in subcollection:', responseData);
      } else {
        console.log('❌ No proposal found in subcollection for provider:', uid);
      }
    } catch (error) {
      console.error('Error checking subcollection proposals:', error);
    }

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
          console.log('✅ Found proposal in main collection:', responseData);
        }
      } catch (error) {
        console.error('Error checking main proposals collection:', error);
      }
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
    console.error('Error in quote detail API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
