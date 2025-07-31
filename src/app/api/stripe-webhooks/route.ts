// src/app/api/stripe-webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, admin } from '@/firebase/server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Rate limiting for error logs to prevent Sentry overload
const errorLogCache = new Map<string, number>();
const ERROR_LOG_COOLDOWN = 60000; // 1 minute cooldown per error type

function shouldLogError(errorKey: string): boolean {
  const now = Date.now();
  const lastLog = errorLogCache.get(errorKey);

  if (!lastLog || now - lastLog > ERROR_LOG_COOLDOWN) {
    errorLogCache.set(errorKey, now);
    return true;
  }
  return false;
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    const errorKey = 'stripe_not_configured';
    if (shouldLogError(errorKey)) {
      console.error('[WEBHOOK ERROR] Stripe ist nicht konfiguriert.');
    }
    return NextResponse.json(
      { received: false, error: 'Stripe nicht konfiguriert' },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    const errorKey = 'webhook_secret_missing';
    if (shouldLogError(errorKey)) {
      console.error('[WEBHOOK ERROR] STRIPE_WEBHOOK_SECRET ist nicht gesetzt.');
    }
    return NextResponse.json(
      { received: false, error: 'Webhook secret nicht konfiguriert' },
      { status: 500 }
    );
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      const errorKey = 'missing_signature';
      if (shouldLogError(errorKey)) {
        console.error('[WEBHOOK ERROR] Keine Stripe-Signatur gefunden.');
      }
      return NextResponse.json({ received: false, error: 'Keine Signatur' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`[WEBHOOK LOG] Event empfangen: ${event.type} (${event.id})`);
    } catch (err: unknown) {
      let errorMessage = 'Fehler bei der Webhook-Verifikation.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      const errorKey = `webhook_verification_${errorMessage.slice(0, 20)}`;
      if (shouldLogError(errorKey)) {
        console.error(`[WEBHOOK ERROR] ${errorMessage}`, err);
      }
      return NextResponse.json({ received: false, error: errorMessage }, { status: 400 });
    }

    switch (event.type) {
      case 'charge.succeeded': {
        const chargeSucceeded = event.data.object as Stripe.Charge;
        console.log(`[WEBHOOK LOG] charge.succeeded: ${chargeSucceeded.id}`);

        // DUAL SUPPORT: Check both 'type' (for additional_hours) and 'paymentType' (for B2B)
        const paymentType = chargeSucceeded.metadata?.type || chargeSucceeded.metadata?.paymentType;

        // Handle additional hours payments
        if (paymentType === 'additional_hours_platform_hold') {
          console.log(
            `[WEBHOOK LOG] Processing additional hours payment (charge): ${chargeSucceeded.id}`
          );

          const orderId = chargeSucceeded.metadata?.orderId;
          const entryIds = chargeSucceeded.metadata?.entryIds;

          if (!orderId || !entryIds) {
            const errorKey = `missing_metadata_charge_${chargeSucceeded.id}`;
            if (shouldLogError(errorKey)) {
              console.error(
                `[WEBHOOK ERROR] Fehlende Metadaten für zusätzliche Stunden im Charge ${chargeSucceeded.id}. orderId: ${orderId}, entryIds: ${entryIds}`
              );
            }
            return NextResponse.json({
              received: true,
              message: 'Wichtige Metadaten (orderId oder entryIds) für zusätzliche Stunden fehlen.',
            });
          }

          try {
            const entryIdsList = entryIds.split(',');
            const orderRef = db.collection('auftraege').doc(orderId);

            await db.runTransaction(async transaction => {
              const orderSnapshot = await transaction.get(orderRef);

              if (!orderSnapshot.exists) {
                throw new Error(`Auftrag ${orderId} nicht gefunden.`);
              }

              const orderData = orderSnapshot.data()!;

              // Update time entries status to 'transferred' in the timeTracking.timeEntries ARRAY
              const timeTracking = orderData.timeTracking;
              if (timeTracking && timeTracking.timeEntries) {
                const now = new Date();
                const updatedTimeEntries = timeTracking.timeEntries.map((entry: any) => {
                  if (entryIdsList.includes(entry.id)) {
                    console.log(
                      `[WEBHOOK LOG] TimeEntry ${entry.id} marked as transferred (paid) via charge.succeeded`
                    );
                    return {
                      ...entry,
                      status: 'transferred', // CRITICAL: Change status to transferred
                      billingStatus: 'transferred', // Also update billingStatus
                      paidAt: now,
                      paymentIntentId: chargeSucceeded.payment_intent,
                      lastUpdated: now.toISOString(),
                      transferredAt: now.toISOString(),
                    };
                  }
                  return entry;
                });

                // Update billingData status to completed
                const updatedBillingData = {
                  ...timeTracking.billingData,
                  status: 'completed', // CRITICAL: Mark billing as completed
                  completedAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                };

                // AUTO-CHECK: If all additional entries are now transferred, mark main timeTracking as completed
                const allAdditionalEntries = updatedTimeEntries.filter(
                  (entry: any) => entry.category === 'additional'
                );
                const allAdditionalTransferred =
                  allAdditionalEntries.length === 0 ||
                  allAdditionalEntries.every((entry: any) => entry.status === 'transferred');

                let timeTrackingStatus = timeTracking.status;
                if (allAdditionalTransferred && timeTrackingStatus !== 'completed') {
                  timeTrackingStatus = 'completed';
                  console.log(
                    `[WEBHOOK LOG] All additional hours transferred (charge) - setting timeTracking.status to 'completed' for order ${orderId}`
                  );
                }

                // Update the entire timeTracking object
                transaction.update(orderRef, {
                  'timeTracking.timeEntries': updatedTimeEntries,
                  'timeTracking.billingData': updatedBillingData,
                  'timeTracking.status': timeTrackingStatus, // AUTO-UPDATE: Main status when all paid
                  'timeTracking.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
                  lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            });

            console.log(
              `[WEBHOOK LOG] Additional hours payment (charge) processed successfully for order ${orderId}`
            );
          } catch (dbError: unknown) {
            let dbErrorMessage =
              'Unbekannter Datenbankfehler bei der Verarbeitung zusätzlicher Stunden (charge).';
            if (dbError instanceof Error) {
              dbErrorMessage = dbError.message;
            }
            const errorKey = `db_additional_hours_charge_${orderId}`;
            if (shouldLogError(errorKey)) {
              console.error(`[WEBHOOK ERROR] Fehler bei zusätzlichen Stunden (charge):`, dbError);
            }
            return NextResponse.json({
              received: true,
              message: `Additional hours processing (charge) failed: ${dbErrorMessage}`,
            });
          }
          break;
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        console.log(`[WEBHOOK LOG] payment_intent.succeeded: ${paymentIntentSucceeded.id}`);

        // DUAL SUPPORT: Check both 'type' (for additional_hours) and 'paymentType' (for B2B)
        const paymentType =
          paymentIntentSucceeded.metadata?.type || paymentIntentSucceeded.metadata?.paymentType;

        // Handle additional hours payments
        if (paymentType === 'additional_hours_platform_hold') {
          console.log(
            `[WEBHOOK LOG] Processing additional hours payment: ${paymentIntentSucceeded.id}`
          );

          const orderId = paymentIntentSucceeded.metadata?.orderId;
          const entryIds = paymentIntentSucceeded.metadata?.entryIds;

          if (!orderId || !entryIds) {
            const errorKey = `missing_metadata_${paymentIntentSucceeded.id}`;
            if (shouldLogError(errorKey)) {
              console.error(
                `[WEBHOOK ERROR] Fehlende Metadaten für zusätzliche Stunden im PI ${paymentIntentSucceeded.id}. orderId: ${orderId}, entryIds: ${entryIds}`
              );
            }
            return NextResponse.json({
              received: true,
              message: 'Wichtige Metadaten (orderId oder entryIds) für zusätzliche Stunden fehlen.',
            });
          }

          try {
            const entryIdsList = entryIds.split(',');
            const orderRef = db.collection('auftraege').doc(orderId);

            await db.runTransaction(async transaction => {
              const orderSnapshot = await transaction.get(orderRef);

              if (!orderSnapshot.exists) {
                throw new Error(`Auftrag ${orderId} nicht gefunden.`);
              }

              const orderData = orderSnapshot.data()!;

              // Update time entries status to 'transferred' in the timeTracking.timeEntries ARRAY
              const timeTracking = orderData.timeTracking;
              if (timeTracking && timeTracking.timeEntries) {
                const now = new Date();
                const updatedTimeEntries = timeTracking.timeEntries.map((entry: any) => {
                  if (entryIdsList.includes(entry.id)) {
                    console.log(`[WEBHOOK LOG] TimeEntry ${entry.id} marked as transferred (paid)`);
                    return {
                      ...entry,
                      status: 'transferred', // CRITICAL: Change status to transferred
                      billingStatus: 'transferred', // Also update billingStatus
                      paidAt: now,
                      paymentIntentId: paymentIntentSucceeded.id,
                      lastUpdated: now.toISOString(),
                      transferredAt: now.toISOString(),
                    };
                  }
                  return entry;
                });

                // Update billingData status to completed
                const updatedBillingData = {
                  ...timeTracking.billingData,
                  status: 'completed', // CRITICAL: Mark billing as completed
                  completedAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                };

                // AUTO-CHECK: If all additional entries are now transferred, mark main timeTracking as completed
                const allAdditionalEntries = updatedTimeEntries.filter(
                  (entry: any) => entry.category === 'additional'
                );
                const allAdditionalTransferred =
                  allAdditionalEntries.length === 0 ||
                  allAdditionalEntries.every((entry: any) => entry.status === 'transferred');

                let timeTrackingStatus = timeTracking.status;
                if (allAdditionalTransferred && timeTrackingStatus !== 'completed') {
                  timeTrackingStatus = 'completed';
                  console.log(
                    `[WEBHOOK LOG] All additional hours transferred (payment_intent) - setting timeTracking.status to 'completed' for order ${orderId}`
                  );
                }

                // Update the entire timeTracking object
                transaction.update(orderRef, {
                  'timeTracking.timeEntries': updatedTimeEntries,
                  'timeTracking.billingData': updatedBillingData,
                  'timeTracking.status': timeTrackingStatus, // AUTO-UPDATE: Main status when all paid
                  'timeTracking.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
                  lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                });
              }

              // Update company balance
              const providerStripeAccountId =
                paymentIntentSucceeded.metadata?.providerStripeAccountId;
              const companyReceives = paymentIntentSucceeded.metadata?.companyReceives;

              if (providerStripeAccountId && companyReceives) {
                const companyRef = db
                  .collection('companies')
                  .where('anbieterStripeAccountId', '==', providerStripeAccountId)
                  .limit(1);
                const companySnapshot = await companyRef.get();

                if (!companySnapshot.empty) {
                  const companyDoc = companySnapshot.docs[0];
                  const currentBalance = companyDoc.data().platformHoldBalance || 0;
                  const additionalAmount = parseInt(companyReceives, 10);

                  transaction.update(companyDoc.ref, {
                    platformHoldBalance: currentBalance + additionalAmount,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  console.log(
                    `[WEBHOOK LOG] Company balance updated: +${additionalAmount} cents (Platform Hold)`
                  );

                  // Create audit trail
                  const auditRef = companyDoc.ref.collection('balanceHistory').doc();
                  transaction.set(auditRef, {
                    type: 'additional_hours_payment',
                    amount: additionalAmount,
                    paymentIntentId: paymentIntentSucceeded.id,
                    orderId: orderId,
                    entryIds: entryIdsList,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'platform_held',
                  });
                }
              }
            });

            // NEU: Transfer money to Connect account (AFTER the transaction)
            const providerStripeAccountId =
              paymentIntentSucceeded.metadata?.providerStripeAccountId;
            const companyReceives = paymentIntentSucceeded.metadata?.companyReceives;

            console.log(
              `[WEBHOOK DEBUG] Transfer data check: providerStripeAccountId=${providerStripeAccountId}, companyReceives=${companyReceives}`
            );

            if (providerStripeAccountId && companyReceives) {
              const transferAmount = parseInt(companyReceives, 10);

              console.log(
                `[WEBHOOK LOG] Creating transfer to Connect account ${providerStripeAccountId}: ${transferAmount} cents for order ${orderId}`
              );

              try {
                // Prüfe erst, ob das Connect-Konto existiert und empfangsfähig ist
                const connectAccount = await stripe.accounts.retrieve(providerStripeAccountId);
                console.log(
                  `[WEBHOOK DEBUG] Connect account status: ${connectAccount.charges_enabled}, payouts_enabled: ${connectAccount.payouts_enabled}`
                );

                if (!connectAccount.charges_enabled) {
                  console.error(
                    `[WEBHOOK ERROR] Connect account ${providerStripeAccountId} is not charges_enabled`
                  );
                  // Trotzdem weitermachen, aber warnen
                }

                const transfer = await stripe.transfers.create({
                  amount: transferAmount,
                  currency: 'eur',
                  destination: providerStripeAccountId,
                  description: `Zusätzliche Arbeitsstunden für Auftrag ${orderId}`,
                  metadata: {
                    type: 'additional_hours_platform_hold',
                    orderId: orderId,
                    paymentIntentId: paymentIntentSucceeded.id,
                    entryIds: entryIds,
                    originalEventId: event.id,
                  },
                });

                console.log(
                  `[WEBHOOK SUCCESS] Transfer created successfully: ${transfer.id} - ${transferAmount} cents to ${providerStripeAccountId} for order ${orderId}`
                );

                // Update company document with transfer info
                const companyRef = db
                  .collection('companies')
                  .where('anbieterStripeAccountId', '==', providerStripeAccountId)
                  .limit(1);
                const companySnapshot = await companyRef.get();

                if (!companySnapshot.empty) {
                  const companyDoc = companySnapshot.docs[0];
                  await companyDoc.ref.update({
                    lastTransferId: transfer.id,
                    lastTransferAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastTransferAmount: transferAmount,
                    lastTransferOrderId: orderId,
                  });
                  console.log(
                    `[WEBHOOK LOG] Company document updated with transfer info: ${transfer.id}`
                  );
                } else {
                  console.error(
                    `[WEBHOOK ERROR] No company found with anbieterStripeAccountId: ${providerStripeAccountId}`
                  );
                }
              } catch (transferError: unknown) {
                let transferErrorMessage = 'Unbekannter Transfer-Fehler';
                if (transferError instanceof Error) {
                  transferErrorMessage = transferError.message;
                }
                const errorKey = `transfer_error_${orderId}_${Date.now()}`;
                if (shouldLogError(errorKey)) {
                  console.error(
                    `[WEBHOOK ERROR] Transfer failed for order ${orderId} to account ${providerStripeAccountId}:`,
                    transferError
                  );
                  console.error(
                    `[WEBHOOK ERROR] Transfer details: amount=${transferAmount}, currency=eur, destination=${providerStripeAccountId}`
                  );
                }
                // Continue processing even if transfer fails - important for webhook reliability
                // Aber versuche einen Retry-Mechanismus zu implementieren
                try {
                  // Speichere failed transfer für später retry
                  await db.collection('failedTransfers').add({
                    orderId: orderId,
                    paymentIntentId: paymentIntentSucceeded.id,
                    providerStripeAccountId: providerStripeAccountId,
                    amount: transferAmount,
                    error: transferErrorMessage,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    retryCount: 0,
                    status: 'pending_retry',
                  });
                  console.log(
                    `[WEBHOOK LOG] Failed transfer saved for retry: order ${orderId}, amount ${transferAmount}`
                  );
                } catch (saveError) {
                  console.error(`[WEBHOOK ERROR] Failed to save failed transfer:`, saveError);
                }
              }
            } else {
              console.error(
                `[WEBHOOK ERROR] Missing transfer data for additional hours payment ${paymentIntentSucceeded.id}: providerStripeAccountId=${providerStripeAccountId}, companyReceives=${companyReceives}`
              );
            }

            console.log(
              `[WEBHOOK LOG] Additional hours payment processed successfully for order ${orderId}`
            );
          } catch (dbError: unknown) {
            let dbErrorMessage =
              'Unbekannter Datenbankfehler bei der Verarbeitung zusätzlicher Stunden.';
            if (dbError instanceof Error) {
              dbErrorMessage = dbError.message;
            }
            const errorKey = `db_additional_hours_${orderId}`;
            if (shouldLogError(errorKey)) {
              console.error(`[WEBHOOK ERROR] Fehler bei zusätzlichen Stunden:`, dbError);
            }
            return NextResponse.json({
              received: true,
              message: `Additional hours processing failed: ${dbErrorMessage}`,
            });
          }
          break;
        }

        // Handle B2B Provider Booking payments (from ProviderBookingModal)
        if (paymentType === 'b2b_payment' || paymentType === 'b2b_project') {
          console.log(
            `[WEBHOOK LOG] Processing B2B Provider Booking payment: ${paymentIntentSucceeded.id} (type: ${paymentType})`
          );

          // DEBUG: Log alle Metadaten für B2B Payments
          console.log(`[WEBHOOK DEBUG] B2B Payment Metadaten:`, {
            paymentType,
            customerFirebaseId: paymentIntentSucceeded.metadata?.customerFirebaseId,
            providerFirebaseId: paymentIntentSucceeded.metadata?.providerFirebaseId,
            projectId: paymentIntentSucceeded.metadata?.projectId,
            projectTitle: paymentIntentSucceeded.metadata?.projectTitle,
            allMetadata: paymentIntentSucceeded.metadata,
          });

          const customerFirebaseId = paymentIntentSucceeded.metadata?.customerFirebaseId;
          const providerFirebaseId = paymentIntentSucceeded.metadata?.providerFirebaseId;
          const projectId = paymentIntentSucceeded.metadata?.projectId;
          const projectTitle = paymentIntentSucceeded.metadata?.projectTitle;
          const projectDescription = paymentIntentSucceeded.metadata?.projectDescription;

          if (!customerFirebaseId || !providerFirebaseId) {
            const errorKey = `missing_b2b_metadata_${paymentIntentSucceeded.id}`;
            if (shouldLogError(errorKey)) {
              console.error(
                `[WEBHOOK ERROR] Fehlende B2B-Metadaten im PI ${paymentIntentSucceeded.id}. customerFirebaseId: ${customerFirebaseId}, providerFirebaseId: ${providerFirebaseId}`
              );
            }
            return NextResponse.json({
              received: true,
              message:
                'Wichtige B2B-Metadaten (customerFirebaseId oder providerFirebaseId) fehlen.',
            });
          }

          try {
            // CREATE B2B ORDER IN WEBHOOK (wie bei B2C-Orders)
            const auftragCollectionRef = db.collection('auftraege');

            await db.runTransaction(async transaction => {
              // Generiere eine eindeutige Auftrags-ID
              const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              // Berechne B2B-spezifische Daten
              const totalAmountCents = paymentIntentSucceeded.amount;
              const platformFeeAmount = paymentIntentSucceeded.application_fee_amount || 0;
              const providerReceives = totalAmountCents - platformFeeAmount;

              // Berechne Clearing-Periode (7 Tage für B2B)
              const clearingPeriodDays = 7;
              const paidAtDate = new Date();
              const clearingEndsDate = new Date(
                paidAtDate.getTime() + clearingPeriodDays * 24 * 60 * 60 * 1000
              );
              const clearingPeriodEndsAtTimestamp =
                admin.firestore.Timestamp.fromDate(clearingEndsDate);

              // B2B Order Data Structure
              const b2bOrderData = {
                // IDs
                id: orderId,
                customerFirebaseUid: customerFirebaseId,
                kundeId: customerFirebaseId,
                selectedAnbieterId: providerFirebaseId,

                // B2B-spezifische Felder
                customerType: 'firma',
                paymentType: paymentType, // Verwende den echten paymentType (b2b_payment oder b2b_project)
                projectId: projectId || '',
                projectTitle: projectTitle || 'B2B Service-Buchung',

                // Service-Details aus Metadaten
                description: projectDescription || 'B2B Dienstleistung',
                selectedCategory: 'B2B Service',
                selectedSubcategory: 'Business Service',

                // Payment & Pricing (in Cents)
                jobCalculatedPriceInCents: totalAmountCents,
                originalJobPriceInCents: totalAmountCents,
                totalAmountPaidByBuyer: totalAmountCents,

                // B2B Platform-Gebühren (4.5% für B2B)
                sellerCommissionInCents: platformFeeAmount,
                totalPlatformFeeInCents: platformFeeAmount,
                buyerServiceFeeInCents: 0, // B2B-Kunden zahlen keine Service-Gebühr

                // Payment-Details
                paymentIntentId: paymentIntentSucceeded.id,
                paidAt: admin.firestore.FieldValue.serverTimestamp(),

                // Status & Zeiten
                status: 'zahlung_erhalten_clearing',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),

                // Clearing (7 Tage für B2B)
                clearingPeriodEndsAt: clearingPeriodEndsAtTimestamp,
                buyerApprovedAt: null,

                // Stripe-Details
                paymentMethodId:
                  typeof paymentIntentSucceeded.payment_method === 'string'
                    ? paymentIntentSucceeded.payment_method
                    : paymentIntentSucceeded.payment_method &&
                        typeof paymentIntentSucceeded.payment_method === 'object' &&
                        'id' in paymentIntentSucceeded.payment_method
                      ? (paymentIntentSucceeded.payment_method as Stripe.PaymentMethod).id
                      : null,
                stripeCustomerId:
                  typeof paymentIntentSucceeded.customer === 'string'
                    ? paymentIntentSucceeded.customer
                    : paymentIntentSucceeded.customer &&
                        typeof paymentIntentSucceeded.customer === 'object' &&
                        'id' in paymentIntentSucceeded.customer
                      ? (paymentIntentSucceeded.customer as Stripe.Customer).id
                      : null,

                // Lokation (Standard für B2B)
                jobCountry: 'DE',
                jobPostalCode: null,
                jobCity: null,
                jobStreet: null,

                // B2B Defaults für fehlende Felder
                jobDateFrom: new Date().toISOString().split('T')[0],
                jobDateTo: new Date().toISOString().split('T')[0],
                jobTimePreference: 'Flexible Terminabsprache',
                jobDurationString: 'Nach Absprache',
                jobTotalCalculatedHours: 0, // Wird später durch Zeiterfassung bestimmt
              };

              const newAuftragRef = auftragCollectionRef.doc(orderId);
              transaction.set(newAuftragRef, b2bOrderData);

              console.log(
                `[WEBHOOK LOG] B2B Order ${orderId} erfolgreich erstellt für Payment ${paymentIntentSucceeded.id}`
              );
            });

            return NextResponse.json({
              received: true,
              message: 'B2B payment and order processed successfully',
            });
          } catch (b2bError: unknown) {
            let b2bErrorMessage = 'Unbekannter Fehler bei B2B-Order-Erstellung.';
            if (b2bError instanceof Error) {
              b2bErrorMessage = b2bError.message;
            }
            const errorKey = `b2b_order_creation_${paymentIntentSucceeded.id}`;
            if (shouldLogError(errorKey)) {
              console.error(`[WEBHOOK ERROR] B2B Order Creation Fehler:`, b2bError);
            }
            return NextResponse.json({
              received: true,
              message: `B2B order creation failed: ${b2bErrorMessage}`,
            });
          }
        }

        // Handle regular order payments
        const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
        const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;

        if (!tempJobDraftId || !firebaseUserId) {
          const errorKey = `missing_draft_metadata_${paymentIntentSucceeded.id}`;
          if (shouldLogError(errorKey)) {
            console.error(
              `[WEBHOOK ERROR] Fehlende Metadaten im PI ${paymentIntentSucceeded.id}. tempJobDraftId: ${tempJobDraftId}, firebaseUserId: ${firebaseUserId}`
            );
          }
          // Wichtig: Trotzdem 200 an Stripe senden, um Wiederholungen zu vermeiden, aber den Fehler loggen.
          return NextResponse.json({
            received: true,
            message: 'Wichtige Metadaten (tempJobDraftId oder firebaseUserId) fehlen.',
          });
        }

        try {
          const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
          const auftragCollectionRef = db.collection('auftraege');

          await db.runTransaction(async transaction => {
            const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);

            if (tempJobDraftSnapshot.data()?.status === 'converted') {
              console.log(
                `[WEBHOOK LOG] Job-Entwurf ${tempJobDraftId} wurde bereits konvertiert. Überspringe.`
              );
              return;
            }
            if (!tempJobDraftSnapshot.exists) {
              throw new Error(`Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden.`);
            }

            const tempJobDraftData = tempJobDraftSnapshot.data()!; // Non-null assertion, da Existenz geprüft

            // Berechnung für die Clearing-Periode (z.B. 14 Tage)
            const clearingPeriodDays = 14;
            const paidAtDate = new Date(); // Zeitpunkt der erfolgreichen Zahlung
            const clearingEndsDate = new Date(
              paidAtDate.getTime() + clearingPeriodDays * 24 * 60 * 60 * 1000
            );
            const clearingPeriodEndsAtTimestamp =
              admin.firestore.Timestamp.fromDate(clearingEndsDate);

            // KRITISCHE KORREKTUR: Berechne jobTotalCalculatedHours neu für Multi-Tag Aufträge
            let correctedJobTotalCalculatedHours = tempJobDraftData.jobTotalCalculatedHours;

            // Prüfe, ob es ein Multi-Tag Auftrag ist und korrigiere die Stunden
            if (tempJobDraftData.jobDateFrom && tempJobDraftData.jobDateTo) {
              const startDate = new Date(tempJobDraftData.jobDateFrom);
              const endDate = new Date(tempJobDraftData.jobDateTo);

              if (startDate.getTime() !== endDate.getTime()) {
                // Multi-Tag Auftrag: Berechne Tage und multipliziere
                const daysDiff =
                  Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                // Extrahiere Stunden pro Tag aus jobDurationString
                const durationMatch = tempJobDraftData.jobDurationString?.match(/(\d+(\.\d+)?)/);
                const hoursPerDay = durationMatch ? parseFloat(durationMatch[1]) : 8; // Fallback auf 8 Stunden

                correctedJobTotalCalculatedHours = hoursPerDay * daysDiff;
                console.log(
                  `[WEBHOOK CORRECTION] Multi-Tag Auftrag korrigiert: ${daysDiff} Tage × ${hoursPerDay}h = ${correctedJobTotalCalculatedHours}h`
                );
              }
            }

            const auftragData = {
              ...tempJobDraftData,
              jobTotalCalculatedHours: correctedJobTotalCalculatedHours, // KORRIGIERTE Stunden verwenden
              status: 'zahlung_erhalten_clearing', // Neuer Status für die Clearing-Periode
              paymentIntentId: paymentIntentSucceeded.id,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
              customerFirebaseUid: firebaseUserId,
              tempJobDraftRefId: tempJobDraftId,
              // Detaillierte Preiskomponenten aus Metadaten (Strings in Zahlen umwandeln)
              originalJobPriceInCents: paymentIntentSucceeded.metadata?.originalJobPriceInCents
                ? parseInt(paymentIntentSucceeded.metadata.originalJobPriceInCents, 10)
                : 0,
              buyerServiceFeeInCents: paymentIntentSucceeded.metadata?.buyerServiceFeeInCents
                ? parseInt(paymentIntentSucceeded.metadata.buyerServiceFeeInCents, 10)
                : 0,
              sellerCommissionInCents: paymentIntentSucceeded.metadata?.sellerCommissionInCents
                ? parseInt(paymentIntentSucceeded.metadata.sellerCommissionInCents, 10)
                : 0,
              totalPlatformFeeInCents: paymentIntentSucceeded.metadata?.totalPlatformFeeInCents
                ? parseInt(paymentIntentSucceeded.metadata.totalPlatformFeeInCents, 10)
                : paymentIntentSucceeded.application_fee_amount || 0,
              totalAmountPaidByBuyer: paymentIntentSucceeded.amount, // Gesamtbetrag, den der Käufer gezahlt hat
              applicationFeeAmountFromStripe: paymentIntentSucceeded.application_fee_amount || 0, // Direkter Wert von Stripe
              // Stelle sicher, dass createdAt ein gültiger Timestamp ist
              createdAt: new admin.firestore.Timestamp(
                tempJobDraftData?.createdAt?._seconds || Math.floor(Date.now() / 1000),
                tempJobDraftData?.createdAt?._nanoseconds || 0
              ),
              paymentMethodId:
                typeof paymentIntentSucceeded.payment_method === 'string'
                  ? paymentIntentSucceeded.payment_method
                  : paymentIntentSucceeded.payment_method &&
                      typeof paymentIntentSucceeded.payment_method === 'object' &&
                      'id' in paymentIntentSucceeded.payment_method
                    ? (paymentIntentSucceeded.payment_method as Stripe.PaymentMethod).id
                    : null,
              stripeCustomerId:
                typeof paymentIntentSucceeded.customer === 'string'
                  ? paymentIntentSucceeded.customer
                  : paymentIntentSucceeded.customer &&
                      typeof paymentIntentSucceeded.customer === 'object' &&
                      'id' in paymentIntentSucceeded.customer
                    ? (paymentIntentSucceeded.customer as Stripe.Customer).id
                    : null,
              clearingPeriodEndsAt: clearingPeriodEndsAtTimestamp,
              buyerApprovedAt: null, // Wird später gesetzt
            };

            const newAuftragRef = auftragCollectionRef.doc();
            transaction.set(newAuftragRef, auftragData);

            transaction.update(tempJobDraftRef, {
              status: 'converted',
              convertedToOrderId: newAuftragRef.id,
            });
          });
          console.log(
            `[WEBHOOK LOG] Transaktion für Job ${tempJobDraftId} erfolgreich abgeschlossen.`
          );
        } catch (dbError: unknown) {
          // dbError ist hier vom Typ unknown
          let dbErrorMessage = 'Unbekannter Datenbankfehler bei der Job-Konvertierung.';
          if (dbError instanceof Error) {
            dbErrorMessage = dbError.message;
          }
          const errorKey = `db_job_conversion_${tempJobDraftId}`;
          if (shouldLogError(errorKey)) {
            console.error(`[WEBHOOK ERROR] Fehler in der Transaktion:`, dbError);
          }
          return NextResponse.json({
            received: true,
            message: `Job conversion failed: ${dbErrorMessage}`,
          });
        }
        break;
      }
      // ... andere cases ...
      // Z.B. setup_intent.succeeded für das Speichern von Zahlungsmethoden
      // case 'setup_intent.succeeded': { ... }
      default:
        // Es ist wichtig, für unbehandelte Events trotzdem 200 OK zu senden,
        // damit Stripe nicht versucht, sie erneut zu senden.
        console.log(`[WEBHOOK LOG] Unbehandelter Event-Typ ${event.type}.`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    let errorMessage = 'Unbekannter Fehler beim Verarbeiten des Webhooks.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const errorKey = `webhook_general_error`;
    if (shouldLogError(errorKey)) {
      console.error('[WEBHOOK ERROR] Fehler beim Verarbeiten des Webhooks:', error);
    }
    return NextResponse.json({ received: false, error: errorMessage }, { status: 500 });
  }
}

// Andere HTTP-Methoden nicht erlaubt
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
