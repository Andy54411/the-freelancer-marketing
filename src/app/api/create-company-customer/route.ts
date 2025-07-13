import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin only if environment variables are available
let db: any = null;

if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (serviceAccountKey && projectId) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      if (serviceAccount.project_id) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
      }
    }
  } catch (error) {
    console.warn("Firebase Admin initialization skipped during build:", error);
  }
} else {
  db = getFirestore();
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/create-company-customer.");
}

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
}) : null;

export async function POST(request: NextRequest) {
  console.log("[API /create-company-customer] POST Anfrage empfangen.");

  if (!stripe) {
    console.error("[API /create-company-customer] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.");
    return NextResponse.json({ error: 'Stripe-Konfiguration auf dem Server fehlt.' }, { status: 500 });
  }

  if (!db) {
    console.error("[API /create-company-customer] Firebase wurde nicht initialisiert.");
    return NextResponse.json({ error: 'Firebase-Konfiguration auf dem Server fehlt.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { companyName, email, uid } = body;

    if (!companyName || typeof companyName !== 'string') {
      console.error("[API /create-company-customer] Validierungsfehler: Ungültiger Firmenname.", { companyName });
      return NextResponse.json({ error: 'Ungültiger Firmenname.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
      console.error("[API /create-company-customer] Validierungsfehler: Ungültige E-Mail.", { email });
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
    }

    if (!uid || typeof uid !== 'string') {
      console.error("[API /create-company-customer] Validierungsfehler: Ungültige UID.", { uid });
      return NextResponse.json({ error: 'Ungültige Benutzer-ID.' }, { status: 400 });
    }

    console.log("[API /create-company-customer] Erstelle Stripe Customer für Unternehmen:", {
      companyName,
      email,
      uid
    });

    // Erstelle Stripe Customer für das Unternehmen
    const customer = await stripe.customers.create({
      email: email,
      name: companyName,
      metadata: {
        firebaseUserId: uid,
        customerType: 'company',
        createdFor: 'B2B_payments',
        createdAt: new Date().toISOString()
      }
    });

    console.log("[API /create-company-customer] Stripe Customer erfolgreich erstellt:", customer.id);

    // Aktualisiere Firestore mit der neuen Customer ID
    try {
      const userDocRef = db.collection('companies').doc(uid);
      await userDocRef.update({
        stripeCustomerId: customer.id,
        customerCreatedAt: new Date(),
        customerType: 'company'
      });

      console.log("[API /create-company-customer] Firestore erfolgreich aktualisiert für UID:", uid);
    } catch (firestoreError) {
      console.warn("[API /create-company-customer] Fehler beim Aktualisieren von Firestore:", firestoreError);
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
        created: customer.created
      }
    });

  } catch (error) {
    console.error("[API /create-company-customer] Fehler beim Erstellen des Company Customers:", error);
    
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

    return NextResponse.json({
      error: errorMessage,
    }, { status: 500 });
  }
}