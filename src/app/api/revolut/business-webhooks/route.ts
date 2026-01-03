/**
 * Revolut Business API Webhook Management
 * 
 * GET - Liste alle registrierten Business Webhooks
 * POST - Registriere neuen Business Webhook
 * DELETE - Lösche einen Business Webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRevolutBusinessAccessToken } from '@/lib/revolut-openbanking-service';

const REVOLUT_API_VERSION = '2024-09-01';

function getBaseUrl(): string {
  const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
  // WICHTIG: Webhooks API v2.0 verwenden!
  return isProduction 
    ? 'https://b2b.revolut.com/api/2.0'
    : 'https://sandbox-b2b.revolut.com/api/2.0';
}

// GET - Liste alle registrierten Webhooks
export async function GET() {
  try {
    let accessToken: string | null = null;
    let tokenError: string | null = null;
    
    try {
      accessToken = await getRevolutBusinessAccessToken();
    } catch (err) {
      tokenError = err instanceof Error ? err.message : 'Token-Abruf fehlgeschlagen';
    }
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Kein Revolut Business Access Token verfügbar',
        tokenError: tokenError,
        environment: process.env.REVOLUT_ENVIRONMENT || 'sandbox',
        hasClientId: !!process.env.REVOLUT_CLIENT_ID,
      }, { status: 401 });
    }

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/webhooks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Webhook-Abfrage fehlgeschlagen',
        details: data,
        status: response.status,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      webhooks: data,
      count: Array.isArray(data) ? data.length : 0,
      environment: process.env.REVOLUT_ENVIRONMENT || 'sandbox',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

// POST - Registriere neuen Webhook
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getRevolutBusinessAccessToken();
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Kein Revolut Business Access Token verfügbar',
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      url = 'https://taskilo.de/api/payment/revolut-business-webhook',
      events = ['TransactionCreated', 'TransactionStateChanged']
    } = body;

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
      body: JSON.stringify({
        url,
        events,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Webhook-Registrierung fehlgeschlagen',
        details: data,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      webhook: data,
      message: 'Webhook erfolgreich registriert',
      important: 'WICHTIG: Speichere das signing_secret in .env.local als REVOLUT_BUSINESS_WEBHOOK_SECRET',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

// DELETE - Lösche einen Webhook
export async function DELETE(request: NextRequest) {
  try {
    const accessToken = await getRevolutBusinessAccessToken();
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Kein Revolut Business Access Token verfügbar',
      }, { status: 401 });
    }

    const body = await request.json();
    const { webhookId } = body;

    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'webhookId ist erforderlich',
      }, { status: 400 });
    }

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: 'Webhook-Löschung fehlgeschlagen',
        details: data,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook gelöscht',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
