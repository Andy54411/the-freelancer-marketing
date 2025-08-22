import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '../../../../firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// Stripe initialization
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error(
      'FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/stripe/get-or-create-customer.'
    );
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  console.log('[API /stripe/get-or-create-customer] POST Anfrage empfangen.');

  const stripe = getStripeInstance();
  if (!stripe) {
    console.error(
      '[API /stripe/get-or-create-customer] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.'
    );
    return NextResponse.json(
      { error: 'Stripe-Konfiguration auf dem Server fehlt.' },
      { status: 500 }
    );
  }

  if (!db) {
    console.error('[API /stripe/get-or-create-customer] Firebase wurde nicht initialisiert.');
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
      console.error('[API /stripe/get-or-create-customer] Validierungsfehler: Ungültige E-Mail.', {
        email,
      });
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
    }

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      console.error('[API /stripe/get-or-create-customer] Validierungsfehler: Ungültige Firebase User ID.', {
        firebaseUserId,
      });
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    console.log('[API /stripe/get-or-create-customer] Prüfe existierende Stripe Customer ID für Benutzer:', {
      firebaseUserId,
      email,
      name,
    });

    // Prüfe zuerst in Firebase, ob bereits eine Stripe Customer ID existiert
    let existingStripeCustomerId: string | null = null;
    try {
      const userDocRef = db.collection('users').doc(firebaseUserId);
      const userDocSnap = await userDocRef.get();
      
      if (userDocSnap.exists) {
        const userData = userDocSnap.data();
        existingStripeCustomerId = userData?.stripeCustomerId || null;
        
        if (existingStripeCustomerId && existingStripeCustomerId.startsWith('cus_')) {
          console.log('[API /stripe/get-or-create-customer] Existierende Stripe Customer ID gefunden:', existingStripeCustomerId);
          
          // Validiere, dass der Customer in Stripe noch existiert
          try {
            const existingCustomer = await stripe.customers.retrieve(existingStripeCustomerId);
            if (existingCustomer && !existingCustomer.deleted) {
              console.log('[API /stripe/get-or-create-customer] Stripe Customer validiert, verwende existierende ID.');
              return NextResponse.json({
                success: true,
                stripeCustomerId: existingStripeCustomerId,
                message: 'Existierende Stripe Customer ID verwendet',
              });
            }
          } catch (stripeError) {
            console.warn('[API /stripe/get-or-create-customer] Stripe Customer nicht mehr gültig, erstelle neuen:', stripeError);
            existingStripeCustomerId = null;
          }
        }
      }
    } catch (firebaseError) {
      console.warn('[API /stripe/get-or-create-customer] Firebase-Abfrage fehlgeschlagen, erstelle neuen Customer:', firebaseError);
    }

    // Erstelle neuen Stripe Customer
    console.log('[API /stripe/get-or-create-customer] Erstelle neuen Stripe Customer.');
    
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

    console.log('[API /stripe/get-or-create-customer] Stripe Customer erfolgreich erstellt:', customer.id);

    // Speichere die Customer ID in Firebase
    try {
      const userDocRef = db.collection('users').doc(firebaseUserId);
      await userDocRef.set({
        stripeCustomerId: customer.id,
        stripeCustomerCreatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('[API /stripe/get-or-create-customer] Firebase erfolgreich aktualisiert für User:', firebaseUserId);
    } catch (firestoreError) {
      console.warn('[API /stripe/get-or-create-customer] Fehler beim Aktualisieren von Firebase:', firestoreError);
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
    console.error('[API /stripe/get-or-create-customer] Fehler beim Verarbeiten der Anfrage:', error);

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
