// Client-side E-Mail-Service für das Frontend
// Verwendet API-Routen statt direkte Resend-Calls

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

export class ClientEmailService {
  private static instance: ClientEmailService;

  private constructor() {}

  public static getInstance(): ClientEmailService {
    if (!ClientEmailService.instance) {
      ClientEmailService.instance = new ClientEmailService();
    }
    return ClientEmailService.instance;
  }

  // E-Mail senden über API-Route
  async sendEmail(message: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    htmlContent: string;
    textContent?: string;
    from?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          from: message.from || 'noreply@taskilo.de',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Fehler beim Senden der E-Mail' };
      }

      return result;
    } catch (error) {

      return { success: false, error: 'Netzwerkfehler beim E-Mail-Versand' };
    }
  }

  // Bulk-E-Mail senden über API-Route
  async sendBulkEmails(messages: Array<{
    to: string[];
    subject: string;
    htmlContent: string;
    from?: string;
  }>): Promise<{
    success: boolean;
    results: Array<{ messageId?: string; error?: string; to: string[] }>;
    totalSent: number;
    successCount: number;
    failureCount: number;
  }> {
    try {
      const response = await fetch('/api/admin/emails/bulk-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            ...msg,
            from: msg.from || 'noreply@taskilo.de',
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          results: messages.map(m => ({ error: result.error || 'Bulk-Versand fehlgeschlagen', to: m.to })),
          totalSent: messages.length,
          successCount: 0,
          failureCount: messages.length,
        };
      }

      return result;
    } catch (error) {

      return {
        success: false,
        results: messages.map(m => ({ error: 'Netzwerkfehler', to: m.to })),
        totalSent: messages.length,
        successCount: 0,
        failureCount: messages.length,
      };
    }
  }

  // Template-E-Mail senden über API-Route
  async sendTemplateEmail(
    templateId: string,
    to: string[],
    variables: Record<string, string>,
    options?: {
      cc?: string[];
      bcc?: string[];
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('/api/admin/emails/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          to,
          variables,
          options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Fehler beim Template-E-Mail-Versand' };
      }

      return result;
    } catch (error) {

      return { success: false, error: 'Netzwerkfehler beim Template-E-Mail-Versand' };
    }
  }

  // Verfügbare Templates abrufen
  async getAvailableTemplates(): Promise<EmailTemplate[]> {
    try {
      const response = await fetch('/api/admin/emails/templates');

      if (!response.ok) {

        return [];
      }

      const result = await response.json();
      return result.templates || [];
    } catch (error) {

      return [];
    }
  }

  // E-Mail-Status abrufen
  async getEmailStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'bounced' | 'complaint' | 'delivery_delayed';
    lastEvent?: Date;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/admin/emails/send?messageId=${encodeURIComponent(messageId)}`);

      if (!response.ok) {
        return { status: 'sent', error: 'Status nicht verfügbar' };
      }

      const result = await response.json();
      return {
        status: result.status || 'sent',
        lastEvent: result.lastEvent ? new Date(result.lastEvent) : undefined,
        error: result.error,
      };
    } catch (error) {

      return { status: 'sent', error: 'Netzwerkfehler' };
    }
  }
}

// Export für Client-Side-Verwendung
export const clientEmailService = ClientEmailService.getInstance();
