import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { ProposalSubcollectionService } from '@/services/ProposalSubcollectionService';
import Stripe from 'stripe';

// Stripe Initialisierung
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return null;
  }
  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

/**
 * API Route für Quote Payment Intent Creation
 * POST /api/user/[uid]/quotes/received/[quoteId]/payment
 */
export async function POST(
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

    // Check if user is authorized
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();

    const {
      proposalId,
      quoteTitle,
      quoteDescription,
      amount,
      currency = 'eur',
      companyName,
      customerFirebaseId,
      customerStripeId,
    } = body;

    // Debug logging

    if (!proposalId || !amount) {
      return NextResponse.json(
        { error: 'Proposal ID und Betrag sind erforderlich' },
        { status: 400 }
      );
    }

    // Stripe initialisieren
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe nicht verfügbar' }, { status: 500 });
    }

    // Get the quote to verify access and get details
    console.log('🔍 Getting quote details for:', quoteId);
    const projectRef = db.collection('quotes').doc(quoteId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      console.error('❌ Quote not found:', quoteId);
      return NextResponse.json({ error: 'Quote nicht gefunden' }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Check if user owns this quote
    if (projectData?.customerUid !== uid) {
      console.error('❌ User does not own quote:', { customerUid: projectData?.customerUid, uid });
      return NextResponse.json({ error: 'Keine Berechtigung für diese Quote' }, { status: 403 });
    }

    // Find the proposal using subcollection
    console.log('🔍 Getting proposal details for:', proposalId);
    const proposal = await ProposalSubcollectionService.getProposal(quoteId, proposalId);

    if (!proposal) {
      console.error('❌ Proposal not found:', proposalId);
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    // Check if proposal is still pending
    if (proposal.status !== 'pending') {
      console.error('❌ Proposal not pending:', proposal.status);
      return NextResponse.json({ error: 'Angebot wurde bereits bearbeitet' }, { status: 400 });
    }

    // Get the provider's companyUid from the proposal
    const providerCompanyUid = proposal.companyUid;
    console.log('🔍 Provider companyUid:', providerCompanyUid);
    if (!providerCompanyUid) {
      console.error('❌ No companyUid in proposal');
      return NextResponse.json({ error: 'Anbieter-ID nicht im Angebot gefunden' }, { status: 400 });
    }

    // Get company's Stripe Account ID from companies collection using the companyUid
    console.log('🔍 Getting company data for:', providerCompanyUid);
    const companyRef = db.collection('companies').doc(providerCompanyUid);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      console.error('❌ Company not found:', providerCompanyUid);
      return NextResponse.json({ error: 'Unternehmenskonto nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();
    console.log('✅ Company data found:', {
      id: providerCompanyUid,
      hasStripeAccount: !!companyData?.stripeAccountId,
    });
    const finalCompanyStripeAccountId = companyData?.stripeAccountId;

    if (!finalCompanyStripeAccountId) {
      console.error('❌ No Stripe Account ID for company:', providerCompanyUid);
      return NextResponse.json(
        { error: 'Stripe Account ID für Unternehmen nicht gefunden' },
        { status: 400 }
      );
    }

    console.log('✅ Using Stripe Account ID:', finalCompanyStripeAccountId);

    // Final validation with database-fetched Stripe Account ID
    if (!proposalId || !amount || !finalCompanyStripeAccountId) {
      return NextResponse.json(
        { error: 'Proposal ID, Betrag und Stripe Account ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Calculate amounts (amounts in cents)
    const totalAmountCents = Math.round(amount * 100);
    const platformFeeRate = 0.035; // 3.5%
    const platformFeeCents = Math.round(totalAmountCents * platformFeeRate);
    const companyReceivesCents = totalAmountCents - platformFeeCents;

    // Get or create Stripe customer
    console.log('🔍 Getting/creating Stripe customer for:', customerFirebaseId);
    let stripeCustomerId = customerStripeId;
    if (!stripeCustomerId) {
      console.log('🔄 Creating new Stripe customer');
      const customer = await stripe.customers.create({
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        metadata: {
          firebase_uid: customerFirebaseId,
        },
      });
      stripeCustomerId = customer.id;
      console.log('✅ Created Stripe customer:', stripeCustomerId);
    } else {
      console.log('✅ Using existing Stripe customer:', stripeCustomerId);
    }

    // Create PaymentIntent with application fee and transfer data for Stripe Connect
    console.log(
      '🔄 Creating PaymentIntent with amount:',
      totalAmountCents,
      'fee:',
      platformFeeCents,
      'destination:',
      finalCompanyStripeAccountId
    );
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: finalCompanyStripeAccountId,
      },
      metadata: {
        type: 'quote_payment',
        quote_id: quoteId,
        proposal_id: proposalId,
        customer_firebase_id: customerFirebaseId,
        firebaseUserId: customerFirebaseId, // Für Webhook Kompatibilität
        tempJobDraftId: quoteId, // Verwende quoteId als tempJobDraftId für Webhook
        company_stripe_account_id: finalCompanyStripeAccountId,
        quote_title: quoteTitle || '',
        company_name: companyName || '',
        customerUid: uid, // Zusätzliche Identifikation
      },
      description: `Quote Payment: ${quoteTitle} - ${companyName}`,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    // Store PaymentIntent ID for webhook processing, but keep status as 'pending'
    // Status will only change to 'payment_pending' and then 'accepted' via webhook
    const proposalRef = db
      .collection('quotes')
      .doc(quoteId)
      .collection('proposals')
      .doc(proposalId);
    await proposalRef.update({
      paymentIntentId: paymentIntent.id,
      paymentInitiatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Keep status as 'pending' - will be updated by webhook
    });

    // Don't update quote status yet - let webhook handle it
    await projectRef.update({
      updatedAt: new Date().toISOString(),
      // Keep existing status - will be updated by webhook
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentDetails: {
        amount: totalAmountCents / 100, // Konvertiere zu Euro für Frontend
        totalAmount: totalAmountCents / 100, // Totalamount für Frontend-Kompatibilität
        platformFee: platformFeeCents / 100, // Konvertiere zu Euro
        companyReceives: companyReceivesCents / 100, // Konvertiere zu Euro
        description: `Zahlung für: ${quoteTitle || 'Angebot'} - ${companyName || 'Unbekannter Anbieter'}`,
      },
    });
  } catch (error) {
    console.error('❌ QUOTE PAYMENT ERROR:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      uid,
      quoteId,
    });
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der Quote-Zahlung',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle Payment Success and Quote → Order Migration
 * PATCH /api/user/[uid]/quotes/received/[quoteId]/payment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  const { uid, quoteId } = await params;

  console.log('🔧 PATCH Payment Route called:', { uid, quoteId });

  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ PATCH: No auth header');
      return NextResponse.json({ error: 'Authentifizierung erforderlich' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ PATCH: Auth token verified for:', decodedToken.uid);
    } catch (authError) {
      console.error('❌ PATCH: Auth error:', authError);
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 });
    }

    // Check if user is authorized
    if (decodedToken.uid !== uid) {
      console.error('❌ PATCH: User not authorized:', {
        tokenUid: decodedToken.uid,
        requestUid: uid,
      });
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    console.log('📝 PATCH: Request body:', body);

    const { paymentIntentId, proposalId } = body;

    if (!paymentIntentId || !proposalId) {
      return NextResponse.json(
        { error: 'Payment Intent ID und Proposal ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Stripe initialisieren
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe nicht verfügbar' }, { status: 500 });
    }

    // Verify payment success
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('🔍 PATCH: PaymentIntent status:', paymentIntent.status);

    if (paymentIntent.status !== 'succeeded') {
      console.error('❌ PATCH: Payment not succeeded, status:', paymentIntent.status);
      return NextResponse.json(
        { error: 'Zahlung wurde nicht erfolgreich abgeschlossen' },
        { status: 400 }
      );
    }

    console.log('✅ PATCH: Payment verification successful:', {
      paymentIntentId,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    });

    // Get the quote - try both collections
    console.log('🔍 PATCH: Looking for quote in collections...');
    let projectRef = db.collection('quotes').doc(quoteId);
    let projectDoc = await projectRef.get();
    let collectionUsed = 'quotes';

    if (!projectDoc.exists) {
      console.log('📝 PATCH: Quote not found in quotes collection, trying project_requests...');
      projectRef = db.collection('project_requests').doc(quoteId);
      projectDoc = await projectRef.get();
      collectionUsed = 'project_requests';
    }

    if (!projectDoc.exists) {
      console.error('❌ PATCH: Quote not found in either collection:', quoteId);
      return NextResponse.json({ error: 'Quote nicht gefunden' }, { status: 404 });
    }

    console.log('✅ PATCH: Quote found in collection:', collectionUsed);
    const projectData = projectDoc.data();

    // Check if user owns this project
    if (projectData?.customerUid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Projekt' }, { status: 403 });
    }

    // Find the proposal - handle both Array and Object structures
    // Get proposal from subcollection
    const proposal = await ProposalSubcollectionService.getProposal(quoteId, proposalId);

    if (!proposal) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const acceptedProposal = proposal;

    // Additional validation: Check if payment amount matches proposal amount
    const proposalAmount = Math.round(acceptedProposal.totalAmount * 100); // Convert to cents
    if (paymentIntent.amount !== proposalAmount) {
      console.error('❌ PATCH: Payment amount mismatch:', {
        paymentIntentAmount: paymentIntent.amount,
        proposalAmount: proposalAmount,
        proposalTotalAmount: acceptedProposal.totalAmount,
      });
      return NextResponse.json(
        { error: 'Zahlungsbetrag stimmt nicht mit Angebotsbetrag überein' },
        { status: 400 }
      );
    }

    console.log('✅ PATCH: Amount validation successful:', {
      paymentIntentAmount: paymentIntent.amount,
      proposalAmount: proposalAmount,
    });

    // Ensure we have a valid amount - fallback to PaymentIntent amount if proposal amount is missing
    const finalAmount = acceptedProposal.totalAmount || paymentIntent.amount / 100;

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get provider information for the order
    let providerName = 'Unbekannter Anbieter';
    let providerStripeAccountId = '';

    try {
      const providerDoc = await db.collection('companies').doc(acceptedProposal.companyUid).get();
      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        providerName = providerData?.companyName || providerName;
        providerStripeAccountId = providerData?.stripeAccountId || '';
      }
    } catch (error) {
      console.error('Error fetching provider data:', error);
    }

    // Create order in auftraege collection
    const orderData = {
      // Basic order info
      id: orderId,

      // Customer info
      customerFirebaseUid: projectData?.customerUid,
      customerEmail: decodedToken.email || '',
      customerFirstName: projectData?.customerName?.split(' ')[0] || '',
      customerLastName: projectData?.customerName?.split(' ').slice(1).join(' ') || '',
      customerType: 'private', // TODO: Detect from project data
      kundeId: projectData?.customerUid,

      // Provider info
      selectedAnbieterId: acceptedProposal.companyUid || '',
      providerName: providerName,
      anbieterStripeAccountId: providerStripeAccountId,

      // Project info
      selectedCategory: projectData?.category || projectData?.serviceCategory || '',
      selectedSubcategory: projectData?.subcategory || projectData?.serviceSubcategory || '',
      projectName: projectData?.title || '',
      projectTitle: projectData?.title || '',
      description: projectData?.description || '',

      // Payment info
      totalAmountPaidByBuyer: finalAmount * 100, // Convert to cents
      originalJobPriceInCents: finalAmount * 100,
      applicationFeeAmountFromStripe: Math.round(finalAmount * 100 * 0.035),
      sellerCommissionInCents: Math.round(finalAmount * 100 * 0.035),
      paymentIntentId: paymentIntentId,
      paidAt: new Date(),

      // Location info
      jobCountry: projectData.location?.country || 'DE',
      jobCity: projectData.location?.city || '',
      jobPostalCode: projectData.location?.postalCode || '',
      jobStreet: projectData.location?.street || '',

      // Dates
      jobDateFrom: projectData.startDate || new Date().toISOString().split('T')[0],
      jobDateTo: projectData.endDate || new Date().toISOString().split('T')[0],
      jobTimePreference: projectData.timePreference || '09:00',

      // Status and meta
      status: 'AKTIV',
      createdAt: new Date(),
      lastUpdated: new Date(),
      orderDate: new Date(),

      // Additional fields
      currency: acceptedProposal.currency || 'EUR',
      jobDurationString: acceptedProposal.timeline || '',

      // Form data if available
      subcategoryFormData: projectData.subcategoryFormData || {},

      // Quote reference
      originalQuoteId: quoteId,
      originalProposalId: proposalId,

      // Approval requests array (empty initially)
      approvalRequests: [],

      // Time tracking setup
      timeTracking: {
        isActive: false,
        status: 'inactive',
        hourlyRate: Math.round((finalAmount * 100) / 8), // Assume 8 hours default
        originalPlannedHours: 8, // Default
        timeEntries: [],
      },
    };

    // Save order to auftraege collection
    await db.collection('auftraege').doc(orderId).set(orderData);

    // Update proposal to accepted and paid using subcollection
    await ProposalSubcollectionService.updateProposalStatus(quoteId, proposalId, 'accepted', {
      acceptedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      paymentIntentId: paymentIntentId,
      orderId: orderId,
    });

    // Update quote status
    await projectRef.update({
      status: 'accepted',
      acceptedProposal: proposalId,
      acceptedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      paymentIntentId: paymentIntentId,
      orderId: orderId,
      updatedAt: new Date().toISOString(),
    });

    // TODO: Send notifications to company about new order

    return NextResponse.json({
      success: true,
      message: 'Zahlung erfolgreich abgeschlossen und Auftrag erstellt',
      orderId: orderId,
      paymentIntentId: paymentIntentId,
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Quote-Zahlung' },
      { status: 500 }
    );
  }
}
