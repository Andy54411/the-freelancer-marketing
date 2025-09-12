// Notification Service for Company Support Tickets
import { ResendEmailService } from './resend-email-service';

// Firebase will be imported dynamically when needed
let admin: any = null;
let db: any = null;

async function ensureFirebaseInitialized() {
  if (!admin || !db) {
    const firebase = await import('@/firebase/server');
    admin = firebase.admin;
    db = firebase.db;
  }
  return { admin, db };
}

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
      // Ensure Firebase is initialized
      const { admin, db } = await ensureFirebaseInitialized();
      if (!admin || !db) {
        return;
      }

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
    } catch (error) {
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
      // Ensure Firebase is initialized
      const { admin, db } = await ensureFirebaseInitialized();
      if (!admin || !db) {
        return;
      }

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
    } catch (error) {
      throw error;
    }
  }
}
