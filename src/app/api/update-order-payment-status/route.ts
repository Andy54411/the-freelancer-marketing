import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
let db: any = null;

try {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);

      if (!projectId && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
      }

      if (serviceAccount.project_id && projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
        console.log('[API /update-order-payment-status] Firebase Admin initialized successfully');
      }
    }
  } else {
    db = getFirestore();
    console.log('[API /update-order-payment-status] Using existing Firebase Admin instance');
  }
} catch (error) {
  console.error('[API /update-order-payment-status] Firebase Admin initialization failed:', error);
  db = null;
}

// Stripe initialization
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    console.error(
      '[API /update-order-payment-status] STRIPE_SECRET_KEY environment variable is not set'
    );
    return null;
  }

  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

export async function POST(request: NextRequest) {
  console.log('[API /update-order-payment-status] POST request received');

  const stripe = getStripeInstance();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe-Konfiguration nicht verfügbar' }, { status: 503 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Datenbank-Konfiguration nicht verfügbar' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { orderId, paymentIntentId, status } = body;

    if (!orderId || !paymentIntentId || !status) {
      return NextResponse.json(
        { error: 'Ungültige Parameter: orderId, paymentIntentId und status sind erforderlich' },
        { status: 400 }
      );
    }

    console.log('[API /update-order-payment-status] Processing:', {
      orderId,
      paymentIntentId,
      status,
    });

    // 1. Hole PaymentIntent Details von Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment ist noch nicht erfolgreich abgeschlossen' },
        { status: 400 }
      );
    }

    // 2. Hole Auftragsdaten aus Firestore
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // 3. Extrahiere Zahlungsbeträge aus PaymentIntent-Metadaten
    const companyReceives = parseInt(paymentIntent.metadata?.companyReceives || '0');
    const platformFee = parseInt(paymentIntent.metadata?.platformFee || '0');
    const totalAmount = paymentIntent.amount;

    if (companyReceives <= 0) {
      return NextResponse.json(
        { error: 'Ungültige Company-Betrag in PaymentIntent-Metadaten' },
        { status: 400 }
      );
    }

    // 4. Starte Firestore-Transaktion für atomare Updates
    await db.runTransaction(async (transaction: any) => {
      // Update Auftragsstatus - markiere TimeEntries als "platform_held"
      const updatedTimeEntries =
        orderData.timeTracking?.timeEntries?.map((entry: any) => {
          if (
            entry.category === 'additional' &&
            entry.status === 'billing_pending' &&
            entry.paymentIntentId === paymentIntentId
          ) {
            return {
              ...entry,
              status: 'platform_held',
              paidAt: new Date(),
              paymentConfirmedAt: new Date(),
            };
          }
          return entry;
        }) || [];

      // Berechne neue Statistiken
      const totalBilledHours = updatedTimeEntries
        .filter(
          (entry: any) =>
            entry.status === 'platform_held' ||
            entry.status === 'platform_released' ||
            entry.status === 'billed'
        )
        .reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0);

      // Update Auftrag
      transaction.update(orderRef, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalBilledHours': totalBilledHours,
        'timeTracking.status': 'platform_held',
        'timeTracking.lastUpdated': new Date(),
        'timeTracking.billingData': {
          ...orderData.timeTracking?.billingData,
          status: 'platform_held',
          paidAt: new Date(),
          paymentIntentId: paymentIntentId,
        },
      });

      // 5. Update Company-Guthaben (Platform Hold)
      const companyRef = db.collection('companies').doc(orderData.selectedAnbieterId);
      const companyDoc = await transaction.get(companyRef);

      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        const currentBalance = companyData.platformHoldBalance || 0;
        const currentEarnings = companyData.totalEarnings || 0;

        transaction.update(companyRef, {
          platformHoldBalance: currentBalance + companyReceives, // Geld wird gehalten
          totalEarnings: currentEarnings + companyReceives, // Gesamteinnahmen erhöhen
          lastPaymentReceived: new Date(),
          lastPaymentAmount: companyReceives,
          lastPaymentOrderId: orderId,
          lastPaymentIntentId: paymentIntentId,
          updatedAt: new Date(),
        });

        console.log('[API /update-order-payment-status] Company balance updated:', {
          companyId: orderData.selectedAnbieterId,
          newPlatformHoldBalance: currentBalance + companyReceives,
          paymentAmount: companyReceives,
        });
      } else {
        // Fallback: Update User-Dokument wenn Company nicht existiert
        const userRef = db.collection('users').doc(orderData.selectedAnbieterId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          const userData = userDoc.data();
          const currentBalance = userData.platformHoldBalance || 0;
          const currentEarnings = userData.totalEarnings || 0;

          transaction.update(userRef, {
            platformHoldBalance: currentBalance + companyReceives,
            totalEarnings: currentEarnings + companyReceives,
            lastPaymentReceived: new Date(),
            lastPaymentAmount: companyReceives,
            lastPaymentOrderId: orderId,
            lastPaymentIntentId: paymentIntentId,
            updatedAt: new Date(),
          });

          console.log('[API /update-order-payment-status] User balance updated (fallback):', {
            userId: orderData.selectedAnbieterId,
            newPlatformHoldBalance: currentBalance + companyReceives,
            paymentAmount: companyReceives,
          });
        }
      }

      // 6. Log Transaction für Audit-Trail
      const transactionLogRef = db.collection('paymentTransactions').doc();
      transaction.set(transactionLogRef, {
        orderId,
        paymentIntentId,
        providerId: orderData.selectedAnbieterId,
        customerId: orderData.customerFirebaseUid,
        type: 'additional_hours_platform_hold',
        totalAmount,
        companyReceives,
        platformFee,
        status: 'completed',
        createdAt: new Date(),
        stripePaymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
      });
    });

    console.log('[API /update-order-payment-status] Successfully updated order and company:', {
      orderId,
      paymentIntentId,
      companyReceives,
      platformFee,
      totalAmount,
    });

    return NextResponse.json({
      success: true,
      message: 'Auftrag und Company erfolgreich aktualisiert',
      orderId,
      paymentIntentId,
      companyReceives,
      platformFee,
      totalAmount,
    });
  } catch (error) {
    console.error('[API /update-order-payment-status] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    return NextResponse.json(
      { error: `Fehler beim Aktualisieren: ${errorMessage}` },
      { status: 500 }
    );
  }
}
