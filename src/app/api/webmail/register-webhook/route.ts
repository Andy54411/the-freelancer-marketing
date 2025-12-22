/**
 * Revolut Webhook Registration API
 * 
 * Registriert einen Webhook bei Revolut Merchant API
 */

import { NextRequest, NextResponse } from 'next/server';

const REVOLUT_API_VERSION = '2025-10-16';

function getConfig() {
  const apiKey = process.env.REVOLUT_MERCHANT_API_KEY;
  const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
  const baseUrl = isProduction 
    ? 'https://merchant.revolut.com/api/1.0'
    : 'https://sandbox-merchant.revolut.com/api/1.0';
  return { apiKey, baseUrl };
}

export async function POST(_request: NextRequest) {
  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'REVOLUT_MERCHANT_API_KEY nicht konfiguriert',
    }, { status: 500 });
  }

  // Webhook URL - use production URL
  const webhookUrl = 'https://taskilo.de/api/webmail/payment-webhook';

  try {
    // Register webhook
    const response = await fetch(`${baseUrl}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: [
          'ORDER_COMPLETED',
          'ORDER_AUTHORISED',
          'ORDER_PAYMENT_AUTHENTICATED',
          'ORDER_PAYMENT_DECLINED',
          'ORDER_PAYMENT_FAILED',
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Webhook-Registrierung fehlgeschlagen',
        details: data,
        status: response.status,
      }, { status: response.status });
    }

    // Return the signing secret - WICHTIG: Speichere dieses Secret!
    return NextResponse.json({
      success: true,
      webhookId: data.id,
      webhookUrl: data.url,
      events: data.events,
      signingSecret: data.signing_secret,
      message: 'WICHTIG: Speichere das signing_secret in .env.local als REVOLUT_WEBHOOK_SECRET',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: 'Webhook-Registrierung fehlgeschlagen',
      details: message,
    }, { status: 500 });
  }
}

// DELETE - Loesche einen Webhook
export async function DELETE(request: NextRequest) {
  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'REVOLUT_MERCHANT_API_KEY nicht konfiguriert',
    }, { status: 500 });
  }

  try {
    const body = await request.json();
    const webhookId = body.webhookId;

    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'webhookId ist erforderlich',
      }, { status: 400 });
    }

    const response = await fetch(`${baseUrl}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: false,
        error: 'Webhook-Loeschung fehlgeschlagen',
        details: data,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook geloescht',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

// GET - Liste alle registrierten Webhooks
export async function GET() {
  const apiKey = process.env.REVOLUT_MERCHANT_API_KEY;
  const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
  const baseUrl = isProduction 
    ? 'https://merchant.revolut.com/api/1.0'
    : 'https://sandbox-merchant.revolut.com/api/1.0';

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'REVOLUT_MERCHANT_API_KEY nicht konfiguriert',
    }, { status: 500 });
  }

  try {
    const response = await fetch(`${baseUrl}/webhooks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Webhook-Abfrage fehlgeschlagen',
        details: data,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      webhooks: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

// PATCH - Rotiere das Signing Secret eines Webhooks
export async function PATCH(request: NextRequest) {
  const apiKey = process.env.REVOLUT_MERCHANT_API_KEY;
  const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
  const baseUrl = isProduction 
    ? 'https://merchant.revolut.com/api/1.0'
    : 'https://sandbox-merchant.revolut.com/api/1.0';

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'REVOLUT_MERCHANT_API_KEY nicht konfiguriert',
    }, { status: 500 });
  }

  try {
    const body = await request.json();
    const webhookId = body.webhookId;

    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'webhookId ist erforderlich',
      }, { status: 400 });
    }

    // Rotate the signing secret
    const response = await fetch(`${baseUrl}/webhooks/${webhookId}/rotate-signing-secret`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Secret-Rotation fehlgeschlagen',
        details: data,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      webhookId: data.id,
      signingSecret: data.signing_secret,
      message: 'WICHTIG: Speichere dieses signing_secret in .env.local als REVOLUT_WEBHOOK_SECRET',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
