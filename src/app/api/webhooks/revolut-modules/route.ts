/**
 * Revolut Module Subscription Webhook Handler
 * 
 * Verarbeitet Zahlungs-Events für Premium-Module:
 * - ORDER_COMPLETED: Zahlung erfolgreich, Modul aktivieren
 * - ORDER_PAYMENT_DECLINED: Zahlung fehlgeschlagen
 * - SUBSCRIPTION_ACTIVATED: Wiederkehrende Zahlung gestartet
 * - SUBSCRIPTION_CANCELLED: Subscription gekündigt
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ModuleSubscriptionService } from '@/services/subscription/ModuleSubscriptionService';
import { ModuleNotificationService } from '@/services/subscription/ModuleNotificationService';
import crypto from 'crypto';
import { z } from 'zod';

const WEBHOOK_SECRET = process.env.REVOLUT_BUSINESS_WEBHOOK_SECRET;

// ============================================================================
// TYPES
// ============================================================================

const RevolutModuleEventSchema = z.object({
  event: z.string(),
  timestamp: z.string(),
  order_id: z.string().optional(),
  subscription_id: z.string().optional(),
  merchant_order_ext_ref: z.string().optional(),
  data: z.object({
    id: z.string().optional(),
    state: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    metadata: z.record(z.string()).optional(),
  }).optional(),
});

type RevolutModuleEvent = z.infer<typeof RevolutModuleEventSchema>;

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  timestampHeader: string | null
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[Module Webhook] Kein Webhook-Secret konfiguriert');
    return process.env.NODE_ENV !== 'production';
  }

  if (!signatureHeader) {
    console.warn('[Module Webhook] Keine Signatur im Header');
    return false;
  }

  try {
    const signatures = signatureHeader.split(',').map(s => s.trim());
    const timestamp = timestampHeader || '';
    const payloadToSign = `v1.${timestamp}.${payload}`;

    const expectedSignature = 'v1=' + crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadToSign)
      .digest('hex');

    for (const sig of signatures) {
      if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleOrderCompleted(event: RevolutModuleEvent): Promise<void> {
  const metadata = event.data?.metadata;
  if (!metadata?.companyId || !metadata?.moduleId) {
    console.log('[Module Webhook] Keine Module-Metadaten in Order');
    return;
  }

  const { companyId, moduleId, subscriptionId } = metadata;

  // Modul aktivieren
  if (subscriptionId) {
    const result = await ModuleSubscriptionService.activateModule(
      companyId,
      subscriptionId,
      event.order_id
    );

    if (result.success) {
      // Erfolgs-E-Mail senden
      await ModuleNotificationService.sendModuleActivatedEmail(companyId, moduleId);
    }
  }
}

async function handleSubscriptionActivated(event: RevolutModuleEvent): Promise<void> {
  const metadata = event.data?.metadata;
  if (!metadata?.companyId) {
    console.log('[Module Webhook] Keine companyId in Subscription-Event');
    return;
  }

  const { companyId, moduleId } = metadata;

  if (db && moduleId) {
    // Update Company mit aktiven Modulen
    await db.collection('companies').doc(companyId).update({
      [`modules.${moduleId}`]: true,
      activeModules: FieldValue.arrayUnion(moduleId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Benachrichtigung senden
    await ModuleNotificationService.sendSubscriptionActivatedEmail(companyId, moduleId);
  }
}

async function handleSubscriptionCancelled(event: RevolutModuleEvent): Promise<void> {
  const metadata = event.data?.metadata;
  if (!metadata?.companyId || !metadata?.moduleId) {
    return;
  }

  const { companyId, moduleId } = metadata;

  // Modul wird zum Periodenende deaktiviert - nicht sofort
  // Die tatsächliche Deaktivierung erfolgt durch den Trial-Cron
  await ModuleNotificationService.sendCancellationConfirmationEmail(companyId, moduleId);
}

async function handlePaymentDeclined(event: RevolutModuleEvent): Promise<void> {
  const metadata = event.data?.metadata;
  if (!metadata?.companyId || !metadata?.moduleId) {
    return;
  }

  const { companyId, moduleId } = metadata;

  // Benachrichtigung über fehlgeschlagene Zahlung
  await ModuleNotificationService.sendPaymentFailedEmail(companyId, moduleId);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('Revolut-Signature');
    const timestampHeader = request.headers.get('Revolut-Request-Timestamp');

    // Signatur prüfen
    if (!verifyWebhookSignature(rawBody, signatureHeader, timestampHeader)) {
      console.error('[Module Webhook] Signatur-Verifizierung fehlgeschlagen');
      return NextResponse.json(
        { error: 'Ungültige Signatur' },
        { status: 401 }
      );
    }

    // Event parsen
    const body = JSON.parse(rawBody);
    const validation = RevolutModuleEventSchema.safeParse(body);

    if (!validation.success) {
      console.error('[Module Webhook] Ungültiges Event-Format:', validation.error);
      return NextResponse.json(
        { error: 'Ungültiges Event-Format' },
        { status: 400 }
      );
    }

    const event = validation.data;
    console.log(`[Module Webhook] Event empfangen: ${event.event}`);

    // Event verarbeiten
    switch (event.event) {
      case 'ORDER_COMPLETED':
        await handleOrderCompleted(event);
        break;

      case 'SUBSCRIPTION_ACTIVATED':
        await handleSubscriptionActivated(event);
        break;

      case 'SUBSCRIPTION_CANCELLED':
        await handleSubscriptionCancelled(event);
        break;

      case 'ORDER_PAYMENT_DECLINED':
      case 'SUBSCRIPTION_PAYMENT_FAILED':
        await handlePaymentDeclined(event);
        break;

      default:
        console.log(`[Module Webhook] Unbekanntes Event: ${event.event}`);
    }

    // Webhook-Log speichern
    if (db) {
      await db.collection('webhook_logs').add({
        type: 'revolut-modules',
        event: event.event,
        payload: body,
        processedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Module Webhook] Fehler:', error);
    return NextResponse.json(
      { error: 'Webhook-Verarbeitung fehlgeschlagen', details: message },
      { status: 500 }
    );
  }
}
