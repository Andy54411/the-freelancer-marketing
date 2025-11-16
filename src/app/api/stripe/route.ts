import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { auth, db } from '@/firebase/server';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY ist nicht definiert');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
});

// API Handler für alle Stripe-Operationen
export async function POST(req: NextRequest) {
  try {
    // Auth-Token validieren
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!auth) {
      throw new Error('Firebase Auth ist nicht initialisiert');
    }
    
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Request-Body parsen
    const body = await req.json();
    const { action, data } = body;

    // Action-basierte Operationen
    switch (action) {
      case 'create_account':
        return handleCreateAccount(userId, data);
      
      case 'upload_documents':
        return handleUploadDocuments(data);
      
      case 'update_account':
        return handleUpdateAccount(data);
      
      case 'create_payment':
        return handleCreatePayment(data);
      
      case 'create_payout':
        return handleCreatePayout(data);
      
      case 'get_account_status':
        return handleGetAccountStatus(data);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Stripe API Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        type: error.type,
        code: error.code 
      },
      { status: error.statusCode || 500 }
    );
  }
}

// Handler für verschiedene Operationen
async function handleCreateAccount(userId: string, data: any) {
  const account = await stripe.accounts.create({
    type: 'custom',
    country: data.country,
    email: data.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    business_type: data.businessType,
    business_profile: {
      name: data.companyName,
      mcc: data.mcc || '5734'
    }
  });

  // Account Link erstellen
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${userId}/settings/payment`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${userId}/settings/payment`,
    type: 'account_onboarding'
  });

  // In Firestore speichern
  if (!db) {
    throw new Error('Firestore ist nicht initialisiert');
  }
  await db.collection('companies').doc(userId).update({
    stripeAccountId: account.id,
    stripeAccountStatus: 'pending',
    stripeOnboardingStarted: true,
    stripeLastUpdated: new Date().toISOString()
  });

  return NextResponse.json({
    accountId: account.id,
    accountLinkUrl: accountLink.url
  });
}

async function handleUploadDocuments(data: any) {
  const { accountId, files } = data;
  const results: Record<string, string> = {};

  // Dokumente verarbeiten
  for (const [key, file] of Object.entries(files)) {
    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const purpose = key === 'identity' ? 'identity_document' : 'additional_verification';

    const stripeFile = await stripe.files.create({
      purpose: purpose as Stripe.FileCreateParams.Purpose,
      file: {
        data: buffer,
        name: (file as File).name,
        type: (file as File).type
      }
    });

    results[key] = stripeFile.id;

    // Wenn es ein Identitätsdokument ist, mit Account verknüpfen
    if (key === 'identity') {
      await stripe.accounts.update(accountId, {
        individual: {
          verification: {
            document: {
              front: stripeFile.id
            }
          }
        }
      });
    }
  }

  return NextResponse.json(results);
}

async function handleUpdateAccount(data: any) {
  const { accountId, ...updateData } = data;
  const account = await stripe.accounts.update(accountId, updateData);

  return NextResponse.json(account);
}

async function handleCreatePayment(data: any) {
  const { amount, currency, customerId, accountId, description } = data;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method_types: ['card', 'sepa_debit'],
    transfer_data: {
      destination: accountId
    },
    description
  });

  return NextResponse.json(paymentIntent);
}

async function handleCreatePayout(data: any) {
  const { accountId, amount, currency = 'eur' } = data;

  const payout = await stripe.payouts.create(
    {
      amount,
      currency
    },
    {
      stripeAccount: accountId
    }
  );

  return NextResponse.json(payout);
}

async function handleGetAccountStatus(data: any) {
  const { accountId } = data;
  const account = await stripe.accounts.retrieve(accountId);

  return NextResponse.json({
    details_submitted: account.details_submitted,
    payouts_enabled: account.payouts_enabled,
    requirements: account.requirements,
    status: account.payouts_enabled ? 'active' : 'pending'
  });
}