/**
 * Storage Email Notification Service
 *
 * Sends emails for storage-related events:
 * - Limit warnings (90%, 100%)
 * - Over limit blocks
 * - Plan cancellation warnings
 * - Data deletion warnings
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailRecipient {
  email: string;
  companyName: string;
  companyId: string;
}

export class StorageEmailService {
  /**
   * Send limit warning email (90% usage)
   */
  static async sendLimitWarningEmail(
    recipient: EmailRecipient,
    currentUsage: number,
    limit: number,
    percentUsed: number
  ): Promise<void> {
    const usageGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2);
    const limitGB = (limit / (1024 * 1024 * 1024)).toFixed(2);

    try {
      await resend.emails.send({
        from: 'Taskilo <noreply@taskilo.de>',
        to: recipient.email,
        subject: '⚠️ Ihr Speicher ist fast voll',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">⚠️ Speicherwarnung</h2>
            
            <p>Hallo ${recipient.companyName},</p>
            
            <p>Sie nutzen derzeit <strong>${usageGB} GB von ${limitGB} GB</strong> (${percentUsed.toFixed(0)}%) Ihres Speicherplatzes.</p>
            
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Was passiert, wenn der Speicher voll ist?</strong></p>
              <ul style="margin: 8px 0;">
                <li>Keine neuen Uploads mehr möglich</li>
                <li>Bestehende Daten bleiben zugänglich</li>
              </ul>
            </div>
            
            <h3>Empfohlene Maßnahmen:</h3>
            <ul>
              <li><a href="https://taskilo.de/dashboard/settings/storage" style="color: #14ad9f;">Upgraden Sie Ihren Plan</a> für mehr Speicherplatz</li>
              <li>Löschen Sie nicht mehr benötigte Dateien</li>
            </ul>
            
            <a href="https://taskilo.de/dashboard/settings/storage" 
               style="display: inline-block; background-color: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              Jetzt upgraden
            </a>
            
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Taskilo GmbH<br>
              Diese E-Mail wurde automatisch versendet.
            </p>
          </div>
        `,
      });

      console.log(`[StorageEmail] Limit warning sent to ${recipient.email}`);
    } catch (error) {
      console.error('[StorageEmail] Error sending limit warning:', error);
    }
  }

  /**
   * Send over-limit email (uploads/downloads blocked)
   */
  static async sendOverLimitEmail(
    recipient: EmailRecipient,
    currentUsage: number,
    limit: number,
    planId: string
  ): Promise<void> {
    const usageMB = (currentUsage / (1024 * 1024)).toFixed(2);
    const limitMB = (limit / (1024 * 1024)).toFixed(2);
    const isFree = planId === 'free';

    try {
      await resend.emails.send({
        from: 'Taskilo <noreply@taskilo.de>',
        to: recipient.email,
        subject: '🚫 Speicherlimit überschritten - Uploads gesperrt',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">🚫 Speicherlimit überschritten</h2>
            
            <p>Hallo ${recipient.companyName},</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Ihr Speicherplatz ist voll!</strong></p>
              <p style="margin: 8px 0 0 0;">
                Aktuelle Nutzung: <strong>${usageMB} MB / ${limitMB} MB</strong>
              </p>
            </div>
            
            <h3>Einschränkungen:</h3>
            <ul style="color: #dc2626;">
              <li><strong>❌ Keine neuen Uploads mehr möglich</strong></li>
              <li><strong>❌ Downloads sind gesperrt</strong></li>
            </ul>
            
            <p>Bestehende Daten bleiben read-only zugänglich im Dashboard.</p>
            
            ${
              isFree
                ? `
              <div style="background-color: #ecfeff; border: 2px solid #14ad9f; padding: 16px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0 0 12px 0;"><strong>💡 Empfehlung:</strong></p>
                <p style="margin: 0;">
                  Upgraden Sie auf einen Bezahl-Plan ab <strong>€0.99/Monat</strong> für bis zu 100 GB Speicher!
                </p>
              </div>
            `
                : `
              <p>Bitte upgraden Sie Ihren Plan oder löschen Sie nicht mehr benötigte Dateien.</p>
            `
            }
            
            <div style="margin-top: 30px;">
              <a href="https://taskilo.de/dashboard/settings/storage" 
                 style="display: inline-block; background-color: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 12px;">
                Plan upgraden
              </a>
              <a href="https://taskilo.de/dashboard/files" 
                 style="display: inline-block; background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Dateien verwalten
              </a>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Taskilo GmbH<br>
              Diese E-Mail wurde automatisch versendet.
            </p>
          </div>
        `,
      });

      console.log(`[StorageEmail] Over-limit notification sent to ${recipient.email}`);
    } catch (error) {
      console.error('[StorageEmail] Error sending over-limit email:', error);
    }
  }

  /**
   * Send plan cancellation warning
   */
  static async sendCancellationWarningEmail(
    recipient: EmailRecipient,
    currentUsage: number,
    cancelDate: Date
  ): Promise<void> {
    const usageGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2);
    const cancelDateStr = cancelDate.toLocaleDateString('de-DE');

    try {
      await resend.emails.send({
        from: 'Taskilo <noreply@taskilo.de>',
        to: recipient.email,
        subject: '⚠️ Plan gekündigt - Datenlöschung angekündigt',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Wichtige Information zu Ihrer Kündigung</h2>
            
            <p>Hallo ${recipient.companyName},</p>
            
            <p>Ihr Speicher-Plan wurde erfolgreich gekündigt und läuft am <strong>${cancelDateStr}</strong> aus.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚠️ Wichtig:</strong></p>
              <p style="margin: 8px 0 0 0;">
                Sie nutzen derzeit <strong>${usageGB} GB</strong>. Der kostenlose Plan bietet nur <strong>500 MB</strong>.
              </p>
              <p style="margin: 8px 0 0 0; color: #dc2626;">
                <strong>Alle Ihre Daten werden nach Ablauf des Plans gelöscht!</strong>
              </p>
            </div>
            
            <h3>Was passiert nach dem ${cancelDateStr}?</h3>
            <ul>
              <li>Automatischer Downgrade auf Free-Plan (500 MB)</li>
              <li><strong style="color: #dc2626;">Alle Dateien über 500 MB werden gelöscht</strong></li>
              <li>Uploads und Downloads werden gesperrt</li>
              <li>Die Löschung ist unwiderruflich</li>
            </ul>
            
            <h3>Handeln Sie jetzt:</h3>
            <ol>
              <li><strong>Daten sichern:</strong> Laden Sie wichtige Dateien herunter</li>
              <li><strong>Oder Plan reaktivieren:</strong> Vermeiden Sie Datenverlust</li>
            </ol>
            
            <div style="margin-top: 30px;">
              <a href="https://taskilo.de/dashboard/files" 
                 style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 12px;">
                Daten jetzt sichern
              </a>
              <a href="https://taskilo.de/dashboard/settings/storage" 
                 style="display: inline-block; background-color: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Plan reaktivieren
              </a>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 40px;">
              Taskilo GmbH<br>
              Sie haben dieser Datenlöschung bei der Kündigung zugestimmt.
            </p>
          </div>
        `,
      });

      console.log(`[StorageEmail] Cancellation warning sent to ${recipient.email}`);
    } catch (error) {
      console.error('[StorageEmail] Error sending cancellation warning:', error);
    }
  }

  /**
   * Send final deletion warning (7 days before)
   */
  static async sendFinalDeletionWarningEmail(
    recipient: EmailRecipient,
    currentUsage: number,
    deletionDate: Date
  ): Promise<void> {
    const usageGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2);
    const deletionDateStr = deletionDate.toLocaleDateString('de-DE');
    const daysLeft = Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    try {
      await resend.emails.send({
        from: 'Taskilo <noreply@taskilo.de>',
        to: recipient.email,
        subject: `🔴 LETZTE WARNUNG: Datenlöschung in ${daysLeft} Tagen`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; color: white;">🔴 LETZTE WARNUNG</h2>
            </div>
            
            <div style="border: 3px solid #dc2626; padding: 20px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; margin-top: 0;">Hallo ${recipient.companyName},</p>
              
              <p style="font-size: 16px; font-weight: bold; color: #dc2626;">
                Ihre Daten werden in ${daysLeft} Tagen (am ${deletionDateStr}) unwiderruflich gelöscht!
              </p>
              
              <div style="background-color: #fef2f2; padding: 16px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0 0 8px 0;"><strong>Betroffene Daten:</strong></p>
                <ul style="margin: 0;">
                  <li>${usageGB} GB Dateien und Dokumente</li>
                  <li>Alle Rechnungen und Belege</li>
                  <li>Kundendokumente</li>
                  <li>Portfolio und Bilder</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; margin: 30px 0;">
                <strong>Dies ist Ihre letzte Chance!</strong>
              </p>
              
              <div style="margin: 30px 0;">
                <a href="https://taskilo.de/dashboard/settings/storage" 
                   style="display: inline-block; background-color: #14ad9f; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  Plan jetzt upgraden und Daten retten
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 40px;">
                Sie haben bei der Plan-Kündigung bestätigt, dass Sie über diese Datenlöschung informiert wurden und zustimmen.
              </p>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Taskilo GmbH<br>
              Bei Fragen: support@taskilo.de
            </p>
          </div>
        `,
      });

      console.log(
        `[StorageEmail] Final deletion warning sent to ${recipient.email} (${daysLeft} days left)`
      );
    } catch (error) {
      console.error('[StorageEmail] Error sending final deletion warning:', error);
    }
  }
}
