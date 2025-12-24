/**
 * Webmail Billing Cron API
 * 
 * Wird täglich aufgerufen um:
 * 1. Revolut Subscriptions mit Firestore zu synchronisieren
 * 2. Fällige Abonnements abzurechnen
 * 3. Rechnungen zu versenden
 * 
 * Aufruf: GET /api/cron/webmail-billing
 * Header: Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebmailSubscriptionService } from '@/services/webmail/WebmailSubscriptionService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 Minuten für viele Abonnements

/**
 * Synchronisiert alle Revolut Subscriptions mit Firestore
 */
async function syncRevolutSubscriptions(): Promise<{ synced: number; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/admin/webmail/sync-revolut-subscriptions`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { synced: 0, error: error.error || 'Sync fehlgeschlagen' };
    }
    
    const data = await response.json();
    return { synced: data.synced || 0 };
  } catch (error) {
    return { synced: 0, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    // Sync-Ergebnisse
    syncedFromRevolut: 0,
    syncError: null as string | null,
    // Billing-Ergebnisse
    processed: 0,
    success: 0,
    failed: 0,
    invoices: [] as string[],
    errors: [] as string[],
  };

  try {
    // SCHRITT 1: Synchronisiere Revolut Subscriptions
    const syncResult = await syncRevolutSubscriptions();
    results.syncedFromRevolut = syncResult.synced;
    if (syncResult.error) {
      results.syncError = syncResult.error;
    }

    // SCHRITT 2: Hole alle fälligen Abonnements
    const dueSubscriptions = await WebmailSubscriptionService.getDueSubscriptions();
    results.processed = dueSubscriptions.length;

    // Verarbeite jedes Abo
    for (const subscription of dueSubscriptions) {
      try {
        const billingResult = await WebmailSubscriptionService.processBilling(subscription.id);
        
        if (billingResult.success && billingResult.invoiceId) {
          results.success++;
          results.invoices.push(billingResult.invoiceId);
          
          // E-Mail mit Rechnung versenden
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webmail/send-invoice-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceId: billingResult.invoiceId,
                customerEmail: subscription.customerEmail,
                customerName: subscription.customerName,
                invoiceNumber: billingResult.invoiceNumber || billingResult.invoiceId,
                total: subscription.priceGross,
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                periodStart: subscription.currentPeriodStart,
                periodEnd: subscription.currentPeriodEnd,
              }),
            });
          } catch (emailError) {
            // E-Mail-Fehler loggen aber nicht als Billing-Fehler werten
            results.errors.push(`${subscription.id}: E-Mail-Versand fehlgeschlagen`);
          }
        } else {
          results.failed++;
          results.errors.push(`${subscription.id}: ${billingResult.error}`);
        }
      } catch (error) {
        results.failed++;
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        results.errors.push(`${subscription.id}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync: ${results.syncedFromRevolut} | Abrechnung: ${results.success}/${results.processed} erfolgreich`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: 'Billing-Cron fehlgeschlagen',
      details: message,
    }, { status: 500 });
  }
}
