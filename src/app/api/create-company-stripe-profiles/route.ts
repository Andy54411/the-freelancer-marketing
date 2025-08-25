import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

// Stripe initialization moved to runtime to avoid build-time errors
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {

    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

interface CreateProfilesRequest {
  companyName: string;
  email: string;
  uid: string;
  userType?: 'user' | 'company';
}

interface CreateProfilesResponse {
  success: boolean;
  stripeCustomerId?: string;
  stripeAccountId?: string;
  message: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateProfilesResponse>> {

  const stripe = getStripeInstance();
  if (!stripe) {

    return NextResponse.json(
      {
        success: false,
        error: 'Stripe-Konfiguration auf dem Server fehlt.',
        message: 'Server-Fehler',
      },
      { status: 500 }
    );
  }

  if (!db) {

    return NextResponse.json(
      {
        success: false,
        error: 'Firebase-Konfiguration auf dem Server fehlt.',
        message: 'Server-Fehler',
      },
      { status: 500 }
    );
  }

  try {
    const body: CreateProfilesRequest = await request.json();
    const { companyName, email, uid, userType = 'company' } = body;

    // Validierung
    if (!companyName || typeof companyName !== 'string') {

      return NextResponse.json(
        { success: false, error: 'Ungültiger Firmenname.', message: 'Validierungsfehler' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {

      return NextResponse.json(
        { success: false, error: 'Ungültige E-Mail-Adresse.', message: 'Validierungsfehler' },
        { status: 400 }
      );
    }

    if (!uid || typeof uid !== 'string') {

      return NextResponse.json(
        { success: false, error: 'Ungültige Benutzer-ID.', message: 'Validierungsfehler' },
        { status: 400 }
      );
    }

    const results: { stripeCustomerId?: string; stripeAccountId?: string } = {};

    // 1. CUSTOMER ID ERSTELLEN (für B2C-Käufe)

    try {
      const customer = await stripe.customers.create({
        email: email,
        name: companyName,
        metadata: {
          firebaseUserId: uid,
          customerType: userType,
          createdFor: 'B2C_payments',
          createdAt: new Date().toISOString(),
        },
      });

      results.stripeCustomerId = customer.id;

    } catch (customerError) {

      throw customerError;
    }

    // 2. CONNECT ACCOUNT ERSTELLEN (für B2B-Verkäufe)

    try {
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'DE', // Deutschland standardmäßig
        email: email,
        business_type: 'company',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: companyName,
          support_email: email,
          url: `https://taskilo.de/profile/${uid}`, // Direkte Profil-URL
        },
        metadata: {
          firebaseUserId: uid,
          accountType: userType,
          createdFor: 'B2B_payments',
          createdAt: new Date().toISOString(),
        },
        tos_acceptance: {
          service_agreement: 'recipient',
        },
      });

      results.stripeAccountId = account.id;

    } catch (accountError) {

      // Customer wurde bereits erstellt, also nur warnen aber nicht komplett fehlschlagen

    }

    // 3. FIRESTORE AKTUALISIEREN

    try {
      const updateData: any = {
        updatedAt: new Date(),
        stripeProfilesCreatedAt: new Date(),
      };

      if (results.stripeCustomerId) {
        updateData.stripeCustomerId = results.stripeCustomerId;
      }

      if (results.stripeAccountId) {
        updateData.stripeAccountId = results.stripeAccountId;
      }

      // Update users collection
      await db.collection('users').doc(uid).update(updateData);

    } catch (firestoreError) {

      // Stripe-Profile wurden erstellt, also weiter fortfahren
    }

    const message =
      results.stripeCustomerId && results.stripeAccountId
        ? 'Beide Stripe-Profile (Customer + Account) erfolgreich erstellt'
        : results.stripeCustomerId
          ? 'Stripe Customer erstellt, Connect Account fehlgeschlagen'
          : results.stripeAccountId
            ? 'Stripe Connect Account erstellt, Customer fehlgeschlagen'
            : 'Beide Profile fehlgeschlagen';

    return NextResponse.json({
      success: true,
      stripeCustomerId: results.stripeCustomerId,
      stripeAccountId: results.stripeAccountId,
      message,
    });
  } catch (error) {

    let errorMessage = 'Interner Serverfehler beim Erstellen der Stripe-Profile.';

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe Fehler: ${error.message}`;

      // Spezielle Behandlung für häufige Stripe-Fehler
      if (error.code === 'email_invalid') {
        errorMessage = 'Die angegebene E-Mail-Adresse ist ungültig.';
      } else if (error.code === 'customer_creation_failed') {
        errorMessage = 'Kunde konnte nicht erstellt werden. Versuchen Sie es erneut.';
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Fehler bei der Profil-Erstellung',
      },
      { status: 500 }
    );
  }
}
