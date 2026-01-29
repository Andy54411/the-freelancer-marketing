import express, { Router } from 'express';
import mongoDBService from '../services/MongoDBService';

const router: Router = express.Router();

// Revolut API Base URLs - Unterschiedliche Pfade für verschiedene APIs
const REVOLUT_MERCHANT_BASE = 'https://merchant.revolut.com';
const REVOLUT_API_KEY = process.env.REVOLUT_MERCHANT_API_KEY;
const REVOLUT_API_VERSION = '2025-12-04';

// TypeScript Interfaces für Revolut API Responses
interface RevolutPlan {
  id: string;
  name: string;
  state: string;
  variations?: RevolutVariation[];
}

interface RevolutVariation {
  id: string;
  phases?: RevolutPhase[];
}

interface RevolutPhase {
  id: string;
  ordinal: number;
  cycle_duration: string;
  amount: number;
  currency: string;
}

interface RevolutCustomer {
  id: string;
  email: string;
  full_name?: string;
}

interface RevolutSubscription {
  id: string;
  state: string;
  checkout_url?: string;
  setup_order?: {
    checkout_url?: string;
  };
  setup_order_id?: string;
}

// Subscription Plan IDs (werden einmalig erstellt und hier gespeichert)
interface SubscriptionPlanCache {
  monthlyPlanId?: string;
  monthlyVariationId?: string;
  yearlyPlanId?: string;
  yearlyVariationId?: string;
  lastUpdated?: Date;
}

let planCache: SubscriptionPlanCache = {};

/**
 * Hilfsfunktion für Revolut API Aufrufe
 * Subscriptions/Plans nutzen /api/, Webhooks/Orders nutzen /api/1.0/
 */
async function revolutRequest<T = unknown>(endpoint: string, method: string = 'GET', body?: unknown): Promise<T> {
  if (!REVOLUT_API_KEY) {
    throw new Error('REVOLUT_MERCHANT_API_KEY nicht konfiguriert');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${REVOLUT_API_KEY}`,
    'Content-Type': 'application/json',
    'Revolut-Api-Version': REVOLUT_API_VERSION,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  // Webhooks und Orders nutzen /api/1.0/, Subscriptions nutzen /api/
  const apiPath = endpoint.startsWith('/webhooks') || endpoint.startsWith('/orders') 
    ? '/api/1.0' 
    : '/api';
  
  const fullUrl = `${REVOLUT_MERCHANT_BASE}${apiPath}${endpoint}`;
  console.log(`Revolut API Request: ${method} ${fullUrl}`);
  
  const response = await fetch(fullUrl, options);
  const data = await response.json().catch(() => ({})) as T;

  if (!response.ok) {
    console.error(`Revolut API Error [${endpoint}]:`, response.status, data);
    const errorData = data as { message?: string };
    throw new Error(errorData.message || `Revolut API Fehler: ${response.status}`);
  }

  return data;
}

// Revolut Paginierte API-Response
interface RevolutPaginatedResponse<T> {
  items?: T[];
  data?: T[];
  next_cursor?: string;
  has_more?: boolean;
}

/**
 * POST /api/revolut/init-plans
 * Erstellt die Webmail Subscription Plans (einmalig ausführen)
 */
router.post('/init-plans', async (req, res) => {
  try {
    console.log('Initialisiere Revolut Subscription Plans...');

    // Prüfe ob Plans schon existieren
    const response = await revolutRequest<RevolutPaginatedResponse<RevolutPlan> | RevolutPlan[]>('/subscription-plans', 'GET');
    
    // Revolut kann entweder ein Array oder ein Objekt mit items/data zurückgeben
    let existingPlans: RevolutPlan[] = [];
    if (Array.isArray(response)) {
      existingPlans = response;
    } else if (response && typeof response === 'object') {
      existingPlans = response.items || response.data || [];
    }

    console.log('Existierende Plans:', existingPlans.length, existingPlans.map(p => p.name));
    
    const monthlyPlan = existingPlans.find((p) => p.name === 'Taskilo Webmail Monatlich');
    const yearlyPlan = existingPlans.find((p) => p.name === 'Taskilo Webmail Jährlich');

    if (monthlyPlan && yearlyPlan) {
      planCache = {
        monthlyPlanId: monthlyPlan.id,
        monthlyVariationId: monthlyPlan.variations?.[0]?.id,
        yearlyPlanId: yearlyPlan.id,
        yearlyVariationId: yearlyPlan.variations?.[0]?.id,
        lastUpdated: new Date(),
      };
      
      return res.json({
        success: true,
        message: 'Plans existieren bereits',
        plans: planCache,
      });
    }

    // Monatlicher Plan mit 14-Tage Trial + monatlicher Abbuchung
    if (!monthlyPlan) {
      const monthly = await revolutRequest<RevolutPlan>('/subscription-plans', 'POST', {
        name: 'Taskilo Webmail Monatlich',
        variations: [{
          phases: [
            {
              ordinal: 1,
              cycle_duration: 'P14D', // 14 Tage Trial
              cycle_count: 1,
              amount: 0,
              currency: 'EUR',
            },
            {
              ordinal: 2,
              cycle_duration: 'P1M', // Monatlich
              cycle_count: null, // Unbegrenzt
              amount: 999, // 9.99 EUR in Cents
              currency: 'EUR',
            },
          ],
        }],
      });
      planCache.monthlyPlanId = monthly.id;
      planCache.monthlyVariationId = monthly.variations?.[0]?.id;
      console.log('Monatlicher Plan erstellt:', monthly.id);
    }

    // Jährlicher Plan mit 14-Tage Trial + jährlicher Abbuchung
    if (!yearlyPlan) {
      const yearly = await revolutRequest<RevolutPlan>('/subscription-plans', 'POST', {
        name: 'Taskilo Webmail Jährlich',
        variations: [{
          phases: [
            {
              ordinal: 1,
              cycle_duration: 'P14D', // 14 Tage Trial
              cycle_count: 1,
              amount: 0,
              currency: 'EUR',
            },
            {
              ordinal: 2,
              cycle_duration: 'P1Y', // Jährlich
              cycle_count: null, // Unbegrenzt
              amount: 9900, // 99.00 EUR in Cents
              currency: 'EUR',
            },
          ],
        }],
      });
      planCache.yearlyPlanId = yearly.id;
      planCache.yearlyVariationId = yearly.variations?.[0]?.id;
      console.log('Jährlicher Plan erstellt:', yearly.id);
    }

    planCache.lastUpdated = new Date();

    // Speichere in MongoDB für Persistenz
    const configCollection = mongoDBService.getCollection('revolut_config');
    await configCollection.updateOne(
      { type: 'subscription_plans' },
      { $set: { ...planCache, updatedAt: new Date() } },
      { upsert: true }
    );

    return res.json({
      success: true,
      message: 'Subscription Plans erstellt',
      plans: planCache,
    });

  } catch (error: unknown) {
    console.error('Init Plans Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/revolut/plans
 * Gibt die Plan IDs zurück
 */
router.get('/plans', async (req, res) => {
  try {
    // Aus Cache oder MongoDB laden
    if (!planCache.monthlyVariationId) {
      const configCollection = mongoDBService.getCollection('revolut_config');
      const config = await configCollection.findOne({ type: 'subscription_plans' });
      if (config) {
        planCache = {
          monthlyPlanId: config.monthlyPlanId as string,
          monthlyVariationId: config.monthlyVariationId as string,
          yearlyPlanId: config.yearlyPlanId as string,
          yearlyVariationId: config.yearlyVariationId as string,
          lastUpdated: config.updatedAt as Date,
        };
      }
    }

    return res.json({
      success: true,
      plans: planCache,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/revolut/create-subscription
 * Erstellt eine Checkout-Session mit Kreditkarten-Speicherung für monatliche Abbuchung
 * Verwendet die Standard Orders-API mit save_payment_method
 */
router.post('/create-subscription', async (req, res) => {
  try {
    const { 
      customerEmail, 
      customerName, 
      plan, // 'monthly' oder 'yearly'
      domain,
      company,
      successUrl,
      cancelUrl,
    } = req.body;

    if (!customerEmail || !plan) {
      return res.status(400).json({
        success: false,
        error: 'customerEmail und plan sind erforderlich',
      });
    }

    if (!REVOLUT_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Revolut API nicht konfiguriert',
      });
    }

    // Preise: 14 Tage Trial = 0€ Setup, dann monatlich/jährlich
    // Setup-Order mit 0€ um Kreditkarte zu speichern
    const orderBody = {
      amount: 0, // 0€ für Trial - Kreditkarte wird nur gespeichert
      currency: 'EUR',
      description: `Taskilo Webmail - ${plan === 'yearly' ? 'Jährlich' : 'Monatlich'} (14-Tage kostenlos testen)`,
      customer_email: customerEmail,
      metadata: {
        domain,
        company,
        plan,
        customerName: customerName || customerEmail.split('@')[0],
        type: 'webmail_subscription_setup',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      save_payment_method_for: {
        feature: 'subscription',
      },
      capture_mode: 'AUTOMATIC',
    };

    console.log('Erstelle Revolut Order für Subscription Setup:', JSON.stringify(orderBody, null, 2));

    const response = await fetch(`${REVOLUT_MERCHANT_BASE}/api/1.0/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Revolut Order Error:', response.status, errorData);
      return res.status(response.status).json({
        success: false,
        error: (errorData as { message?: string }).message || 'Order-Erstellung fehlgeschlagen',
      });
    }

    const order = await response.json() as {
      id: string;
      checkout_url: string;
      state: string;
    };

    console.log('Revolut Order erstellt:', order.id, 'Checkout URL:', order.checkout_url);

    // In MongoDB speichern
    const subscriptionsCollection = mongoDBService.getCollection('webmail_subscriptions');
    await subscriptionsCollection.insertOne({
      revolutOrderId: order.id,
      customerEmail,
      customerName: customerName || customerEmail.split('@')[0],
      domain,
      company,
      plan,
      amount: plan === 'yearly' ? 9900 : 999, // Cents: 99€ jährlich, 9.99€ monatlich
      status: 'pending_payment_method', // Wird nach Checkout auf 'trial' gesetzt
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 Tage
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.json({
      success: true,
      orderId: order.id,
      checkoutUrl: order.checkout_url,
      status: order.state,
      plan,
      trialDays: 14,
    });

  } catch (error: unknown) {
    console.error('Create Subscription Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/revolut/create-checkout
 * Erstellt eine Revolut Merchant Checkout-Session
 */
router.post('/create-checkout', async (req, res) => {
  try {
    const { customer, amount, currency, description, metadata, successUrl, cancelUrl } = req.body;

    if (!customer || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'customer, amount und currency sind erforderlich',
      });
    }

    if (!REVOLUT_API_KEY) {
      console.error('REVOLUT_API_KEY nicht gesetzt');
      return res.status(500).json({
        success: false,
        error: 'Revolut API nicht konfiguriert',
      });
    }

    // Revolut Checkout erstellen
    const response = await fetch(`${REVOLUT_MERCHANT_BASE}/api/1.0/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        description: description || 'Taskilo Webmail Subscription',
        customer_email: customer.email,
        customer_name: customer.name,
        metadata: metadata || {},
        redirect_urls: {
          success: successUrl || 'https://taskilo.de/webmail/register/success',
          failure: cancelUrl || 'https://taskilo.de/webmail/register/checkout',
        },
        capture_mode: 'AUTOMATIC',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      console.error('Revolut Checkout Error:', errorData);
      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Checkout-Erstellung fehlgeschlagen',
        details: errorData,
      });
    }

    const order = await response.json() as any;

    return res.json({
      success: true,
      checkoutUrl: order.checkout_url || order.public_id,
      checkoutId: order.id,
      orderId: order.id,
    });

  } catch (error: any) {
    console.error('Revolut Checkout Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Checkout-Erstellung fehlgeschlagen',
      details: error.message,
    });
  }
});

/**
 * POST /api/revolut/webhook
 * Revolut Webhook für Zahlungsbestätigungen und Subscription-Events
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    const subscriptionsCollection = mongoDBService.getCollection('webmail_subscriptions');

    console.log('Revolut Webhook Event:', JSON.stringify(event, null, 2));

    // Event-Typ verarbeiten
    switch (event.type) {
      case 'ORDER_COMPLETED':
        // Zahlung erfolgreich - Subscription auf Trial setzen und Payment Method speichern
        console.log('Zahlung erfolgreich:', event.order_id);
        
        // Order-Details abrufen um Payment Method zu erhalten
        try {
          const orderResponse = await fetch(`${REVOLUT_MERCHANT_BASE}/api/1.0/orders/${event.order_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${REVOLUT_API_KEY}`,
            },
          });
          
          if (orderResponse.ok) {
            const orderDetails = await orderResponse.json() as {
              id: string;
              customer_id?: string;
              payments?: Array<{
                payment_method?: {
                  id: string;
                  type: string;
                  card?: {
                    last4: string;
                    brand: string;
                  };
                };
              }>;
              metadata?: Record<string, string>;
            };
            
            console.log('Order Details:', JSON.stringify(orderDetails, null, 2));
            
            // Payment Method ID extrahieren (für zukünftige Abbuchungen)
            const paymentMethodId = orderDetails.payments?.[0]?.payment_method?.id;
            const customerId = orderDetails.customer_id;
            const cardLast4 = orderDetails.payments?.[0]?.payment_method?.card?.last4;
            const cardBrand = orderDetails.payments?.[0]?.payment_method?.card?.brand;
            
            // Subscription in MongoDB aktualisieren
            const updateResult = await subscriptionsCollection.updateOne(
              { revolutOrderId: event.order_id },
              { 
                $set: { 
                  status: 'trial',
                  revolutPaymentMethodId: paymentMethodId,
                  revolutCustomerId: customerId,
                  cardLast4,
                  cardBrand,
                  paymentMethodSavedAt: new Date(),
                  updatedAt: new Date(),
                } 
              }
            );
            
            console.log('Subscription auf Trial gesetzt, Payment Method gespeichert:', paymentMethodId);
            console.log('Update Result:', updateResult.modifiedCount, 'Dokumente aktualisiert');
          }
        } catch (orderError) {
          console.error('Fehler beim Abrufen der Order-Details:', orderError);
        }
        break;

      case 'ORDER_AUTHORISED':
        // Zahlung autorisiert
        console.log('Zahlung autorisiert:', event.order_id);
        break;

      case 'ORDER_CANCELLED':
        // Zahlung abgebrochen
        console.log('Zahlung abgebrochen:', event.order_id);
        await subscriptionsCollection.updateOne(
          { revolutOrderId: event.order_id },
          { 
            $set: { 
              status: 'cancelled',
              cancelledAt: new Date(),
              updatedAt: new Date(),
            } 
          }
        );
        break;

      // Subscription Events
      case 'SUBSCRIPTION_CREATED':
        console.log('Subscription erstellt:', event.subscription?.id);
        await subscriptionsCollection.updateOne(
          { revolutSubscriptionId: event.subscription?.id },
          { 
            $set: { 
              status: 'created',
              updatedAt: new Date(),
            } 
          }
        );
        break;

      case 'SUBSCRIPTION_ACTIVATED':
        console.log('Subscription aktiviert:', event.subscription?.id);
        await subscriptionsCollection.updateOne(
          { revolutSubscriptionId: event.subscription?.id },
          { 
            $set: { 
              status: 'active',
              activatedAt: new Date(),
              updatedAt: new Date(),
            } 
          }
        );
        break;

      case 'SUBSCRIPTION_RENEWED':
        console.log('Subscription erneuert:', event.subscription?.id);
        await subscriptionsCollection.updateOne(
          { revolutSubscriptionId: event.subscription?.id },
          { 
            $set: { 
              status: 'active',
              lastRenewalAt: new Date(),
              updatedAt: new Date(),
            },
            $inc: { renewalCount: 1 }
          }
        );
        break;

      case 'SUBSCRIPTION_CANCELLED':
        console.log('Subscription gekündigt:', event.subscription?.id);
        await subscriptionsCollection.updateOne(
          { revolutSubscriptionId: event.subscription?.id },
          { 
            $set: { 
              status: 'cancelled',
              cancelledAt: new Date(),
              updatedAt: new Date(),
            } 
          }
        );
        break;

      case 'SUBSCRIPTION_PAYMENT_FAILED':
        console.log('Subscription Zahlung fehlgeschlagen:', event.subscription?.id);
        await subscriptionsCollection.updateOne(
          { revolutSubscriptionId: event.subscription?.id },
          { 
            $set: { 
              status: 'payment_failed',
              lastPaymentFailedAt: new Date(),
              updatedAt: new Date(),
            },
            $inc: { paymentFailedCount: 1 }
          }
        );
        // TODO: E-Mail an Kunden senden
        break;

      case 'SUBSCRIPTION_CYCLE_COMPLETED':
        console.log('Subscription Cycle abgeschlossen:', event.subscription?.id);
        await subscriptionsCollection.updateOne(
          { revolutSubscriptionId: event.subscription?.id },
          { 
            $set: { 
              lastCycleCompletedAt: new Date(),
              updatedAt: new Date(),
            }
          }
        );
        break;

      default:
        console.log('Unbekannter Event-Typ:', event.type);
    }

    // Webhook bestätigen
    res.status(200).json({ success: true });

  } catch (error: unknown) {
    console.error('Revolut Webhook Error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook-Verarbeitung fehlgeschlagen',
    });
  }
});

// Order Response Interface
interface RevolutOrder {
  id: string;
  type: string;
  state: string;
  created_at: string;
  updated_at: string;
  amount: number;
  currency: string;
  checkout_url?: string;
}

/**
 * GET /api/revolut/order/:orderId
 * Order-Status abrufen
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!REVOLUT_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Revolut API nicht konfiguriert',
      });
    }

    const response = await fetch(`${REVOLUT_MERCHANT_BASE}/api/1.0/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Revolut Order Fetch Error:', errorData);
      return res.status(response.status).json({
        success: false,
        error: 'Order-Abruf fehlgeschlagen',
      });
    }

    const order = await response.json() as RevolutOrder;

    res.json({
      success: true,
      order,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Revolut Order Fetch Error:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Order-Abruf fehlgeschlagen',
    });
  }
});

/**
 * GET /api/revolut/subscription/:subscriptionId
 * Subscription-Status abrufen
 */
router.get('/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await revolutRequest<RevolutSubscription>(`/subscriptions/${subscriptionId}`, 'GET');

    res.json({
      success: true,
      subscription,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Revolut Subscription Fetch Error:', errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/revolut/subscription/:subscriptionId/cancel
 * Subscription kündigen
 */
router.post('/subscription/:subscriptionId/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const result = await revolutRequest<RevolutSubscription>(`/subscriptions/${subscriptionId}/cancel`, 'POST');

    // In MongoDB aktualisieren
    const subscriptionsCollection = mongoDBService.getCollection('webmail_subscriptions');
    await subscriptionsCollection.updateOne(
      { revolutSubscriptionId: subscriptionId },
      { 
        $set: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        } 
      }
    );

    res.json({
      success: true,
      message: 'Subscription gekündigt',
      subscription: result,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Revolut Cancel Subscription Error:', errorMessage);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// WebmailSubscription Interface für MongoDB
interface WebmailSubscription {
  revolutSubscriptionId: string;
  revolutCustomerId: string;
  revolutPlanId: string;
  customerEmail: string;
  customerName: string;
  domain: string;
  company: string;
  plan: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  cancelledAt?: Date;
  lastRenewalAt?: Date;
  lastPaymentFailedAt?: Date;
  renewalCount?: number;
  paymentFailedCount?: number;
}

/**
 * GET /api/revolut/subscriptions
 * Alle Subscriptions eines Kunden abrufen
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const { email, domain } = req.query;

    const subscriptionsCollection = mongoDBService.getCollection<WebmailSubscription>('webmail_subscriptions');
    const query: Partial<WebmailSubscription> = {};
    
    if (email && typeof email === 'string') query.customerEmail = email;
    if (domain && typeof domain === 'string') query.domain = domain;

    const subscriptions = await subscriptionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      subscriptions,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Webhook Response Interface
interface RevolutWebhook {
  id: string;
  url: string;
  events: string[];
  signing_secret?: string;
}

/**
 * POST /api/revolut/register-webhook
 * Registriert einen Webhook bei Revolut für Order-Events
 */
router.post('/register-webhook', async (req, res) => {
  try {
    const webhookUrl = 'https://mail.taskilo.de/webmail-api/api/revolut/webhook';
    
    // Standard Order-Events (Subscription-Events werden automatisch gesendet)
    const events = [
      'ORDER_COMPLETED',
      'ORDER_AUTHORISED',
      'ORDER_CANCELLED',
    ];

    // Prüfe ob Webhook schon existiert
    let existingWebhooks: RevolutWebhook[] = [];
    try {
      const response = await revolutRequest<RevolutWebhook[] | RevolutPaginatedResponse<RevolutWebhook>>('/webhooks', 'GET');
      if (Array.isArray(response)) {
        existingWebhooks = response;
      } else if (response && typeof response === 'object') {
        existingWebhooks = (response as RevolutPaginatedResponse<RevolutWebhook>).items || (response as RevolutPaginatedResponse<RevolutWebhook>).data || [];
      }
    } catch (error) {
      console.log('Keine existierenden Webhooks gefunden oder Fehler beim Abrufen');
    }

    const existing = existingWebhooks.find(w => w.url === webhookUrl);
    
    if (existing) {
      return res.json({
        success: true,
        message: 'Webhook existiert bereits',
        webhook: existing,
      });
    }

    // Neuen Webhook erstellen
    const webhook = await revolutRequest<RevolutWebhook>('/webhooks', 'POST', {
      url: webhookUrl,
      events,
    });

    // Signing Secret speichern
    const configCollection = mongoDBService.getCollection('revolut_config');
    await configCollection.updateOne(
      { type: 'webhook_config' },
      { 
        $set: { 
          webhookId: webhook.id,
          webhookUrl: webhook.url,
          signingSecret: webhook.signing_secret,
          events: webhook.events,
          updatedAt: new Date(),
        } 
      },
      { upsert: true }
    );

    console.log('Revolut Webhook registriert:', webhook.id);

    return res.json({
      success: true,
      message: 'Webhook erfolgreich registriert',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
      },
    });

  } catch (error: unknown) {
    console.error('Register Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/revolut/webhooks
 * Liste aller registrierten Webhooks
 */
router.get('/webhooks', async (req, res) => {
  try {
    const webhooks = await revolutRequest<RevolutWebhook[]>('/webhooks', 'GET');

    return res.json({
      success: true,
      webhooks,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/revolut/process-subscriptions
 * Cron-Job: Verarbeitet fällige Subscriptions (Trial abgelaufen, monatliche Abbuchung)
 * Sollte täglich aufgerufen werden
 */
router.post('/process-subscriptions', async (req, res) => {
  try {
    const subscriptionsCollection = mongoDBService.getCollection('webmail_subscriptions');
    const now = new Date();
    
    // 1. Trial abgelaufen - erste Abbuchung durchführen
    const trialExpired = await subscriptionsCollection.find({
      status: 'trial',
      trialEndsAt: { $lte: now },
      revolutPaymentMethodId: { $exists: true },
    }).toArray();

    console.log(`Verarbeite ${trialExpired.length} abgelaufene Trials...`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      renewals: 0,
      errors: [] as string[],
    };

    for (const subscription of trialExpired) {
      try {
        // Betrag basierend auf Plan
        const amount = subscription.plan === 'yearly' ? 9900 : 999; // Cents
        
        // Zahlung mit gespeicherter Karte durchführen
        const paymentResult = await chargeSubscription(
          subscription.revolutPaymentMethodId as string,
          amount,
          subscription.customerEmail as string,
          subscription.domain as string,
          subscription.plan as string
        );

        if (paymentResult.success) {
          // Subscription auf aktiv setzen und nächste Abbuchung planen
          const nextBillingDate = subscription.plan === 'yearly'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await subscriptionsCollection.updateOne(
            { _id: subscription._id },
            {
              $set: {
                status: 'active',
                lastPaymentAt: now,
                nextBillingAt: nextBillingDate,
                lastPaymentOrderId: paymentResult.orderId,
                updatedAt: now,
              },
              $inc: { paymentCount: 1 },
            }
          );
          results.successful++;
        } else {
          // Zahlung fehlgeschlagen
          await subscriptionsCollection.updateOne(
            { _id: subscription._id },
            {
              $set: {
                status: 'payment_failed',
                lastPaymentFailedAt: now,
                lastPaymentError: paymentResult.error,
                updatedAt: now,
              },
              $inc: { paymentFailedCount: 1 },
            }
          );
          results.failed++;
          results.errors.push(`${subscription.customerEmail}: ${paymentResult.error}`);
        }
        results.processed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
        results.errors.push(`${subscription.customerEmail}: ${errorMsg}`);
        results.failed++;
        results.processed++;
      }
    }

    // 2. Monatliche Renewals verarbeiten
    const renewalsDue = await subscriptionsCollection.find({
      status: 'active',
      nextBillingAt: { $lte: now },
      revolutPaymentMethodId: { $exists: true },
    }).toArray();

    console.log(`Verarbeite ${renewalsDue.length} fällige Renewals...`);

    for (const subscription of renewalsDue) {
      try {
        const amount = subscription.plan === 'yearly' ? 9900 : 999;
        
        const paymentResult = await chargeSubscription(
          subscription.revolutPaymentMethodId as string,
          amount,
          subscription.customerEmail as string,
          subscription.domain as string,
          subscription.plan as string
        );

        if (paymentResult.success) {
          const nextBillingDate = subscription.plan === 'yearly'
            ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await subscriptionsCollection.updateOne(
            { _id: subscription._id },
            {
              $set: {
                lastPaymentAt: now,
                nextBillingAt: nextBillingDate,
                lastPaymentOrderId: paymentResult.orderId,
                updatedAt: now,
              },
              $inc: { paymentCount: 1, renewalCount: 1 },
            }
          );
          results.renewals++;
          results.successful++;
        } else {
          await subscriptionsCollection.updateOne(
            { _id: subscription._id },
            {
              $set: {
                status: 'payment_failed',
                lastPaymentFailedAt: now,
                lastPaymentError: paymentResult.error,
                updatedAt: now,
              },
              $inc: { paymentFailedCount: 1 },
            }
          );
          results.failed++;
          results.errors.push(`Renewal ${subscription.customerEmail}: ${paymentResult.error}`);
        }
        results.processed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
        results.errors.push(`Renewal ${subscription.customerEmail}: ${errorMsg}`);
        results.failed++;
        results.processed++;
      }
    }

    console.log('Subscription Processing abgeschlossen:', results);

    return res.json({
      success: true,
      message: 'Subscriptions verarbeitet',
      results,
    });

  } catch (error: unknown) {
    console.error('Process Subscriptions Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * Hilfsfunktion: Führt eine Abbuchung mit gespeicherter Zahlungsmethode durch
 */
async function chargeSubscription(
  paymentMethodId: string,
  amount: number,
  customerEmail: string,
  domain: string,
  plan: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    if (!REVOLUT_API_KEY) {
      return { success: false, error: 'API Key nicht konfiguriert' };
    }

    const orderBody = {
      amount,
      currency: 'EUR',
      description: `Taskilo Webmail ${plan === 'yearly' ? 'Jährlich' : 'Monatlich'} - ${domain}`,
      customer_email: customerEmail,
      capture_mode: 'AUTOMATIC',
      metadata: {
        type: 'webmail_subscription_renewal',
        domain,
        plan,
      },
    };

    // 1. Order erstellen
    const orderResponse = await fetch(`${REVOLUT_MERCHANT_BASE}/api/1.0/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json().catch(() => ({})) as { message?: string };
      return { success: false, error: errorData.message || `Order fehlgeschlagen: ${orderResponse.status}` };
    }

    const order = await orderResponse.json() as { id: string };

    // 2. Zahlung mit gespeicherter Karte durchführen
    const paymentBody = {
      saved_payment_method: {
        type: 'card',
        id: paymentMethodId,
        initiator: 'merchant',
      },
    };

    const paymentResponse = await fetch(`${REVOLUT_MERCHANT_BASE}/api/1.0/orders/${order.id}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentBody),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json().catch(() => ({})) as { message?: string };
      return { success: false, error: errorData.message || `Zahlung fehlgeschlagen: ${paymentResponse.status}` };
    }

    console.log(`Subscription-Abbuchung erfolgreich: ${order.id} - ${amount / 100}€`);
    return { success: true, orderId: order.id };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('chargeSubscription Error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * GET /api/revolut/subscription-stats
 * Statistiken über alle Subscriptions
 */
router.get('/subscription-stats', async (req, res) => {
  try {
    const subscriptionsCollection = mongoDBService.getCollection('webmail_subscriptions');
    
    const stats = await subscriptionsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const totalRevenue = await subscriptionsCollection.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          monthlyCount: { $sum: { $cond: [{ $eq: ['$plan', 'monthly'] }, 1, 0] } },
          yearlyCount: { $sum: { $cond: [{ $eq: ['$plan', 'yearly'] }, 1, 0] } },
        },
      },
    ]).toArray();

    const revenue = totalRevenue[0] || { monthlyCount: 0, yearlyCount: 0 };
    const mrr = (revenue.monthlyCount * 9.99) + (revenue.yearlyCount * 99 / 12);

    // MongoDB Aggregation Result-Typ explizit definieren
    const typedStats = stats as Array<{ _id: string; count: number }>;

    return res.json({
      success: true,
      stats: typedStats.reduce((acc: Record<string, number>, s) => ({ ...acc, [s._id]: s.count }), {}),
      mrr: Math.round(mrr * 100) / 100,
      activeSubscriptions: {
        monthly: revenue.monthlyCount,
        yearly: revenue.yearlyCount,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
