/**
 * Revolut Business API Webhook Handler
 * 
 * Empfängt Webhooks von Revolut Business API bei eingehenden SEPA-Überweisungen.
 * Prüft den Verwendungszweck (z.B. ESC-12345678) und markiert den Escrow/Auftrag als bezahlt.
 * 
 * Webhook Events:
 * - TransactionCreated: Neue eingehende Überweisung
 * - TransactionStateChanged: Status-Update (pending -> completed)
 * 
 * Dokumentation: https://developer.revolut.com/docs/business/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.REVOLUT_BUSINESS_WEBHOOK_SECRET || process.env.REVOLUT_WEBHOOK_SECRET;

interface RevolutTransactionEvent {
  event: 'TransactionCreated' | 'TransactionStateChanged';
  timestamp: string;
  data: {
    id: string;
    type: 'transfer' | 'card_payment' | 'exchange' | 'fee' | 'refund' | 'atm' | 'topup';
    state: 'pending' | 'completed' | 'declined' | 'failed' | 'reverted';
    created_at: string;
    completed_at?: string;
    reference?: string; // Verwendungszweck bei SEPA
    legs: Array<{
      leg_id: string;
      amount: number;
      currency: string;
      description?: string;
      balance?: number;
      account_id: string;
      counterparty?: {
        account_id?: string;
        account_type?: string;
        name?: string;
      };
    }>;
  };
}

/**
 * Verifiziert die Webhook-Signatur von Revolut Business API
 * 
 * Signatur-Format laut Revolut Docs:
 * - Header: Revolut-Signature mit Format "v1=<hex_signature>"
 * - Timestamp: Revolut-Request-Timestamp (UNIX timestamp in ms)
 * - Payload to sign: "v1.{timestamp}.{raw_payload}"
 * - HMAC-SHA256 mit dem Signing Secret
 */
function verifyWebhookSignature(
  payload: string, 
  signatureHeader: string | null,
  timestampHeader: string | null
): boolean {
  if (!WEBHOOK_SECRET) {
    console.log('[Revolut Business Webhook] No webhook secret configured');
    return process.env.NODE_ENV !== 'production';
  }
  
  if (!signatureHeader) {
    console.log('[Revolut Business Webhook] No signature header present');
    return process.env.NODE_ENV !== 'production';
  }

  try {
    // Extrahiere alle Signaturen (können mehrere sein, komma-getrennt)
    // Format: "v1=abc123,v1=def456"
    const signatures = signatureHeader.split(',').map(s => s.trim());
    
    // Timestamp für die Signatur-Berechnung
    const timestamp = timestampHeader || '';
    
    // Payload to sign: "v1.{timestamp}.{raw_payload}"
    const payloadToSign = `v1.${timestamp}.${payload}`;
    
    // Debug logging
    console.log('[Revolut Webhook Debug] Received signature:', signatureHeader);
    console.log('[Revolut Webhook Debug] Timestamp:', timestamp);
    console.log('[Revolut Webhook Debug] Secret configured:', WEBHOOK_SECRET ? 'yes (length: ' + WEBHOOK_SECRET.length + ')' : 'no');
    
    // Berechne erwartete Signatur
    const expectedSignature = 'v1=' + crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadToSign)
      .digest('hex');
    
    console.log('[Revolut Webhook Debug] Expected signature:', expectedSignature);
    
    // Prüfe ob eine der Signaturen übereinstimmt
    for (const sig of signatures) {
      try {
        if (crypto.timingSafeEqual(
          Buffer.from(sig),
          Buffer.from(expectedSignature)
        )) {
          return true;
        }
      } catch {
        // Unterschiedliche Längen - nicht übereinstimmend
        continue;
      }
    }
    
    console.log('[Revolut Business Webhook] Signature mismatch');
    return false;
  } catch (error) {
    console.error('[Revolut Business Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Extrahiert die Escrow-ID aus dem Verwendungszweck
 * Erwartet Format: ESC-XXXXXXXX (8 Ziffern)
 */
function extractEscrowId(reference: string | undefined): string | null {
  if (!reference) return null;
  
  // Suche nach ESC-XXXXXXXX Pattern
  const match = reference.match(/ESC-(\d{8})/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Markiert Escrow und zugehörigen Auftrag als bezahlt
 */
async function processIncomingPayment(
  escrowReference: string,
  transactionId: string,
  amountInCents: number,
  senderName: string | undefined
): Promise<{ success: boolean; escrowId?: string; orderId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  const firestore = db;

  try {
    // 1. Finde Escrow anhand der Referenz
    const escrowQuery = await firestore
      .collection('escrowPayments')
      .where('paymentReference', '==', escrowReference)
      .limit(1)
      .get();

    if (escrowQuery.empty) {
      // Versuche auch mit escrowId direkt
      const directEscrowDoc = await firestore.collection('escrowPayments').doc(escrowReference).get();
      
      if (!directEscrowDoc.exists) {
        console.log('[Revolut Business Webhook] Escrow not found for reference:', escrowReference);
        return { success: false, error: 'Escrow not found' };
      }

      // Direkter Escrow gefunden
      const escrowDoc = directEscrowDoc;
      const escrowData = escrowDoc.data();
      const escrowId = escrowDoc.id;

      // Prüfe ob bereits bezahlt
      if (escrowData?.status === 'held' || escrowData?.status === 'paid') {
        console.log('[Revolut Business Webhook] Escrow already paid:', escrowId);
        return { success: true, escrowId, orderId: escrowData?.finalOrderId, error: 'Already paid' };
      }

      // Betragsprüfung (mit 1% Toleranz für Gebühren)
      const expectedAmount = escrowData?.amountInCents || 0;
      const tolerance = expectedAmount * 0.01;
      if (Math.abs(amountInCents - expectedAmount) > tolerance) {
        console.warn('[Revolut Business Webhook] Amount mismatch:', {
          expected: expectedAmount,
          received: amountInCents,
          escrowId,
        });
        // Trotzdem verarbeiten, aber loggen
      }

      // Escrow als bezahlt markieren
      await escrowDoc.ref.update({
        status: 'held',
        paidAt: FieldValue.serverTimestamp(),
        paymentId: transactionId,
        paymentMethod: 'bank_transfer',
        senderName: senderName || 'Unknown',
        receivedAmountInCents: amountInCents,
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log('[Revolut Business Webhook] Escrow marked as paid:', escrowId);

      // 2. Auftrag erstellen falls tempDraftId vorhanden
      const tempDraftId = escrowData?.tempDraftId;
      let orderId = escrowData?.finalOrderId;

      if (tempDraftId && !orderId) {
        const orderResult = await createOrderFromEscrow(tempDraftId, transactionId, escrowId);
        if (orderResult.success) {
          orderId = orderResult.orderId;
          
          // Escrow mit Order verknüpfen
          await escrowDoc.ref.update({
            finalOrderId: orderId,
          });
        }
      }

      // 3. Falls Auftrag existiert, Status aktualisieren
      if (orderId) {
        await firestore.collection('auftraege').doc(orderId).update({
          status: 'zahlung_erhalten',
          paymentStatus: 'paid',
          paymentReceivedAt: FieldValue.serverTimestamp(),
          paymentMethod: 'bank_transfer',
          revolutTransactionId: transactionId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        console.log('[Revolut Business Webhook] Order marked as paid:', orderId);
      }

      return { success: true, escrowId, orderId };
    }

    // Escrow über Query gefunden
    const escrowDoc = escrowQuery.docs[0];
    const escrowData = escrowDoc.data();
    const escrowId = escrowDoc.id;

    // Rest der Verarbeitung wie oben...
    if (escrowData?.status === 'held' || escrowData?.status === 'paid') {
      return { success: true, escrowId, orderId: escrowData?.finalOrderId };
    }

    await escrowDoc.ref.update({
      status: 'held',
      paidAt: FieldValue.serverTimestamp(),
      paymentId: transactionId,
      paymentMethod: 'bank_transfer',
      senderName: senderName || 'Unknown',
      receivedAmountInCents: amountInCents,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const tempDraftId = escrowData?.tempDraftId;
    let orderId = escrowData?.finalOrderId;

    if (tempDraftId && !orderId) {
      const orderResult = await createOrderFromEscrow(tempDraftId, transactionId, escrowId);
      if (orderResult.success) {
        orderId = orderResult.orderId;
        await escrowDoc.ref.update({ finalOrderId: orderId });
      }
    }

    if (orderId) {
      await firestore.collection('auftraege').doc(orderId).update({
        status: 'zahlung_erhalten',
        paymentStatus: 'paid',
        paymentReceivedAt: FieldValue.serverTimestamp(),
        paymentMethod: 'bank_transfer',
        revolutTransactionId: transactionId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true, escrowId, orderId };
  } catch (error) {
    console.error('[Revolut Business Webhook] Processing error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Erstellt einen Auftrag aus TempDraft nach erfolgreicher Zahlung
 */
async function createOrderFromEscrow(
  tempDraftId: string,
  transactionId: string,
  escrowId: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  const firestore = db;
  const tempDraftRef = firestore.collection('temporaryJobDrafts').doc(tempDraftId);

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const tempDraftDoc = await transaction.get(tempDraftRef);

      if (!tempDraftDoc.exists) {
        return { success: false, error: 'TempDraft not found' };
      }

      const tempDraftData = tempDraftDoc.data();

      // Prüfe ob bereits konvertiert
      if (tempDraftData?.convertedToOrderId) {
        return { success: true, orderId: tempDraftData.convertedToOrderId };
      }

      // Auftrag erstellen
      const orderData: Record<string, unknown> = {
        titel: tempDraftData?.titel || `Auftrag für ${tempDraftData?.selectedSubcategory || 'Dienstleistung'}`,
        beschreibung: tempDraftData?.beschreibung || tempDraftData?.description || '',
        kategorie: tempDraftData?.kategorie || tempDraftData?.selectedCategory || '',
        unterkategorie: tempDraftData?.unterkategorie || tempDraftData?.selectedSubcategory || '',
        
        kundeId: tempDraftData?.kundeId || tempDraftData?.customerFirebaseUid,
        customerFirebaseUid: tempDraftData?.customerFirebaseUid || tempDraftData?.kundeId,
        kundentyp: tempDraftData?.kundentyp || 'privat',
        
        selectedAnbieterId: tempDraftData?.anbieterId || tempDraftData?.selectedAnbieterId,
        providerName: tempDraftData?.providerName,
        
        jobDateFrom: tempDraftData?.jobDateFrom || null,
        jobDateTo: tempDraftData?.jobDateTo || null,
        time: tempDraftData?.time || null,
        auftragsDauer: tempDraftData?.auftragsDauer || null,
        
        jobCalculatedPriceInCents: tempDraftData?.jobCalculatedPriceInCents || 0,
        totalPriceInCents: tempDraftData?.jobCalculatedPriceInCents || 0,
        totalAmountPaidByBuyer: tempDraftData?.jobCalculatedPriceInCents || 0,
        currency: 'EUR',
        
        postalCode: tempDraftData?.postalCode || '',
        city: tempDraftData?.city || '',
        street: tempDraftData?.street || '',
        
        status: 'zahlung_erhalten',
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        revolutTransactionId: transactionId,
        escrowId: escrowId,
        
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        paidAt: FieldValue.serverTimestamp(),
        
        tempDraftId: tempDraftId,
        createdBy: 'bank_transfer_webhook',
      };

      const orderRef = firestore.collection('auftraege').doc();
      transaction.set(orderRef, orderData);

      transaction.update(tempDraftRef, {
        convertedToOrderId: orderRef.id,
        convertedAt: FieldValue.serverTimestamp(),
        convertedBy: 'bank_transfer_webhook',
      });

      return { success: true, orderId: orderRef.id };
    });

    return result;
  } catch (error) {
    console.error('[createOrderFromEscrow] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('Revolut-Signature') || request.headers.get('X-Revolut-Signature');
    const timestamp = request.headers.get('Revolut-Request-Timestamp');

    // Verifiziere Signatur
    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      console.error('[Revolut Business Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as RevolutTransactionEvent;
    
    console.log('[Revolut Business Webhook] Received:', payload.event, payload.data?.id);

    // Nur eingehende completed Transaktionen verarbeiten
    if (
      (payload.event === 'TransactionCreated' || payload.event === 'TransactionStateChanged') &&
      payload.data?.state === 'completed' &&
      payload.data?.type === 'transfer'
    ) {
      // Prüfe ob es eine eingehende Überweisung ist (positiver Betrag im ersten Leg)
      const incomingLeg = payload.data.legs?.find(leg => leg.amount > 0);
      
      if (!incomingLeg) {
        console.log('[Revolut Business Webhook] Not an incoming transfer, skipping');
        return NextResponse.json({ received: true });
      }

      // Extrahiere Escrow-Referenz aus Verwendungszweck
      const reference = payload.data.reference || incomingLeg.description;
      const escrowReference = extractEscrowId(reference);

      if (!escrowReference) {
        console.log('[Revolut Business Webhook] No escrow reference found in:', reference);
        return NextResponse.json({ received: true, note: 'No escrow reference' });
      }

      // Verarbeite Zahlung
      const result = await processIncomingPayment(
        escrowReference,
        payload.data.id,
        Math.abs(incomingLeg.amount), // Betrag in Cents
        incomingLeg.counterparty?.name
      );

      console.log('[Revolut Business Webhook] Processing result:', result);

      return NextResponse.json({
        received: true,
        processed: result.success,
        escrowId: result.escrowId,
        orderId: result.orderId,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Revolut Business Webhook] Error:', error);
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Revolut Business Webhook endpoint active',
    events: ['TransactionCreated', 'TransactionStateChanged'],
    description: 'Handles incoming SEPA transfers for escrow payments',
  });
}
