// API Route für die Abrechnung zusätzlicher Stunden über Stripe
import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

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

  try {
    const body = await request.json();

    const {
      orderId,
      approvedEntryIds,
      customerStripeId: providedCustomerStripeId,
      providerStripeAccountId: initialProviderStripeAccountId,
    } = body;

    // Validierung
    if (
      !orderId ||
      !approvedEntryIds ||
      !Array.isArray(approvedEntryIds) ||
      approvedEntryIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Ungültige Parameter: orderId und approvedEntryIds sind erforderlich.' },
        { status: 400 }
      );
    }

    // Hole Auftragsdaten aus Firebase ZUERST um Stripe IDs zu laden
    const orderDoc = await db.collection('auftraege').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden.' }, { status: 404 });
    }

    const orderData = orderDoc.data();

    if (!orderData) {
      return NextResponse.json({ error: 'Auftragsdaten nicht verfügbar.' }, { status: 404 });
    }

    if (!orderData.timeTracking) {
      return NextResponse.json(
        { error: 'Keine Zeiterfassung für diesen Auftrag gefunden.' },
        { status: 404 }
      );
    }

    // Lade customerStripeId aus Order-Daten oder verwende provided Value als Fallback
    const customerStripeId = orderData.stripeCustomerId || providedCustomerStripeId;

    console.log('🔍 Order Data Debug:', {
      orderId,
      customerFirebaseUid: orderData.customerFirebaseUid,
      selectedAnbieterId: orderData.selectedAnbieterId,
      stripeCustomerId: orderData.stripeCustomerId,
      hasTimeTracking: !!orderData.timeTracking,
      timeTrackingKeys: orderData.timeTracking ? Object.keys(orderData.timeTracking) : [],
    });

    // Validiere customerStripeId NACH dem Loading aus Order-Daten
    if (!customerStripeId || !customerStripeId.startsWith('cus_')) {
      console.error('❌ CustomerStripeId Validation Failed:', {
        fromOrder: orderData.stripeCustomerId,
        fromRequest: providedCustomerStripeId,
        finalValue: customerStripeId,
      });
      return NextResponse.json(
        {
          error: 'Ungültige Kunde Stripe ID. Weder in Order-Daten noch als Parameter verfügbar.',
        },
        { status: 400 }
      );
    }

    console.log('✅ Customer Stripe ID gefunden:', customerStripeId);

    // Provider Stripe Account ID validieren und ggf. Fallback verwenden
    let providerStripeAccountId = initialProviderStripeAccountId;

    console.log('🔍 Provider Stripe Account Check:', {
      providedAccountId: initialProviderStripeAccountId,
      selectedAnbieterId: orderData.selectedAnbieterId,
    });

    if (!providerStripeAccountId || !providerStripeAccountId.startsWith('acct_')) {
      console.log(
        '⚠️ Kein gültiger Provider Stripe Account, versuche Fallback aus users collection...'
      );

      // Versuche Fallback aus users collection zu holen
      try {
        const userDoc = await db.collection('users').doc(orderData.selectedAnbieterId).get();

        console.log('🔍 User Document Check:', {
          exists: userDoc.exists,
          docId: orderData.selectedAnbieterId,
        });

        if (userDoc.exists) {
          const userData = userDoc.data();
          const fallbackStripeAccountId = userData?.stripeAccountId;

          console.log('🔍 User Data:', {
            hasUserData: !!userData,
            stripeAccountId: fallbackStripeAccountId,
            userDataKeys: userData ? Object.keys(userData) : [],
          });

          if (fallbackStripeAccountId && fallbackStripeAccountId.startsWith('acct_')) {
            console.log('✅ Fallback Stripe Account gefunden:', fallbackStripeAccountId);

            // Migriere die ID zur users collection (Server-Side)
            try {
              await db.collection('users').doc(orderData.selectedAnbieterId).update({
                stripeConnectAccountId: fallbackStripeAccountId,
                migratedFromUsers: true,
                migratedAt: new Date(),
              });
            } catch (migrationError) {
              console.error('⚠️ Migration Error:', migrationError);
            }

            // Verwende Fallback für diese Anfrage
            providerStripeAccountId = fallbackStripeAccountId;
          } else {
            return NextResponse.json(
              {
                error:
                  'Provider hat keine gültige Stripe Account ID (weder in companies noch in users collection).',
              },
              { status: 400 }
            );
          }
        } else {
          console.log('❌ User nicht gefunden, versuche companies collection...');

          // Versuche auch die companies collection zu prüfen
          try {
            const companyDoc = await db
              .collection('companies')
              .doc(orderData.selectedAnbieterId)
              .get();

            console.log('🔍 Company Document Check:', {
              exists: companyDoc.exists,
              docId: orderData.selectedAnbieterId,
            });

            if (companyDoc.exists) {
              const companyData = companyDoc.data();
              const companyStripeAccountId =
                companyData?.stripeConnectAccountId || companyData?.stripeAccountId;

              console.log('🔍 Company Data:', {
                hasCompanyData: !!companyData,
                stripeConnectAccountId: companyData?.stripeConnectAccountId,
                stripeAccountId: companyData?.stripeAccountId,
                finalAccountId: companyStripeAccountId,
                companyDataKeys: companyData ? Object.keys(companyData) : [],
              });

              if (companyStripeAccountId && companyStripeAccountId.startsWith('acct_')) {
                console.log('✅ Company Stripe Account gefunden:', companyStripeAccountId);
                providerStripeAccountId = companyStripeAccountId;
              } else {
                return NextResponse.json(
                  {
                    error:
                      'Provider hat keine gültige Stripe Account ID (weder in users noch in companies collection).',
                  },
                  { status: 400 }
                );
              }
            } else {
              return NextResponse.json(
                {
                  error:
                    'Provider-Benutzer nicht gefunden (weder in users noch in companies collection).',
                },
                { status: 404 }
              );
            }
          } catch (companyError) {
            console.error('❌ Company Check Error:', companyError);
            return NextResponse.json(
              {
                error: 'Fehler beim Prüfen der Provider-Company-Konfiguration.',
              },
              { status: 500 }
            );
          }
        }
      } catch (fallbackError) {
        return NextResponse.json(
          {
            error: 'Fehler beim Prüfen der Provider Stripe-Konfiguration.',
          },
          { status: 500 }
        );
      }
    }

    // Finde genehmigte zusätzliche Zeiteinträge (customer_approved ODER billing_pending)
    const approvedEntries = orderData.timeTracking.timeEntries.filter(
      (entry: {
        id: string;
        category: string;
        status: string;
        billableAmount?: number;
        hours: number;
      }) =>
        approvedEntryIds.includes(entry.id) &&
        entry.category === 'additional' &&
        (entry.status === 'customer_approved' || entry.status === 'billing_pending')
    );

    if (approvedEntries.length === 0) {
      return NextResponse.json(
        { error: 'Keine genehmigten zusätzlichen Stunden gefunden.' },
        { status: 404 }
      );
    }

    // Berechne Gesamtbetrag
    const totalAmount = approvedEntries.reduce(
      (sum: number, entry: { billableAmount?: number }) => sum + (entry.billableAmount || 0),
      0
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Kein abrechnungsfähiger Betrag gefunden.' },
        { status: 400 }
      );
    }

    // Berechne Plattformgebühr (4.5% - wird bei Auszahlung an Company abgezogen)
    const platformFee = Math.round(totalAmount * 0.045);

    // Company erhält den Betrag minus Plattformgebühr
    const companyAmount = totalAmount - platformFee;

    // IMPROVED SYSTEM: Direct Transfer mit Platform Fee
    // Kunde zahlt Gesamtbetrag, Provider erhält sofort den Betrag minus Platform Fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      customer: customerStripeId,
      application_fee_amount: platformFee, // Platform behält nur die Gebühr
      transfer_data: {
        destination: providerStripeAccountId, // Provider erhält Geld sofort
      },
      confirm: false,
      capture_method: 'automatic',
      setup_future_usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        orderId,
        type: 'additional_hours_direct_transfer', // Neuer Typ für direkten Transfer
        entryIds: approvedEntryIds.join(','),
        providerStripeAccountId,
        totalHours: approvedEntries
          .reduce((sum: number, entry: { hours: number }) => sum + entry.hours, 0)
          .toString(),
        originalOrderAmount: orderData.jobCalculatedPriceInCents?.toString() || '0',
        additionalAmount: totalAmount.toString(),
        platformFee: platformFee.toString(),
        companyReceives: companyAmount.toString(),
        transferType: 'direct', // Kennzeichnet direkten Transfer
      },
      description: `Zusätzliche Arbeitsstunden für Auftrag ${orderId} - Direktüberweisung`,
    });

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      customerPays: totalAmount, // Kunde zahlt vollen Betrag
      companyReceives: companyAmount, // Company erhält Betrag minus Plattformgebühr
      platformFee: platformFee,
      additionalHours: approvedEntries.reduce(
        (sum: number, entry: { hours: number }) => sum + entry.hours,
        0
      ),
      transferType: 'direct', // Direkter Transfer statt Platform Hold
      message:
        'PaymentIntent für zusätzliche Stunden erfolgreich erstellt. Provider erhält Geld automatisch nach Zahlung.',
    });
  } catch (error: unknown) {
    let errorMessage =
      'Interner Serverfehler beim Erstellen des PaymentIntents für zusätzliche Stunden.';
    let stripeErrorCode: string | null = null;
    let stripeErrorType: string | null = null;

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe Fehler: ${error.message}`;
      stripeErrorCode = error.code || null;
      stripeErrorType = error.type;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: stripeErrorCode,
        stripeErrorType: stripeErrorType,
      },
      { status: 500 }
    );
  }
}
