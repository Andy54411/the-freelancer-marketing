import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import Stripe from 'stripe';

// Stripe Initialisierung
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.error('STRIPE_SECRET_KEY ist nicht gesetzt');
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
      console.error('Auth-Fehler:', authError);
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
      companyStripeAccountId,
      companyName,
      customerFirebaseId,
      customerStripeId,
    } = body;

    if (!proposalId || !amount || !companyStripeAccountId) {
      return NextResponse.json(
        { error: 'Proposal ID, Betrag und Stripe Account ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Stripe initialisieren
    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe nicht verfügbar' }, { status: 500 });
    }

    // Get the project request to verify access and get details
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

    // Find the proposal
    const proposals = projectData?.proposals || [];
    const proposal = proposals.find((p: any) => p.companyUid === proposalId);

    if (!proposal) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    // Check if proposal is still pending
    if (proposal.status !== 'pending') {
      return NextResponse.json({ error: 'Angebot wurde bereits bearbeitet' }, { status: 400 });
    }

    // Calculate amounts (amounts in cents)
    const totalAmountCents = Math.round(amount * 100);
    const platformFeeRate = 0.035; // 3.5%
    const platformFeeCents = Math.round(totalAmountCents * platformFeeRate);
    const companyReceivesCents = totalAmountCents - platformFeeCents;

    console.log('💰 Quote Payment Calculation:', {
      totalAmountCents,
      platformFeeCents,
      companyReceivesCents,
      companyStripeAccountId,
    });

    // Get or create Stripe customer
    let stripeCustomerId = customerStripeId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        metadata: {
          firebase_uid: customerFirebaseId,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create PaymentIntent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: companyStripeAccountId,
      },
      metadata: {
        type: 'quote_payment',
        quote_id: quoteId,
        proposal_id: proposalId,
        customer_firebase_id: customerFirebaseId,
        company_stripe_account_id: companyStripeAccountId,
        quote_title: quoteTitle || '',
        company_name: companyName || '',
      },
      description: `Quote Payment: ${quoteTitle} - ${companyName}`,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    });

    console.log('✅ Quote PaymentIntent created:', {
      paymentIntentId: paymentIntent.id,
      amount: totalAmountCents,
      applicationFee: platformFeeCents,
      destination: companyStripeAccountId,
    });

    // Update quote status to payment_pending
    await projectRef.update({
      [`proposals.${proposals.findIndex((p: any) => p.companyUid === proposalId)}.status`]:
        'payment_pending',
      [`proposals.${proposals.findIndex((p: any) => p.companyUid === proposalId)}.paymentIntentId`]:
        paymentIntent.id,
      [`proposals.${proposals.findIndex((p: any) => p.companyUid === proposalId)}.paymentPendingAt`]:
        new Date().toISOString(),
      status: 'payment_pending',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentDetails: {
        amount: totalAmountCents,
        platformFee: platformFeeCents,
        companyReceives: companyReceivesCents,
      },
    });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Quote Payment Intents:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Quote-Zahlung' }, { status: 500 });
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

    // Check if user is authorized
    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
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

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Zahlung wurde nicht erfolgreich abgeschlossen' },
        { status: 400 }
      );
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

    // Find the proposal
    const proposals = projectData?.proposals || [];
    const proposalIndex = proposals.findIndex((p: any) => p.companyUid === proposalId);

    if (proposalIndex === -1) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const acceptedProposal = proposals[proposalIndex];

    // Generate unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create order in auftraege collection
    const orderData = {
      // Basic order info
      id: orderId,

      // Customer info
      customerFirebaseUid: projectData.customerUid,
      customerEmail: decodedToken.email || '',
      customerFirstName: projectData.customerName?.split(' ')[0] || '',
      customerLastName: projectData.customerName?.split(' ').slice(1).join(' ') || '',
      customerType: 'private', // TODO: Detect from project data
      kundeId: projectData.customerUid,

      // Provider info
      selectedAnbieterId: acceptedProposal.companyUid,
      providerName: acceptedProposal.companyName || '',
      anbieterStripeAccountId: acceptedProposal.companyStripeAccountId || '',

      // Project info
      selectedCategory: projectData.category || projectData.serviceCategory || '',
      selectedSubcategory: projectData.subcategory || projectData.serviceSubcategory || '',
      projectName: projectData.title,
      projectTitle: projectData.title,
      description: projectData.description,

      // Payment info
      totalAmountPaidByBuyer: acceptedProposal.totalAmount * 100, // Convert to cents
      originalJobPriceInCents: acceptedProposal.totalAmount * 100,
      applicationFeeAmountFromStripe: Math.round(acceptedProposal.totalAmount * 100 * 0.035),
      sellerCommissionInCents: Math.round(acceptedProposal.totalAmount * 100 * 0.035),
      paymentIntentId: paymentIntentId,
      paidAt: new Date(),

      // Location info
      jobCountry: projectData.location?.country || 'DE',
      jobCity: projectData.location?.city || null,
      jobPostalCode: projectData.location?.postalCode || null,
      jobStreet: projectData.location?.street || null,

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
        hourlyRate: Math.round((acceptedProposal.totalAmount * 100) / 8), // Assume 8 hours default
        originalPlannedHours: 8, // Default
        timeEntries: [],
      },
    };

    // Save order to auftraege collection
    await db.collection('auftraege').doc(orderId).set(orderData);

    // Update quote status to accepted and paid
    const updatedProposals = [...proposals];
    updatedProposals.forEach((proposal, index) => {
      if (index === proposalIndex) {
        proposal.status = 'accepted';
        proposal.acceptedAt = new Date().toISOString();
        proposal.paidAt = new Date().toISOString();
        proposal.paymentIntentId = paymentIntentId;
        proposal.orderId = orderId;
      } else if (proposal.status === 'pending') {
        proposal.status = 'declined';
        proposal.declinedAt = new Date().toISOString();
        proposal.declineReason = 'Ein anderes Angebot wurde angenommen und bezahlt';
      }
    });

    await projectRef.update({
      proposals: updatedProposals,
      status: 'accepted',
      acceptedProposal: proposalId,
      acceptedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      paymentIntentId: paymentIntentId,
      orderId: orderId,
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ Quote → Order Migration completed:', {
      quoteId,
      orderId,
      paymentIntentId,
      companyUid: acceptedProposal.companyUid,
    });

    // TODO: Send notifications to company about new order

    return NextResponse.json({
      success: true,
      message: 'Zahlung erfolgreich abgeschlossen und Auftrag erstellt',
      orderId: orderId,
      paymentIntentId: paymentIntentId,
    });
  } catch (error) {
    console.error('❌ Fehler beim Verarbeiten der Quote-Zahlung:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Quote-Zahlung' },
      { status: 500 }
    );
  }
}
