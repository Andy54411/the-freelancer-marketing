import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { QuoteNotificationService } from '@/lib/quote-notifications';

// Stripe Initialisierung
function getStripeInstance() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return null;
  }
  return new Stripe(stripeSecret, {
    apiVersion: '2024-06-20',
  });
}

/**
 * API Route für Quote-Provisions-Zahlungen
 * POST /api/company/[uid]/quotes/received/[quoteId]/payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; quoteId: string }> }
) {
  try {
    const { uid: companyId, quoteId } = await params;

    // Dynamically import Firebase setup to avoid build-time initialization
    const { db } = await import('@/firebase/server');

    // Check if Firebase is properly initialized
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const stripe = getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe-Konfiguration fehlt' }, { status: 500 });
    }

    const body = await request.json();
    const { action } = body;

    // Lade Quote-Details
    const quoteRef = db.collection('quotes').doc(quoteId);
    const quoteDoc = await quoteRef.get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 });
    }

    const quoteData = quoteDoc.data();

    // Validiere, dass das Angebot angenommen wurde ODER Payment Intent erstellt werden soll
    if (action === 'create_payment_intent') {
      // Bei Payment Intent Creation: Setze Status auf 'accepted' falls noch 'responded'
      if (quoteData?.status === 'responded') {
        await quoteRef.update({
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
        });
        console.log('✅ Quote status updated to accepted');
      } else if (quoteData?.status !== 'accepted') {
        return NextResponse.json(
          { error: 'Angebot muss zuerst beantwortet werden' },
          { status: 400 }
        );
      }
    } else if (quoteData?.status !== 'accepted') {
      return NextResponse.json({ error: 'Angebot wurde noch nicht angenommen' }, { status: 400 });
    }

    // Validiere, dass es eine Response mit totalAmount gibt (Legacy) oder Proposals (Neu)
    let totalAmount = 0;

    // Zuerst prüfen: Proposals in Subcollection (Neues System)
    const proposalsSnapshot = await quoteRef.collection('proposals').get();
    if (!proposalsSnapshot.empty) {
      const proposalDoc = proposalsSnapshot.docs[0]; // Nehme erste Proposal
      const proposalData = proposalDoc.data();
      totalAmount = proposalData.totalAmount || 0;
      console.log('💰 Using totalAmount from proposal:', totalAmount);
    }
    // Fallback: Legacy Response System
    else if (quoteData?.response?.totalAmount) {
      totalAmount = parseFloat(quoteData.response.totalAmount);
      console.log('💰 Using totalAmount from legacy response:', totalAmount);
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: 'Angebotssumme nicht gefunden' }, { status: 400 });
    }

    switch (action) {
      case 'create_payment_intent': {
        // Berechne 3,5% Provision
        const provisionRate = 0.05; // 5% Provision für Taskilo
        const provisionAmount = Math.round(totalAmount * provisionRate * 100); // In Cents

        console.log('💰 Payment calculation:', {
          totalAmount,
          provisionRate,
          provisionAmount: provisionAmount / 100,
        });

        // Erstelle Payment Intent für Provision (ohne Connect Features für Tests)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: provisionAmount,
          currency: 'eur',
          metadata: {
            type: 'quote_provision',
            quoteId: quoteId,
            providerUid: quoteData.providerUid,
            customerUid: companyId,
            totalQuoteAmount: totalAmount.toString(),
            provisionRate: provisionRate.toString(),
          },
          description: `Taskilo Provision (5%) für Angebot #${quoteId}`,
          statement_descriptor_suffix: 'PROVISION',
          // Einfacher Payment Intent ohne Connect Features
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Speichere Payment Intent Referenz
        await quoteRef.update({
          'payment.provisionPaymentIntentId': paymentIntent.id,
          'payment.provisionAmount': provisionAmount / 100,
          'payment.provisionStatus': 'pending',
          'payment.createdAt': new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          provisionAmount: provisionAmount / 100,
        });
      }

      case 'confirm_payment': {
        const { paymentIntentId } = body;

        if (!paymentIntentId) {
          return NextResponse.json({ error: 'Payment Intent ID fehlt' }, { status: 400 });
        }

        // Prüfe Payment Intent Status
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
          // Lade Company-Daten für Customer und Provider automatisch
          const customerCompanyDoc = await db.collection('companies').doc(companyId).get();
          const providerId = quoteData.providerId || quoteData.providerUid;
          const providerCompanyDoc = await db.collection('companies').doc(providerId).get();

          // Extrahiere Customer Contact aus Company-Daten
          let customerContact: any = null;
          if (customerCompanyDoc.exists) {
            const customerCompanyData = customerCompanyDoc.data();
            customerContact = {
              name: customerCompanyData?.companyName || customerCompanyData?.name || 'Kunde',
              email: customerCompanyData?.email || '',
              phone: customerCompanyData?.phone || customerCompanyData?.phoneNumber || '',
              address:
                `${customerCompanyData?.address || customerCompanyData?.street || ''}, ${customerCompanyData?.city || ''}`
                  .trim()
                  .replace(/^,\s*/, '')
                  .replace(/,\s*$/, '') || 'Adresse nicht verfügbar',
            };
          }

          // Extrahiere Provider Contact aus Company-Daten
          let providerContact: any = null;
          if (providerCompanyDoc.exists) {
            const providerCompanyData = providerCompanyDoc.data();
            providerContact = {
              name: providerCompanyData?.companyName || providerCompanyData?.name || 'Anbieter',
              email: providerCompanyData?.email || '',
              phone: providerCompanyData?.phone || providerCompanyData?.phoneNumber || '',
              address:
                `${providerCompanyData?.address || providerCompanyData?.street || ''}, ${providerCompanyData?.city || ''}`
                  .trim()
                  .replace(/^,\s*/, '')
                  .replace(/,\s*$/, '') || 'Adresse nicht verfügbar',
            };
          }

          // Update Quote mit erfolgreichem Payment und Kontaktdaten
          const updateData: any = {
            'payment.provisionStatus': 'paid',
            'payment.paidAt': new Date().toISOString(),
            'payment.paymentIntentId': paymentIntentId,
            'contactExchange.readyForExchange': true,
            status: 'contacts_exchanged',
          };

          // Füge Kontaktdaten hinzu, falls verfügbar
          if (customerContact) {
            updateData['contactExchange.customerContact'] = customerContact;
          }
          if (providerContact) {
            updateData['contactExchange.providerContact'] = providerContact;
          }

          await quoteRef.update(updateData);

          // Bell-Notification für erfolgreichen Kontaktaustausch
          if (providerId) {
            try {
              // Namen für Notification abrufen
              let customerName = 'Kunde';
              let providerName = 'Anbieter';

              // Customer Name abrufen
              const customerDoc = await db.collection('users').doc(companyId).get();
              if (customerDoc.exists) {
                const customerData = customerDoc.data();
                customerName =
                  customerData?.firstName && customerData?.lastName
                    ? `${customerData.firstName} ${customerData.lastName}`
                    : customerData?.name || quoteData.customerName || 'Kunde';
              }

              // Provider Name abrufen
              const providerDoc = await db.collection('users').doc(providerId).get();
              if (providerDoc.exists) {
                const providerData = providerDoc.data();
                providerName = providerData?.companyName || 'Anbieter';
              }

              await QuoteNotificationService.createContactExchangeNotifications(
                quoteId,
                companyId, // Customer UID
                providerId, // Provider UID
                `${customerName} ↔ ${providerName} - ${quoteData.projectSubcategory || quoteData.projectTitle || 'Service'}`
              );
            } catch (notificationError) {
              // Notification-Fehler sollten das Payment nicht rückgängig machen
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Provision erfolgreich bezahlt',
          });
        } else {
          return NextResponse.json({ error: 'Zahlung noch nicht abgeschlossen' }, { status: 400 });
        }
      }

      default:
        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
