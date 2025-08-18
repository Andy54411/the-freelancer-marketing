// Order Notification Service für Auftragsbuchungen
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

export interface OrderNotification {
  userId: string;
  type: 'order' | 'order_accepted' | 'order_completed' | 'order_cancelled';
  title: string;
  message: string;
  orderId: string;
  orderTitle?: string;
  link: string;
  isRead: boolean;
  createdAt: any;
  metadata?: {
    customerName?: string;
    providerName?: string;
    amount?: number;
    category?: string;
    subcategory?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export class OrderNotificationService {
  /**
   * Erstellt Notifications wenn ein neuer Auftrag gebucht wurde
   * - Benachrichtigt den Provider über die neue Buchung
   * - Benachrichtigt den Customer über die erfolgreiche Buchung
   */
  static async createNewOrderNotifications(
    orderId: string,
    customerUid: string,
    providerUid: string,
    orderData: {
      customerName: string;
      providerName: string;
      subcategory: string;
      category?: string;
      amount: number;
      dateFrom: string;
      dateTo?: string;
    }
  ): Promise<void> {
    try {
      // 1. PROVIDER NOTIFICATION - Neue Buchung erhalten
      const providerNotification: Omit<OrderNotification, 'id'> = {
        userId: providerUid,
        type: 'order',
        title: '🎉 Neue Buchung erhalten!',
        message: `${orderData.customerName} hat Sie für "${orderData.subcategory}" gebucht. Betrag: €${orderData.amount}`,
        orderId,
        orderTitle: `${orderData.subcategory} - ${orderData.customerName}`,
        link: `/dashboard/company/${providerUid}/orders/${orderId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: orderData.customerName,
          providerName: orderData.providerName,
          amount: orderData.amount,
          category: orderData.category,
          subcategory: orderData.subcategory,
          dateFrom: orderData.dateFrom,
          dateTo: orderData.dateTo,
        },
      };

      // 2. CUSTOMER NOTIFICATION - Buchung bestätigt
      const customerNotification: Omit<OrderNotification, 'id'> = {
        userId: customerUid,
        type: 'order',
        title: '✅ Buchung erfolgreich!',
        message: `Ihre Buchung bei ${orderData.providerName} für "${orderData.subcategory}" wurde bestätigt.`,
        orderId,
        orderTitle: `${orderData.subcategory} - ${orderData.providerName}`,
        link: `/dashboard/user/${customerUid}/orders/${orderId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: orderData.customerName,
          providerName: orderData.providerName,
          amount: orderData.amount,
          category: orderData.category,
          subcategory: orderData.subcategory,
          dateFrom: orderData.dateFrom,
          dateTo: orderData.dateTo,
        },
      };

      // Beide Notifications parallel erstellen
      await Promise.all([
        db.collection('notifications').add(providerNotification),
        db.collection('notifications').add(customerNotification),
      ]);

      console.log(`✅ Order-Notifications erstellt für Auftrag ${orderId}:`, {
        provider: providerUid,
        customer: customerUid,
        subcategory: orderData.subcategory,
        amount: orderData.amount,
      });
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Order-Notifications:', error);
      throw error;
    }
  }

  /**
   * Benachrichtigt über Auftragsstatus-Änderungen
   */
  static async createOrderStatusNotification(
    orderId: string,
    targetUserUid: string,
    status: 'accepted' | 'completed' | 'cancelled',
    orderData: {
      customerName?: string;
      providerName?: string;
      subcategory: string;
      amount?: number;
    }
  ): Promise<void> {
    try {
      let title: string;
      let message: string;
      let notificationType: OrderNotification['type'];

      switch (status) {
        case 'accepted':
          title = '✅ Auftrag angenommen';
          message = `Ihr Auftrag "${orderData.subcategory}" wurde von ${orderData.providerName} angenommen.`;
          notificationType = 'order_accepted';
          break;
        case 'completed':
          title = '🎉 Auftrag abgeschlossen';
          message = `Ihr Auftrag "${orderData.subcategory}" wurde erfolgreich abgeschlossen.`;
          notificationType = 'order_completed';
          break;
        case 'cancelled':
          title = '❌ Auftrag storniert';
          message = `Ihr Auftrag "${orderData.subcategory}" wurde storniert.`;
          notificationType = 'order_cancelled';
          break;
        default:
          throw new Error(`Unbekannter Status: ${status}`);
      }

      const notification: Omit<OrderNotification, 'id'> = {
        userId: targetUserUid,
        type: notificationType,
        title,
        message,
        orderId,
        orderTitle: orderData.subcategory,
        link: `/dashboard/user/${targetUserUid}/orders/${orderId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: orderData,
      };

      await db.collection('notifications').add(notification);

      console.log(
        `✅ Order-Status-Notification erstellt: ${status} für User ${targetUserUid}, Order ${orderId}`
      );
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Order-Status-Notification:', error);
      throw error;
    }
  }

  /**
   * Test-Notification für Entwicklung
   */
  static async createTestOrderNotification(
    userUid: string,
    orderId: string = 'test-order-123'
  ): Promise<void> {
    try {
      const testNotification: Omit<OrderNotification, 'id'> = {
        userId: userUid,
        type: 'order',
        title: '🧪 Test: Neue Buchung',
        message: 'Dies ist eine Test-Benachrichtigung für eine neue Auftragsbuchung.',
        orderId,
        orderTitle: 'Test Mietkoch Service',
        link: `/dashboard/company/${userUid}/orders/${orderId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: 'Max Mustermann',
          providerName: 'Test Provider',
          amount: 150,
          subcategory: 'Mietkoch',
          dateFrom: new Date().toISOString().split('T')[0],
        },
      };

      await db.collection('notifications').add(testNotification);

      console.log(`✅ Test-Order-Notification erstellt für User ${userUid}`);
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Test-Order-Notification:', error);
      throw error;
    }
  }
}
