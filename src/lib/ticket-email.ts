import { Resend } from 'resend';
import type { Ticket, TicketComment } from '@/types/ticket';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface TicketEmailOptions {
  ticket: Ticket;
  recipient: string;
  type: 'created' | 'updated' | 'comment' | 'resolved' | 'assigned';
  comment?: TicketComment;
  assignedBy?: string;
}

export class TicketEmailService {
  private static getFromEmail(): string {
    return 'Taskilo Support <support@taskilo.de>';
  }

  private static getReplyToEmail(): string {
    return 'andy.staudinger@taskilo.de';
  }

  private static getPriorityEmoji(priority: string): string {
    const priorities = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴'
    };
    return priorities[priority as keyof typeof priorities] || '⚪';
  }

  private static getCategoryEmoji(category: string): string {
    const categories = {
      bug: '🐛',
      feature: '✨',
      support: '🤝',
      billing: '💰',
      payment: '💳',
      account: '👤',
      technical: '⚙️',
      feedback: '💬',
      other: '📋'
    };
    return categories[category as keyof typeof categories] || '📋';
  }

  private static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    }).format(date);
  }

  static async sendTicketEmail(options: TicketEmailOptions): Promise<boolean> {
    try {
      const { ticket, recipient, type, comment, assignedBy } = options;

      const subject = this.generateSubject(ticket, type);
      const html = this.generateEmailTemplate(ticket, type, comment, assignedBy);

      const emailResponse = await resend.emails.send({
        from: this.getFromEmail(),
        to: [recipient],
        replyTo: this.getReplyToEmail(),
        subject,
        html,
        headers: {
          'X-Ticket-ID': ticket.id,
          'X-Ticket-Type': type
        }
      });

      if (emailResponse.error) {

        return false;
      }

      return true;

    } catch (error) {

      return false;
    }
  }

  private static generateSubject(ticket: Ticket, type: string): string {
    const priorityEmoji = this.getPriorityEmoji(ticket.priority);
    const categoryEmoji = this.getCategoryEmoji(ticket.category);

    const subjects = {
      created: `${priorityEmoji} Neues Ticket erstellt: ${ticket.title} [#${ticket.id}]`,
      updated: `${priorityEmoji} Ticket aktualisiert: ${ticket.title} [#${ticket.id}]`,
      comment: `💬 Neue Antwort: ${ticket.title} [#${ticket.id}]`,
      resolved: `✅ Ticket gelöst: ${ticket.title} [#${ticket.id}]`,
      assigned: `👤 Ticket zugewiesen: ${ticket.title} [#${ticket.id}]`
    };

    return subjects[type as keyof typeof subjects] || `${categoryEmoji} Ticket-Update: ${ticket.title} [#${ticket.id}]`;
  }

  private static generateEmailTemplate(
    ticket: Ticket,
    type: string,
    comment?: TicketComment,
    assignedBy?: string
  ): string {
    const priorityEmoji = this.getPriorityEmoji(ticket.priority);
    const categoryEmoji = this.getCategoryEmoji(ticket.category);

    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://taskilo.de'
      : 'http://localhost:3000';

    const ticketUrl = `${baseUrl}/dashboard/admin/tickets?ticket=${ticket.id}`;

    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Taskilo Ticket ${type}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #14ad9f 0%, #129488 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Taskilo Support</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Ticket-System Benachrichtigung</p>
        </div>

        <!-- Content -->
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">

          <!-- Ticket Info -->
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #14ad9f;">
            <h2 style="margin: 0 0 15px 0; color: #14ad9f;">
              ${categoryEmoji} ${ticket.title}
            </h2>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div>
                <strong>Ticket-ID:</strong> #${ticket.id}
              </div>
              <div>
                <strong>Status:</strong> ${this.getStatusBadge(ticket.status)}
              </div>
              <div>
                <strong>Priorität:</strong> ${priorityEmoji} ${ticket.priority.toUpperCase()}
              </div>
              <div>
                <strong>Kategorie:</strong> ${categoryEmoji} ${ticket.category}
              </div>
              <div>
                <strong>Erstellt:</strong> ${this.formatDate(ticket.createdAt)}
              </div>
              <div>
                <strong>Zuletzt aktualisiert:</strong> ${this.formatDate(ticket.updatedAt)}
              </div>
            </div>

            ${ticket.assignedTo ? `
              <div style="margin-bottom: 15px;">
                <strong>Zugewiesen an:</strong> ${ticket.assignedTo}
              </div>
            ` : ''}

            ${ticket.dueDate ? `
              <div style="margin-bottom: 15px;">
                <strong>Fälligkeitsdatum:</strong> ${this.formatDate(ticket.dueDate)}
              </div>
            ` : ''}

            <div style="margin-bottom: 15px;">
              <strong>Beschreibung:</strong>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 5px;">
                ${ticket.description.replace(/\n/g, '<br>')}
              </div>
            </div>

            ${ticket.tags.length > 0 ? `
              <div>
                <strong>Tags:</strong>
                ${ticket.tags.map(tag => `<span style="background: #14ad9f; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px;">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </div>

          ${this.generateTypeSpecificContent(type, comment, assignedBy)}

          <!-- Action Button -->
          <div style="text-align: center; margin: 20px 0;">
            <a href="${ticketUrl}"
               style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Ticket im Dashboard öffnen
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
            <p>
              <strong>Taskilo Support Team</strong><br>
              E-Mail: <a href="mailto:support@taskilo.de" style="color: #14ad9f;">support@taskilo.de</a><br>
              Web: <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px;">
              Diese E-Mail wurde automatisch vom Taskilo Ticket-System generiert.<br>
              Antworten Sie direkt auf diese E-Mail oder verwenden Sie das Dashboard.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private static generateTypeSpecificContent(type: string, comment?: TicketComment, assignedBy?: string): string {
    switch (type) {
      case 'created':
        return `
          <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <strong>🎫 Neues Ticket erstellt</strong><br>
            Ein neues Support-Ticket wurde erstellt und wartet auf Bearbeitung.
          </div>
        `;

      case 'comment':
        return comment ? `
          <div style="background: #cce7ff; color: #004085; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <strong>💬 Neue Antwort von ${comment.userDisplayName}</strong><br>
            <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 10px;">
              ${comment.content.replace(/\n/g, '<br>')}
            </div>
            <small style="opacity: 0.8;">
              ${this.formatDate(comment.createdAt)} ${comment.isInternal ? '(Interne Notiz)' : ''}
            </small>
          </div>
        ` : '';

      case 'resolved':
        return `
          <div style="background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <strong>✅ Ticket gelöst</strong><br>
            Dieses Ticket wurde erfolgreich gelöst. Falls Sie weitere Fragen haben, können Sie gerne antworten.
          </div>
        `;

      case 'assigned':
        return `
          <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <strong>👤 Ticket zugewiesen</strong><br>
            ${assignedBy ? `Zugewiesen von: ${assignedBy}` : 'Neuer Bearbeiter wurde zugewiesen.'}
          </div>
        `;

      case 'updated':
      default:
        return `
          <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <strong>📝 Ticket aktualisiert</strong><br>
            Die Ticket-Details wurden geändert. Bitte überprüfen Sie die aktualisierten Informationen.
          </div>
        `;
    }
  }

  private static getStatusBadge(status: string): string {
    const statusConfig = {
      open: { label: 'Offen', color: '#dc3545' },
      'in-progress': { label: 'In Bearbeitung', color: '#fd7e14' },
      waiting: { label: 'Wartet', color: '#ffc107' },
      resolved: { label: 'Gelöst', color: '#28a745' },
      closed: { label: 'Geschlossen', color: '#6c757d' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;

    return `<span style="background: ${config.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${config.label}</span>`;
  }

  // Hilfsmethoden für verschiedene Ticket-Aktionen
  static async notifyTicketCreated(ticket: Ticket): Promise<void> {
    // Benachrichtige den Ersteller
    await this.sendTicketEmail({
      ticket,
      recipient: ticket.reportedBy,
      type: 'created'
    });

    // Benachrichtige den Admin
    await this.sendTicketEmail({
      ticket,
      recipient: 'andy.staudinger@taskilo.de',
      type: 'created'
    });

    // Benachrichtige zugewiesene Person (falls vorhanden)
    if (ticket.assignedTo && ticket.assignedTo !== 'andy.staudinger@taskilo.de') {
      await this.sendTicketEmail({
        ticket,
        recipient: ticket.assignedTo,
        type: 'assigned'
      });
    }
  }

  static async notifyTicketComment(ticket: Ticket, comment: TicketComment): Promise<void> {
    // Sammle alle Empfänger (ohne Duplikate)
    const recipients = new Set([
      ticket.reportedBy,
      'andy.staudinger@taskilo.de'
    ]);

    if (ticket.assignedTo) {
      recipients.add(ticket.assignedTo);
    }

    // Entferne den Kommentar-Autor von den Empfängern
    if (comment.userId) {
      recipients.delete(comment.userId);
    }

    // Sende E-Mails an alle Beteiligten
    for (const recipient of recipients) {
      await this.sendTicketEmail({
        ticket,
        recipient,
        type: 'comment',
        comment
      });
    }
  }

  static async notifyTicketResolved(ticket: Ticket): Promise<void> {
    // Benachrichtige den Ersteller
    await this.sendTicketEmail({
      ticket,
      recipient: ticket.reportedBy,
      type: 'resolved'
    });

    // Benachrichtige den Admin
    await this.sendTicketEmail({
      ticket,
      recipient: 'andy.staudinger@taskilo.de',
      type: 'resolved'
    });
  }

  static async notifyTicketAssigned(ticket: Ticket, assignedBy: string): Promise<void> {
    if (ticket.assignedTo) {
      await this.sendTicketEmail({
        ticket,
        recipient: ticket.assignedTo,
        type: 'assigned',
        assignedBy
      });
    }
  }
}
