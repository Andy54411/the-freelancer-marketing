// Notification Service for Company Support Tickets
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.log('Firebase admin already initialized or error:', error);
  }
}

const db = admin.firestore();

export interface TicketNotification {
  userId: string;
  type: 'support';
  title: string;
  message: string;
  ticketId: string;
  ticketTitle: string;
  link: string;
  isRead: boolean;
  createdAt: any;
}

export class TicketNotificationService {
  /**
   * Erstellt eine Notification wenn ein Support-Ticket beantwortet wurde
   */
  static async createTicketReplyNotification(
    customerUid: string,
    ticketId: string,
    ticketTitle: string,
    replyAuthor: string
  ): Promise<void> {
    try {
      const notification: Omit<TicketNotification, 'id'> = {
        userId: customerUid,
        type: 'support',
        title: 'Neue Antwort auf Ihr Support-Ticket',
        message: `${replyAuthor} hat auf Ihr Ticket "${ticketTitle}" geantwortet`,
        ticketId,
        ticketTitle,
        link: `/dashboard/company/${customerUid}/support`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('notifications').add(notification);

      console.log(`Ticket-Notification erstellt für User ${customerUid}, Ticket ${ticketId}`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Ticket-Notification:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine Notification wenn ein neues Support-Ticket erstellt wurde (für Admins)
   */
  static async createNewTicketNotification(
    ticketId: string,
    ticketTitle: string,
    customerName: string,
    adminUids: string[] = []
  ): Promise<void> {
    try {
      // Falls keine Admin UIDs übergeben, verwende Standard-Admin UID
      const defaultAdminUids = adminUids.length > 0 ? adminUids : ['admin-uid']; // TODO: Echte Admin UIDs

      for (const adminUid of defaultAdminUids) {
        const notification: Omit<TicketNotification, 'id'> = {
          userId: adminUid,
          type: 'support',
          title: 'Neues Support-Ticket',
          message: `${customerName} hat ein neues Support-Ticket erstellt: "${ticketTitle}"`,
          ticketId,
          ticketTitle,
          link: `/dashboard/admin/tickets`,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('notifications').add(notification);
      }

      console.log(`Admin-Notifications erstellt für neues Ticket ${ticketId}`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Admin-Notification:', error);
      throw error;
    }
  }
}
