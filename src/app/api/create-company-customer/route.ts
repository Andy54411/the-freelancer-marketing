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

export async function POST(request: NextRequest) {
  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  if (!db) {
    return NextResponse.json(
      { error: 'Firebase-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { companyName, email, uid } = body;

    if (!companyName || typeof companyName !== 'string') {
      return NextResponse.json({ error: 'Ungültiger Firmenname.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
    }

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    // Erstelle Stripe Customer für das Unternehmen
    const customer = await stripe.customers.create({
      email: email,
      name: companyName,
      metadata: {
        firebaseUserId: uid,
        customerType: 'company',
        createdFor: 'B2B_payments',
        createdAt: new Date().toISOString(),
      },
    });

    // Aktualisiere Firestore mit der neuen Customer ID
    try {
      const userDocRef = db!.collection('users').doc(uid);
      await userDocRef.update({
        stripeCustomerId: customer.id,
        customerCreatedAt: new Date(),
        customerType: 'company',
      });
    } catch (firestoreError) {
      // Continue even if Firestore update fails, as the Stripe customer was created successfully
    }

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      message: 'Company customer erfolgreich erstellt',
      customerDetails: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: customer.created,
      },
    });
  } catch (error) {
    let errorMessage = 'Interner Serverfehler beim Erstellen des Company Customers.';

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
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
