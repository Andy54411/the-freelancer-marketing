import { NextRequest, NextResponse } from 'next/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';

// Dynamic Firebase imports to prevent build-time issues
let db: any;
let admin: any;

async function getFirebaseServices() {
  if (!db || !admin) {
    try {
      // Try existing server config first
      try {
        const firebaseServer = await import('@/firebase/server');
        db = firebaseServer.db;
        admin = firebaseServer.admin;
        if (db && admin) {
          return { db, admin };
        }
      } catch (importError) {}

      // Fallback to direct initialization
      const firebaseAdmin = await import('firebase-admin');

      // Check if app is already initialized
      let app;
      try {
        app = firebaseAdmin.app();
      } catch (appError) {
        if (
          process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_PRIVATE_KEY &&
          process.env.FIREBASE_CLIENT_EMAIL
        ) {
          app = firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
          });
        } else if (process.env.FIREBASE_PROJECT_ID) {
          app = firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
        } else {
          throw new Error('No Firebase configuration found');
        }
      }

      db = firebaseAdmin.firestore(app);
      admin = firebaseAdmin;
    } catch (error) {
      throw error;
    }
  }
  return { db, admin };
}

/**
 * API Route für Company Received Quote Details
 * GET /api/company/[uid]/quotes/received/[quoteId]
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

    // Get Firebase services with robust error handling
    const { db, admin: firebaseAdmin } = await getFirebaseServices();

    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    } catch (authError) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    // Check if user is authorized to access this company's data

    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Get company data

    // Try companies collection first (for B2B), then users as fallback (for B2C)

    let companyDoc = await db.collection('companies').doc(uid).get();
    if (!companyDoc.exists) {
      companyDoc = await db.collection('users').doc(uid).get();
      if (!companyDoc.exists) {
        return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
      } else {
      }
    } else {
    }

    const companyData = companyDoc.data();
    const customerEmail = companyData?.email;

    if (!customerEmail) {
      return NextResponse.json({ error: 'Keine E-Mail für Unternehmen gefunden' }, { status: 400 });
    }

    // Get the specific quote where this company is the customer

    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Verify this company is the customer for this quote
    if (quoteData?.customerEmail !== customerEmail && quoteData?.customerUid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Angebot' }, { status: 403 });
    }

    // Get provider information (who sent the quote)
    let providerInfo: {
      name: string;
      type: 'company' | 'user';
      email: string;
      avatar: string | null;
      uid: string;
    } | null = null;

    if (quoteData?.providerId) {
      // Try companies collection first, then users as fallback
      const companyDoc = await db.collection('companies').doc(quoteData.providerId).get();
      if (companyDoc.exists) {
        const providerCompanyData = companyDoc.data();
        providerInfo = {
          name: providerCompanyData?.companyName || 'Unbekanntes Unternehmen',
          type: 'company',
          email: providerCompanyData?.ownerEmail || providerCompanyData?.email || '',
          avatar:
            providerCompanyData?.profilePictureURL || providerCompanyData?.companyLogo || null,
          uid: quoteData.providerId,
        };
      } else {
        // Fallback to users collection
        const userDoc = await db.collection('users').doc(quoteData.providerId).get();
        if (userDoc.exists) {
          const providerUserData = userDoc.data();
          providerInfo = {
            name:
              providerUserData?.companyName ||
              (providerUserData?.firstName && providerUserData?.lastName
                ? `${providerUserData.firstName} ${providerUserData.lastName}`
                : 'Unbekannter Anbieter'),
            type: 'user',
            email: providerUserData?.email || '',
            avatar: providerUserData?.profilePictureURL || providerUserData?.avatar || null,
            uid: quoteData.providerId,
          };
        }
      }
    }

    // Check for proposals/responses in subcollection
    let hasResponse = false;
    let responseData: any = null;
    let proposalsData: any[] = [];
    let responseDate: Date | null = null;

    try {
      // Check subcollection for proposals (new structure)
      const proposalsSnapshot = await db
        .collection('quotes')
        .doc(quoteId)
        .collection('proposals')
        .get();

      if (!proposalsSnapshot.empty) {
        // Collect all proposals
        proposalsData = proposalsSnapshot.docs.map(proposalDoc => {
          const proposalData = proposalDoc.data();
          return {
            id: proposalDoc.id,
            providerId: proposalData.providerId || proposalData.companyUid,
            message: proposalData.message,
            totalAmount: proposalData.totalAmount,
            currency: proposalData.currency || 'EUR',
            timeline: proposalData.timeline,
            status: proposalData.status,
            submittedAt: proposalData.submittedAt,
            serviceItems: proposalData.serviceItems || [],
            createdAt: proposalData.submittedAt ? new Date(proposalData.submittedAt) : null,
            // Contact exchange data
            contactsExchanged: proposalData.contactsExchanged,
            paymentComplete: proposalData.paymentComplete,
            customerContact: proposalData.customerContact,
            providerContact: proposalData.providerContact,
            contactExchangeAt: proposalData.contactExchangeAt,
            acceptedAt: proposalData.acceptedAt,
          };
        });

        // Use the first proposal for legacy compatibility
        const firstProposal = proposalsData[0];
        hasResponse = true;
        responseData = firstProposal;
        responseDate = firstProposal.createdAt;
      } else {
      }
    } catch (error) {}

    // Fallback: Check old response structure in quote document
    if (!hasResponse && quoteData?.response) {
      hasResponse = true;
      responseData = quoteData.response;
      responseDate = quoteData.response?.respondedAt
        ? new Date(quoteData.response.respondedAt)
        : null;
    }

    // Build the quote response object
    const quote = {
      id: quoteDoc.id,
      title: quoteData?.projectTitle || quoteData?.title || 'Kein Titel',
      description: quoteData?.projectDescription || quoteData?.description || '',
      category: quoteData?.projectCategory || quoteData?.serviceCategory || '',
      subcategory: quoteData?.projectSubcategory || quoteData?.serviceSubcategory || '',
      status: quoteData?.status || 'pending',
      budget: quoteData?.budgetRange || 'Nicht angegeben',
      budgetRange: quoteData?.budgetRange || 'Nicht angegeben',
      location: quoteData?.location || '',
      postalCode: quoteData?.postalCode || '',
      urgency: quoteData?.urgency || 'normal',
      estimatedDuration: quoteData?.estimatedDuration || '',
      preferredStartDate: quoteData?.preferredStartDate || '',
      additionalNotes: quoteData?.additionalNotes || '',
      provider: providerInfo,
      hasResponse: hasResponse,
      hasProposals: proposalsData.length > 0,
      proposals: proposalsData,
      response: responseData,
      responseDate: responseDate,
      createdAt: quoteData?.createdAt?.toDate
        ? quoteData.createdAt.toDate()
        : new Date(quoteData?.createdAt || Date.now()),
      // Contact exchange data from first proposal if available
      contactExchange:
        responseData && responseData.contactsExchanged
          ? {
              status: 'completed',
              completedAt:
                responseData.contactExchangeAt ||
                responseData.acceptedAt ||
                new Date().toISOString(),
              contactsExchanged: responseData.contactsExchanged,
              customerContact: responseData.customerContact,
              providerContact: responseData.providerContact,
            }
          : null,
    };

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Laden des Angebots' }, { status: 500 });
  }
}

/**
 * API Route für Quote Actions (Accept/Decline)
 * POST /api/company/[uid]/quotes/received/[quoteId]
 */
export async function POST(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Get the quote document - first try quotes collection, then requests collection
    let quoteDoc = await db.collection('quotes').doc(quoteId).get();
    let quoteData: any = null;
    let isFromRequestsCollection = false;

    if (quoteDoc.exists) {
      quoteData = quoteDoc.data();
    } else {
      // Try requests collection as fallback

      quoteDoc = await db.collection('requests').doc(quoteId).get();
      if (quoteDoc.exists) {
        quoteData = quoteDoc.data();
        isFromRequestsCollection = true;
      } else {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }
    }

    if (action === 'accept') {
      // Find the accepted proposal
      let proposalId: string | null = null;
      let proposalData: any = null;

      try {
        const proposalsSnapshot = await db
          .collection('quotes')
          .doc(quoteId)
          .collection('proposals')
          .get();

        if (!proposalsSnapshot.empty) {
          // Use the first proposal (in a real app, you might want to specify which proposal to accept)
          const firstProposal = proposalsSnapshot.docs[0];
          proposalId = firstProposal.id;
          proposalData = firstProposal.data();
        } else {
          proposalData = quoteData?.response;
        }
      } catch (error) {
        proposalData = quoteData?.response;
      }

      if (!proposalData) {
        return NextResponse.json(
          { error: 'Kein Angebot gefunden zum Akzeptieren' },
          { status: 400 }
        );
      }

      // Get customer information from both collections
      const companyId = uid; // The requesting company
      const providerId = quoteData?.providerId || proposalData?.providerId;

      if (!providerId) {
        return NextResponse.json(
          { error: 'Provider-Informationen nicht gefunden' },
          { status: 400 }
        );
      }

      // Get customer data - check both collections
      let customerData: any = null;
      let customerDoc = await db.collection('companies').doc(companyId).get();

      if (customerDoc.exists) {
        customerData = customerDoc.data();
      } else {
        customerDoc = await db.collection('users').doc(companyId).get();
        if (customerDoc.exists) {
          customerData = customerDoc.data();
        } else {
          return NextResponse.json(
            { error: 'Kunden-Informationen nicht gefunden' },
            { status: 400 }
          );
        }
      }

      // Get provider data - check both collections
      let providerData: any = null;
      let providerDoc = await db.collection('companies').doc(providerId).get();

      if (providerDoc.exists) {
        providerData = providerDoc.data();
      } else {
        providerDoc = await db.collection('users').doc(providerId).get();
        if (providerDoc.exists) {
          providerData = providerDoc.data();
        } else {
          return NextResponse.json(
            { error: 'Anbieter-Informationen nicht gefunden' },
            { status: 400 }
          );
        }
      }

      // Update quote with contact exchange information

      const updateData = {
        customerDecision: {
          action: 'accept',
          decidedAt: admin.firestore.FieldValue.serverTimestamp(),
          decidedBy: companyId,
          customerUid: companyId,
          customerName:
            customerData?.companyName ||
            (customerData?.firstName && customerData?.lastName
              ? `${customerData.firstName} ${customerData.lastName}`
              : customerData?.name || 'Kunde'),
          customerEmail: customerData?.ownerEmail || customerData?.email || '',
          customerPhone: customerData?.ownerPhone || customerData?.phone || '',
          customerType: customerDoc.ref.parent.id === 'companies' ? 'company' : 'individual',
          provider: {
            uid: providerId,
            name: providerData?.companyName
              ? providerData.companyName
              : providerData?.firstName && providerData?.lastName
                ? `${providerData.firstName} ${providerData.lastName}`
                : providerData?.name || 'Anbieter',
            email: providerData?.email || providerData?.ownerEmail || '',
            phone: providerData?.phone || providerData?.ownerPhone || '',
            type: providerDoc.ref.parent.id === 'companies' ? 'company' : 'individual',
          },
        },
        status: 'contacts_exchanged',
      };

      await quoteDoc.ref.update(updateData);

      // Send notification to provider about the acceptance
      try {
      } catch (notificationError) {}

      return NextResponse.json({
        success: true,
        message:
          'Angebot angenommen. Der Anbieter wurde benachrichtigt und bearbeitet Ihre Anfrage.',
        status: 'contacts_exchanged',
        customerDecision: updateData.customerDecision,
      });
    } else if (action === 'decline') {
      // Update quote status to declined
      await quoteDoc.ref.update({
        status: 'declined',
        customerDecision: {
          action: 'decline',
          decidedAt: admin.firestore.FieldValue.serverTimestamp(),
          decidedBy: uid,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: 'Angebot abgelehnt.',
        status: 'declined',
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
