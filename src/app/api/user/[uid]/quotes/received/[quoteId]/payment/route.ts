import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
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

    // Get company's Stripe Account ID from users collection
    const companyUserRef = db.collection('users').doc(proposalId);
    const companyUserDoc = await companyUserRef.get();

    if (!companyUserDoc.exists) {
      return NextResponse.json({ error: 'Unternehmenskonto nicht gefunden' }, { status: 404 });
    }

    const companyUserData = companyUserDoc.data();
    const finalCompanyStripeAccountId = companyUserData?.stripeAccountId;

    if (!finalCompanyStripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe Account ID für Unternehmen nicht gefunden' },
        { status: 400 }
      );
    }

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

    // Create PaymentIntent with application fee (NO AUTOMATIC TRANSFERS)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      application_fee_amount: platformFeeCents,
      // ❌ ENTFERNT: transfer_data für automatische Transfers
      // transfer_data: {
      //   destination: finalCompanyStripeAccountId,
      // },
      // ✅ GELD BLEIBT AUF PLATFORM für kontrollierte Auszahlungen
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

    // Update quote status to payment_pending
    const proposalArray = Array.isArray(proposals) ? proposals : Object.values(proposals);
    const updateProposalIndex = proposalArray.findIndex((p: any) => p.companyUid === proposalId);

    if (updateProposalIndex !== -1) {
      await projectRef.update({
        [`proposals.${updateProposalIndex}.status`]: 'payment_pending',
        [`proposals.${updateProposalIndex}.paymentIntentId`]: paymentIntent.id,
        [`proposals.${updateProposalIndex}.paymentPendingAt`]: new Date().toISOString(),
        status: 'payment_pending',
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Fallback: Update the whole proposals array
      const updatedProposals = proposalArray.map((p: any) => {
        if (p.companyUid === proposalId) {
          return {
            ...p,
            status: 'payment_pending',
            paymentIntentId: paymentIntent.id,
            paymentPendingAt: new Date().toISOString(),
          };
        }
        return p;
      });

      await projectRef.update({
        proposals: updatedProposals,
        status: 'payment_pending',
        updatedAt: new Date().toISOString(),
      });
    }

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

    // Find the proposal - handle both Array and Object structures
    const proposals = projectData?.proposals || [];

    let proposalIndex = -1;
    let proposal: any = null;

    if (Array.isArray(proposals)) {
      // Normal Array structure
      proposalIndex = proposals.findIndex((p: any) => p.companyUid === proposalId);
      if (proposalIndex !== -1) {
        proposal = proposals[proposalIndex];
      }
    } else if (typeof proposals === 'object' && proposals !== null) {
      // Object structure - corrupted by Firebase

      // Try to find by object key matching proposalId
      const objectKeys = Object.keys(proposals);

      // First, try to find if proposalId is a direct key
      if (proposals[proposalId]) {

        proposal = { ...proposals[proposalId], companyUid: proposalId };
        proposalIndex = 0; // Set to 0 for object structure
      } else {
        // Convert to array and search for any proposal that might match
        const proposalArray = Object.values(proposals);
        for (let i = 0; i < proposalArray.length; i++) {
          const p = proposalArray[i] as any;
          if (
            p.companyUid === proposalId ||
            p.paymentIntentId === paymentIntentId ||
            (p.status === 'payment_pending' && objectKeys.length === 1)
          ) {

            proposal = p;
            proposalIndex = i;
            break;
          }
        }
      }

      // If still not found, try to reconstruct from payment intent
      if (!proposal && paymentIntentId) {

        // Extract amount from PaymentIntent (convert from cents to euros)
        const paymentAmountEuros = paymentIntent.amount / 100;

        // We'll reconstruct the proposal data from what we know
        proposal = {
          companyUid: proposalId,
          status: 'payment_pending',
          paymentIntentId: paymentIntentId,
          // Get the actual amount from PaymentIntent
          totalAmount: paymentAmountEuros,
          price: paymentAmountEuros,
          currency: paymentIntent.currency.toUpperCase(),
          companyName: paymentIntent.metadata?.company_name || 'Unknown Company',
          timeline: '',
          description: paymentIntent.description || '',
        };
        proposalIndex = 0;

      }
    }

    if (proposalIndex === -1 || !proposal) {

      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const acceptedProposal = proposal;

    // Ensure we have a valid amount - fallback to PaymentIntent amount if proposal amount is missing
    const finalAmount =
      acceptedProposal.totalAmount || acceptedProposal.price || paymentIntent.amount / 100;

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
      selectedAnbieterId: acceptedProposal.companyUid || '',
      providerName: acceptedProposal.companyName || '',
      anbieterStripeAccountId: acceptedProposal.companyStripeAccountId || '',

      // Project info
      selectedCategory: projectData.category || projectData.serviceCategory || '',
      selectedSubcategory: projectData.subcategory || projectData.serviceSubcategory || '',
      projectName: projectData.title || '',
      projectTitle: projectData.title || '',
      description: projectData.description || '',

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

    // Update quote status to accepted and paid
    const originalProposals = projectData?.proposals || [];
    let updatedProposals;

    if (Array.isArray(originalProposals)) {
      // Normal Array structure
      updatedProposals = [...originalProposals];
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
    } else {
      // Object structure - update the accepted proposal
      updatedProposals = { ...originalProposals };

      // Find and update the accepted proposal
      const objectKeys = Object.keys(updatedProposals);
      objectKeys.forEach(key => {
        const prop = updatedProposals[key];
        if (
          prop.companyUid === proposalId ||
          prop.paymentIntentId === paymentIntentId ||
          (prop.status === 'payment_pending' && objectKeys.length === 1)
        ) {
          // This is the accepted proposal
          updatedProposals[key] = {
            ...prop,
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
            paidAt: new Date().toISOString(),
            paymentIntentId: paymentIntentId,
            orderId: orderId,
            companyUid: proposalId, // Ensure this is set
          };
        } else if (prop.status === 'pending') {
          updatedProposals[key] = {
            ...prop,
            status: 'declined',
            declinedAt: new Date().toISOString(),
            declineReason: 'Ein anderes Angebot wurde angenommen und bezahlt',
          };
        }
      });
    }

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

    // TODO: Send notifications to company about new order

    return NextResponse.json({
      success: true,
      message: 'Zahlung erfolgreich abgeschlossen und Auftrag erstellt',
      orderId: orderId,
      paymentIntentId: paymentIntentId,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Quote-Zahlung' },
      { status: 500 }
    );
  }
}
