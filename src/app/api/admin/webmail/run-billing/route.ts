/**
 * Admin API - Run Manual Billing
 * Uses Firebase Admin SDK for server-side access
 */

import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST() {
  const results = {
    processed: 0,
    success: 0,
    failed: 0,
    invoices: [] as string[],
    errors: [] as string[],
  };

  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Datenbank nicht verfügbar',
      }, { status: 500 });
    }

    // Hole alle fälligen Abonnements
    const now = new Date();
    const snapshot = await db.collection('webmailSubscriptions')
      .where('status', '==', 'active')
      .where('nextBillingDate', '<=', now)
      .get();
    
    results.processed = snapshot.docs.length;

    // Verarbeite jedes Abo
    for (const doc of snapshot.docs) {
      try {
        const subscription = doc.data();
        
        // Erstelle neue Rechnung
        const invoiceId = `INV-WM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        await db.collection('webmailInvoices').doc(invoiceId).set({
          id: invoiceId,
          subscriptionId: doc.id,
          userId: subscription.userId,
          companyId: subscription.companyId,
          customerEmail: subscription.customerEmail,
          customerName: subscription.customerName,
          customerAddress: subscription.customerAddress,
          invoiceNumber: `WM-${new Date().getFullYear()}-${String(results.success + 1).padStart(4, '0')}`,
          items: [{
            description: subscription.type === 'mailbox' 
              ? `E-Mail Postfach: ${subscription.mailboxEmail}`
              : `Domain: ${subscription.domain}`,
            quantity: 1,
            unitPrice: subscription.priceNet,
            total: subscription.priceNet,
          }],
          subtotal: subscription.priceNet,
          vatRate: subscription.vatRate || 19,
          vatAmount: subscription.priceNet * ((subscription.vatRate || 19) / 100),
          total: subscription.priceGross,
          periodStart: subscription.currentPeriodEnd,
          periodEnd: new Date(subscription.currentPeriodEnd.toDate().getTime() + 
            (subscription.billingInterval === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
          status: 'sent',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 Tage
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Update Subscription Billing Cycle
        const nextPeriodEnd = new Date(subscription.currentPeriodEnd.toDate());
        if (subscription.billingInterval === 'monthly') {
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
        } else {
          nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
        }

        await db.collection('webmailSubscriptions').doc(doc.id).update({
          currentPeriodStart: subscription.currentPeriodEnd,
          currentPeriodEnd: nextPeriodEnd,
          nextBillingDate: nextPeriodEnd,
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.success++;
        results.invoices.push(invoiceId);
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        results.errors.push(`${doc.id}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Abrechnung: ${results.success}/${results.processed} erfolgreich`,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
