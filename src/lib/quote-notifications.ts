// Quote Notification Service für Angebotsanfragen und Statusänderungen
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
      // Ensure Firebase is initialized
      const { admin, db } = await ensureFirebaseInitialized();
      if (!admin || !db) {
        return;
      }

      const budgetText = `${quoteData.budget.min.toLocaleString('de-DE')} - ${quoteData.budget.max.toLocaleString('de-DE')} ${quoteData.budget.currency}`;
      const urgencyText = quoteData.urgency ? ` (${quoteData.urgency} Priorität)` : '';

      // Intelligente Link-Generierung für hybride Accounts
      const providerLink = await QuoteNotificationService.getSmartLink(
        providerUid,
        quoteId,
        'incoming'
      );
      const customerLink = await QuoteNotificationService.getSmartLink(
        customerUid,
        quoteId,
        'received'
      );

      // 1. PROVIDER NOTIFICATION - Neue Angebotsanfrage erhalten
      const providerNotification: Omit<QuoteNotification, 'id'> = {
        userId: providerUid,
        type: 'quote_request',
        title: '🔔 Neue Angebotsanfrage!',
        message: `${quoteData.customerName} hat eine Angebotsanfrage für "${quoteData.subcategory}" gesendet. Budget: ${budgetText}${urgencyText}`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.customerName}`,
        link: providerLink,
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
        link: customerLink,
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bestimmt intelligente Link-Pfade für hybride User/Company-Accounts
   */
  private static async getSmartLink(
    userId: string,
    quoteId: string,
    linkType: 'received' | 'incoming'
  ): Promise<string> {
    try {
      const { db } = await ensureFirebaseInitialized();
      if (!db) {
        // Fallback auf user dashboard
        return `/dashboard/user/${userId}/quotes/${linkType}/${quoteId}`;
      }

      // Prüfe, ob User ein Company-Account hat
      const companyDoc = await db.collection('companies').doc(userId).get();
      const userDoc = await db.collection('users').doc(userId).get();

      // Intelligente Entscheidung basierend auf Account-Typ und Kontext
      if (companyDoc.exists && userDoc.exists) {
        // Hybrid Account - entscheide basierend auf Kontext
        const companyData = companyDoc.data();
        const userData = userDoc.data();

        // Wenn es eine aktive Company ist und der Link für "incoming" quotes ist
        if (linkType === 'incoming' && companyData?.isActive) {
          return `/dashboard/company/${userId}/quotes/incoming/${quoteId}`;
        }

        // Für "received" quotes - prüfe, ob es als Customer oder als Company empfangen wurde
        // Default für received quotes: user dashboard (als Customer)
        return `/dashboard/user/${userId}/quotes/received/${quoteId}`;
      } else if (companyDoc.exists) {
        // Nur Company Account
        return `/dashboard/company/${userId}/quotes/${linkType}/${quoteId}`;
      } else {
        // Nur User Account
        return `/dashboard/user/${userId}/quotes/${linkType}/${quoteId}`;
      }
    } catch (error) {
      // Fallback auf user dashboard
      return `/dashboard/user/${userId}/quotes/${linkType}/${quoteId}`;
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
      // Ensure Firebase is initialized
      const { admin, db } = await ensureFirebaseInitialized();
      if (!admin || !db) {
        return;
      }

      const priceText = quoteData.estimatedPrice
        ? ` Angebotspreis: ${quoteData.estimatedPrice.toLocaleString('de-DE')} €`
        : '';
      const durationText = quoteData.estimatedDuration ? ` (${quoteData.estimatedDuration})` : '';

      // Intelligente Link-Generierung für hybride Accounts
      const smartLink = await QuoteNotificationService.getSmartLink(
        customerUid,
        quoteId,
        'received'
      );

      const notification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_response',
        title: '💼 Neues Angebot erhalten!',
        message: `${quoteData.providerName} hat Ihnen ein Angebot für "${quoteData.subcategory}" gesendet.${priceText}${durationText}`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.providerName}`,
        link: smartLink,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
          estimatedPrice: quoteData.estimatedPrice,
        },
      };

      await db.collection('notifications').add(notification);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Benachrichtigt über Angebotsstatus-Änderungen
   */
  static async createQuoteStatusNotification(
    quoteId: string,
    targetUserId: string,
    status: 'accepted' | 'declined',
    quoteData: {
      customerName?: string;
      providerName?: string;
      subcategory: string;
      estimatedPrice?: number;
      isCustomerAction?: boolean;
    }
  ): Promise<void> {
    try {
      // Ensure Firebase is initialized
      const { admin, db } = await ensureFirebaseInitialized();
      if (!admin || !db) {
        return;
      }

      let title: string;
      let message: string;
      let notificationType: QuoteNotification['type'];
      const userRole = quoteData.isCustomerAction ? 'provider' : 'customer';

      switch (status) {
        case 'accepted':
          if (userRole === 'provider') {
            // Provider wird benachrichtigt, dass Kunde das Angebot angenommen hat
            title = '🎉 Angebot angenommen!';
            message = `${quoteData.customerName} hat Ihr Angebot für "${quoteData.subcategory}" angenommen! Zahlung erforderlich für Kontaktaustausch.`;
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

      // Intelligente Link-Generierung basierend auf User-Rolle
      const linkType = userRole === 'provider' ? 'incoming' : 'received';
      const smartLink = await QuoteNotificationService.getSmartLink(
        targetUserId,
        quoteId,
        linkType
      );

      const notification: Omit<QuoteNotification, 'id'> = {
        userId: targetUserId,
        type: notificationType,
        title,
        message,
        quoteId,
        quoteTitle: quoteData.subcategory,
        link: smartLink,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: quoteData,
      };

      await db.collection('notifications').add(notification);
    } catch (error) {
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
      // Ensure Firebase is initialized
      const { admin, db } = await ensureFirebaseInitialized();
      if (!admin || !db) {
        return;
      }

      // Intelligente Link-Generierung für hybride Accounts
      const smartLink = await QuoteNotificationService.getSmartLink(
        customerUid,
        quoteId,
        'received'
      );

      const notification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_payment_required',
        title: '💳 Zahlung erforderlich',
        message: `Um die Kontaktdaten für "${quoteData.subcategory}" mit ${quoteData.providerName} auszutauschen, ist eine Provision von ${quoteData.provisionAmount.toLocaleString('de-DE')} € erforderlich.`,
        quoteId,
        quoteTitle: `${quoteData.subcategory} - ${quoteData.providerName}`,
        link: smartLink,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          providerName: quoteData.providerName,
          subcategory: quoteData.subcategory,
          provisionAmount: quoteData.provisionAmount,
        },
      };
      await db.collection('notifications').add(notification);
    } catch (error) {
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
    quoteTitle: string
  ): Promise<void> {
    try {
      // Ensure Firebase is initialized
      const { admin, db } = await ensureFirebaseInitialized();
      if (!admin || !db) {
        return;
      }

      // Intelligente Link-Generierung für hybride Accounts
      const providerLink = await QuoteNotificationService.getSmartLink(
        providerUid,
        quoteId,
        'incoming'
      );
      const customerLink = await QuoteNotificationService.getSmartLink(
        customerUid,
        quoteId,
        'received'
      );

      // 1. PROVIDER NOTIFICATION - Kontakte verfügbar
      const providerNotification: Omit<QuoteNotification, 'id'> = {
        userId: providerUid,
        type: 'quote_contact_exchange',
        title: '📞 Kontaktdaten verfügbar!',
        message: `Die Zahlung wurde abgeschlossen! Sie können nun die Kontaktdaten für "${quoteTitle}" einsehen.`,
        quoteId,
        quoteTitle: quoteTitle,
        link: providerLink,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          subcategory: quoteTitle,
        },
      };

      // 2. CUSTOMER NOTIFICATION - Kontakte verfügbar
      const customerNotification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_contact_exchange',
        title: '🤝 Kontaktaustausch erfolgreich!',
        message: `Die Zahlung war erfolgreich! Sie können nun die Kontaktdaten für "${quoteTitle}" einsehen.`,
        quoteId,
        quoteTitle: quoteTitle,
        link: customerLink,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          subcategory: quoteTitle,
        },
      };

      // Beide Notifications parallel erstellen
      await Promise.all([
        db.collection('notifications').add(providerNotification),
        db.collection('notifications').add(customerNotification),
      ]);
    } catch (error) {
      throw error;
    }
  }
}
