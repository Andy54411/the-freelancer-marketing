import type { Ticket, TicketComment } from '@/types/ticket';

// Hilfsfunktion zum Versenden von Ticket-E-Mails
export class TicketEmailService {
  private static baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  /**
   * Sendet eine E-Mail wenn ein neues Ticket erstellt wird
   */
  static async sendTicketCreatedEmail(ticket: Ticket): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'created',
          ticket
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Fehler beim Senden der Ticket-E-Mail:', result.error);
        return false;
      }

      console.log('✅ Ticket-Erstellungs-E-Mail gesendet:', result.emailId);
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Ticket-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail wenn ein Ticket aktualisiert wird
   */
  static async sendTicketUpdatedEmail(ticket: Ticket): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'updated',
          ticket
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Fehler beim Senden der Update-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail wenn ein Kommentar hinzugefügt wird
   */
  static async sendTicketCommentEmail(ticket: Ticket, comment: TicketComment): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'commented',
          ticket,
          comment
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Fehler beim Senden der Kommentar-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail wenn ein Ticket gelöst wird
   */
  static async sendTicketResolvedEmail(ticket: Ticket): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'resolved',
          ticket
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Fehler beim Senden der Resolved-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail wenn ein Ticket wiedereröffnet wird
   */
  static async sendTicketReopenedEmail(ticket: Ticket): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'reopened',
          ticket
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Fehler beim Senden der Reopened-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet eine E-Mail wenn ein Ticket zugewiesen wird
   */
  static async sendTicketAssignedEmail(
    ticket: Ticket, 
    assignedTo: string, 
    assignedBy: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tickets/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'assigned',
          ticket,
          assignedTo,
          assignedBy
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Fehler beim Senden der Assigned-E-Mail:', error);
      return false;
    }
  }

  /**
   * Sendet mehrere E-Mail-Typen basierend auf Ticket-Änderungen
   */
  static async sendTicketChangeEmails(
    oldTicket: Ticket | null, 
    newTicket: Ticket,
    userEmail?: string
  ): Promise<void> {
    const changes: string[] = [];

    // Neues Ticket
    if (!oldTicket) {
      await this.sendTicketCreatedEmail(newTicket);
      return;
    }

    // Status-Änderungen
    if (oldTicket.status !== newTicket.status) {
      changes.push(`Status: ${oldTicket.status} → ${newTicket.status}`);
      
      if (newTicket.status === 'resolved') {
        await this.sendTicketResolvedEmail(newTicket);
      } else if (newTicket.status === 'open' && oldTicket.status === 'resolved') {
        await this.sendTicketReopenedEmail(newTicket);
      } else {
        await this.sendTicketUpdatedEmail(newTicket);
      }
    }

    // Zuweisung geändert
    if (oldTicket.assignedTo !== newTicket.assignedTo && newTicket.assignedTo) {
      changes.push(`Zugewiesen: ${oldTicket.assignedTo || 'Niemand'} → ${newTicket.assignedTo}`);
      await this.sendTicketAssignedEmail(
        newTicket, 
        newTicket.assignedTo, 
        userEmail || 'System'
      );
    }

    // Andere Änderungen
    if (oldTicket.priority !== newTicket.priority) {
      changes.push(`Priorität: ${oldTicket.priority} → ${newTicket.priority}`);
    }

    // Allgemeine Update-E-Mail senden wenn andere Änderungen vorliegen
    if (changes.length > 0 && 
        newTicket.status === oldTicket.status && 
        oldTicket.assignedTo === newTicket.assignedTo) {
      await this.sendTicketUpdatedEmail(newTicket);
    }

    if (changes.length > 0) {
      console.log(`📧 Ticket ${newTicket.id} Änderungen:`, changes);
    }
  }
}

// Typen für E-Mail-Benachrichtigungen
export interface TicketEmailPreferences {
  onCreated: boolean;
  onUpdated: boolean;
  onCommented: boolean;
  onResolved: boolean;
  onAssigned: boolean;
  userEmail: string;
}

// Standard-E-Mail-Einstellungen
export const defaultEmailPreferences: TicketEmailPreferences = {
  onCreated: true,
  onUpdated: true,
  onCommented: true,
  onResolved: true,
  onAssigned: true,
  userEmail: 'andy.staudinger@taskilo.de'
};
