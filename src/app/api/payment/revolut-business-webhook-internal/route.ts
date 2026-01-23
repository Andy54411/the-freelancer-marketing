/**
 * Interner Revolut Business Webhook Handler
 * 
 * Empfängt verifizierte Webhooks von Hetzner (mail.taskilo.de).
 * Hetzner empfängt die Webhooks von Revolut (wegen IP-Whitelist),
 * verifiziert die Signatur und leitet hierher weiter.
 * 
 * DIESER ENDPOINT AKZEPTIERT NUR ANFRAGEN VON HETZNER!
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

const INTERNAL_WEBHOOK_SECRET = process.env.INTERNAL_WEBHOOK_SECRET || 'taskilo-internal-webhook-secret';

interface RevolutTransactionEvent {
  event: 'TransactionCreated' | 'TransactionStateChanged';
  timestamp: string;
  data: {
    id: string;
    type: 'transfer' | 'card_payment' | 'exchange' | 'fee' | 'refund' | 'atm' | 'topup';
    state: 'pending' | 'completed' | 'declined' | 'failed' | 'reverted';
    created_at: string;
    completed_at?: string;
    reference?: string;
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
 * Verifiziert, dass die Anfrage von Hetzner kommt
 */
function verifyInternalRequest(request: NextRequest): boolean {
  const secret = request.headers.get('X-Internal-Webhook-Secret');
  const forwardedFrom = request.headers.get('X-Forwarded-From');
  
  if (secret !== INTERNAL_WEBHOOK_SECRET) {
    console.error('[Internal Webhook] Invalid secret');
    return false;
  }
  
  if (forwardedFrom !== 'hetzner-revolut-proxy') {
    console.error('[Internal Webhook] Invalid forwarded-from header');
    return false;
  }
  
  return true;
}

/**
 * Extrahiert die Escrow-ID aus dem Verwendungszweck
 * Erwartet Format: ESC-XXXXXXXX (8 Ziffern)
 */
function extractEscrowId(reference: string | undefined): string | null {
  if (!reference) return null;
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

    let escrowDoc;
    let escrowData;
    let escrowId;

    if (escrowQuery.empty) {
      // Versuche auch mit escrowId direkt
      const directEscrowDoc = await firestore.collection('escrowPayments').doc(escrowReference).get();
      
      if (!directEscrowDoc.exists) {
        console.log('[Internal Webhook] Escrow not found for reference:', escrowReference);
        return { success: false, error: 'Escrow not found' };
      }

      escrowDoc = directEscrowDoc;
      escrowData = escrowDoc.data();
      escrowId = escrowDoc.id;
    } else {
      escrowDoc = escrowQuery.docs[0];
      escrowData = escrowDoc.data();
      escrowId = escrowDoc.id;
    }

    // Prüfe ob bereits bezahlt
    if (escrowData?.status === 'held' || escrowData?.status === 'paid') {
      console.log('[Internal Webhook] Escrow already paid:', escrowId);
      return { success: true, escrowId, orderId: escrowData?.finalOrderId, error: 'Already paid' };
    }

    // Betragsprüfung (mit 1% Toleranz für Gebühren)
    const expectedAmount = escrowData?.amountInCents || 0;
    const tolerance = expectedAmount * 0.01;
    if (Math.abs(amountInCents - expectedAmount) > tolerance) {
      console.warn('[Internal Webhook] Amount mismatch:', {
        expected: expectedAmount,
        received: amountInCents,
        escrowId,
      });
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

    console.log('[Internal Webhook] Escrow marked as paid:', escrowId);

    // 2. Auftrag erstellen falls tempDraftId vorhanden
    const tempDraftId = escrowData?.tempDraftId;
    let orderId = escrowData?.finalOrderId;

    if (tempDraftId && !orderId) {
      orderId = await createOrderFromEscrow(firestore, tempDraftId, transactionId, escrowId);
      if (orderId) {
        await escrowDoc.ref.update({ finalOrderId: orderId });
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
      
      console.log('[Internal Webhook] Order marked as paid:', orderId);
    }

    return { success: true, escrowId, orderId };
  } catch (error) {
    console.error('[Internal Webhook] Processing error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Erstellt einen Auftrag aus TempDraft nach erfolgreicher Zahlung
 */
async function createOrderFromEscrow(
  firestore: FirebaseFirestore.Firestore,
  tempDraftId: string,
  transactionId: string,
  escrowId: string
): Promise<string | null> {
  const tempDraftRef = firestore.collection('temporaryJobDrafts').doc(tempDraftId);

  try {
    const result = await firestore.runTransaction(async (transaction) => {
      const tempDraftDoc = await transaction.get(tempDraftRef);

      if (!tempDraftDoc.exists) {
        return null;
      }

      const tempDraftData = tempDraftDoc.data();

      // Prüfe ob bereits konvertiert
      if (tempDraftData?.convertedToOrderId) {
        return tempDraftData.convertedToOrderId;
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

      return orderRef.id;
    });

    return result;
  } catch (error) {
    console.error('[createOrderFromEscrow] Error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifiziere interne Anfrage
    if (!verifyInternalRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json() as RevolutTransactionEvent;
    
    console.log('[Internal Webhook] Received from Hetzner:', payload.event, payload.data?.id);

    // Nur eingehende completed Transaktionen verarbeiten
    if (
      (payload.event === 'TransactionCreated' || payload.event === 'TransactionStateChanged') &&
      payload.data?.state === 'completed' &&
      payload.data?.type === 'transfer'
    ) {
      // Prüfe ob es eine eingehende Überweisung ist (positiver Betrag im ersten Leg)
      const incomingLeg = payload.data.legs?.find(leg => leg.amount > 0);
      
      if (!incomingLeg) {
        console.log('[Internal Webhook] Not an incoming transfer, skipping');
        return NextResponse.json({ received: true });
      }

      // Extrahiere Escrow-Referenz aus Verwendungszweck
      const reference = payload.data.reference || incomingLeg.description;
      const escrowReference = extractEscrowId(reference);

      if (!escrowReference) {
        console.log('[Internal Webhook] No escrow reference found in:', reference);
        return NextResponse.json({ received: true, note: 'No escrow reference' });
      }

      // Verarbeite Zahlung
      const result = await processIncomingPayment(
        escrowReference,
        payload.data.id,
        Math.abs(incomingLeg.amount),
        incomingLeg.counterparty?.name
      );

      console.log('[Internal Webhook] Processing result:', result);

      return NextResponse.json({
        received: true,
        processed: result.success,
        escrowId: result.escrowId,
        orderId: result.orderId,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Internal Webhook] Error:', error);
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Internal Revolut Webhook endpoint active',
    description: 'Receives forwarded webhooks from Hetzner proxy',
    note: 'Direct Revolut webhooks should go to mail.taskilo.de/webmail-api/api/payment/revolut-webhook',
  });
}
