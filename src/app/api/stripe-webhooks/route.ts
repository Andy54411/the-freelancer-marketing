// src/app/api/stripe-webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, admin, isFirebaseAvailable } from '@/firebase/server';
import { OrderNotificationService } from '../../../lib/order-notifications';

// CRITICAL: Disable body parsing to get raw body for Stripe signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  // Check if Firebase is properly initialized
  if (!isFirebaseAvailable() || !db) {
    console.error('Firebase not initialized');
    return NextResponse.json(
      { received: false, error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  }

  if (!stripe) {
    const errorKey = 'stripe_not_configured';
    if (shouldLogError(errorKey)) {
    }
    return NextResponse.json(
      { received: false, error: 'Stripe nicht konfiguriert' },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    const errorKey = 'webhook_secret_missing';
    if (shouldLogError(errorKey)) {
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
      }
      return NextResponse.json({ received: false, error: 'Keine Signatur' }, { status: 400 });
    }

    // DEBUG: Log body and signature info for troubleshooting
    console.log('🔍 Webhook Debug:', {
      bodyLength: body.length,
      signaturePresent: !!signature,
      secretPresent: !!webhookSecret,
      secretLength: webhookSecret?.length,
      hasWhitespace: webhookSecret?.includes(' ') || webhookSecret?.includes('\n'),
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      let errorMessage = 'Fehler bei der Webhook-Verifikation.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      const errorKey = `webhook_verification_${errorMessage.slice(0, 20)}`;
      if (shouldLogError(errorKey)) {
        console.error('❌ Webhook Verification Failed:', {
          error: errorMessage,
          bodyPreview: body.substring(0, 100),
          signaturePreview: signature?.substring(0, 50),
        });
      }
      return NextResponse.json({ received: false, error: errorMessage }, { status: 400 });
    }

    switch (event.type) {
      case 'charge.succeeded': {
        const chargeSucceeded = event.data.object as Stripe.Charge;

        // DUAL SUPPORT: Check both 'type' (for additional_hours) and 'paymentType' (for B2B)
        const paymentType = chargeSucceeded.metadata?.type || chargeSucceeded.metadata?.paymentType;

        // Handle additional hours payments (all variants)
        if (
          paymentType === 'additional_hours_platform_hold' ||
          paymentType === 'additional_hours_direct_transfer' ||
          paymentType === 'mobile_hourly_payment' // ADDED: Support for mobile app
        ) {
          const orderId = chargeSucceeded.metadata?.orderId;
          const entryIds = chargeSucceeded.metadata?.entryIds;

          if (!orderId || !entryIds) {
            const errorKey = `missing_metadata_charge_${chargeSucceeded.id}`;
            if (shouldLogError(errorKey)) {
            }
            return NextResponse.json({
              received: true,
              message: 'Wichtige Metadaten (orderId oder entryIds) für zusätzliche Stunden fehlen.',
            });
          }

          try {
            const entryIdsList = entryIds.split(',');
            const orderRef = db!.collection('auftraege').doc(orderId);

            await db!.runTransaction(async transaction => {
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
          } catch (dbError: unknown) {
            let dbErrorMessage =
              'Unbekannter Datenbankfehler bei der Verarbeitung zusätzlicher Stunden (charge).';
            if (dbError instanceof Error) {
              dbErrorMessage = dbError.message;
            }
            const errorKey = `db_additional_hours_charge_${orderId}`;
            if (shouldLogError(errorKey)) {
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

        // DUAL SUPPORT: Check both 'type' (for additional_hours) and 'paymentType' (for B2B)
        const paymentType =
          paymentIntentSucceeded.metadata?.type || paymentIntentSucceeded.metadata?.paymentType;

        // Handle additional hours payments (all variants)
        if (
          paymentType === 'additional_hours_platform_hold' ||
          paymentType === 'additional_hours_direct_transfer' ||
          paymentType === 'mobile_hourly_payment' // ADDED: Support for mobile app
        ) {
          const orderId = paymentIntentSucceeded.metadata?.orderId;
          const entryIds = paymentIntentSucceeded.metadata?.entryIds;

          if (!orderId || !entryIds) {
            const errorKey = `missing_metadata_${paymentIntentSucceeded.id}`;
            if (shouldLogError(errorKey)) {
            }
            return NextResponse.json({
              received: true,
              message: 'Wichtige Metadaten (orderId oder entryIds) für zusätzliche Stunden fehlen.',
            });
          }

          try {
            const entryIdsList = entryIds.split(',');
            const orderRef = db!.collection('auftraege').doc(orderId);

            await db!.runTransaction(async transaction => {
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
                const companyRef = db!
                  .collection('users')
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

            // Only do manual transfer for platform_hold payments
            // direct_transfer payments get money automatically via transfer_data
            if (paymentType === 'additional_hours_platform_hold') {
              // NEU: Transfer money to Connect account (AFTER the transaction)
              const providerStripeAccountId =
                paymentIntentSucceeded.metadata?.providerStripeAccountId;
              const companyReceives = paymentIntentSucceeded.metadata?.companyReceives;

              if (providerStripeAccountId && companyReceives) {
                const transferAmount = parseInt(companyReceives, 10);

                try {
                  // Prüfe erst, ob das Connect-Konto existiert und empfangsfähig ist
                  const connectAccount = await stripe.accounts.retrieve(providerStripeAccountId);

                  if (!connectAccount.charges_enabled) {
                    // Trotzdem weitermachen, aber warnen
                  } // ❌ ENTFERNT: Automatischer Transfer für Additional Hours
                  // const transfer = await stripe.transfers.create({
                  //   amount: transferAmount,
                  //   currency: 'eur',
                  //   destination: providerStripeAccountId,
                  //   description: `Zusätzliche Arbeitsstunden (Platform Hold Release) für Auftrag ${orderId}`,
                  //   metadata: {
                  //     type: 'additional_hours_platform_hold_release',
                  //     orderId: orderId,
                  //     paymentIntentId: paymentIntentSucceeded.id,
                  //     entryIds: entryIds,
                  //     originalEventId: event.id,
                  //   },
                  // });

                  // ✅ KONTROLLIERTE PAYOUTS: Markiere Additional Hours für manuelle Auszahlung

                  // Update Order mit Additional Hours Payout Info
                  const orderRef = db!.collection('auftraege').doc(orderId);
                  await orderRef.update({
                    additionalHoursPayoutAmount:
                      admin.firestore.FieldValue.increment(transferAmount),
                    payoutStatus: 'available_for_payout', // Markiere für manuelle Auszahlung
                    additionalHoursEntries: admin.firestore.FieldValue.arrayUnion({
                      amount: transferAmount,
                      paymentIntentId: paymentIntentSucceeded.id,
                      entryIds: entryIds,
                      processedAt: new Date(),
                      status: 'available_for_payout',
                    }),
                    updatedAt: new Date(),
                  });

                  // Update company document with controlled payout info
                  const companyRef = db
                    .collection('users')
                    .where('anbieterStripeAccountId', '==', providerStripeAccountId)
                    .limit(1);
                  const companySnapshot = await companyRef.get();

                  if (!companySnapshot.empty) {
                    const companyDoc = companySnapshot.docs[0];
                    await companyDoc.ref.update({
                      lastAdditionalHoursAmount: transferAmount,
                      lastAdditionalHoursAt: admin.firestore.FieldValue.serverTimestamp(),
                      lastAdditionalHoursOrderId: orderId,
                      pendingAdditionalHours: admin.firestore.FieldValue.increment(transferAmount),
                    });
                  } else {
                  }
                } catch (transferError: unknown) {
                  let transferErrorMessage = 'Unbekannter Transfer-Fehler';
                  if (transferError instanceof Error) {
                    transferErrorMessage = transferError.message;
                  }
                  const errorKey = `transfer_error_${orderId}_${Date.now()}`;
                  if (shouldLogError(errorKey)) {
                  }
                  // Continue processing even if transfer fails - important for webhook reliability
                  // Aber versuche einen Retry-Mechanismus zu implementieren
                  try {
                    // Speichere failed transfer für später retry
                    await db!.collection('failedTransfers').add({
                      orderId: orderId,
                      paymentIntentId: paymentIntentSucceeded.id,
                      providerStripeAccountId: providerStripeAccountId,
                      amount: transferAmount,
                      error: transferErrorMessage,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      retryCount: 0,
                      status: 'pending_retry',
                    });
                  } catch (saveError) {}
                }
              } else {
              }
            } else if (paymentType === 'additional_hours_direct_transfer') {
            }
          } catch (dbError: unknown) {
            let dbErrorMessage =
              'Unbekannter Datenbankfehler bei der Verarbeitung zusätzlicher Stunden.';
            if (dbError instanceof Error) {
              dbErrorMessage = dbError.message;
            }
            const errorKey = `db_additional_hours_${orderId}`;
            if (shouldLogError(errorKey)) {
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
          // DEBUG: Log alle Metadaten für B2B Payments

          const customerFirebaseId = paymentIntentSucceeded.metadata?.customerFirebaseId;
          const providerFirebaseId = paymentIntentSucceeded.metadata?.providerFirebaseId;
          const projectId = paymentIntentSucceeded.metadata?.projectId;
          const projectTitle = paymentIntentSucceeded.metadata?.projectTitle;
          const projectDescription = paymentIntentSucceeded.metadata?.projectDescription;

          if (!customerFirebaseId || !providerFirebaseId) {
            const errorKey = `missing_b2b_metadata_${paymentIntentSucceeded.id}`;
            if (shouldLogError(errorKey)) {
            }
            return NextResponse.json({
              received: true,
              message:
                'Wichtige B2B-Metadaten (customerFirebaseId oder providerFirebaseId) fehlen.',
            });
          }

          try {
            // CREATE B2B ORDER IN WEBHOOK (wie bei B2C-Orders)
            const auftragCollectionRef = db!.collection('auftraege');

            // Definiere Variablen außerhalb der Transaction
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const totalAmountCents = paymentIntentSucceeded.amount;

            await db!.runTransaction(async transaction => {
              // Berechne B2B-spezifische Daten
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
            });

            // 🔔 BELL NOTIFICATION: B2B Order erfolgreich erstellt
            try {
              const orderNotificationData = {
                customerName: 'B2B-Kunde', // Default, da B2B oft anonymer
                providerName: 'Provider', // Default, echte Namen kommen aus DB
                subcategory: 'Business Service',
                category: 'B2B Service',
                amount: totalAmountCents,
                dateFrom: new Date().toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0],
              };

              await OrderNotificationService.createNewOrderNotifications(
                orderId,
                customerFirebaseId, // Customer ID
                providerFirebaseId, // Provider ID
                orderNotificationData
              );
            } catch (notificationError) {}

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
            }
            return NextResponse.json({
              received: true,
              message: `B2B order creation failed: ${b2bErrorMessage}`,
            });
          }
        }

        // Check if this is a quote payment based on metadata
        const quotePaymentType = paymentIntentSucceeded.metadata?.type;

        if (quotePaymentType === 'quote_payment') {
          // Quote payment - delegate to the existing API route
          const quoteId = paymentIntentSucceeded.metadata?.quote_id;
          const proposalId = paymentIntentSucceeded.metadata?.proposal_id;
          const customerUid = paymentIntentSucceeded.metadata?.customerUid;
          const companyId = paymentIntentSucceeded.metadata?.companyId;

          if (!quoteId || !proposalId || !customerUid || !companyId) {
            return NextResponse.json({
              received: true,
              message: 'Quote payment metadata incomplete.',
            });
          }

          try {
            // Handle quote -> order conversion directly in webhook
            const quoteRef = db!
              .collection('companies')
              .doc(companyId)
              .collection('quotes')
              .doc(quoteId);
            const quoteDoc = await quoteRef.get();

            if (!quoteDoc.exists) {
              throw new Error(`Quote ${quoteId} not found`);
            }

            const quoteData = quoteDoc.data();

            if (!quoteData) {
              throw new Error(`Quote ${quoteId} has no data`);
            }

            // Find the proposal - OLD WAY (Array in main doc)
            const proposals = quoteData?.proposals || [];
            let proposal: any = null;

            if (Array.isArray(proposals)) {
              proposal = proposals.find((p: any) => p.companyUid === proposalId);
            } else if (typeof proposals === 'object' && proposals !== null) {
              // Handle object structure
              proposal = Object.values(proposals).find(
                (p: any) =>
                  p.companyUid === proposalId || p.paymentIntentId === paymentIntentSucceeded.id
              );
            }

            if (!proposal) {
              throw new Error(`Proposal ${proposalId} not found`);
            }

            // Generate unique order ID
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Extract amount from PaymentIntent if proposal amount is missing
            const proposalAmount = proposal.totalAmount || proposal.price;
            const finalAmount = proposalAmount || paymentIntentSucceeded.amount / 100;

            // Create order in auftraege collection
            const orderData = {
              id: orderId,
              customerFirebaseUid: quoteData.customerUid,
              customerEmail: quoteData.customerEmail || '',
              customerFirstName: quoteData.customerName?.split(' ')[0] || '',
              customerLastName: quoteData.customerName?.split(' ').slice(1).join(' ') || '',
              customerType: 'private',
              kundeId: quoteData.customerUid,
              selectedAnbieterId: proposal.companyUid || '',
              providerName: proposal.companyName || '',
              anbieterStripeAccountId: proposal.companyStripeAccountId || '',
              selectedCategory: quoteData.category || quoteData.serviceCategory || '',
              selectedSubcategory: quoteData.subcategory || quoteData.serviceSubcategory || '',
              projectName: quoteData.title || quoteData.projectTitle || '',
              projectTitle: quoteData.title || quoteData.projectTitle || '',
              description: quoteData.description || quoteData.projectDescription || '',
              totalAmountPaidByBuyer: finalAmount * 100,
              originalJobPriceInCents: finalAmount * 100,
              applicationFeeAmountFromStripe: Math.round(finalAmount * 100 * 0.035),
              sellerCommissionInCents: Math.round(finalAmount * 100 * 0.035),
              paymentIntentId: paymentIntentSucceeded.id,
              paidAt: new Date(),
              jobCountry: quoteData.location?.country || 'DE',
              jobCity: quoteData.location?.city || '',
              jobPostalCode: quoteData.location?.postalCode || '',
              jobStreet: quoteData.location?.street || '',
              jobDateFrom:
                quoteData.startDate ||
                quoteData.preferredStartDate ||
                new Date().toISOString().split('T')[0],
              jobDateTo:
                quoteData.endDate || quoteData.deadline || new Date().toISOString().split('T')[0],
              jobTimePreference: quoteData.timePreference || '09:00',
              status: 'AKTIV', // Auftrag beginnt nach Zahlung
              payoutStatus: 'pending', // Zahlung noch nicht freigegeben
              createdAt: new Date(),
              lastUpdated: new Date(),
              orderDate: new Date(),
              currency: proposal.currency || 'EUR',
              jobDurationString: proposal.timeline || '',
              subcategoryFormData: quoteData.subcategoryFormData || {},
              originalQuoteId: quoteId,
              originalProposalId: proposalId,
              approvalRequests: [],
              timeTracking: {
                isActive: false,
                status: 'inactive',
                hourlyRate: Math.round((finalAmount * 100) / 8),
                originalPlannedHours: 8,
                timeEntries: [],
              },
            };

            // Save order
            await db!.collection('auftraege').doc(orderId).set(orderData);
            // Save order
            await db!.collection('auftraege').doc(orderId).set(orderData);

            // Update quote status - OLD WAY (update proposals array in main doc)
            const updatedProposals = Array.isArray(proposals) ? [...proposals] : { ...proposals };

            if (Array.isArray(updatedProposals)) {
              updatedProposals.forEach((p, index) => {
                if (p.companyUid === proposalId) {
                  p.status = 'accepted';
                  p.acceptedAt = new Date().toISOString();
                  p.paidAt = new Date().toISOString();
                  p.paymentIntentId = paymentIntentSucceeded.id;
                  p.orderId = orderId;
                } else if (p.status === 'pending') {
                  p.status = 'declined';
                  p.declinedAt = new Date().toISOString();
                  p.declineReason = 'Ein anderes Angebot wurde angenommen und bezahlt';
                }
              });
            } else {
              Object.keys(updatedProposals).forEach(key => {
                const p = updatedProposals[key];
                if (
                  p.companyUid === proposalId ||
                  p.paymentIntentId === paymentIntentSucceeded.id
                ) {
                  updatedProposals[key] = {
                    ...p,
                    status: 'accepted',
                    acceptedAt: new Date().toISOString(),
                    paidAt: new Date().toISOString(),
                    paymentIntentId: paymentIntentSucceeded.id,
                    orderId: orderId,
                    companyUid: proposalId,
                  };
                } else if (p.status === 'pending') {
                  updatedProposals[key] = {
                    ...p,
                    status: 'declined',
                    declinedAt: new Date().toISOString(),
                    declineReason: 'Ein anderes Angebot wurde angenommen und bezahlt',
                  };
                }
              });
            }

            await quoteRef.update({
              proposals: updatedProposals,
              status: 'accepted',
              acceptedProposal: proposalId,
              acceptedAt: new Date().toISOString(),
              paidAt: new Date().toISOString(),
              paymentIntentId: paymentIntentSucceeded.id,
              orderId: orderId,
              updatedAt: new Date().toISOString(),
            });

            return NextResponse.json({
              received: true,
              message: `Quote payment processed for quote ${quoteId}, order ${orderId} created`,
            });
          } catch (error) {
            return NextResponse.json({
              received: true,
              message: 'Quote payment processing failed.',
            });
          }
        }

        // Handle Mobile B2C payments
        if (paymentType === 'mobile_b2c_payment') {
          const customerId = paymentIntentSucceeded.metadata?.customerId;
          const providerId = paymentIntentSucceeded.metadata?.providerId;
          const serviceTitle = paymentIntentSucceeded.metadata?.serviceTitle;
          const serviceDescription = paymentIntentSucceeded.metadata?.serviceDescription;

          if (!customerId || !providerId || !serviceTitle) {
            const errorKey = `missing_mobile_metadata_${paymentIntentSucceeded.id}`;
            if (shouldLogError(errorKey)) {
            }
            return NextResponse.json({
              received: true,
              message:
                'Wichtige Mobile B2C-Metadaten (customerId, providerId oder serviceTitle) fehlen.',
            });
          }

          try {
            // Generate unique order ID
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const totalAmountCents = paymentIntentSucceeded.amount;
            const platformFeeAmount = paymentIntentSucceeded.application_fee_amount || 0;

            // Extract metadata for mobile order
            const metadata = paymentIntentSucceeded.metadata;

            // Create Mobile B2C order
            const mobileOrderData = {
              // IDs
              id: orderId,
              customerFirebaseUid: customerId,
              selectedAnbieterId: providerId,

              // Mobile B2C-spezifische Felder
              customerType: 'privat',
              paymentType: 'b2c_fixed_price',
              platform: 'mobile_app',

              // Service-Details
              description: serviceDescription,
              selectedCategory: metadata?.serviceCategory || 'Mobile App Service',
              selectedSubcategory: serviceTitle,

              // Payment & Pricing (in Cents)
              jobCalculatedPriceInCents: totalAmountCents,
              originalJobPriceInCents: totalAmountCents,
              totalAmountPaidByBuyer: totalAmountCents,
              sellerCommissionInCents: platformFeeAmount,
              totalPlatformFeeInCents: platformFeeAmount,

              // Termin-Felder aus Metadata
              jobDateFrom: metadata?.selectedDate
                ? new Date(metadata.selectedDate).toISOString().split('T')[0]
                : null,
              jobDateTo: metadata?.selectedDate
                ? new Date(metadata.selectedDate).toISOString().split('T')[0]
                : null,
              jobDurationString:
                metadata?.startTime && metadata?.endTime
                  ? `${metadata.startTime} - ${metadata.endTime}`
                  : 'Nach Absprache',
              jobTimePreference:
                metadata?.startTime && metadata?.endTime
                  ? `${metadata.startTime} - ${metadata.endTime}`
                  : 'Flexible Terminabsprache',

              // Adress-Felder aus Metadata
              jobStreet: metadata?.location ? metadata.location.split(',')[0]?.trim() : '',
              jobCity: metadata?.location ? metadata.location.split(',').pop()?.trim() : '',
              jobCountry: 'DE',

              // Payment-Details
              paymentIntentId: paymentIntentSucceeded.id,
              stripeCustomerId:
                typeof paymentIntentSucceeded.customer === 'string'
                  ? paymentIntentSucceeded.customer
                  : null,
              paidAt: admin.firestore.FieldValue.serverTimestamp(),

              // Status & Zeiten
              status: 'zahlung_erhalten_clearing',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),

              // Mobile-spezifische Felder (für Debugging)
              metadata: {
                originalMobileData: {
                  titel: serviceTitle,
                  beschreibung: serviceDescription,
                  kundentyp: 'Privatkunde',
                  totalAmount: totalAmountCents,
                  platformFee: platformFeeAmount,
                  currency: paymentIntentSucceeded.currency,
                },
              },
            };

            // Save Mobile B2C order
            await db!.collection('auftraege').doc(orderId).set(mobileOrderData);

            return NextResponse.json({
              received: true,
              message: `Mobile B2C payment processed, order ${orderId} created`,
            });
          } catch (error) {
            const errorKey = `mobile_b2c_processing_${paymentIntentSucceeded.id}`;
            if (shouldLogError(errorKey)) {
            }
            return NextResponse.json({
              received: true,
              message: 'Mobile B2C payment processing failed.',
            });
          }
        }

        // Handle regular order payments
        const tempJobDraftId = paymentIntentSucceeded.metadata?.tempJobDraftId;
        const firebaseUserId = paymentIntentSucceeded.metadata?.firebaseUserId;

        if (!tempJobDraftId || !firebaseUserId) {
          const errorKey = `missing_draft_metadata_${paymentIntentSucceeded.id}`;
          if (shouldLogError(errorKey)) {
          }
          // Wichtig: Trotzdem 200 an Stripe senden, um Wiederholungen zu vermeiden, aber den Fehler loggen.
          return NextResponse.json({
            received: true,
            message: 'Wichtige Metadaten (tempJobDraftId oder firebaseUserId) fehlen.',
          });
        }

        try {
          const tempJobDraftRef = db!.collection('temporaryJobDrafts').doc(tempJobDraftId);
          const auftragCollectionRef = db!.collection('auftraege');

          // Definiere Variablen außerhalb der Transaction für Notifications
          let newOrderId: string = '';
          let orderData: any = null;

          await db!.runTransaction(async transaction => {
            const tempJobDraftSnapshot = await transaction.get(tempJobDraftRef);

            if (tempJobDraftSnapshot.data()?.status === 'converted') {
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
            newOrderId = newAuftragRef.id; // Speichere Order ID für Notifications
            orderData = auftragData; // Speichere Order Data für Notifications

            transaction.set(newAuftragRef, auftragData);

            transaction.update(tempJobDraftRef, {
              status: 'converted',
              convertedToOrderId: newAuftragRef.id,
            });
          });

          // 🔔 BELL NOTIFICATION: Regular Order erfolgreich erstellt
          if (newOrderId && orderData) {
            try {
              const orderNotificationData = {
                customerName: orderData.customerName || 'Kunde',
                providerName: orderData.providerName || 'Anbieter',
                subcategory: orderData.selectedSubcategory || 'Service',
                category: orderData.selectedCategory || 'Dienstleistung',
                amount: orderData.totalAmountPaidByBuyer || 0,
                dateFrom: orderData.jobDateFrom || new Date().toISOString().split('T')[0],
                dateTo: orderData.jobDateTo,
              };

              await OrderNotificationService.createNewOrderNotifications(
                newOrderId,
                firebaseUserId, // Customer ID
                orderData.selectedAnbieterId, // Provider ID
                orderNotificationData
              );
            } catch (notificationError) {}

            // 📊 SERVICE USAGE TRACKING - Track platform booking for analytics
            try {
              // Dynamic import des Service Tracking Service
              const { ServiceUsageTrackingService } = await import(
                '@/services/serviceUsageTrackingService'
              );

              // Erstelle Service-Package-Daten aus Order-Informationen
              const servicePackageData = {
                packageName: orderData.selectedSubcategory || 'Platform Service',
                packagePrice: (orderData.originalJobPriceInCents || 0) / 100, // Convert to euros
                subcategory: orderData.selectedSubcategory || 'Service',
              };

              await ServiceUsageTrackingService.trackPlatformBookingUsage(
                orderData.selectedAnbieterId, // Provider ID
                newOrderId, // Order ID
                servicePackageData,
                orderData.customerName || 'Kunde',
                orderData.jobDateFrom
              );
            } catch (trackingError) {
              // Service-Tracking ist nicht kritisch für die Hauptfunktion
              console.warn(
                '⚠️ Platform service usage tracking failed (non-critical):',
                trackingError
              );
            }
          } else {
          }
        } catch (dbError: unknown) {
          // dbError ist hier vom Typ unknown
          let dbErrorMessage = 'Unbekannter Datenbankfehler bei der Job-Konvertierung.';
          if (dbError instanceof Error) {
            dbErrorMessage = dbError.message;
          }
          const errorKey = `db_job_conversion_${tempJobDraftId}`;
          if (shouldLogError(errorKey)) {
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

      // ========================================
      // STORAGE SUBSCRIPTION EVENTS
      // ========================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if this is a storage subscription
        if (session.metadata?.type === 'storage_subscription') {
          const companyId = session.metadata.companyId;
          const planId = session.metadata.planId;
          const storage = parseInt(session.metadata.storage);

          try {
            // Update storage limit for the entire company
            const companyRef = db!.collection('companies').doc(companyId);
            await companyRef.update({
              storageLimit: storage,
              storagePlanId: planId,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: 'active',
              subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update subscription log
            const subscriptionLogRef = db!
              .collection('companies')
              .doc(companyId)
              .collection('storage_subscriptions')
              .doc(session.id);

            await subscriptionLogRef.set(
              {
                status: 'active',
                subscriptionId: session.subscription,
                planId: planId,
                storage: storage,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            console.log(
              `✅ Storage subscription activated for company ${companyId}: ${planId} (${storage} bytes)`
            );
          } catch (storageError: unknown) {
            let storageErrorMessage = 'Storage subscription activation failed';
            if (storageError instanceof Error) {
              storageErrorMessage = storageError.message;
            }
            const errorKey = `storage_subscription_${companyId}`;
            if (shouldLogError(errorKey)) {
              console.error('Storage subscription error:', storageErrorMessage);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Check if this is a storage subscription
        if (
          subscription.metadata?.companyId &&
          subscription.metadata?.type === 'storage_subscription'
        ) {
          const companyId = subscription.metadata.companyId;
          const status = subscription.status;

          try {
            const companyRef = db!.collection('companies').doc(companyId);
            await companyRef.update({
              subscriptionStatus: status,
              subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ Storage subscription updated: ${status} for company ${companyId}`);
          } catch (updateError: unknown) {
            const errorKey = `storage_subscription_update_${companyId}`;
            if (shouldLogError(errorKey)) {
              console.error('Storage subscription update error:', updateError);
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Check if this is a storage subscription
        if (
          subscription.metadata?.companyId &&
          subscription.metadata?.type === 'storage_subscription'
        ) {
          const companyId = subscription.metadata.companyId;

          try {
            // Reset to default storage (1 GB)
            const companyRef = db!.collection('companies').doc(companyId);
            await companyRef.update({
              storageLimit: 1024 * 1024 * 1024, // 1 GB
              storagePlanId: null,
              stripeSubscriptionId: null,
              subscriptionStatus: 'canceled',
              subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ Storage subscription canceled for company ${companyId}, reset to 1GB`);
          } catch (deleteError: unknown) {
            const errorKey = `storage_subscription_delete_${companyId}`;
            if (shouldLogError(errorKey)) {
              console.error('Storage subscription delete error:', deleteError);
            }
          }
        }
        break;
      }
      // ========================================
      // END STORAGE SUBSCRIPTION EVENTS
      // ========================================

      default:
      // Es ist wichtig, für unbehandelte Events trotzdem 200 OK zu senden,
      // damit Stripe nicht versucht, sie erneut zu senden.
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    let errorMessage = 'Unbekannter Fehler beim Verarbeiten des Webhooks.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    const errorKey = `webhook_general_error`;
    if (shouldLogError(errorKey)) {
    }
    return NextResponse.json({ received: false, error: errorMessage }, { status: 500 });
  }
}

// Andere HTTP-Methoden nicht erlaubt
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
