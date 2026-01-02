/**
 * Revolut Checkout Service
 * 
 * Erstellt Revolut Orders für Kreditkartenzahlungen
 * Nutzt die Revolut Merchant API 1.0
 */

const REVOLUT_CONFIG = {
  apiKey: process.env.REVOLUT_MERCHANT_API_KEY,
  isProduction: process.env.REVOLUT_ENVIRONMENT === 'production',
  get baseUrl() {
    return this.isProduction
      ? 'https://merchant.revolut.com/api/1.0'
      : 'https://sandbox-merchant.revolut.com/api/1.0';
  },
};

interface RevolutOrder {
  id: string;
  public_id: string;
  state: string;
  checkout_url: string;
}

export class RevolutCheckoutService {
  /**
   * Erstellt eine Revolut Order für Kreditkartenzahlung
   */
  static async createOrder(params: {
    amount: number; // in Cents
    currency: string;
    orderId: string;
    description?: string;
    customerEmail?: string;
  }): Promise<{ success: boolean; order?: RevolutOrder; checkoutUrl?: string; error?: string }> {
    const { amount, currency, orderId, description, customerEmail } = params;

    if (!REVOLUT_CONFIG.apiKey) {
      return { success: false, error: 'Revolut API nicht konfiguriert' };
    }
    
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de';
      
      // Baue Request Body - nur definierte Felder
      const requestBody: Record<string, unknown> = {
        amount: Math.round(amount), // Revolut erwartet integer minor units (cents)
        currency: currency.toUpperCase(),
        // Redirect URL nach erfolgreicher Zahlung
        settle_url: `${appUrl}/auftrag/erfolg?orderId=${orderId}&status=success`,
      };

      // Optionale Felder nur wenn definiert
      if (description) {
        requestBody.description = description;
      }
      if (customerEmail) {
        requestBody.customer_email = customerEmail;
      }
      if (orderId) {
        requestBody.merchant_order_ext_ref = orderId;
      }

      console.log('[RevolutCheckout] Creating order with:', JSON.stringify(requestBody));

      const response = await fetch(`${REVOLUT_CONFIG.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${REVOLUT_CONFIG.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RevolutCheckout] API Error:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          return {
            success: false,
            error: errorData.message || errorData.error || `Revolut API Fehler: ${response.status}`,
          };
        } catch {
          return {
            success: false,
            error: `Revolut API Fehler: ${response.status} - ${errorText}`,
          };
        }
      }

      const order = await response.json() as RevolutOrder;
      
      return {
        success: true,
        order,
        checkoutUrl: order.checkout_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Prüft den Status einer Order
   */
  static async getOrder(orderId: string): Promise<{ success: boolean; order?: RevolutOrder; error?: string }> {
    if (!REVOLUT_CONFIG.apiKey) {
      return { success: false, error: 'Revolut API nicht konfiguriert' };
    }

    try {
      const response = await fetch(`${REVOLUT_CONFIG.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${REVOLUT_CONFIG.apiKey}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: `Order nicht gefunden: ${response.status}` };
      }

      const order = await response.json() as RevolutOrder;
      return { success: true, order };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }
}
