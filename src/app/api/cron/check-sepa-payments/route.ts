/**
 * Cron Job: SEPA-Zahlungen prüfen
 * Läuft täglich um 7:00 Uhr
 * Prüft Revolut Business auf eingehende SEPA-Überweisungen mit ESC-* Referenz
 */

import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// Revolut API Konfiguration - über Hetzner Proxy wegen IP-Whitelisting
const HETZNER_PROXY_URL = process.env.HETZNER_PROXY_URL || 'https://mail.taskilo.de';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY;

interface RevolutTransaction {
  id: string;
  type: string;
  state: string;
  reference?: string;
  created_at: string;
  completed_at?: string;
  legs: Array<{
    amount: number;
    currency: string;
    description?: string;
  }>;
}

interface ProcessedPayment {
  transactionId: string;
  escrowReference: string;
  amount: number;
  success: boolean;
  error?: string;
}

/**
 * Extrahiert Escrow-Referenz aus Verwendungszweck
 */
function extractEscrowReference(reference: string | undefined): string | null {
  if (!reference) return null;
  const match = reference.match(/ESC-(\d{8})/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Holt die letzten SEPA-Transaktionen über Hetzner Proxy
 * (Hetzner ist IP-whitelisted bei Revolut)
 */
async function fetchRecentTransactions(): Promise<RevolutTransaction[]> {
  const response = await fetch(
    `${HETZNER_PROXY_URL}/api/payment/transactions`,
    {
      headers: {
        'x-api-key': WEBMAIL_API_KEY || '',
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Hetzner Proxy error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.transactions || [];

  return response.json();
}

/**
 * Verarbeitet eine eingehende SEPA-Zahlung
 */
async function processPayment(
  transaction: RevolutTransaction,
  escrowReference: string,
  db: FirebaseFirestore.Firestore
): Promise<ProcessedPayment> {
  const transactionId = transaction.id;
  const amount = transaction.legs[0]?.amount || 0;
  const amountInCents = Math.round(amount * 100);
  const senderName = transaction.legs[0]?.description?.replace('Payment from ', '') || 'Unknown';

  try {
    // Prüfe ob diese Transaktion bereits verarbeitet wurde
    const processedQuery = await db
      .collection('processedRevolutTransactions')
      .doc(transactionId)
      .get();

    if (processedQuery.exists) {
      return {
        transactionId,
        escrowReference,
        amount,
        success: true,
        error: 'Already processed',
      };
    }

    // Finde Escrow anhand der Referenz
    const escrowQuery = await db
      .collection('escrowPayments')
      .where('paymentReference', '==', escrowReference)
      .limit(1)
      .get();

    let escrowDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    if (escrowQuery.empty) {
      // Versuche mit direkter ID
      const directDoc = await db.collection('escrowPayments').doc(escrowReference).get();
      if (directDoc.exists) {
        escrowDoc = directDoc;
      }
    } else {
      escrowDoc = escrowQuery.docs[0];
    }

    if (!escrowDoc || !escrowDoc.exists) {
      // Markiere als verarbeitet, auch wenn kein Escrow gefunden
      await db.collection('processedRevolutTransactions').doc(transactionId).set({
        transactionId,
        escrowReference,
        amount,
        status: 'no_escrow_found',
        processedAt: FieldValue.serverTimestamp(),
      });

      return {
        transactionId,
        escrowReference,
        amount,
        success: false,
        error: 'Escrow not found',
      };
    }

    const escrowData = escrowDoc.data();
    const escrowId = escrowDoc.id;

    // Prüfe ob bereits bezahlt
    if (escrowData?.status === 'held' || escrowData?.status === 'paid') {
      await db.collection('processedRevolutTransactions').doc(transactionId).set({
        transactionId,
        escrowReference,
        escrowId,
        amount,
        status: 'already_paid',
        processedAt: FieldValue.serverTimestamp(),
      });

      return {
        transactionId,
        escrowReference,
        amount,
        success: true,
        error: 'Already paid',
      };
    }

    // Escrow als bezahlt markieren
    await escrowDoc.ref.update({
      status: 'held',
      paidAt: FieldValue.serverTimestamp(),
      paymentId: transactionId,
      paymentMethod: 'bank_transfer',
      senderName,
      receivedAmountInCents: amountInCents,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Auftrag aktualisieren falls vorhanden
    const orderId = escrowData?.finalOrderId;
    if (orderId) {
      await db.collection('auftraege').doc(orderId).update({
        status: 'zahlung_erhalten',
        paymentStatus: 'paid',
        paymentReceivedAt: FieldValue.serverTimestamp(),
        paymentMethod: 'bank_transfer',
        revolutTransactionId: transactionId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Markiere Transaktion als verarbeitet
    await db.collection('processedRevolutTransactions').doc(transactionId).set({
      transactionId,
      escrowReference,
      escrowId,
      orderId: orderId || null,
      amount,
      status: 'processed',
      processedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[SEPA Cron] Payment processed: ${escrowReference} - ${amount}€`);

    return {
      transactionId,
      escrowReference,
      amount,
      success: true,
    };

  } catch (error) {
    console.error(`[SEPA Cron] Error processing payment ${transactionId}:`, error);
    return {
      transactionId,
      escrowReference,
      amount,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(request: Request) {
  // Vercel Cron Authorization prüfen
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Erlaube auch ohne Secret für manuelle Tests im Development
    if (process.env.NODE_ENV === 'production' && !authHeader?.includes('Bearer')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('[SEPA Cron] Starting daily SEPA payment check...');

  try {
    // Firebase prüfen
    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Transaktionen von Hetzner Proxy holen (der hat Revolut IP-Whitelisting)
    const transactions = await fetchRecentTransactions();
    console.log(`[SEPA Cron] Found ${transactions.length} SEPA transactions with ESC-* reference`);

    // Transaktionen sind bereits gefiltert vom Proxy
    const sepaPayments = transactions;

    console.log(`[SEPA Cron] Found ${sepaPayments.length} SEPA payments with ESC-* reference`);

    // Verarbeite jede Zahlung
    const results: ProcessedPayment[] = [];
    for (const payment of sepaPayments) {
      const escrowRef = extractEscrowReference(payment.reference);
      if (escrowRef) {
        const result = await processPayment(payment, escrowRef, db);
        results.push(result);
      }
    }

    const processed = results.filter((r) => r.success && !r.error);
    const skipped = results.filter((r) => r.error === 'Already processed' || r.error === 'Already paid');
    const failed = results.filter((r) => !r.success);

    console.log(`[SEPA Cron] Completed: ${processed.length} processed, ${skipped.length} skipped, ${failed.length} failed`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalTransactions: transactions.length,
        sepaPaymentsFound: sepaPayments.length,
        processed: processed.length,
        skipped: skipped.length,
        failed: failed.length,
      },
      results,
    });

  } catch (error) {
    console.error('[SEPA Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST für manuelle Ausführung
export async function POST(request: Request) {
  return GET(request);
}
