/**
 * Webmail Invoice Email API
 * 
 * Versendet Rechnungen per E-Mail an Kunden
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SendInvoiceSchema = z.object({
  invoiceId: z.string(),
  customerEmail: z.string().email(),
  customerName: z.string(),
  invoiceNumber: z.string(),
  total: z.number(),
  dueDate: z.string().or(z.date()),
  periodStart: z.string().or(z.date()).optional(),
  periodEnd: z.string().or(z.date()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = SendInvoiceSchema.parse(body);
    
    const formatDate = (dateStr: string | Date | undefined) => {
      if (!dateStr) return '';
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return date.toLocaleDateString('de-DE');
    };
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    };
    
    // E-Mail HTML
    const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihre Rechnung von Taskilo</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Ihre Rechnung</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Rechnungsnummer: ${data.invoiceNumber}</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #333;">Guten Tag ${data.customerName},</p>
      
      <p style="color: #666; line-height: 1.6;">
        anbei erhalten Sie Ihre Rechnung fuer Ihre Taskilo Webmail-Dienste.
      </p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Rechnungsnummer:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.invoiceNumber}</td>
          </tr>
          ${data.periodStart && data.periodEnd ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Abrechnungszeitraum:</td>
            <td style="padding: 8px 0; text-align: right;">${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #666;">Faellig am:</td>
            <td style="padding: 8px 0; text-align: right;">${formatDate(data.dueDate)}</td>
          </tr>
          <tr style="border-top: 2px solid #e9ecef;">
            <td style="padding: 12px 0; font-size: 18px; font-weight: bold;">Gesamtbetrag:</td>
            <td style="padding: 12px 0; text-align: right; font-size: 18px; font-weight: bold; color: #0d9488;">${formatCurrency(data.total)}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #666; line-height: 1.6;">
        Die Rechnung ist als PDF im Anhang beigefuegt. Bitte ueberweisen Sie den Betrag
        bis zum ${formatDate(data.dueDate)} auf das in der Rechnung angegebene Konto.
      </p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          Bei Fragen zu Ihrer Rechnung kontaktieren Sie uns unter billing@taskilo.de
        </p>
      </div>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
      <p>&copy; ${new Date().getFullYear()} Taskilo. Alle Rechte vorbehalten.</p>
      <p>Taskilo UG (haftungsbeschr&auml;nkt) | taskilo.de</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Sende E-Mail ueber SES oder internen Mail-Service
    // TODO: PDF-Anhang generieren und anhaengen
    
    const emailData = {
      to: data.customerEmail,
      from: 'billing@taskilo.de',
      subject: `Ihre Rechnung ${data.invoiceNumber} von Taskilo`,
      html: emailHtml,
    };
    
    // Versuche ueber AWS SES zu senden
    const sesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        from: emailData.from,
      }),
    });
    
    if (!sesResponse.ok) {
      const errorData = await sesResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: 'E-Mail-Versand fehlgeschlagen',
        details: errorData,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Rechnung ${data.invoiceNumber} an ${data.customerEmail} versendet`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        details: error.errors,
      }, { status: 400 });
    }
    
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
