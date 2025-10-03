// Nur auf dem Server verwenden - nicht im Client!
if (typeof window !== 'undefined') {
  throw new Error('resend-email-service kann nur auf dem Server verwendet werden');
}

import { Resend } from 'resend';

// Lazy initialization to avoid client-side errors
let resend: Resend | null = null;

const getResendInstance = (): Resend => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resend = new Resend(apiKey);
  }
  return resend;
};

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  variables: string[];
}

export interface EmailMessage {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  status: 'draft' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  templateId?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  metadata?: Record<string, any>;
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  htmlContent: string;
  textContent: string;
  receivedAt: Date;
  isRead: boolean;
  labels: string[];
  attachments?: Array<{
    filename: string;
    size: number;
    contentType: string;
    url: string;
  }>;
}

export class ResendEmailService {
  private static instance: ResendEmailService;

  private constructor() {}

  public static getInstance(): ResendEmailService {
    if (!ResendEmailService.instance) {
      ResendEmailService.instance = new ResendEmailService();
    }
    return ResendEmailService.instance;
  }

  // E-Mail senden
  async sendEmail(
    message: Omit<EmailMessage, 'id' | 'status' | 'sentAt'>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const resendInstance = getResendInstance();
      const result = await resendInstance.emails.send({
        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        html: message.htmlContent,
        text: message.textContent,
        attachments: message.attachments?.map(att => {
          // Falls content Base64 ist, in Buffer wandeln; wenn bereits Buffer (string/Uint8Array), durchreichen
          const isLikelyBase64 =
            typeof att.content === 'string' && /^[A-Za-z0-9+/=]+$/.test(att.content || '');
          const contentAny = isLikelyBase64
            ? (Buffer.from(att.content, 'base64') as unknown as string)
            : (att.content as any);
          return {
            filename: att.filename,
            content: contentAny,
            type: att.contentType || 'application/pdf',
            contentType: att.contentType || 'application/pdf',
            disposition: 'attachment',
          };
        }),
        headers: {
          'X-Taskilo-Source': 'admin-panel',
          'X-Taskilo-Metadata': JSON.stringify(message.metadata || {}),
        },
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  // Bulk E-Mail senden
  async sendBulkEmails(messages: Array<Omit<EmailMessage, 'id' | 'status' | 'sentAt'>>): Promise<{
    success: boolean;
    results: Array<{ messageId?: string; error?: string; to: string[] }>;
  }> {
    try {
      const results = await Promise.allSettled(
        messages.map(async message => {
          const result = await this.sendEmail(message);
          return { ...result, to: message.to };
        })
      );

      const mappedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            error: result.reason?.message || 'Unbekannter Fehler',
            to: messages[index].to,
          };
        }
      });

      const successCount = mappedResults.filter(r => 'messageId' in r && r.messageId).length;

      return {
        success: successCount > 0,
        results: mappedResults,
      };
    } catch (error) {
      return {
        success: false,
        results: messages.map(m => ({ error: 'Bulk-Versand fehlgeschlagen', to: m.to })),
      };
    }
  }

  // Template-basierte E-Mail senden
  async sendTemplateEmail(
    templateId: string,
    to: string[],
    variables: Record<string, string>,
    options?: {
      cc?: string[];
      bcc?: string[];
      attachments?: Array<{ filename: string; content: string; contentType: string }>;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Template laden (normalerweise aus Datenbank)
      const template = await this.getTemplate(templateId);
      if (!template) {
        return { success: false, error: 'Template nicht gefunden' };
      }

      // Variablen ersetzen
      let htmlContent = template.htmlContent;
      let subject = template.subject;

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
      });

      return await this.sendEmail({
        from: 'noreply@taskilo.de',
        to,
        cc: options?.cc,
        bcc: options?.bcc,
        subject,
        htmlContent,
        attachments: options?.attachments,
        templateId,
        metadata: { templateId, variables },
      });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Template-Fehler' };
    }
  }

  // E-Mail-Status abrufen
  async getEmailStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'bounced' | 'complaint' | 'delivery_delayed';
    lastEvent?: Date;
    error?: string;
  }> {
    try {
      // Resend hat aktuell keine direkte Status-API, aber wir können Webhooks nutzen
      // Hier würde normalerweise eine Datenbankabfrage stehen
      return { status: 'sent' };
    } catch (error) {
      return { status: 'sent', error: 'Status nicht verfügbar' };
    }
  }

  // Template-Verwaltung
  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    // Hier würden Templates aus der Datenbank geladen
    const defaultTemplates: Record<string, EmailTemplate> = {
      welcome: {
        id: 'welcome',
        name: 'Willkommens-E-Mail',
        subject: 'Willkommen bei Taskilo, {{name}}!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #14ad9f;">Willkommen bei Taskilo!</h1>
            <p>Hallo {{name}},</p>
            <p>vielen Dank für Ihre Registrierung bei Taskilo. Wir freuen uns, Sie als neuen Nutzer begrüßen zu dürfen.</p>
            <p>Ihr Taskilo-Team</p>
          </div>
        `,
        variables: ['name'],
      },
      'support-ticket': {
        id: 'support-ticket',
        name: 'Support-Ticket',
        subject: 'Ihr Support-Ticket #{{ticketId}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #14ad9f;">Support-Ticket erstellt</h1>
            <p>Hallo {{customerName}},</p>
            <p>Ihr Support-Ticket wurde erfolgreich erstellt:</p>
            <ul>
              <li><strong>Ticket-ID:</strong> #{{ticketId}}</li>
              <li><strong>Betreff:</strong> {{subject}}</li>
              <li><strong>Priorität:</strong> {{priority}}</li>
            </ul>
            <p>Wir werden uns schnellstmöglich um Ihr Anliegen kümmern.</p>
            <p>Ihr Taskilo-Support-Team</p>
          </div>
        `,
        variables: ['customerName', 'ticketId', 'subject', 'priority'],
      },
    };

    return defaultTemplates[templateId] || null;
  }

  // Verfügbare Templates abrufen
  async getAvailableTemplates(): Promise<EmailTemplate[]> {
    return [await this.getTemplate('welcome'), await this.getTemplate('support-ticket')].filter(
      Boolean
    ) as EmailTemplate[];
  }

  // E-Mail-Domains verwalten
  async verifyDomain(domain: string): Promise<{ success: boolean; error?: string }> {
    try {
      const resendInstance = getResendInstance();
      const result = await resendInstance.domains.create({
        name: domain,
        region: 'eu-west-1',
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Domain-Fehler' };
    }
  }

  // Webhook-Events verarbeiten
  async processWebhookEvent(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'email.sent':
          break;
        case 'email.delivered':
          break;
        case 'email.bounced':
          break;
        case 'email.complained':
          break;
        default:
      }
    } catch (error) {}
  }

  // Neue Angebot Email an Kunden senden
  async sendNewProposalEmail(
    customerEmail: string,
    projectTitle: string,
    providerName: string,
    proposalAmount: number
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Neues Angebot erhalten - Taskilo</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #14ad9f; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px 20px; border: 1px solid #e1e5e9; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e1e5e9; border-top: none; }
            .button { display: inline-block; background: #14ad9f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .proposal-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14ad9f; }
            .amount { font-size: 24px; font-weight: bold; color: #14ad9f; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Neues Angebot erhalten!</h1>
            </div>
            <div class="content">
              <h2>Hallo!</h2>
              <p>Gute Nachrichten! Sie haben ein neues Angebot für Ihr Projekt erhalten:</p>

              <div class="proposal-box">
                <h3>📋 ${projectTitle}</h3>
                <p><strong>Anbieter:</strong> ${providerName}</p>
                <p><strong>Angebotspreis:</strong> <span class="amount">${proposalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></p>
              </div>

              <p>Schauen Sie sich das vollständige Angebot in Ihrem Dashboard an:</p>

              <div style="text-align: center;">
                <a href="https://taskilo.de/dashboard" class="button">Angebot anschauen</a>
              </div>

              <p>Sie können das Angebot annehmen, ablehnen oder weitere Fragen an den Anbieter stellen.</p>

              <p><strong>Tipp:</strong> Antworten Sie schnell, um die besten Anbieter zu sichern!</p>
            </div>
            <div class="footer">
              <p>Beste Grüße,<br>Ihr Taskilo Team</p>
              <p style="font-size: 12px; color: #666;">
                <a href="https://taskilo.de">taskilo.de</a> |
                <a href="https://taskilo.de/impressum">Impressum</a> |
                <a href="https://taskilo.de/datenschutz">Datenschutz</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await this.sendEmail({
        to: [customerEmail],
        from: 'noreply@taskilo.de',
        subject: `💼 Neues Angebot für "${projectTitle}" erhalten`,
        htmlContent: emailHtml,
        textContent: `Neues Angebot erhalten!\n\nProjekt: ${projectTitle}\nAnbieter: ${providerName}\nPreis: ${proposalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}\n\nSchauen Sie sich das Angebot in Ihrem Dashboard an: https://taskilo.de/dashboard`,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }
}

export const emailService = ResendEmailService.getInstance();
