/**
 * Trial & Account Management Service
 * 
 * - 7-Tage kostenlose Testphase für alle neuen Accounts
 * - Automatische Sperrung nach Ablauf
 * - Promo-Code System für verlängerte Testphasen
 * - E-Mail Erinnerungen ab Tag 5
 */

import { db } from '@/firebase/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';

const TRIAL_DAYS = 7;
const REMINDER_START_DAY = 5; // Ab Tag 5 Erinnerungen senden

// Resend Instance
let resend: Resend | null = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

export interface TrialInfo {
  trialStartDate: Date;
  trialEndDate: Date;
  daysRemaining: number;
  isExpired: boolean;
  isBlocked: boolean;
  promoCode?: string;
  promoExpiresAt?: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  companyId: string;
  durationDays: number;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  createdBy: string;
  notes?: string;
}

export class TrialService {
  
  /**
   * Initialisiert die Trial-Phase für ein neues Unternehmen
   */
  static async initializeTrial(companyId: string): Promise<{ success: boolean; trialEndDate?: Date; error?: string }> {
    if (!db) return { success: false, error: 'Datenbank nicht verfügbar' };

    try {
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

      await db.collection('companies').doc(companyId).update({
        trialStartDate: Timestamp.fromDate(now),
        trialEndDate: Timestamp.fromDate(trialEndDate),
        trialDays: TRIAL_DAYS,
        subscriptionStatus: 'trialing',
        isBlocked: false,
        lastTrialReminderSent: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, trialEndDate };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  /**
   * Prüft den Trial-Status und blockiert abgelaufene Accounts
   */
  static async checkAndUpdateTrialStatus(companyId: string): Promise<TrialInfo | null> {
    if (!db) return null;

    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (!companyDoc.exists) return null;

      const data = companyDoc.data()!;
      const now = new Date();

      // Promo-Code prüfen
      let effectiveEndDate: Date;
      if (data.promoExpiresAt) {
        effectiveEndDate = data.promoExpiresAt.toDate ? data.promoExpiresAt.toDate() : new Date(data.promoExpiresAt);
      } else if (data.trialEndDate) {
        effectiveEndDate = data.trialEndDate.toDate ? data.trialEndDate.toDate() : new Date(data.trialEndDate);
      } else {
        // Kein Trial-Datum - Account direkt blockieren
        return {
          trialStartDate: new Date(),
          trialEndDate: new Date(),
          daysRemaining: 0,
          isExpired: true,
          isBlocked: true,
        };
      }

      const trialStartDate = data.trialStartDate?.toDate ? data.trialStartDate.toDate() : new Date(data.createdAt);
      const daysRemaining = Math.ceil((effectiveEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = now > effectiveEndDate;

      // Hat einen bezahlten Plan?
      const hasPaidPlan = data.subscriptionStatus === 'active' && data.planId && data.planId !== 'free';

      // Wenn abgelaufen und kein bezahlter Plan, blockieren
      if (isExpired && !hasPaidPlan && !data.isBlocked) {
        await db.collection('companies').doc(companyId).update({
          isBlocked: true,
          subscriptionStatus: 'expired',
          blockedAt: FieldValue.serverTimestamp(),
          blockedReason: 'Testphase abgelaufen',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        trialStartDate,
        trialEndDate: effectiveEndDate,
        daysRemaining: Math.max(0, daysRemaining),
        isExpired,
        isBlocked: isExpired && !hasPaidPlan,
        promoCode: data.promoCode,
        promoExpiresAt: data.promoExpiresAt?.toDate ? data.promoExpiresAt.toDate() : undefined,
      };
    } catch (error) {
      console.error('Fehler beim Prüfen des Trial-Status:', error);
      return null;
    }
  }

  /**
   * Generiert einen Promo-Code für ein Unternehmen
   */
  static async generatePromoCode(params: {
    companyId: string;
    durationDays: number;
    createdBy: string;
    notes?: string;
  }): Promise<{ success: boolean; promoCode?: PromoCode; error?: string }> {
    if (!db) return { success: false, error: 'Datenbank nicht verfuegbar' };

    try {
      const { companyId, durationDays, createdBy, notes } = params;
      
      // Promo-Code generieren
      const code = `TASKILO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const promoCode: PromoCode = {
        id: `promo-${Date.now()}`,
        code,
        companyId,
        durationDays,
        createdAt: now,
        expiresAt,
        createdBy,
        notes,
      };

      // In Firestore speichern
      await db.collection('promoCodes').doc(promoCode.id).set({
        ...promoCode,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
      });

      // Company aktualisieren
      await db.collection('companies').doc(companyId).update({
        promoCode: code,
        promoExpiresAt: Timestamp.fromDate(expiresAt),
        promoDurationDays: durationDays,
        isBlocked: false, // Entsperren wenn vorher blockiert
        subscriptionStatus: 'trialing',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, promoCode };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  /**
   * Sendet Erinnerungs-E-Mails für ablaufende Trials
   */
  static async sendTrialReminderEmails(): Promise<{ sent: number; errors: string[] }> {
    if (!db) return { sent: 0, errors: ['Datenbank nicht verfügbar'] };

    const resendInstance = getResend();
    if (!resendInstance) return { sent: 0, errors: ['Resend nicht konfiguriert'] };

    const results = { sent: 0, errors: [] as string[] };

    try {
      const now = new Date();
      
      // Finde alle Companies mit Trial die bald ablaufen (Tag 5, 6, 7)
      const companiesSnapshot = await db.collection('companies')
        .where('subscriptionStatus', '==', 'trialing')
        .where('isBlocked', '==', false)
        .get();

      for (const doc of companiesSnapshot.docs) {
        const data = doc.data();
        const companyId = doc.id;

        const trialEndDate = data.promoExpiresAt?.toDate?.() || data.trialEndDate?.toDate?.();
        if (!trialEndDate) continue;

        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Nur senden wenn zwischen Tag 5 und Tag 7 (inkl. Tag 0)
        if (daysRemaining > (TRIAL_DAYS - REMINDER_START_DAY) || daysRemaining < 0) continue;

        // Prüfe ob heute schon eine E-Mail gesendet wurde
        const lastReminderSent = data.lastTrialReminderSent?.toDate?.();
        if (lastReminderSent) {
          const hoursSinceLastReminder = (now.getTime() - lastReminderSent.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastReminder < 24) continue; // Max 1 E-Mail pro Tag
        }

        try {
          const email = data.email || data.ownerEmail;
          const companyName = data.companyName || data.name || 'Ihr Unternehmen';

          if (!email) continue;

          await resendInstance.emails.send({
            from: 'Taskilo <noreply@taskilo.de>',
            to: [email],
            subject: `Ihre Taskilo-Testphase endet in ${daysRemaining} ${daysRemaining === 1 ? 'Tag' : 'Tagen'}`,
            html: this.getTrialReminderEmailHtml(companyName, daysRemaining, trialEndDate),
          });

          // Aktualisiere lastTrialReminderSent
          await db.collection('companies').doc(companyId).update({
            lastTrialReminderSent: FieldValue.serverTimestamp(),
          });

          results.sent++;
        } catch (emailError) {
          results.errors.push(`${companyId}: ${emailError instanceof Error ? emailError.message : 'E-Mail Fehler'}`);
        }
      }
    } catch (error) {
      results.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    }

    return results;
  }

  /**
   * Sendet eine einzelne Erinnerungs-E-Mail
   */
  static async sendSingleReminderEmail(
    email: string,
    companyName: string,
    daysRemaining: number,
    trialEndDate: Date
  ): Promise<{ success: boolean; error?: string }> {
    const resendInstance = getResend();
    if (!resendInstance) return { success: false, error: 'Resend nicht konfiguriert' };

    try {
      await resendInstance.emails.send({
        from: 'Taskilo <noreply@taskilo.de>',
        to: [email],
        subject: `Ihre Taskilo-Testphase endet in ${daysRemaining} ${daysRemaining === 1 ? 'Tag' : 'Tagen'}`,
        html: this.getTrialReminderEmailHtml(companyName, daysRemaining, trialEndDate),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'E-Mail Fehler' };
    }
  }

  /**
   * HTML Template für Trial-Erinnerungs-E-Mails
   */
  private static getTrialReminderEmailHtml(companyName: string, daysRemaining: number, trialEndDate: Date): string {
    const formattedDate = trialEndDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const urgencyColor = daysRemaining <= 1 ? '#dc2626' : daysRemaining <= 3 ? '#f59e0b' : '#14ad9f';

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihre Taskilo-Testphase endet bald</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header mit Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #14ad9f 0%, #0f9688 100%); padding: 30px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <img src="https://taskilo.de/images/taskilo-logo-white.png" alt="Taskilo" style="height: 50px; width: auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Countdown Banner -->
          <tr>
            <td style="padding: 0;">
              <div style="background-color: ${urgencyColor}; padding: 20px 40px; text-align: center;">
                <span style="font-size: 48px; font-weight: 700; color: #ffffff;">${daysRemaining}</span>
                <p style="margin: 5px 0 0; font-size: 16px; color: #ffffff; opacity: 0.9;">
                  ${daysRemaining === 1 ? 'Tag verbleibend' : 'Tage verbleibend'}
                </p>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1f2937;">
                Hallo ${companyName},
              </h2>
              
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Ihre kostenlose Testphase bei Taskilo endet am <strong>${formattedDate}</strong>.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Um weiterhin alle Funktionen nutzen zu können, wählen Sie jetzt einen passenden Tarif:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px;">
                    <a href="https://taskilo.de/webmail/pricing" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #14ad9f 0%, #0f9688 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(20, 173, 159, 0.4);">
                      Tarif wählen
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Benefits -->
              <div style="background-color: #f0fdfa; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f766e;">
                  Was Sie mit einem Upgrade erhalten:
                </h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>GoBD-konforme Rechnungen und Angebote</li>
                  <li>Professionelle Kundenverwaltung (CRM)</li>
                  <li>Zeiterfassung und Personalverwaltung</li>
                  <li>DATEV-Export für Ihren Steuerberater</li>
                  <li>Premium Support</li>
                </ul>
              </div>

              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Bei Fragen stehen wir Ihnen gerne zur Verfügung unter 
                <a href="mailto:support@taskilo.de" style="color: #14ad9f;">support@taskilo.de</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 15px; font-size: 14px; color: #6b7280;">
                      Taskilo - Ihre Business-Plattform
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                      <strong>The Freelancer Marketing Ltd.</strong>
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                      Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                      8015, Paphos Cyprus
                    </p>
                    <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                      Registrierungsnummer: HE 458650 | VAT: CY60058879W
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      <a href="https://taskilo.de/impressum" style="color: #14ad9f; text-decoration: none;">Impressum</a> | 
                      <a href="https://taskilo.de/datenschutz" style="color: #14ad9f; text-decoration: none;">Datenschutz</a> | 
                      <a href="https://taskilo.de/agb" style="color: #14ad9f; text-decoration: none;">AGB</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
  }
}
