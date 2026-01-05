/**
 * Payout History API Route
 * 
 * Gibt die Auszahlungshistorie für ein Unternehmen zurück.
 * Basiert primär auf Platform-Fee-Rechnungen (diese haben alle nötigen Daten).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ uid: string }>;
}

interface PayoutHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'in_transit' | 'failed';
  created: number;
  arrival_date: number | null;
  method: string;
  description: string;
  escrowIds: string[];
  orderIds: string[];
  grossAmount: number;
  platformFee: number;
  expressFee?: number;
  invoiceId?: string;
  invoiceUrl?: string;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { uid: companyId } = await context.params;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID fehlt' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin nicht verfügbar' }, { status: 500 });
    }

    // Hole Platform Fee Invoices - diese haben alle nötigen Daten
    const invoicesSnapshot = await adminDb
      .collection('platformFeeInvoices')
      .where('providerId', '==', companyId)
      .limit(100)
      .get();

    // Konvertiere Invoices zu PayoutHistoryItems
    const payouts: PayoutHistoryItem[] = [];
    let totalAmount = 0;

    invoicesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Beträge sind in Euro gespeichert, wir brauchen Cent für die Anzeige
      const grossAmount = (data.grossAmount || 0) * 100;
      const platformFee = (data.platformFeeAmount || 0) * 100;
      const expressFee = (data.expressFeeAmount || 0) * 100;
      const netAmount = (data.netPayoutAmount || 0) * 100;
      
      // Datum aus payoutDate oder createdAt
      let createdTimestamp: number;
      if (data.payoutDate?.toMillis) {
        createdTimestamp = Math.floor(data.payoutDate.toMillis() / 1000);
      } else if (data.createdAt?.toMillis) {
        createdTimestamp = Math.floor(data.createdAt.toMillis() / 1000);
      } else {
        createdTimestamp = Math.floor(Date.now() / 1000);
      }
      
      // Ankunftsdatum: 1-2 Werktage nach Auszahlung
      const arrivalDate = createdTimestamp + (2 * 24 * 60 * 60); // +2 Tage
      
      const orderIds = data.orderIds || [];
      const escrowIds = data.escrowIds || [];

      const payoutItem: PayoutHistoryItem = {
        id: data.payoutId || doc.id,
        amount: netAmount,
        currency: 'EUR',
        status: 'paid',
        created: createdTimestamp,
        arrival_date: arrivalDate,
        method: 'sepa_transfer',
        description: `Auszahlung für ${orderIds.length} Auftrag${orderIds.length === 1 ? '' : 'e'}`,
        escrowIds,
        orderIds,
        grossAmount,
        platformFee,
        expressFee: expressFee > 0 ? expressFee : undefined,
        invoiceId: doc.id,
        invoiceUrl: data.pdfUrl,
      };

      payouts.push(payoutItem);
      totalAmount += netAmount;
    });

    // Sortiere nach Datum (neueste zuerst)
    payouts.sort((a, b) => b.created - a.created);

    // Summary
    const pendingAmount = 0;
    const summary = {
      totalPayouts: payouts.length,
      totalAmount,
      pendingAmount,
      lastPayout: payouts.length > 0 ? payouts[0] : null,
    };

    return NextResponse.json({
      success: true,
      payouts,
      summary,
    });
  } catch (error) {
    console.error('[PayoutHistory] Error:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Laden der Auszahlungshistorie',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
