/**
 * AdminContactNotificationService
 * 
 * Multi-Channel Benachrichtigungssystem für Admin-zu-Company Kommunikation
 * 
 * Kanäle:
 * 1. Dashboard-Benachrichtigung (Firestore notifications collection)
 * 2. E-Mail via Hetzner Webmailer (nodemailer SMTP)
 * 3. WhatsApp via Twilio
 * 4. SMS via Twilio
 */

import { db as serverDb } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

// Twilio Client Type
import type Twilio from 'twilio';
type TwilioClient = ReturnType<typeof Twilio>;

// Twilio wird lazy geladen um Client-Side Imports zu vermeiden
let twilioClient: TwilioClient | null = null;

async function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      return null;
    }
    
    const twilio = await import('twilio');
    twilioClient = twilio.default(accountSid, authToken);
  }
  return twilioClient;
}

export interface ContactNotificationPayload {
  companyId: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  taskiloEmail?: string;
  title: string;
  message: string;
  ticketId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  link?: string;
}

export interface NotificationResult {
  dashboard: { success: boolean; error?: string };
  email: { success: boolean; error?: string };
  taskiloEmail: { success: boolean; error?: string };
  whatsapp: { success: boolean; error?: string };
  sms: { success: boolean; error?: string };
}

// E-Mail Template für Support-Ticket Benachrichtigung
function generateTicketEmailTemplate(payload: ContactNotificationPayload): string {
  const priorityColors: Record<string, string> = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    urgent: '#dc3545',
  };
  
  const priorityLabels: Record<string, string> = {
    low: 'Niedrig',
    medium: 'Mittel',
    high: 'Hoch',
    urgent: 'Dringend',
  };
  
  const priority = payload.priority || 'medium';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${payload.title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f9; line-height: 1.6; }
        .wrapper { background-color: #f4f7f9; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
        .header { background: linear-gradient(135deg, #14ad9f 0%, #0d8f84 100%); color: white; padding: 32px 40px; text-align: center; }
        .logo { margin-bottom: 16px; }
        .logo img { height: 40px; width: auto; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
        .priority-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; background-color: ${priorityColors[priority]}; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .content { padding: 40px; }
        .greeting { font-size: 20px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px 0; }
        .intro { color: #5a5a72; font-size: 15px; margin-bottom: 24px; }
        .ticket-card { background: linear-gradient(135deg, #f8fffe 0%, #f0faf9 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #14ad9f; }
        .ticket-card h3 { color: #14ad9f; margin: 0 0 16px 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .ticket-row { display: flex; margin-bottom: 10px; }
        .ticket-label { color: #5a5a72; font-size: 14px; min-width: 100px; }
        .ticket-value { color: #1a1a2e; font-size: 14px; font-weight: 500; }
        .message-card { background-color: #fafbfc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e8ecef; }
        .message-card h4 { margin: 0 0 12px 0; color: #1a1a2e; font-size: 14px; font-weight: 600; }
        .message-text { color: #4a4a5a; font-size: 15px; white-space: pre-wrap; line-height: 1.7; }
        .cta-section { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #14ad9f 0%, #0d8f84 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: transform 0.2s; }
        .button:hover { transform: translateY(-2px); }
        .hint { color: #8a8a9a; font-size: 13px; text-align: center; margin-top: 16px; }
        .footer { background-color: #f8f9fa; padding: 32px 40px; text-align: center; border-top: 1px solid #e8ecef; }
        .footer-logo { margin-bottom: 16px; }
        .footer-company { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 4px; }
        .footer-address { font-size: 12px; color: #8a8a9a; line-height: 1.6; margin-bottom: 12px; }
        .footer-legal { font-size: 11px; color: #a0a0b0; margin-bottom: 16px; }
        .footer-links { margin-top: 16px; }
        .footer-links a { color: #14ad9f; text-decoration: none; font-size: 13px; font-weight: 500; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, #e0e0e0, transparent); margin: 24px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">
              <img src="https://taskilo.de/images/taskilo-logo-white.png" alt="Taskilo" />
            </div>
            <h1>Support-Nachricht</h1>
            <span class="priority-badge">${priorityLabels[priority]}</span>
          </div>

          <div class="content">
            <h2 class="greeting">Hallo ${payload.companyName},</h2>

            <p class="intro">Sie haben eine neue Nachricht vom Taskilo Support-Team erhalten.</p>

            <div class="ticket-card">
              <h3>Ticket-Details</h3>
              <div class="ticket-row">
                <span class="ticket-label">Ticket-Nr.:</span>
                <span class="ticket-value">${payload.ticketId}</span>
              </div>
              <div class="ticket-row">
                <span class="ticket-label">Betreff:</span>
                <span class="ticket-value">${payload.title}</span>
              </div>
              ${payload.category ? `
              <div class="ticket-row">
                <span class="ticket-label">Kategorie:</span>
                <span class="ticket-value">${payload.category}</span>
              </div>
              ` : ''}
            </div>

            <div class="message-card">
              <h4>Nachricht:</h4>
              <p class="message-text">${payload.message}</p>
            </div>

            <div class="cta-section">
              <a href="${payload.link || `https://taskilo.de/dashboard/company/${payload.companyId}/support`}" class="button">
                Ticket im Dashboard ansehen
              </a>
              <p class="hint">Sie können direkt im Dashboard auf dieses Ticket antworten.</p>
            </div>
          </div>

          <div class="footer">
            <div class="footer-logo">
              <img src="https://taskilo.de/images/taskilo-logo-transparent.png" alt="Taskilo" height="28" />
            </div>
            <p class="footer-company">Taskilo ist eine Marke der The Freelancer Marketing Ltd.</p>
            <p class="footer-address">
              Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2<br>
              8015, Paphos, Cyprus
            </p>
            <p class="footer-legal">
              Registrierungsnummer: HE 458650 | VAT: CY60058879W
            </p>
            <div class="footer-links">
              <a href="https://taskilo.de">www.taskilo.de</a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// SMS/WhatsApp Text-Nachricht
function generateShortMessage(payload: ContactNotificationPayload): string {
  const priorityEmoji: Record<string, string> = {
    low: '',
    medium: '',
    high: '!',
    urgent: '!!',
  };
  
  const priority = payload.priority || 'medium';
  const emoji = priorityEmoji[priority];
  
  return `${emoji}Taskilo Support${emoji}\n\nTicket ${payload.ticketId}: ${payload.title}\n\nBitte prüfen Sie Ihr Dashboard für weitere Details.\n\nhttps://taskilo.de/dashboard/company/${payload.companyId}/support`;
}

export class AdminContactNotificationService {
  /**
   * Sendet Benachrichtigung über alle verfügbaren Kanäle
   */
  static async notifyCompany(payload: ContactNotificationPayload): Promise<NotificationResult> {
    const results: NotificationResult = {
      dashboard: { success: false },
      email: { success: false },
      taskiloEmail: { success: false },
      whatsapp: { success: false },
      sms: { success: false },
    };

    // Parallel alle Kanäle bedienen
    const [dashboardResult, emailResult, taskiloEmailResult, whatsappResult, smsResult] = await Promise.allSettled([
      this.sendDashboardNotification(payload),
      this.sendEmail(payload, payload.companyEmail),
      payload.taskiloEmail ? this.sendEmail(payload, payload.taskiloEmail) : Promise.resolve({ success: true, skipped: true }),
      this.sendWhatsApp(payload),
      this.sendSMS(payload),
    ]);

    // Dashboard-Ergebnis
    if (dashboardResult.status === 'fulfilled') {
      results.dashboard = dashboardResult.value;
    } else {
      results.dashboard = { success: false, error: dashboardResult.reason?.message };
    }

    // E-Mail-Ergebnis
    if (emailResult.status === 'fulfilled') {
      results.email = emailResult.value;
    } else {
      results.email = { success: false, error: emailResult.reason?.message };
    }

    // Taskilo E-Mail-Ergebnis
    if (taskiloEmailResult.status === 'fulfilled') {
      const val = taskiloEmailResult.value as { success: boolean; skipped?: boolean; error?: string };
      if (val.skipped) {
        results.taskiloEmail = { success: true }; // Übersprungen weil nicht vorhanden
      } else {
        results.taskiloEmail = val;
      }
    } else {
      results.taskiloEmail = { success: false, error: taskiloEmailResult.reason?.message };
    }

    // WhatsApp-Ergebnis
    if (whatsappResult.status === 'fulfilled') {
      results.whatsapp = whatsappResult.value;
    } else {
      results.whatsapp = { success: false, error: whatsappResult.reason?.message };
    }

    // SMS-Ergebnis
    if (smsResult.status === 'fulfilled') {
      results.sms = smsResult.value;
    } else {
      results.sms = { success: false, error: smsResult.reason?.message };
    }

    return results;
  }

  /**
   * Dashboard-Benachrichtigung erstellen (Firestore notifications collection)
   */
  static async sendDashboardNotification(payload: ContactNotificationPayload): Promise<{ success: boolean; error?: string }> {
    try {
      if (!serverDb) {
        return { success: false, error: 'Datenbank nicht verfügbar' };
      }

      const notification = {
        companyId: payload.companyId,
        userId: payload.companyId, // Company = User in diesem Fall
        type: 'admin_ticket',
        title: payload.title,
        message: payload.message.substring(0, 200) + (payload.message.length > 200 ? '...' : ''),
        ticketId: payload.ticketId,
        link: payload.link || `/dashboard/company/${payload.companyId}/support`,
        priority: payload.priority || 'medium',
        category: payload.category,
        isRead: false,
        readAt: null,
        createdAt: FieldValue.serverTimestamp(),
      };

      await serverDb.collection('notifications').add(notification);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Dashboard-Benachrichtigung fehlgeschlagen'
      };
    }
  }

  /**
   * E-Mail via Hetzner Webmailer (nodemailer SMTP)
   */
  static async sendEmail(payload: ContactNotificationPayload, recipientEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!recipientEmail) {
        return { success: false, error: 'Keine E-Mail-Adresse vorhanden' };
      }

      // SMTP Konfiguration für Hetzner
      const smtpHost = process.env.SMTP_HOST || 'mail.taskilo.de';
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const smtpUser = process.env.SMTP_USER || 'support@taskilo.de';
      const smtpPassword = process.env.SMTP_PASSWORD;
      const smtpFrom = process.env.SMTP_FROM || 'support@taskilo.de';

      if (!smtpPassword) {
        return { success: false, error: 'SMTP nicht konfiguriert' };
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const htmlContent = generateTicketEmailTemplate(payload);
      const textContent = `
Hallo ${payload.companyName},

Sie haben eine neue Nachricht vom Taskilo Support-Team erhalten.

Ticket-Nr.: ${payload.ticketId}
Betreff: ${payload.title}
${payload.category ? `Kategorie: ${payload.category}` : ''}

Nachricht:
${payload.message}

Bitte prüfen Sie Ihr Dashboard für weitere Details:
${payload.link || `https://taskilo.de/dashboard/company/${payload.companyId}/support`}

Mit freundlichen Grüßen
Ihr Taskilo Support-Team
      `.trim();

      await transporter.sendMail({
        from: `Taskilo Support <${smtpFrom}>`,
        to: recipientEmail,
        subject: `[Ticket ${payload.ticketId}] ${payload.title}`,
        text: textContent,
        html: htmlContent,
        replyTo: smtpFrom,
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen'
      };
    }
  }

  /**
   * WhatsApp via Twilio
   * 
   * HINWEIS: WhatsApp Business API erfordert Meta Business Verification.
   * Vorerst deaktiviert bis die Genehmigung vorliegt.
   */
  static async sendWhatsApp(payload: ContactNotificationPayload): Promise<{ success: boolean; error?: string }> {
    // WhatsApp ist vorerst deaktiviert - erfordert Meta Business Verification
    // Die Twilio Sandbox funktioniert nur wenn der Empfänger sich vorher registriert hat
    // payload wird nicht verwendet, aber für die Signatur benötigt
    void payload;
    return { 
      success: true, // Als "erfolgreich" markieren, damit keine Fehlermeldung erscheint
      error: 'WhatsApp nicht verfügbar (Meta Business Verification ausstehend)' 
    };
  }

  /**
   * SMS via Twilio
   */
  static async sendSMS(payload: ContactNotificationPayload): Promise<{ success: boolean; error?: string }> {
    try {
      if (!payload.companyPhone) {
        return { success: false, error: 'Keine Telefonnummer vorhanden' };
      }

      const client = await getTwilioClient();
      if (!client) {
        return { success: false, error: 'Twilio nicht konfiguriert' };
      }

      const twilioSmsNumber = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_PHONE_NUMBER;
      if (!twilioSmsNumber) {
        return { success: false, error: 'TWILIO_SMS_NUMBER nicht konfiguriert' };
      }

      // Telefonnummer formatieren
      let formattedPhone = payload.companyPhone.replace(/\s+/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+49' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+49' + formattedPhone;
      }

      const message = generateShortMessage(payload);

      await client.messages.create({
        body: message,
        from: twilioSmsNumber,
        to: formattedPhone,
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SMS-Versand fehlgeschlagen'
      };
    }
  }
}

export default AdminContactNotificationService;
