// src/app/api/b2b/create-project-payment/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/clients';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Stripe initialization for B2B payments
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error('[B2B Payment API] STRIPE_SECRET_KEY ist nicht gesetzt.');
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
  console.log('[B2B Payment API] Neue B2B-Zahlungsanfrage empfangen');

  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json({ error: 'B2B Payment Service nicht verfügbar' }, { status: 500 });
  }

  try {
    const body: B2BPaymentRequest = await request.json();
    console.log('[B2B Payment API] Request:', JSON.stringify(body, null, 2));

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
      console.error('[B2B Payment API] Ungültige Connected Account ID:', providerStripeAccountId);
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
      console.error('[B2B Payment API] Stripe Account Check fehlgeschlagen:', stripeError);
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
        // Load customer data from Firebase (with error handling for API permissions)
        const customerDoc = await getDoc(doc(db, 'users', customerFirebaseId));
        const customerData = customerDoc.exists() ? customerDoc.data() : null;

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
          await setDoc(
            doc(db, 'users', customerFirebaseId),
            {
              stripeCustomerId: customerStripeId,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (firebaseError) {
          console.warn(
            '[B2B Payment API] Could not update user with Stripe Customer ID:',
            firebaseError
          );
          // Continue without failing - not critical for payment
        }
      } catch (firebaseError) {
        console.warn(
          '[B2B Payment API] Firebase access failed, using fallback data:',
          firebaseError
        );

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

    console.log('[B2B Payment API] Fee Calculation:', {
      grossAmount: amount / 100,
      platformFee: platformFee / 100,
      providerReceives: providerAmount / 100,
      feeRate: B2B_PLATFORM_FEE_RATE * 100 + '%',
    });

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
      console.warn('[B2B Payment API] Could not save payment record to Firebase:', firebaseError);
      // Continue without failing - payment intent is created, record can be recreated later
    }

    console.log('[B2B Payment API] B2B PaymentIntent created successfully:', {
      paymentIntentId: paymentIntent.id,
      projectId,
      amount: amount / 100,
      paymentType,
    });

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
    console.error('[B2B Payment API] Fehler bei der B2B-Zahlungserstellung:', error);

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
