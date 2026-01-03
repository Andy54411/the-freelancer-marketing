/**
 * Revolut Business API Webhook Management (via Hetzner Proxy)
 * 
 * GET - Liste alle registrierten Business Webhooks
 * POST - Registriere neuen Business Webhook
 * DELETE - Loesche einen Business Webhook
 * 
 * Alle Aufrufe laufen ueber Hetzner wegen IP-Whitelist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getWebhooksViaProxy, 
  registerWebhookViaProxy, 
  deleteWebhookViaProxy 
} from '@/lib/revolut-hetzner-proxy';

// GET - Liste alle registrierten Webhooks
export async function GET() {
  try {
    const result = await getWebhooksViaProxy();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Webhook-Abfrage fehlgeschlagen',
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      webhooks: result.data,
      count: result.count,
      source: 'hetzner-proxy',
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
    const body = await request.json();
    const { 
      url = 'https://taskilo.de/api/payment/revolut-business-webhook',
      events = ['TransactionCreated', 'TransactionStateChanged']
    } = body;

    const result = await registerWebhookViaProxy(url, events);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Webhook-Registrierung fehlgeschlagen',
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      webhook: result.data,
      message: 'Webhook erfolgreich registriert',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

// DELETE - Loesche einen Webhook
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');
    
    if (!webhookId) {
      return NextResponse.json({
        success: false,
        error: 'Webhook-ID erforderlich (query param: id)',
      }, { status: 400 });
    }
    
    const result = await deleteWebhookViaProxy(webhookId);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Webhook-Loeschung fehlgeschlagen',
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Webhook ${webhookId} geloescht`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
