/**
 * Admin API - Generate Test Invoice PDF
 * 
 * Generiert eine Test-Rechnung mit PDF-Anhang und sendet sie per E-Mail
 */

import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { WebmailInvoicePdfService } from '@/services/webmail/WebmailInvoicePdfService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const TestInvoiceSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  amount: z.number().positive().default(2.99),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = TestInvoiceSchema.parse(body);

    if (!adminDb) {
      return NextResponse.json({ error: 'Datenbank nicht verfügbar' }, { status: 500 });
    }

    // Generiere Rechnungsnummer
    const counterRef = adminDb.collection('counters').doc('webmailInvoices');
    const { invoiceNumber, sequentialNumber } = await adminDb.runTransaction(async (transaction) => {
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
      return {
        invoiceNumber: `WM-${year}-${String(currentNumber).padStart(5, '0')}`,
        sequentialNumber: currentNumber,
      };
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 14);

    // Generiere PDF
    const pdfService = WebmailInvoicePdfService.getInstance();
    const invoiceData = pdfService.createInvoiceDataFromSubscription(
      {
        customerName: data.name,
        customerEmail: data.email,
        amount: data.amount,
        planName: 'Taskilo Webmail - Test',
      },
      invoiceNumber,
      periodStart,
      periodEnd
    );
    const pdfBase64 = pdfService.generatePdfBase64(invoiceData);

    // Speichere Rechnung in Firestore
    const invoiceId = `WMI-TEST-${Date.now()}`;
    await adminDb.collection('webmailInvoices').doc(invoiceId).set({
      id: invoiceId,
      invoiceNumber,
      sequentialNumber,
      customerEmail: data.email,
      customerName: data.name,
      items: [{
        description: 'Taskilo Webmail - Test',
        quantity: 1,
        unitPrice: data.amount,
        total: data.amount,
      }],
      subtotal: data.amount,
      vatRate: 0,
      vatAmount: 0,
      total: data.amount,
      periodStart: Timestamp.fromDate(periodStart),
      periodEnd: Timestamp.fromDate(periodEnd),
      dueDate: Timestamp.fromDate(dueDate),
      status: 'paid',
      isTest: true,
      pdfGeneratedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Sende E-Mail mit PDF-Anhang
    const resend = new Resend(process.env.RESEND_API_KEY);
    const periodText = `${periodStart.toLocaleDateString('de-DE')} - ${periodEnd.toLocaleDateString('de-DE')}`;
    const formattedTotal = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(data.amount);

    await resend.emails.send({
      from: 'Taskilo Buchhaltung <buchhaltung@taskilo.de>',
      to: [data.email],
      subject: `[TEST] Ihre Rechnung ${invoiceNumber} von Taskilo`,
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
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                <strong style="color: #d97706;">TEST-RECHNUNG</strong>
              </div>
              
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1f2937;">
                Ihre Rechnung ${invoiceNumber}
              </h2>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Hallo ${data.name},
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
                Die PDF-Rechnung ist dieser E-Mail als Anhang beigefügt. Bitte speichern Sie diese für Ihre Unterlagen.
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

    // Aktualisiere Rechnung mit E-Mail-Status
    await adminDb.collection('webmailInvoices').doc(invoiceId).update({
      emailSentAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `Test-Rechnung ${invoiceNumber} erstellt und an ${data.email} versendet`,
      invoice: {
        id: invoiceId,
        invoiceNumber,
        total: data.amount,
        email: data.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        details: error.errors,
      }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
