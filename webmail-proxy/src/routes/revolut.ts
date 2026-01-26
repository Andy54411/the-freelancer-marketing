import express from 'express';
import axios from 'axios';

const router = express.Router();

// Revolut API Base URL
const REVOLUT_API_URL = process.env.REVOLUT_API_URL || 'https://merchant.revolut.com/api/1.0';
const REVOLUT_API_KEY = process.env.REVOLUT_API_KEY;

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
    const response = await axios.post(
      `${REVOLUT_API_URL}/orders`,
      {
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
      },
      {
        headers: {
          'Authorization': `Bearer ${REVOLUT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const order = response.data;

    return res.json({
      success: true,
      checkoutUrl: order.checkout_url || order.public_id, // Revolut gibt checkout_url zurück
      checkoutId: order.id,
      orderId: order.id,
    });

  } catch (error: any) {
    console.error('Revolut Checkout Error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || 'Checkout-Erstellung fehlgeschlagen',
      details: error.response?.data || error.message,
    });
  }
});

/**
 * POST /api/revolut/webhook
 * Revolut Webhook für Zahlungsbestätigungen
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    console.log('Revolut Webhook Event:', event);

    // Event-Typ verarbeiten
    switch (event.type) {
      case 'ORDER_COMPLETED':
        // Zahlung erfolgreich
        console.log('✅ Zahlung erfolgreich:', event.order.id);
        // TODO: User-Konto aktivieren, Subscription in Firebase speichern
        break;

      case 'ORDER_AUTHORISED':
        // Zahlung autorisiert
        console.log('✅ Zahlung autorisiert:', event.order.id);
        break;

      case 'ORDER_CANCELLED':
        // Zahlung abgebrochen
        console.log('❌ Zahlung abgebrochen:', event.order.id);
        break;

      default:
        console.log('Unbekannter Event-Typ:', event.type);
    }

    // Webhook bestätigen
    res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Revolut Webhook Error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook-Verarbeitung fehlgeschlagen',
    });
  }
});

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

    const response = await axios.get(
      `${REVOLUT_API_URL}/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        },
      }
    );

    res.json({
      success: true,
      order: response.data,
    });

  } catch (error: any) {
    console.error('Revolut Order Fetch Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Order-Abruf fehlgeschlagen',
    });
  }
});

export default router;
