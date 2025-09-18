import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '../../../../firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// Stripe initialization
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
    const { email, name, firebaseUserId, phone, address } = body;

    // Validierung
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
    }

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    // Prüfe zuerst in Firebase, ob bereits eine Stripe Customer ID existiert
    let existingStripeCustomerId: string | null = null;
    try {
      const userDocRef = db!.collection('users').doc(firebaseUserId);
      const userDocSnap = await userDocRef.get();

      if (userDocSnap.exists) {
        const userData = userDocSnap.data();
        existingStripeCustomerId = userData?.stripeCustomerId || null;

        if (existingStripeCustomerId && existingStripeCustomerId.startsWith('cus_')) {
          // Validiere, dass der Customer in Stripe noch existiert
          try {
            const existingCustomer = await stripe.customers.retrieve(existingStripeCustomerId);
            if (existingCustomer && !existingCustomer.deleted) {
              return NextResponse.json({
                success: true,
                stripeCustomerId: existingStripeCustomerId,
                message: 'Existierende Stripe Customer ID verwendet',
              });
            }
          } catch (stripeError) {
            existingStripeCustomerId = null;
          }
        }
      }
    } catch (firebaseError) {}

    // Erstelle neuen Stripe Customer

    const customerData: Stripe.CustomerCreateParams = {
      email: email,
      name: name || 'Taskilo Kunde',
      metadata: {
        firebaseUserId: firebaseUserId,
        customerType: 'private',
        createdFor: 'B2C_payments',
        createdAt: new Date().toISOString(),
      },
    };

    // Optionale Felder hinzufügen
    if (phone) {
      customerData.phone = phone;
    }

    if (address && address.line1 && address.postal_code && address.city && address.country) {
      customerData.address = {
        line1: address.line1,
        line2: address.line2 || undefined,
        city: address.city,
        postal_code: address.postal_code,
        state: address.state || undefined,
        country: address.country,
      };
    }

    const customer = await stripe.customers.create(customerData);

    // Speichere die Customer ID in Firebase
    try {
      const userDocRef = db!.collection('users').doc(firebaseUserId);
      await userDocRef.set(
        {
          stripeCustomerId: customer.id,
          stripeCustomerCreatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (firestoreError) {
      // Continue even if Firestore update fails, as the Stripe customer was created successfully
    }

    return NextResponse.json({
      success: true,
      stripeCustomerId: customer.id,
      message: 'Stripe Customer erfolgreich erstellt',
      customerDetails: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: customer.created,
      },
    });
  } catch (error) {
    let errorMessage = 'Interner Serverfehler beim Erstellen des Stripe Customers.';

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
        message: 'Fehler beim Erstellen des Stripe Customers',
      },
      { status: 500 }
    );
  }
}
