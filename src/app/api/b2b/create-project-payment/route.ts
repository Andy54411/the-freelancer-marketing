// src/app/api/b2b/create-project-payment/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/clients';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Stripe initialization for B2B payments
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

// B2B Platform Fee Rate (kann unterschiedlich zu B2C sein)
const B2B_PLATFORM_FEE_RATE = 0.045; // 4.5% für B2B (vs 4.5% für B2C)

interface B2BPaymentRequest {
  // Project Details
  projectId: string;
  milestoneId?: string;
  projectTitle: string;
  projectDescription?: string;

  // Payment Details
  amount: number; // Bruttobetrag in Cents
  currency?: string;
  paymentType: 'milestone' | 'project_deposit' | 'final_payment';

  // Provider & Customer
  providerStripeAccountId: string;
  customerStripeId?: string;
  customerFirebaseId: string;
  providerFirebaseId: string;

  // B2B Specific
  invoiceNumber?: string;
  taxRate?: number; // For VAT/Tax handling
  paymentTermsDays?: number; // Payment terms (e.g., NET 30)
  isRecurring?: boolean;

  // Billing Details
  billingDetails?: {
    companyName: string;
    email?: string;
    phone?: string;
    vatNumber?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      postal_code: string;
      country: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json({ error: 'B2B Payment Service nicht verfügbar' }, { status: 500 });
  }

  try {
    const body: B2BPaymentRequest = await request.json();

    // Validate B2B specific requirements
    const {
      projectId,
      amount,
      currency = 'eur',
      paymentType,
      providerStripeAccountId,
      customerFirebaseId,
      providerFirebaseId,
      projectTitle,
      billingDetails,
    } = body;

    // Validation
    if (!projectId || !amount || !providerStripeAccountId || !customerFirebaseId) {
      return NextResponse.json({ error: 'Fehlende B2B-Zahlungsparameter' }, { status: 400 });
    }

    // Validate Stripe Account ID format for B2B
    if (!providerStripeAccountId.startsWith('acct_')) {
      return NextResponse.json(
        {
          error: 'Ungültige Connected Account ID. Muss mit "acct_" beginnen.',
          details: 'b2b_invalid_account_id',
          receivedAccountId: providerStripeAccountId,
        },
        { status: 400 }
      );
    }

    // Check if Connected Account is active for B2B payments
    try {
      const account = await stripe.accounts.retrieve(providerStripeAccountId);

      if (!account.charges_enabled || !account.payouts_enabled) {
        return NextResponse.json(
          {
            error: 'Provider-Konto nicht für B2B-Zahlungen aktiviert',
            details: 'b2b_account_not_ready',
            accountStatus: {
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
            },
          },
          { status: 400 }
        );
      }
    } catch (stripeError: any) {
      return NextResponse.json(
        {
          error: 'Provider-Konto konnte nicht verifiziert werden',
          details: 'b2b_account_verification_failed',
        },
        { status: 400 }
      );
    }

    // Get or create Stripe Customer for B2B
    let customerStripeId = body.customerStripeId;

    if (!customerStripeId) {
      try {
        // KRITISCHE KORREKTUR: Load customer data from Firebase (companies first, dann users fallback)
        let customerData: any = null;

        // 1. Prüfe companies Collection
        const companyDoc = await getDoc(doc(db, 'companies', customerFirebaseId));
        if (companyDoc.exists()) {
          customerData = companyDoc.data();
        } else {
          // 2. Fallback: users Collection
          const customerDoc = await getDoc(doc(db, 'users', customerFirebaseId));
          if (customerDoc.exists()) {
            customerData = customerDoc.data();
          }
        }

        // Fallback customer data if Firebase query fails
        const fallbackCustomerData = {
          email: billingDetails?.email || 'b2b-customer@taskilo.de',
          displayName: billingDetails?.companyName || 'B2B Customer',
          userName: billingDetails?.companyName || 'B2B Customer',
          phone: billingDetails?.phone || '+49000000000',
        };

        const customerInfo = customerData || fallbackCustomerData;

        // Create B2B Stripe Customer with company details
        const customer = await stripe.customers.create({
          email: customerInfo.email,
          name: billingDetails?.companyName || customerInfo.displayName || customerInfo.userName,
          phone: customerInfo.phone,
          address: billingDetails?.address,
          metadata: {
            firebaseUserId: customerFirebaseId,
            projectId,
            customerType: 'b2b',
            vatNumber: billingDetails?.vatNumber || '',
          },
        });

        customerStripeId = customer.id;

        // Try to save Stripe Customer ID back to Firebase (with error handling)
        try {
          // KRITISCHE KORREKTUR: Schreibe Stripe Customer ID in beide Collections
          const updateData = {
            stripeCustomerId: customerStripeId,
            updatedAt: serverTimestamp(),
          };

          // Update companies collection (primär)
          await setDoc(doc(db, 'companies', customerFirebaseId), updateData, { merge: true });

          // Update users collection (fallback)
          await setDoc(doc(db, 'users', customerFirebaseId), updateData, { merge: true });
        } catch (firebaseError) {}
      } catch (customerError) {
        // Create customer with fallback data
        const customer = await stripe.customers.create({
          email: billingDetails?.email || 'b2b-customer@taskilo.de',
          name: billingDetails?.companyName || 'B2B Customer',
          address: billingDetails?.address,
          metadata: {
            firebaseUserId: customerFirebaseId,
            projectId,
            customerType: 'b2b',
            vatNumber: billingDetails?.vatNumber || '',
          },
        });

        customerStripeId = customer.id;
      }
    }

    // Calculate B2B Platform Fee
    const platformFee = Math.round(amount * B2B_PLATFORM_FEE_RATE);
    const providerAmount = amount - platformFee;

    // Create B2B Payment Intent with business-specific features
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerStripeId,

      // B2B: Use on_session setup for immediate payment
      setup_future_usage: paymentType === 'milestone' ? 'on_session' : 'off_session',

      // Transfer to provider's account (full amount, we'll get fee via separate mechanism)
      transfer_data: {
        destination: providerStripeAccountId,
      },

      // B2B Application Fee (what we keep) - use only this, not transfer_data.amount
      application_fee_amount: platformFee,

      confirm: false,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // B2B prefers inline payment
      },

      // B2B-specific metadata
      metadata: {
        paymentType: 'b2b_project',
        projectId,
        milestoneId: body.milestoneId || '',
        paymentCategory: paymentType,
        customerFirebaseId,
        providerFirebaseId,
        projectTitle,
        invoiceNumber: body.invoiceNumber || '',
        platformFeeRate: B2B_PLATFORM_FEE_RATE.toString(),
        grossAmount: amount.toString(),
        platformFeeAmount: platformFee.toString(),
        providerAmount: providerAmount.toString(),
        taxRate: body.taxRate?.toString() || '0',
        paymentTermsDays: body.paymentTermsDays?.toString() || '0',
        billingCompanyName: billingDetails?.companyName || '',
        vatNumber: billingDetails?.vatNumber || '',
      },

      // B2B Payment description
      description: `B2B Payment: ${projectTitle} (${paymentType})`,
    });

    // Store B2B Payment record in Firebase (with error handling)
    const b2bPaymentData = {
      // Payment Details
      paymentIntentId: paymentIntent.id,
      projectId,
      milestoneId: body.milestoneId || null,
      paymentType,

      // Amounts
      grossAmount: amount,
      platformFee,
      providerAmount,
      platformFeeRate: B2B_PLATFORM_FEE_RATE,
      currency,

      // Parties
      customerFirebaseId,
      providerFirebaseId,
      customerStripeId,
      providerStripeAccountId,

      // B2B Details
      projectTitle,
      projectDescription: body.projectDescription || '',
      invoiceNumber: body.invoiceNumber || null,
      taxRate: body.taxRate || 0,
      paymentTermsDays: body.paymentTermsDays || 0,

      // Billing
      billingDetails: billingDetails || null,

      // Status
      status: 'pending_payment',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'b2b_payments', paymentIntent.id), b2bPaymentData);
    } catch (firebaseError) {
      // Continue without failing - payment intent is created, record can be recreated later
    }
    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,

      // B2B-specific response data
      projectDetails: {
        projectId,
        projectTitle,
        paymentType,
      },

      paymentDetails: {
        grossAmount: amount,
        platformFee,
        providerAmount,
        currency,
      },

      message: 'B2B Payment Intent erfolgreich erstellt',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'B2B Payment konnte nicht erstellt werden',
        details: error.message || 'Unbekannter B2B-Zahlungsfehler',
        type: error.type || 'b2b_payment_error',
      },
      { status: 500 }
    );
  }
}
