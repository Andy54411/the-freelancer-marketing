/**
 * Module Notification Service
 * 
 * E-Mail-Benachrichtigungen für Modul-Subscriptions:
 * - Trial-Ende Erinnerungen (3 Tage vorher, am Tag)
 * - Modul aktiviert
 * - Zahlung erfolgreich
 * - Zahlung fehlgeschlagen
 * - Kündigung bestätigt
 * 
 * @module ModuleNotificationService
 */

import { db } from '@/firebase/server';
import { PREMIUM_MODULES, type PremiumModuleId } from '@/lib/moduleConfig';

// ============================================================================
// TYPES
// ============================================================================

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

interface CompanyData {
  email?: string;
  contactEmail?: string;
  companyName?: string;
  displayName?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCompanyData(companyId: string): Promise<CompanyData | null> {
  if (!db) return null;

  try {
    const doc = await db.collection('companies').doc(companyId).get();
    if (!doc.exists) return null;
    return doc.data() as CompanyData;
  } catch {
    return null;
  }
}

function getModuleName(moduleId: string): string {
  const premiumModule = PREMIUM_MODULES[moduleId as PremiumModuleId];
  return premiumModule?.name || moduleId;
}

function getModulePrice(moduleId: string): number {
  const premiumModule = PREMIUM_MODULES[moduleId as PremiumModuleId];
  return premiumModule?.price.monthly || 0;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    // Nutze den internen E-Mail-Endpunkt
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/api/internal/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('[ModuleNotificationService] E-Mail-Versand fehlgeschlagen:', error);
    return false;
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function createEmailHeader(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); color: white; padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 32px; }
        .module-badge { display: inline-block; background: #f0fdfa; color: #14ad9f; padding: 8px 16px; border-radius: 9999px; font-weight: 600; margin: 16px 0; }
        .price-box { background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .price { font-size: 32px; font-weight: 700; color: #1f2937; }
        .price-suffix { color: #6b7280; font-size: 16px; }
        .button { display: inline-block; background: #14ad9f; color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; margin: 16px 0; }
        .button:hover { background: #0d8a7f; }
        .footer { padding: 24px 32px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .error { background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
  `;
}

function createEmailFooter(): string {
  return `
        </div>
        <div class="footer">
          <p>Diese E-Mail wurde automatisch von Taskilo generiert.</p>
          <p>&copy; ${new Date().getFullYear()} Taskilo GmbH - Alle Rechte vorbehalten</p>
          <p>
            <a href="https://taskilo.de/dashboard" style="color: #14ad9f;">Dashboard</a> |
            <a href="https://taskilo.de/pricing" style="color: #14ad9f;">Module verwalten</a> |
            <a href="https://taskilo.de/kontakt" style="color: #14ad9f;">Hilfe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// NOTIFICATION METHODS
// ============================================================================

export class ModuleNotificationService {
  /**
   * E-Mail bei Trial-Ende Erinnerung (3 Tage vorher)
   */
  static async sendTrialEndingEmail(
    companyId: string,
    moduleId: string,
    daysLeft: number
  ): Promise<boolean> {
    const company = await getCompanyData(companyId);
    if (!company?.email && !company?.contactEmail) return false;

    const email = company.email || company.contactEmail || '';
    const moduleName = getModuleName(moduleId);
    const price = getModulePrice(moduleId);

    const html = `
      ${createEmailHeader()}
      <div class="header">
        <h1>Ihre Testphase endet bald</h1>
      </div>
      <div class="content">
        <p>Hallo ${company.companyName || company.displayName || 'Nutzer'},</p>
        
        <div class="warning">
          <strong>Ihre kostenlose Testphase für ${moduleName} endet in ${daysLeft} Tag${daysLeft > 1 ? 'en' : ''}.</strong>
        </div>
        
        <p>Um weiterhin alle Funktionen von ${moduleName} nutzen zu können, müssen Sie das Modul aktivieren.</p>
        
        <div class="price-box">
          <div class="price">${price.toFixed(2).replace('.', ',')} €<span class="price-suffix">/Monat</span></div>
        </div>
        
        <p style="text-align: center;">
          <a href="https://taskilo.de/dashboard/company/${companyId}/settings/modules" class="button">
            Jetzt aktivieren
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px;">
          Wenn Sie das Modul nicht aktivieren, werden die Premium-Funktionen nach Ablauf der Testphase gesperrt. 
          Ihre Daten bleiben erhalten und werden nicht gelöscht.
        </p>
      </div>
      ${createEmailFooter()}
    `;

    return sendEmail({
      to: email,
      subject: `Erinnerung: Ihre ${moduleName} Testphase endet in ${daysLeft} Tagen`,
      html,
    });
  }

  /**
   * E-Mail wenn Trial abgelaufen ist
   */
  static async sendTrialExpiredEmail(
    companyId: string,
    moduleId: string
  ): Promise<boolean> {
    const company = await getCompanyData(companyId);
    if (!company?.email && !company?.contactEmail) return false;

    const email = company.email || company.contactEmail || '';
    const moduleName = getModuleName(moduleId);
    const price = getModulePrice(moduleId);

    const html = `
      ${createEmailHeader()}
      <div class="header">
        <h1>Ihre Testphase ist abgelaufen</h1>
      </div>
      <div class="content">
        <p>Hallo ${company.companyName || company.displayName || 'Nutzer'},</p>
        
        <div class="warning">
          <strong>Ihre kostenlose Testphase für ${moduleName} ist heute abgelaufen.</strong>
        </div>
        
        <p>Die Premium-Funktionen von ${moduleName} sind jetzt gesperrt. Um sie wieder freizuschalten, aktivieren Sie bitte das Modul.</p>
        
        <div class="price-box">
          <div class="price">${price.toFixed(2).replace('.', ',')} €<span class="price-suffix">/Monat</span></div>
        </div>
        
        <p style="text-align: center;">
          <a href="https://taskilo.de/dashboard/company/${companyId}/settings/modules" class="button">
            Modul aktivieren
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px;">
          Ihre Daten bleiben erhalten. Sie können das Modul jederzeit aktivieren, um wieder Zugriff zu erhalten.
        </p>
      </div>
      ${createEmailFooter()}
    `;

    return sendEmail({
      to: email,
      subject: `Ihre ${moduleName} Testphase ist abgelaufen`,
      html,
    });
  }

  /**
   * E-Mail bei erfolgreicher Modul-Aktivierung
   */
  static async sendModuleActivatedEmail(
    companyId: string,
    moduleId: string
  ): Promise<boolean> {
    const company = await getCompanyData(companyId);
    if (!company?.email && !company?.contactEmail) return false;

    const email = company.email || company.contactEmail || '';
    const moduleName = getModuleName(moduleId);

    const html = `
      ${createEmailHeader()}
      <div class="header">
        <h1>${moduleName} aktiviert</h1>
      </div>
      <div class="content">
        <p>Hallo ${company.companyName || company.displayName || 'Nutzer'},</p>
        
        <div class="success">
          <strong>Ihr Modul ${moduleName} wurde erfolgreich aktiviert!</strong>
        </div>
        
        <p>Sie haben jetzt vollen Zugriff auf alle Funktionen von ${moduleName}. Entdecken Sie die neuen Möglichkeiten in Ihrem Dashboard.</p>
        
        <p style="text-align: center;">
          <a href="https://taskilo.de/dashboard/company/${companyId}" class="button">
            Zum Dashboard
          </a>
        </p>
      </div>
      ${createEmailFooter()}
    `;

    return sendEmail({
      to: email,
      subject: `${moduleName} wurde erfolgreich aktiviert`,
      html,
    });
  }

  /**
   * E-Mail bei erfolgreicher Subscription-Aktivierung
   */
  static async sendSubscriptionActivatedEmail(
    companyId: string,
    moduleId: string
  ): Promise<boolean> {
    return this.sendModuleActivatedEmail(companyId, moduleId);
  }

  /**
   * E-Mail bei fehlgeschlagener Zahlung
   */
  static async sendPaymentFailedEmail(
    companyId: string,
    moduleId: string
  ): Promise<boolean> {
    const company = await getCompanyData(companyId);
    if (!company?.email && !company?.contactEmail) return false;

    const email = company.email || company.contactEmail || '';
    const moduleName = getModuleName(moduleId);

    const html = `
      ${createEmailHeader()}
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <h1>Zahlung fehlgeschlagen</h1>
      </div>
      <div class="content">
        <p>Hallo ${company.companyName || company.displayName || 'Nutzer'},</p>
        
        <div class="error">
          <strong>Die Zahlung für ${moduleName} konnte nicht verarbeitet werden.</strong>
        </div>
        
        <p>Bitte überprüfen Sie Ihre Zahlungsmethode und versuchen Sie es erneut. Ohne erfolgreiche Zahlung wird das Modul in 3 Tagen deaktiviert.</p>
        
        <p style="text-align: center;">
          <a href="https://taskilo.de/dashboard/company/${companyId}/settings/modules" class="button" style="background: #ef4444;">
            Zahlung aktualisieren
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px;">
          Bei Fragen kontaktieren Sie uns unter support@taskilo.de oder über das Dashboard.
        </p>
      </div>
      ${createEmailFooter()}
    `;

    return sendEmail({
      to: email,
      subject: `Zahlung fehlgeschlagen: ${moduleName}`,
      html,
    });
  }

  /**
   * E-Mail bei Kündigungsbestätigung
   */
  static async sendCancellationConfirmationEmail(
    companyId: string,
    moduleId: string,
    effectiveDate?: Date
  ): Promise<boolean> {
    const company = await getCompanyData(companyId);
    if (!company?.email && !company?.contactEmail) return false;

    const email = company.email || company.contactEmail || '';
    const moduleName = getModuleName(moduleId);
    const formattedDate = effectiveDate 
      ? effectiveDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Ende der aktuellen Abrechnungsperiode';

    const html = `
      ${createEmailHeader()}
      <div class="header">
        <h1>Kündigung bestätigt</h1>
      </div>
      <div class="content">
        <p>Hallo ${company.companyName || company.displayName || 'Nutzer'},</p>
        
        <p>Wir bestätigen die Kündigung von <strong>${moduleName}</strong>.</p>
        
        <div class="price-box">
          <p style="margin: 0; color: #6b7280;">Das Modul ist aktiv bis:</p>
          <div class="price" style="font-size: 24px;">${formattedDate}</div>
        </div>
        
        <p>Bis dahin können Sie alle Funktionen weiterhin nutzen. Nach dem Stichtag wird das Modul deaktiviert, Ihre Daten bleiben jedoch erhalten.</p>
        
        <p style="color: #6b7280; font-size: 14px;">
          Sie können das Modul jederzeit wieder aktivieren, um vollen Zugriff zu erhalten.
        </p>
        
        <p style="text-align: center;">
          <a href="https://taskilo.de/pricing" class="button" style="background: #6b7280;">
            Kündigung rückgängig machen
          </a>
        </p>
      </div>
      ${createEmailFooter()}
    `;

    return sendEmail({
      to: email,
      subject: `Kündigung bestätigt: ${moduleName}`,
      html,
    });
  }

  /**
   * E-Mail bei erfolgreicher Abrechnung
   */
  static async sendBillingSuccessEmail(
    companyId: string,
    moduleId: string,
    amount: number,
    invoiceId?: string
  ): Promise<boolean> {
    const company = await getCompanyData(companyId);
    if (!company?.email && !company?.contactEmail) return false;

    const email = company.email || company.contactEmail || '';
    const moduleName = getModuleName(moduleId);

    const html = `
      ${createEmailHeader()}
      <div class="header">
        <h1>Zahlung erfolgreich</h1>
      </div>
      <div class="content">
        <p>Hallo ${company.companyName || company.displayName || 'Nutzer'},</p>
        
        <div class="success">
          <strong>Ihre monatliche Zahlung für ${moduleName} war erfolgreich.</strong>
        </div>
        
        <div class="price-box">
          <p style="margin: 0 0 8px; color: #6b7280;">Abgerechneter Betrag:</p>
          <div class="price">${amount.toFixed(2).replace('.', ',')} €</div>
          ${invoiceId ? `<p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Rechnungsnr.: ${invoiceId}</p>` : ''}
        </div>
        
        <p>Ihre Subscription für ${moduleName} läuft weiter. Sie haben vollen Zugriff auf alle Funktionen.</p>
        
        <p style="text-align: center;">
          <a href="https://taskilo.de/dashboard/company/${companyId}/finance/invoices" class="button">
            Rechnungen ansehen
          </a>
        </p>
      </div>
      ${createEmailFooter()}
    `;

    return sendEmail({
      to: email,
      subject: `Zahlung erfolgreich: ${moduleName}`,
      html,
    });
  }
}
