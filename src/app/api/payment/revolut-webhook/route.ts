/**
 * Revolut Webhook Handler
 * 
 * Empfängt Webhooks von Revolut bei Zahlungsereignissen
 * Erstellt automatisch Aufträge bei erfolgreicher Zahlung
 * 
 * Dokumentation: https://developer.revolut.com/docs/merchant/webhooks
 * 
 * Webhook registriert am 02.01.2026:
 * - ID: f8d15f75-7cce-4caa-9907-8a226cf0b8cd
 * - URL: https://taskilo.de/api/payment/revolut-webhook
 * - Events: ORDER_AUTHORISED, ORDER_COMPLETED
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.REVOLUT_BUSINESS_WEBHOOK_SECRET;

interface RevolutWebhookPayload {
  event: string;
  order_id: string;
  merchant_order_ext_ref?: string;
  state?: string;
  completed_at?: string;
}

/**
 * Verifiziert die Webhook-Signatur von Revolut
 * 
 * Signatur-Format laut Revolut Docs (v2):
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
  if (!WEBHOOK_SECRET || !signatureHeader) {
    console.log('[Revolut Webhook] No secret or signature - skipping verification');
    return process.env.NODE_ENV !== 'production';
  }

  try {
    // Extrahiere alle Signaturen (können mehrere sein, komma-getrennt)
    const signatures = signatureHeader.split(',').map(s => s.trim());
    
    // Timestamp für die Signatur-Berechnung
    const timestamp = timestampHeader || '';
    
    // Payload to sign: "v1.{timestamp}.{raw_payload}"
    const payloadToSign = `v1.${timestamp}.${payload}`;
    
    // Berechne erwartete Signatur
    const expectedSignature = 'v1=' + crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payloadToSign)
      .digest('hex');
    
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
        continue;
      }
    }
    
    console.log('[Revolut Webhook] Signature mismatch');
    return false;
  } catch (error) {
    console.error('[Revolut Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Erstellt einen Auftrag aus einem TempDraft - mit Transaktionsschutz gegen Duplikate
 */
async function createOrderFromTempDraft(tempDraftId: string, revolutOrderId: string): Promise<{ success: boolean; orderId?: string; alreadyExists?: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  // db ist ab hier garantiert nicht null - speichere in lokale Variable für TypeScript
  const firestore = db;

  const tempDraftRef = firestore.collection('temporaryJobDrafts').doc(tempDraftId);

  try {
    // Transaktion für atomare Prüfung und Erstellung
    const result = await firestore.runTransaction(async (transaction) => {
      const tempDraftDoc = await transaction.get(tempDraftRef);

      if (!tempDraftDoc.exists) {
        return { success: false, error: 'TempDraft not found' };
      }

      const tempDraftData = tempDraftDoc.data();

      // WICHTIG: Prüfe ob bereits konvertiert - verhindert Duplikate
      if (tempDraftData?.convertedToOrderId) {
        return { 
          success: true, 
          orderId: tempDraftData.convertedToOrderId, 
          alreadyExists: true 
        };
      }

      // Auftrag erstellen
      const orderData: Record<string, unknown> = {
        titel: tempDraftData?.titel || `Auftrag für ${tempDraftData?.selectedSubcategory || tempDraftData?.unterkategorie || 'Dienstleistung'}`,
        beschreibung: tempDraftData?.beschreibung || tempDraftData?.description || '',
        kategorie: tempDraftData?.kategorie || tempDraftData?.selectedCategory || '',
        unterkategorie: tempDraftData?.unterkategorie || tempDraftData?.selectedSubcategory || '',
        selectedSubcategory: tempDraftData?.selectedSubcategory || tempDraftData?.unterkategorie || '',
        selectedCategory: tempDraftData?.selectedCategory || tempDraftData?.kategorie || '',
        
        kundeId: tempDraftData?.kundeId || tempDraftData?.customerFirebaseUid,
        customerFirebaseUid: tempDraftData?.customerFirebaseUid || tempDraftData?.kundeId,
        kundentyp: tempDraftData?.kundentyp || tempDraftData?.customerType || 'privat',
        
        selectedAnbieterId: tempDraftData?.anbieterId || tempDraftData?.selectedAnbieterId,
        providerName: tempDraftData?.providerName,
        
        jobDateFrom: tempDraftData?.jobDateFrom || null,
        jobDateTo: tempDraftData?.jobDateTo || null,
        time: tempDraftData?.time || tempDraftData?.jobTimePreference || null,
        jobTimePreference: tempDraftData?.jobTimePreference || null,
        auftragsDauer: tempDraftData?.auftragsDauer || tempDraftData?.jobDurationString || null,
        jobTotalCalculatedHours: tempDraftData?.jobTotalCalculatedHours || null,
        
        jobCalculatedPriceInCents: tempDraftData?.jobCalculatedPriceInCents || 0,
        totalPriceInCents: tempDraftData?.jobCalculatedPriceInCents || 0,
        totalAmountPaidByBuyer: tempDraftData?.jobCalculatedPriceInCents || 0,
        price: tempDraftData?.jobCalculatedPriceInCents ? tempDraftData.jobCalculatedPriceInCents / 100 : 0,
        totalAmount: tempDraftData?.jobCalculatedPriceInCents ? tempDraftData.jobCalculatedPriceInCents / 100 : 0,
        currency: 'EUR',
        
        postalCode: tempDraftData?.postalCode || tempDraftData?.jobPostalCode || '',
        city: tempDraftData?.city || tempDraftData?.jobCity || '',
        street: tempDraftData?.street || tempDraftData?.jobStreet || '',
        
        status: 'zahlung_erhalten_clearing',
        paymentMethod: 'escrow',
        revolutOrderId: revolutOrderId,
        
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        paidAt: FieldValue.serverTimestamp(),
        
        tempDraftId: tempDraftId,
        createdBy: 'webhook', // Markiere dass vom Webhook erstellt
      };

      // B2B Felder
      if (tempDraftData?.isB2B || tempDraftData?.companyId) {
        orderData.isB2B = true;
        orderData.companyId = tempDraftData.companyId;
        orderData.companyName = tempDraftData.companyName;
      }

      // Neuen Auftrag erstellen
      const orderRef = firestore.collection('auftraege').doc();
      transaction.set(orderRef, orderData);

      // TempDraft als konvertiert markieren (innerhalb derselben Transaktion!)
      transaction.update(tempDraftRef, {
        convertedToOrderId: orderRef.id,
        convertedAt: FieldValue.serverTimestamp(),
        convertedBy: 'webhook',
      });

      return { success: true, orderId: orderRef.id, alreadyExists: false };
    });

    return result;
  } catch (error) {
    console.error('[createOrderFromTempDraft] Transaction error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Transaction failed' 
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Hole Raw Body für Signatur-Verifizierung
    const rawBody = await request.text();
    const signature = request.headers.get('Revolut-Signature');
    const timestamp = request.headers.get('Revolut-Request-Timestamp');

    // Verifiziere Signatur (in Produktion)
    if (process.env.NODE_ENV === 'production' && WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
        console.error('[Revolut Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody) as RevolutWebhookPayload;
    
    console.log('[Revolut Webhook] Received:', JSON.stringify(payload));

    // Prüfe Event-Typ - ORDER_COMPLETED oder state === 'COMPLETED'
    if (payload.event === 'ORDER_COMPLETED' || payload.state === 'COMPLETED') {
      const escrowId = payload.merchant_order_ext_ref;
      
      if (!escrowId) {
        console.log('[Revolut Webhook] No escrowId in merchant_order_ext_ref');
        return NextResponse.json({ received: true });
      }

      if (!db) {
        console.error('[Revolut Webhook] Database not initialized');
        return NextResponse.json({ received: true, error: 'DB not initialized' });
      }

      // 1. Escrow als bezahlt markieren
      const escrowRef = db.collection('escrows').doc(escrowId);
      const escrowDoc = await escrowRef.get();

      if (!escrowDoc.exists) {
        console.log('[Revolut Webhook] Escrow not found:', escrowId);
        return NextResponse.json({ received: true });
      }

      const escrowData = escrowDoc.data();

      await escrowRef.update({
        status: 'held',
        paidAt: new Date(),
        paymentId: payload.order_id,
        paymentMethod: 'card',
        revolutOrderId: payload.order_id,
        updatedAt: new Date(),
      });

      console.log('[Revolut Webhook] Escrow marked as paid:', escrowId);

      // 2. Auftrag erstellen (falls noch nicht existiert)
      const tempDraftId = escrowData?.tempDraftId;
      
      if (tempDraftId) {
        const orderResult = await createOrderFromTempDraft(tempDraftId, payload.order_id);
        
        if (orderResult.success) {
          if (orderResult.alreadyExists) {
            console.log('[Revolut Webhook] Order already exists:', orderResult.orderId);
          } else {
            console.log('[Revolut Webhook] Order created:', orderResult.orderId);
          }

          // Escrow mit Order ID verknüpfen
          await escrowRef.update({
            finalOrderId: orderResult.orderId,
          });
        } else {
          console.error('[Revolut Webhook] Failed to create order:', orderResult.error);
        }
      } else {
        console.log('[Revolut Webhook] No tempDraftId in escrow');
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Revolut Webhook] Error:', error);
    // Immer 200 zurückgeben damit Revolut nicht erneut sendet
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

// Revolut sendet auch GET für Webhook-Verifizierung
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
