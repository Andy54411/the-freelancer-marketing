// Quote Notification Service für Angebotsanfragen und Statusänderungen
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

export interface QuoteNotification {
  userId: string;
  type:
    | 'quote_request'
    | 'quote_response'
    | 'quote_accepted'
    | 'quote_declined'
    | 'quote_payment_required'
    | 'quote_contact_exchange';
  title: string;
  message: string;
  quoteId: string;
  quoteTitle?: string;
  link: string;
  isRead: boolean;
  createdAt: any;
  metadata?: {
    customerName?: string;
    providerName?: string;
    subcategory?: string;
    budget?: {
      min: number;
      max: number;
      currency: string;
    };
    urgency?: string;
    estimatedPrice?: number;
    provisionAmount?: number;
  };
}

export class QuoteNotificationService {
  /**
   * Erstellt Notifications für neue Angebotsanfragen
   * - Benachrichtigt den Provider über die neue Angebotsanfrage
   * - Benachrichtigt den Customer über die gesendete Anfrage
   */
  static async createNewQuoteRequestNotifications(
    quoteId: string,
    customerUid: string,
    providerUid: string,
    quoteData: {
      customerName: string;
      providerName: string;
      subcategory: string;
      budget: {
        min: number;
        max: number;
        currency: string;
      };
      urgency?: string;
      description?: string;
    }
  ): Promise<void> {
    try {
      const budgetText = `${quoteData.budget.min.toLocaleString('de-DE')} - ${quoteData.budget.max.toLocaleString('de-DE')} ${quoteData.budget.currency}`;
      const urgencyText = quoteData.urgency ? ` (${quoteData.urgency} Priorität)` : '';

      // 1. PROVIDER NOTIFICATION - Neue Angebotsanfrage erhalten
      const providerNotification: Omit<QuoteNotification, 'id'> = {
        userId: providerUid,
        type: 'quote_request',
        title: '🔔 Neue Angebotsanfrage!',
        message: `${quoteData.customerName} hat eine Angebotsanfrage für "${quoteData.subcategory}" gesendet. Budget: ${budgetText}${urgencyText}`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.customerName}`,
        link: `/dashboard/company/${providerUid}/quotes/incoming/${quoteId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: quoteData.customerName,
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
          budget: quoteData.budget,
          urgency: quoteData.urgency,
        },
      };

      // 2. CUSTOMER NOTIFICATION - Anfrage gesendet bestätigung
      const customerNotification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_request',
        title: '✅ Angebotsanfrage gesendet!',
        message: `Ihre Angebotsanfrage für "${quoteData.subcategory}" wurde an ${quoteData.providerName} gesendet. Sie erhalten eine Benachrichtigung, sobald ein Angebot eingeht.`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.providerName}`,
        link: `/dashboard/company/${customerUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: quoteData.customerName,
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
          budget: quoteData.budget,
          urgency: quoteData.urgency,
        },
      };

      // Beide Notifications parallel erstellen
      await Promise.all([
        db.collection('notifications').add(providerNotification),
        db.collection('notifications').add(customerNotification),
      ]);

      console.log(`✅ Quote-Request-Notifications erstellt für Quote ${quoteId}:`, {
        provider: providerUid,
        customer: customerUid,
        subcategory: quoteData.subcategory,
        budget: budgetText,
      });
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Quote-Request-Notifications:', error);
      throw error;
    }
  }

  /**
   * Benachrichtigt über eingegangene Angebote (Provider hat geantwortet)
   */
  static async createQuoteResponseNotification(
    quoteId: string,
    customerUid: string,
    quoteData: {
      providerName: string;
      subcategory: string;
      estimatedPrice?: number;
      estimatedDuration?: string;
    }
  ): Promise<void> {
    try {
      const priceText = quoteData.estimatedPrice
        ? ` Angebotspreis: ${quoteData.estimatedPrice.toLocaleString('de-DE')} €`
        : '';
      const durationText = quoteData.estimatedDuration ? ` (${quoteData.estimatedDuration})` : '';

      const notification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_response',
        title: '💼 Neues Angebot erhalten!',
        message: `${quoteData.providerName} hat Ihnen ein Angebot für "${quoteData.subcategory}" gesendet.${priceText}${durationText}`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.providerName}`,
        link: `/dashboard/company/${customerUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
          estimatedPrice: quoteData.estimatedPrice,
        },
      };

      await db.collection('notifications').add(notification);

      console.log(
        `✅ Quote-Response-Notification erstellt für Quote ${quoteId}, Customer: ${customerUid}`
      );
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Quote-Response-Notification:', error);
      throw error;
    }
  }

  /**
   * Benachrichtigt über Angebotsstatus-Änderungen
   */
  static async createQuoteStatusNotification(
    quoteId: string,
    targetUserUid: string,
    status: 'accepted' | 'declined',
    quoteData: {
      customerName?: string;
      providerName?: string;
      subcategory: string;
      estimatedPrice?: number;
      isCustomerAction?: boolean; // Um zu unterscheiden, wer die Aktion ausgeführt hat
    }
  ): Promise<void> {
    try {
      let title: string;
      let message: string;
      let notificationType: QuoteNotification['type'];
      const userRole = quoteData.isCustomerAction ? 'provider' : 'customer';

      switch (status) {
        case 'accepted':
          if (userRole === 'provider') {
            // Provider wird benachrichtigt, dass Kunde das Angebot angenommen hat
            title = '🎉 Angebot angenommen!';
            message = `${quoteData.customerName} hat Ihr Angebot für "${quoteData.subcategory}" angenommen! Provision erforderlich für Kontaktaustausch.`;
            notificationType = 'quote_accepted';
          } else {
            // Kunde wird über eigene Annahme informiert (falls nötig)
            title = '✅ Angebot angenommen';
            message = `Sie haben das Angebot für "${quoteData.subcategory}" von ${quoteData.providerName} angenommen.`;
            notificationType = 'quote_accepted';
          }
          break;
        case 'declined':
          if (userRole === 'provider') {
            // Provider wird benachrichtigt, dass Kunde das Angebot abgelehnt hat
            title = '❌ Angebot abgelehnt';
            message = `${quoteData.customerName} hat Ihr Angebot für "${quoteData.subcategory}" abgelehnt.`;
            notificationType = 'quote_declined';
          } else {
            // Kunde wird über eigene Ablehnung informiert (falls nötig)
            title = '🚫 Angebot abgelehnt';
            message = `Sie haben das Angebot für "${quoteData.subcategory}" von ${quoteData.providerName} abgelehnt.`;
            notificationType = 'quote_declined';
          }
          break;
        default:
          throw new Error(`Unbekannter Status: ${status}`);
      }

      const notification: Omit<QuoteNotification, 'id'> = {
        userId: targetUserUid,
        type: notificationType,
        title,
        message,
        quoteId,
        quoteTitle: quoteData.subcategory,
        link:
          userRole === 'provider'
            ? `/dashboard/company/${targetUserUid}/quotes/incoming/${quoteId}`
            : `/dashboard/company/${targetUserUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: quoteData,
      };

      await db.collection('notifications').add(notification);

      console.log(
        `✅ Quote-Status-Notification erstellt: ${status} für User ${targetUserUid}, Quote ${quoteId}`
      );
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Quote-Status-Notification:', error);
      throw error;
    }
  }

  /**
   * Benachrichtigt über erforderliche Provision-Zahlung
   */
  static async createPaymentRequiredNotification(
    quoteId: string,
    customerUid: string,
    quoteData: {
      providerName: string;
      subcategory: string;
      provisionAmount: number;
    }
  ): Promise<void> {
    try {
      const notification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_payment_required',
        title: '💳 Zahlung erforderlich',
        message: `Um die Kontaktdaten für "${quoteData.subcategory}" mit ${quoteData.providerName} auszutauschen, ist eine Provision von ${quoteData.provisionAmount.toLocaleString('de-DE')} € erforderlich.`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.providerName}`,
        link: `/dashboard/company/${customerUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
          provisionAmount: quoteData.provisionAmount,
        },
      };

      await db.collection('notifications').add(notification);

      console.log(
        `✅ Payment-Required-Notification erstellt für Quote ${quoteId}, Customer: ${customerUid}`
      );
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Payment-Required-Notification:', error);
      throw error;
    }
  }

  /**
   * Benachrichtigt über erfolgreichen Kontaktaustausch
   */
  static async createContactExchangeNotifications(
    quoteId: string,
    customerUid: string,
    providerUid: string,
    quoteData: {
      customerName: string;
      providerName: string;
      subcategory: string;
    }
  ): Promise<void> {
    try {
      // 1. PROVIDER NOTIFICATION - Kontakte verfügbar
      const providerNotification: Omit<QuoteNotification, 'id'> = {
        userId: providerUid,
        type: 'quote_contact_exchange',
        title: '📞 Kontaktdaten verfügbar!',
        message: `Die Provision wurde bezahlt! Sie können nun die Kontaktdaten von ${quoteData.customerName} für "${quoteData.subcategory}" einsehen.`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.customerName}`,
        link: `/dashboard/company/${providerUid}/quotes/incoming/${quoteId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: quoteData.customerName,
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
        },
      };

      // 2. CUSTOMER NOTIFICATION - Kontakte verfügbar
      const customerNotification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_contact_exchange',
        title: '🤝 Kontaktaustausch erfolgreich!',
        message: `Die Zahlung war erfolgreich! Sie können nun die Kontaktdaten von ${quoteData.providerName} für "${quoteData.subcategory}" einsehen.`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.providerName}`,
        link: `/dashboard/company/${customerUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          customerName: quoteData.customerName,
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
        },
      };

      // Beide Notifications parallel erstellen
      await Promise.all([
        db.collection('notifications').add(providerNotification),
        db.collection('notifications').add(customerNotification),
      ]);

      console.log(`✅ Contact-Exchange-Notifications erstellt für Quote ${quoteId}:`, {
        provider: providerUid,
        customer: customerUid,
        subcategory: quoteData.subcategory,
      });
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Contact-Exchange-Notifications:', error);
      throw error;
    }
  }
}
