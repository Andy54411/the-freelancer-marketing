import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { calculatePlatformFee } from '@/lib/platform-config';

// Initialize Firebase Admin only if environment variables are available
let db: any = null;

try {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    console.log("[API /request-payout] Firebase init check:", {
      hasServiceAccountKey: !!serviceAccountKey,
      hasProjectId: !!projectId,
      serviceAccountKeyLength: serviceAccountKey?.length || 0
    });
    
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      // Extract project ID from service account if not set in environment
      if (!projectId && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
        console.log("[API /request-payout] Using project ID from service account:", projectId);
      }
      
      if (serviceAccount.project_id && projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
        console.log("[API /request-payout] Firebase Admin initialized successfully");
      } else {
        console.error("[API /request-payout] Invalid service account or missing project ID");
      }
    } else {
      console.error("[API /request-payout] Missing Firebase service account key");
    }
  } else {
    db = getFirestore();
    console.log("[API /request-payout] Using existing Firebase Admin instance");
  }
} catch (error) {
  console.error("[API /request-payout] Firebase Admin initialization failed:", error);
  db = null;
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("FATAL_ERROR: Die Umgebungsvariable STRIPE_SECRET_KEY ist nicht gesetzt für die API Route /api/request-payout.");
}

const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
}) : null;

export async function POST(request: NextRequest) {
  console.log("[API /request-payout] POST Anfrage empfangen.");

  if (!stripe) {
    console.error("[API /request-payout] Stripe wurde nicht initialisiert, da STRIPE_SECRET_KEY fehlt.");
    return NextResponse.json({ error: 'Stripe-Konfiguration auf dem Server fehlt.' }, { status: 500 });
  }

  if (!db) {
    console.error("[API /request-payout] Firebase wurde nicht initialisiert.");
    return NextResponse.json({ error: 'Firebase-Konfiguration auf dem Server fehlt.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { firebaseUserId, amount } = body;

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      console.error("[API /request-payout] Validierungsfehler: Ungültige Firebase User ID.", { firebaseUserId });
      return NextResponse.json({ error: 'Ungültige Firebase User ID.' }, { status: 400 });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.error("[API /request-payout] Validierungsfehler: Ungültiger Betrag.", { amount });
      return NextResponse.json({ error: 'Ungültiger Betrag.' }, { status: 400 });
    }

    // Hole die Stripe Account ID aus der Firestore - suche in users Collection zuerst
    let userDoc = await db.collection('users').doc(firebaseUserId).get();
    let userData = null;
    let stripeAccountId = null;

    if (userDoc.exists) {
      userData = userDoc.data();
      stripeAccountId = userData?.stripeAccountId;
      console.log("[API /request-payout] Found user in users collection with stripeAccountId:", stripeAccountId);
    }

    // Fallback: Suche in companies Collection
    if (!stripeAccountId) {
      const companyDocRef = db.collection('companies').doc(firebaseUserId);
      const companyDoc = await companyDocRef.get();
      
      if (companyDoc.exists) {
        userData = companyDoc.data();
        stripeAccountId = userData?.stripeAccountId;
        console.log("[API /request-payout] Found user in companies collection with stripeAccountId:", stripeAccountId);
      }
    }

    if (!userData) {
      console.error("[API /request-payout] Benutzer nicht gefunden in Firestore.", { firebaseUserId });
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      console.error("[API /request-payout] Keine gültige Stripe Account ID gefunden.", { stripeAccountId });
      return NextResponse.json({ error: 'Keine gültige Stripe Account ID gefunden.' }, { status: 400 });
    }

    console.log("[API /request-payout] Erstelle Payout für Account:", stripeAccountId, "Betrag:", amount);

    // Berechne Plattformgebühr dynamisch aus der Datenbank (nur für Logging/Metadata)
    const feeCalculation = await calculatePlatformFee(amount);
    const { platformFee, payoutAmount, feeRate: platformFeeRate } = feeCalculation;

    console.log("[API /request-payout] Gebührenberechnung (nur für Tracking - Application Fee bereits abgezogen):", {
      originalAmount: amount,
      platformFee,
      calculatedPayoutAmount: payoutAmount,
      feeRate: platformFeeRate,
      actualPayoutAmount: amount // Der tatsächliche Payout-Betrag (ohne nochmalige Gebührenabzug)
    });

    // Prüfe verfügbares Guthaben vor Auszahlung
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId
    });

    const eurBalance = balance.available.find(b => b.currency === 'eur');
    const availableBalance = eurBalance ? eurBalance.amount : 0;

    if (availableBalance < amount) {
      console.error("[API /request-payout] Unzureichendes Guthaben.", {
        requested: amount,
        available: availableBalance
      });
      return NextResponse.json({ 
        error: 'Unzureichendes Guthaben für diese Auszahlung.' 
      }, { status: 400 });
    }

    // Erstelle die Auszahlung - WICHTIG: Verwende den vollen Betrag, da Application Fee bereits beim Payment Intent abgezogen wurde
    const payout = await stripe.payouts.create({
      amount: amount, // Vollbetrag - Plattformgebühr wurde bereits als Application Fee transferiert
      currency: 'eur',
      metadata: {
        firebaseUserId,
        originalAmount: amount.toString(),
        platformFee: platformFee.toString(), // Bereits als Application Fee transferiert
        feeRate: platformFeeRate.toString(),
        processedAt: new Date().toISOString(),
        note: 'Application fee already transferred to platform account'
      }
    }, {
      stripeAccount: stripeAccountId
    });

    console.log("[API /request-payout] Payout erfolgreich erstellt:", {
      payoutId: payout.id,
      amount: amount, // Voller Betrag ausgezahlt
      status: payout.status
    });

    // Speichere die Auszahlungs-Information in Firestore (optional)
    try {
      await db.collection('payouts').doc(payout.id).set({
        firebaseUserId,
        stripeAccountId,
        payoutId: payout.id,
        originalAmount: amount,
        platformFee,
        actualPayoutAmount: amount, // Tatsächlich ausgezahlter Betrag (ohne doppelte Gebührenabzug)
        status: payout.status,
        createdAt: new Date(),
        metadata: {
          feeRate: platformFeeRate,
          currency: 'eur',
          note: 'Application fee already transferred to platform account'
        }
      });
      console.log("[API /request-payout] Payout-Information in Firestore gespeichert.");
    } catch (firestoreError) {
      console.warn("[API /request-payout] Fehler beim Speichern in Firestore:", firestoreError);
      // Continue even if Firestore save fails
    }

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      amount: amount, // Tatsächlich ausgezahlter Betrag (voller verfügbarer Betrag)
      originalAmount: amount,
      platformFee,
      status: payout.status,
      expectedArrival: 'Die Auszahlung erfolgt normalerweise innerhalb von 1-2 Werktagen.',
      note: 'Plattformgebühr wurde bereits beim Payment als Application Fee an das Hauptkonto transferiert'
    });

  } catch (error) {
    console.error("[API /request-payout] Fehler bei der Auszahlung:", error);
    
    let errorMessage = 'Interner Serverfehler bei der Auszahlung.';
    
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe Fehler: ${error.message}`;
      
      // Spezielle Behandlung für häufige Stripe-Fehler
      if (error.code === 'insufficient_funds') {
        errorMessage = 'Unzureichendes Guthaben für diese Auszahlung.';
      } else if (error.code === 'account_invalid') {
        errorMessage = 'Ihr Stripe-Konto ist nicht für Auszahlungen eingerichtet.';
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({
      error: errorMessage,
    }, { status: 500 });
  }
}