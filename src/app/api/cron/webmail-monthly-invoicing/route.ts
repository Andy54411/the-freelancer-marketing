/**
 * Webmail Monthly Invoicing Cron API
 * 
 * Läuft am 1. jeden Monats um 8:00 Uhr:
 * 1. Synchronisiert alle Revolut Subscriptions
 * 2. Erstellt Rechnungen für alle aktiven Abos
 * 3. Versendet Rechnungs-E-Mails
 * 
 * Aufruf: GET /api/cron/webmail-monthly-invoicing
 * Header: Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { WebmailInvoicePdfService } from '@/services/webmail/WebmailInvoicePdfService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const REVOLUT_API_KEY = process.env.REVOLUT_MERCHANT_API_KEY;
const REVOLUT_API_VERSION = '2025-10-16';
const REVOLUT_ENVIRONMENT = process.env.REVOLUT_ENVIRONMENT || 'sandbox';

function getBaseUrl() {
  return REVOLUT_ENVIRONMENT === 'production'
    ? 'https://merchant.revolut.com/api'
    : 'https://sandbox-merchant.revolut.com/api';
}

// Resend für E-Mail-Versand
let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface RevolutSubscription {
  id: string;
  state: string;
  customer_id: string;
  customer_email?: string;
  plan_id: string;
  plan_variation_id: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  metadata?: Record<string, string>;
}

interface RevolutPlan {
  id: string;
  name: string;
  variations: Array<{
    id: string;
    phases: Array<{
      cycle_duration: string;
      amount: number;
      currency: string;
    }>;
  }>;
}

/**
 * Generiert eine GoBD-konforme Rechnungsnummer
 */
async function generateInvoiceNumber(): Promise<{ invoiceNumber: string; sequentialNumber: number }> {
  if (!adminDb) throw new Error('Datenbank nicht verfügbar');
  
  const counterRef = adminDb.collection('counters').doc('webmailInvoices');
  
  return adminDb.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentNumber = 1;
    
    if (counterDoc.exists) {
      currentNumber = (counterDoc.data()?.current || 0) + 1;
    }
    
    transaction.set(counterRef, {
      current: currentNumber,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    
    const year = new Date().getFullYear();
    const invoiceNumber = `WM-${year}-${String(currentNumber).padStart(5, '0')}`;
    
    return { invoiceNumber, sequentialNumber: currentNumber };
  });
}

/**
 * Erstellt eine Rechnung für ein Abo
 */
async function createInvoice(
  subscription: FirebaseFirestore.DocumentData,
  subscriptionId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; error?: string }> {
  if (!adminDb) return { success: false, error: 'Datenbank nicht verfügbar' };

  try {
    const { invoiceNumber, sequentialNumber } = await generateInvoiceNumber();
    const invoiceId = `WMI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 14); // 14 Tage Zahlungsziel

    // Preis und MwSt berechnen (Revolut zieht bereits ab, Rechnung ist Beleg)
    const priceNet = subscription.priceGross / 1.19; // 19% MwSt zurückrechnen
    const vatAmount = subscription.priceGross - priceNet;

    const invoice = {
      id: invoiceId,
      subscriptionId,
      revolutSubscriptionId: subscription.revolutSubscriptionId,
      invoiceNumber,
      sequentialNumber,
      
      // Kunde
      userId: subscription.userId || null,
      companyId: subscription.companyId || null,
      customerEmail: subscription.customerEmail,
      customerName: subscription.customerName,
      
      // Positionen
      items: [{
        description: subscription.planName,
        quantity: 1,
        unitPrice: Math.round(priceNet * 100) / 100,
        total: Math.round(priceNet * 100) / 100,
        period: `${periodStart.toLocaleDateString('de-DE')} - ${periodEnd.toLocaleDateString('de-DE')}`,
      }],
      
      // Beträge
      subtotal: Math.round(priceNet * 100) / 100,
      vatRate: 19,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: subscription.priceGross,
      
      // Zeitraum
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      
      // Status
      status: 'paid', // Bereits von Revolut abgebucht
      paymentMethod: 'revolut_subscription',
      paidAt: Timestamp.fromDate(now),
      
      // Daten
      dueDate: Timestamp.fromDate(dueDate),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('webmailInvoices').doc(invoiceId).set(invoice);

    return { success: true, invoiceId, invoiceNumber };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
  }
}

/**
 * Versendet die Rechnungs-E-Mail mit PDF-Anhang
 */
async function sendInvoiceEmail(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  total: number,
  periodStart: Date,
  periodEnd: Date,
  planName?: string
): Promise<boolean> {
  const resendInstance = getResend();
  if (!resendInstance) return false;

  const formattedTotal = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(total);

  const periodText = `${periodStart.toLocaleDateString('de-DE')} - ${periodEnd.toLocaleDateString('de-DE')}`;

  // PDF generieren
  const pdfService = WebmailInvoicePdfService.getInstance();
  const invoiceData = pdfService.createInvoiceDataFromSubscription(
    {
      customerName,
      customerEmail,
      amount: total,
      planName: planName || 'Taskilo Webmail',
    },
    invoiceNumber,
    periodStart,
    periodEnd
  );
  const pdfBase64 = pdfService.generatePdfBase64(invoiceData);

  try {
    await resendInstance.emails.send({
      from: 'Taskilo Buchhaltung <buchhaltung@taskilo.de>',
      to: [customerEmail],
      subject: `Ihre Rechnung ${invoiceNumber} von Taskilo`,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: pdfBase64,
        },
      ],
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14ad9f 0%, #0f9688 100%); padding: 30px 40px;">
              <img src="https://taskilo.de/images/taskilo-logo-white.png" alt="Taskilo" style="height: 40px; width: auto;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1f2937;">
                Ihre Rechnung ${invoiceNumber}
              </h2>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Hallo ${customerName},
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                vielen Dank für Ihr Vertrauen in Taskilo. Anbei finden Sie Ihre Rechnung als PDF-Anhang für den Abrechnungszeitraum <strong>${periodText}</strong>.
              </p>

              <!-- Rechnungsdetails -->
              <div style="background-color: #f0fdfa; border-radius: 12px; padding: 24px; margin: 30px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #4b5563;">Rechnungsnummer:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1f2937;">${invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4b5563;">Zeitraum:</td>
                    <td style="padding: 8px 0; text-align: right; color: #1f2937;">${periodText}</td>
                  </tr>
                  <tr style="border-top: 2px solid #14ad9f;">
                    <td style="padding: 16px 0 8px; font-size: 18px; font-weight: 600; color: #1f2937;">Gesamtbetrag:</td>
                    <td style="padding: 16px 0 8px; text-align: right; font-size: 18px; font-weight: 700; color: #14ad9f;">${formattedTotal}</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #6b7280;">
                Der Betrag wurde bereits automatisch von Ihrem hinterlegten Zahlungsmittel abgebucht. Diese Rechnung dient als Beleg für Ihre Unterlagen.
              </p>

              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Bei Fragen stehen wir Ihnen gerne zur Verfügung unter 
                <a href="mailto:buchhaltung@taskilo.de" style="color: #14ad9f;">buchhaltung@taskilo.de</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af; text-align: center;">
                <strong>The Freelancer Marketing Ltd.</strong>
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af; text-align: center;">
                Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2 | 8015, Paphos Cyprus
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Reg: HE 458650 | VAT: CY60058879W
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronisiert Subscriptions von Revolut
 */
async function syncRevolutSubscriptions(): Promise<{ synced: number; active: number }> {
  if (!adminDb || !REVOLUT_API_KEY) return { synced: 0, active: 0 };

  try {
    // Hole alle Subscriptions
    const subsResponse = await fetch(`${getBaseUrl()}/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });

    if (!subsResponse.ok) return { synced: 0, active: 0 };
    const subsData = await subsResponse.json();
    const subscriptions = (subsData.subscriptions || []) as RevolutSubscription[];

    // Hole Plans
    const plansResponse = await fetch(`${getBaseUrl()}/subscription-plans`, {
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });
    const plansData = await plansResponse.json();
    const plans = (plansData.subscription_plans || []) as RevolutPlan[];
    const planMap = new Map<string, RevolutPlan>();
    plans.forEach(p => planMap.set(p.id, p));

    let synced = 0;
    let active = 0;

    for (const sub of subscriptions) {
      const plan = planMap.get(sub.plan_id);
      let priceGross = 0;
      let billingInterval: 'monthly' | 'yearly' = 'monthly';

      if (plan) {
        const variation = plan.variations.find(v => v.id === sub.plan_variation_id);
        if (variation?.phases?.[0]) {
          priceGross = variation.phases[0].amount / 100;
          billingInterval = variation.phases[0].cycle_duration === 'P1Y' ? 'yearly' : 'monthly';
        }
      }

      // Hole Customer-Details
      let customerEmail = sub.customer_email || 'Unbekannt';
      let customerName = 'Unbekannt';
      
      if (sub.customer_id) {
        try {
          const legacyUrl = REVOLUT_ENVIRONMENT === 'production'
            ? 'https://merchant.revolut.com/api/1.0'
            : 'https://sandbox-merchant.revolut.com/api/1.0';
          
          const custResponse = await fetch(`${legacyUrl}/customers/${sub.customer_id}`, {
            headers: { 'Authorization': `Bearer ${REVOLUT_API_KEY}` },
          });
          
          if (custResponse.ok) {
            const customer = await custResponse.json();
            customerEmail = customer.email || customerEmail;
            customerName = customer.full_name || customerName;
          }
        } catch {
          // Ignore
        }
      }

      await adminDb.collection('webmailSubscriptions').doc(sub.id).set({
        id: sub.id,
        revolutSubscriptionId: sub.id,
        revolutCustomerId: sub.customer_id,
        revolutPlanId: sub.plan_id,
        revolutVariationId: sub.plan_variation_id,
        customerEmail,
        customerName,
        userId: sub.metadata?.userId || null,
        companyId: sub.metadata?.companyId || null,
        planId: sub.plan_id,
        planName: plan?.name || 'Unbekannt',
        priceGross,
        billingInterval,
        status: sub.state.toLowerCase(),
        currentPeriodStart: sub.current_period_start 
          ? Timestamp.fromDate(new Date(sub.current_period_start)) 
          : null,
        currentPeriodEnd: sub.current_period_end 
          ? Timestamp.fromDate(new Date(sub.current_period_end)) 
          : null,
        syncedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      synced++;
      if (sub.state === 'ACTIVE') active++;
    }

    return { synced, active };
  } catch {
    return { synced: 0, active: 0 };
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Datenbank nicht verfügbar' }, { status: 500 });
  }

  const results = {
    syncedSubscriptions: 0,
    activeSubscriptions: 0,
    invoicesCreated: 0,
    emailsSent: 0,
    errors: [] as string[],
  };

  try {
    // SCHRITT 1: Synchronisiere alle Subscriptions von Revolut
    const syncResult = await syncRevolutSubscriptions();
    results.syncedSubscriptions = syncResult.synced;
    results.activeSubscriptions = syncResult.active;

    // SCHRITT 2: Hole alle aktiven Subscriptions
    const activeSnapshot = await adminDb.collection('webmailSubscriptions')
      .where('status', '==', 'active')
      .get();

    // Aktueller Monat
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // SCHRITT 3: Erstelle Rechnungen für jedes aktive Abo
    for (const doc of activeSnapshot.docs) {
      const subscription = doc.data();
      const subscriptionId = doc.id;

      // Prüfe ob für diesen Monat schon eine Rechnung existiert
      const existingInvoice = await adminDb.collection('webmailInvoices')
        .where('subscriptionId', '==', subscriptionId)
        .where('periodKey', '==', periodKey)
        .limit(1)
        .get();

      if (!existingInvoice.empty) {
        // Rechnung für diesen Monat existiert bereits
        continue;
      }

      // Erstelle Rechnung
      const invoiceResult = await createInvoice(subscription, subscriptionId, periodStart, periodEnd);
      
      if (invoiceResult.success && invoiceResult.invoiceNumber) {
        results.invoicesCreated++;

        // Speichere periodKey für Duplikat-Prüfung
        await adminDb.collection('webmailInvoices').doc(invoiceResult.invoiceId!).update({
          periodKey,
        });

        // Versende E-Mail mit PDF-Anhang
        const emailSent = await sendInvoiceEmail(
          subscription.customerEmail,
          subscription.customerName,
          invoiceResult.invoiceNumber,
          subscription.priceGross,
          periodStart,
          periodEnd,
          subscription.planName
        );

        if (emailSent) {
          results.emailsSent++;
          await adminDb.collection('webmailInvoices').doc(invoiceResult.invoiceId!).update({
            emailSentAt: FieldValue.serverTimestamp(),
            pdfGeneratedAt: FieldValue.serverTimestamp(),
          });
        } else {
          results.errors.push(`${subscriptionId}: E-Mail-Versand fehlgeschlagen`);
        }
      } else {
        results.errors.push(`${subscriptionId}: ${invoiceResult.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Monatsabrechnung: ${results.invoicesCreated} Rechnungen erstellt, ${results.emailsSent} E-Mails versendet`,
      results,
      period: periodKey,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      results,
    }, { status: 500 });
  }
}
