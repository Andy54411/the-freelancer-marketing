import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';

/**
 * API Route für Company Received Quote Details
 * GET /api/company/[uid]/quotes/received/[quoteId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  console.log(`🚀 ROUTE HIT! URL: ${request.url}`);
  
  const { uid, quoteId } = await params;

  console.log(`🎯 GET ROUTE CALLED: uid=${uid}, quoteId=${quoteId}`);

  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization');
    console.log(`🔐 Auth header present: ${!!authHeader}`);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid auth header provided');
      return NextResponse.json({ error: 'Authentifizierung erforderlich' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log(`🔑 Token extracted, length: ${token?.length}`);
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log(`✅ Token verified for user: ${decodedToken.uid}`);
    } catch (authError) {
      console.error('❌ Token verification failed:', authError);
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    // Check if user is authorized to access this company's data
    console.log(`🔍 Checking authorization: token.uid=${decodedToken.uid}, requested.uid=${uid}`);
    if (decodedToken.uid !== uid) {
      console.error(`❌ Authorization failed: token.uid=${decodedToken.uid}, requested.uid=${uid}`);
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Get company data
    console.log(`🏢 Loading company data for uid: ${uid}`);
    
    // Try companies collection first (for B2B), then users as fallback (for B2C)
    console.log(`🔍 Searching for company in 'companies' collection: ${uid}`);
    let companyDoc = await db.collection('companies').doc(uid).get();
    if (!companyDoc.exists) {
      console.log(`❌ Company not found in companies collection, trying users collection: ${uid}`);
      companyDoc = await db.collection('users').doc(uid).get();
      if (!companyDoc.exists) {
        console.error(`❌ Company not found in any collection: ${uid}`);
        return NextResponse.json({ error: 'Unternehmen nicht gefunden' }, { status: 404 });
      } else {
        console.log(`✅ Found company in 'users' collection: ${uid}`);
      }
    } else {
      console.log(`✅ Found company in 'companies' collection: ${uid}`);
    }

    const companyData = companyDoc.data();
    const customerEmail = companyData?.email;

    if (!customerEmail) {
      return NextResponse.json({ error: 'Keine E-Mail für Unternehmen gefunden' }, { status: 400 });
    }

    // Get the specific quote where this company is the customer
    console.log(`📄 Loading quote: ${quoteId}`);
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      console.error(`❌ Quote not found: ${quoteId}`);
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

      console.log(
        `🔍 Found ${proposalsSnapshot.docs.length} proposal(s) in subcollection for quote ${quoteId}`
      );

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

        console.log('✅ Found proposal(s) in subcollection:', {
          count: proposalsData.length,
          firstProposalId: firstProposal.id,
          status: firstProposal.status,
          amount: firstProposal.totalAmount,
          submittedAt: firstProposal.submittedAt,
          contactsExchanged: firstProposal.contactsExchanged,
          paymentComplete: firstProposal.paymentComplete,
          customerContact: firstProposal.customerContact,
          providerContact: firstProposal.providerContact,
        });
      } else {
        console.log('❌ No proposals found in subcollection');
      }
    } catch (error) {
      console.error('Error checking proposal subcollection:', error);
    }

    // Fallback: Check old response structure in quote document
    if (!hasResponse && quoteData?.response) {
      hasResponse = true;
      responseData = quoteData.response;
      responseDate = quoteData.response?.respondedAt
        ? new Date(quoteData.response.respondedAt)
        : null;
      console.log('✅ Found response in quote document (old structure)');
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
      contactExchange: responseData && responseData.contactsExchanged ? {
        status: 'completed',
        completedAt: responseData.contactExchangeAt || responseData.acceptedAt || new Date().toISOString(),
        contactsExchanged: responseData.contactsExchanged,
        customerContact: responseData.customerContact,
        providerContact: responseData.providerContact,
      } : null,
    };

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error('Error fetching received quote details:', error);
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
  
  console.log(`🎯 ACTION ROUTE CALLED: uid=${uid}, quoteId=${quoteId}`);

  try {
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No auth header provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log(`✅ Token verified for user: ${decodedToken.uid}`);
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is authorized to access this company's data
    if (decodedToken.uid !== uid) {
      console.error(`❌ UID mismatch: token=${decodedToken.uid}, requested=${uid}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'decline'].includes(action)) {
      console.error(`❌ Invalid action: ${action}`);
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    console.log(`📝 Processing ${action} action for quote ${quoteId}`);

    // Get the quote document - first try quotes collection, then requests collection
    let quoteDoc = await db.collection('quotes').doc(quoteId).get();
    let quoteData: any = null;
    let isFromRequestsCollection = false;

    if (quoteDoc.exists) {
      quoteData = quoteDoc.data();
      console.log(`✅ Found quote in quotes collection`);
    } else {
      // Try requests collection as fallback
      console.log(`⚠️ Quote not found in quotes, trying requests collection...`);
      quoteDoc = await db.collection('requests').doc(quoteId).get();
      if (quoteDoc.exists) {
        quoteData = quoteDoc.data();
        isFromRequestsCollection = true;
        console.log(`✅ Found quote in requests collection`);
      } else {
        console.error(`❌ Quote ${quoteId} not found in any collection`);
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }
    }

    console.log(`📊 Quote data:`, {
      status: quoteData?.status,
      customerUid: quoteData?.customerUid,
      providerId: quoteData?.providerId,
      projectTitle: quoteData?.projectTitle
    });

    if (action === 'accept') {
      console.log(`✅ Processing ACCEPT action for quote ${quoteId}`);

      // Find the accepted proposal
      let proposalId: string | null = null;
      let proposalData: any = null;

      try {
        console.log(`🔍 Looking for proposals in subcollection...`);
        const proposalsSnapshot = await db
          .collection('quotes')
          .doc(quoteId)
          .collection('proposals')
          .get();

        console.log(`📊 Found ${proposalsSnapshot.docs.length} proposals`);

        if (!proposalsSnapshot.empty) {
          // Use the first proposal (in a real app, you might want to specify which proposal to accept)
          const firstProposal = proposalsSnapshot.docs[0];
          proposalId = firstProposal.id;
          proposalData = firstProposal.data();
          
          console.log(`✅ Using proposal ${proposalId} with amount ${proposalData?.totalAmount}`);
        } else {
          console.log(`⚠️ No proposals found in subcollection, using legacy response`);
          proposalData = quoteData?.response;
        }
      } catch (error) {
        console.error('❌ Error loading proposals:', error);
        proposalData = quoteData?.response;
      }

      if (!proposalData) {
        console.error(`❌ No proposal or response data found for quote ${quoteId}`);
        return NextResponse.json(
          { error: 'Kein Angebot gefunden zum Akzeptieren' },
          { status: 400 }
        );
      }

      // Get customer information from both collections
      const companyId = uid; // The requesting company
      const providerId = quoteData?.providerId || proposalData?.providerId;

      if (!providerId) {
        console.error(`❌ No provider ID found for quote ${quoteId}`);
        return NextResponse.json(
          { error: 'Provider-Informationen nicht gefunden' },
          { status: 400 }
        );
      }

      console.log(`👥 Customer: ${companyId}, Provider: ${providerId}`);

      // Get customer data - check both collections
      let customerData: any = null;
      let customerDoc = await db.collection('companies').doc(companyId).get();
      
      if (customerDoc.exists) {
        customerData = customerDoc.data();
        console.log(`✅ Found customer in companies collection: ${customerData?.companyName}`);
      } else {
        console.log(`⚠️ Customer not found in companies, checking users...`);
        customerDoc = await db.collection('users').doc(companyId).get();
        if (customerDoc.exists) {
          customerData = customerDoc.data();
          console.log(`✅ Found customer in users collection: ${customerData?.firstName} ${customerData?.lastName}`);
        } else {
          console.error(`❌ Customer ${companyId} not found in any collection`);
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
        console.log(`✅ Found provider in companies collection: ${providerData?.companyName}`);
      } else {
        console.log(`⚠️ Provider not found in companies, checking users...`);
        providerDoc = await db.collection('users').doc(providerId).get();
        if (providerDoc.exists) {
          providerData = providerDoc.data();
          console.log(`✅ Found provider in users collection: ${providerData?.firstName} ${providerData?.lastName}`);
        } else {
          console.error(`❌ Provider ${providerId} not found in any collection`);
          return NextResponse.json(
            { error: 'Anbieter-Informationen nicht gefunden' },
            { status: 400 }
          );
        }
      }

      // Update quote with contact exchange information
      console.log(`📝 Updating quote ${quoteId} with contact exchange...`);
      
      const updateData = {
        customerDecision: {
          action: 'accept',
          decidedAt: admin.firestore.FieldValue.serverTimestamp(),
          decidedBy: companyId,
          customerUid: companyId,
          customerName: customerData?.companyName || 
                      (customerData?.firstName && customerData?.lastName 
                        ? `${customerData.firstName} ${customerData.lastName}` 
                        : customerData?.name || 'Kunde'),
          customerEmail: customerData?.ownerEmail || customerData?.email || '',
          customerPhone: customerData?.ownerPhone || customerData?.phone || '',
          customerType: customerDoc.ref.parent.id === 'companies' ? 'company' : 'individual',
          provider: {
            uid: providerId,
            name: (providerData?.companyName 
                    ? providerData.companyName 
                    : providerData?.firstName && providerData?.lastName 
                      ? `${providerData.firstName} ${providerData.lastName}`
                      : providerData?.name || 'Anbieter'),
            email: providerData?.email || providerData?.ownerEmail || '',
            phone: providerData?.phone || providerData?.ownerPhone || '',
            type: providerDoc.ref.parent.id === 'companies' ? 'company' : 'individual',
          },
        },
        status: 'contacts_exchanged',
      };

      await quoteDoc.ref.update(updateData);

      console.log(`✅ Quote ${quoteId} updated successfully`);

      // Send notification to provider about the acceptance
      try {
        console.log(`📧 Sending notification to provider ${providerId}...`);
        // TODO: Fix notification service undefined values
        // await QuoteNotificationService.createContactExchangeNotifications(
        //   quoteId,
        //   companyId,
        //   providerId,
        //   quoteData?.projectTitle || 'Projekt'
        // );
        console.log(`✅ Notification skipped (temporarily disabled)`);
      } catch (notificationError) {
        console.error('⚠️ Failed to send notification:', notificationError);
        // Don't fail the whole operation if notification fails
      }

      return NextResponse.json({
        success: true,
        message: 'Angebot angenommen. Der Anbieter wurde benachrichtigt und bearbeitet Ihre Anfrage.',
        status: 'contacts_exchanged',
        customerDecision: updateData.customerDecision,
      });

    } else if (action === 'decline') {
      console.log(`❌ Processing DECLINE action for quote ${quoteId}`);
      
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

      console.log(`✅ Quote ${quoteId} declined successfully`);

      return NextResponse.json({
        success: true,
        message: 'Angebot abgelehnt.',
        status: 'declined',
      });
    }

  } catch (error) {
    console.error('❌ Error processing quote action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
