import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';
import { calculatePlatformFee } from '@/lib/platform-config';

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

  try {
    const body = await request.json();
    const { firebaseUserId, amount } = body;

    if (!firebaseUserId || typeof firebaseUserId !== 'string') {
      return NextResponse.json({ error: 'Ungültige Firebase User ID.' }, { status: 400 });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Ungültiger Betrag.' }, { status: 400 });
    }

    // Hole die Stripe Account ID aus der Firestore - suche in users Collection zuerst
    const userDoc = await db!.collection('users').doc(firebaseUserId).get();
    let userData: any = null;
    let stripeAccountId: string | null = null;

    if (userDoc.exists) {
      userData = userDoc.data() as any;
      stripeAccountId = userData?.stripeAccountId;
    }

    // Fallback: Suche in users Collection
    if (!stripeAccountId || !stripeAccountId.startsWith('acct_')) {
      const companyDocRef = db!.collection('users').doc(firebaseUserId);
      const companyDoc = await companyDocRef.get();
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        stripeAccountId = companyData?.stripeAccountId;
      }
    }

    // Berechne Plattformgebühr dynamisch aus der Datenbank (nur für Logging/Metadata)
    const feeCalculation = await calculatePlatformFee(amount);
    const { platformFee, payoutAmount, feeRate: platformFeeRate } = feeCalculation;

    // Prüfe verfügbares Guthaben vor Auszahlung
    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Kein Stripe Account verfügbar' }, { status: 400 });
    }

    const balance = await stripe.balance.retrieve(undefined, {
      stripeAccount: stripeAccountId,
    });

    const eurBalance = balance.available.find(b => b.currency === 'eur');
    const availableBalance = eurBalance ? eurBalance.amount : 0;

    if (availableBalance < amount) {
      return NextResponse.json(
        {
          error: 'Unzureichendes Guthaben für diese Auszahlung.',
        },
        { status: 400 }
      );
    }

    // Erstelle die Auszahlung - WICHTIG: Verwende den vollen Betrag, da Application Fee bereits beim Payment Intent abgezogen wurde
    const payout = await stripe.payouts.create(
      {
        amount: amount, // Vollbetrag - Plattformgebühr wurde bereits als Application Fee transferiert
        currency: 'eur',
        metadata: {
          firebaseUserId,
          originalAmount: amount.toString(),
          platformFee: platformFee.toString(), // Bereits als Application Fee transferiert
          feeRate: platformFeeRate.toString(),
          processedAt: new Date().toISOString(),
          note: 'Application fee already transferred to platform account',
        },
      },
      {
        stripeAccount: stripeAccountId || undefined,
      }
    );

    // Speichere die Auszahlungs-Information in Firestore (optional)
    try {
      await db
        .collection('payouts')
        .doc(payout.id)
        .set({
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
            note: 'Application fee already transferred to platform account',
          },
        });
    } catch (firestoreError) {
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
      note: 'Plattformgebühr wurde bereits beim Payment als Application Fee an das Hauptkonto transferiert',
    });
  } catch (error) {
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

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
