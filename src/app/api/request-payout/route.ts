import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

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

    // Hole die Stripe Account ID aus der Firestore
    const userDocRef = db.collection('firma').doc(firebaseUserId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.error("[API /request-payout] Benutzer nicht gefunden in Firestore.", { firebaseUserId });
      return NextResponse.json({ error: 'Benutzer nicht gefunden.' }, { status: 404 });
    }

    const userData = userDoc.data();
    const stripeAccountId = userData?.stripeAccountId;

    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      console.error("[API /request-payout] Keine gültige Stripe Account ID gefunden.", { stripeAccountId });
      return NextResponse.json({ error: 'Keine gültige Stripe Account ID gefunden.' }, { status: 400 });
    }

    console.log("[API /request-payout] Erstelle Payout für Account:", stripeAccountId, "Betrag:", amount);

    // Berechne Plattformgebühr (4.5%)
    const platformFeeRate = 0.045;
    const platformFee = Math.floor(amount * platformFeeRate);
    const payoutAmount = amount - platformFee;

    console.log("[API /request-payout] Gebührenberechnung:", {
      originalAmount: amount,
      platformFee,
      payoutAmount,
      feeRate: platformFeeRate
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

    // Erstelle die Auszahlung
    const payout = await stripe.payouts.create({
      amount: payoutAmount,
      currency: 'eur',
      metadata: {
        firebaseUserId,
        originalAmount: amount.toString(),
        platformFee: platformFee.toString(),
        feeRate: platformFeeRate.toString(),
        processedAt: new Date().toISOString()
      }
    }, {
      stripeAccount: stripeAccountId
    });

    console.log("[API /request-payout] Payout erfolgreich erstellt:", {
      payoutId: payout.id,
      amount: payoutAmount,
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
        payoutAmount,
        status: payout.status,
        createdAt: new Date(),
        metadata: {
          feeRate: platformFeeRate,
          currency: 'eur'
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
      amount: payoutAmount,
      originalAmount: amount,
      platformFee,
      status: payout.status,
      expectedArrival: 'Die Auszahlung erfolgt normalerweise innerhalb von 1-2 Werktagen.'
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
