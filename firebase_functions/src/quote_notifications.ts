// Firebase Cloud Function - Quote Notification Triggers
import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import type { FirestoreEvent, QueryDocumentSnapshot, Change } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { debounceFirestoreTrigger, incrementOperationCount } from './pub-sub-optimization';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

// Interface für Quote-Notifications
interface QuoteNotification {
  userId: string;
  type: 'quote_request' | 'quote_response' | 'quote_accepted' | 'quote_declined' | 'quote_payment_required' | 'quote_contact_exchange';
  title: string;
  message: string;
  quoteId: string;
  quoteTitle?: string;
  link: string;
  isRead: boolean;
  createdAt: any;
  metadata?: any;
}

/**
 * COST-OPTIMIZED: Quote creation trigger with debouncing
 */
export const onQuoteCreated = onDocumentCreated({
  document: 'quotes/{quoteId}',
  region: "europe-west1",
  memory: "256MiB", // Erhöht von 128MiB wegen Memory-Limit-Überschreitungen
  timeoutSeconds: 60
}, async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { quoteId: string }>) => {
  incrementOperationCount();
  
  return debounceFirestoreTrigger(
    `quote_created_${event.params.quoteId}`,
    async () => {
      const quoteId = event.params.quoteId;
      const quoteData = event.data?.data();

      if (!quoteData) {
        logger.warn(`[onQuoteCreated] No data for quote ${quoteId}`);
        return;
      }

      logger.info(`[onQuoteCreated] Processing new quote: ${quoteId}`);

      // Check if notifications were already sent (to avoid duplicates)
      if (quoteData.sentViaNotificationSystem) {
        logger.info(`[onQuoteCreated] Notifications already sent for quote ${quoteId}, skipping trigger`);
        return;
      }

  try {
    const providerId = quoteData.providerId;
    const customerUid = quoteData.customerUid;

    if (!providerId || !customerUid) {
      logger.warn(`[onQuoteCreated] Missing providerId or customerUid for quote ${quoteId}`);
      return;
    }

    // Get provider name
    let providerName = 'Anbieter';
    try {
      // Versuche zuerst companies collection für Unternehmensdaten
      let providerDoc = await db.collection('companies').doc(providerId).get();
      let providerData;
      
      if (providerDoc.exists) {
        providerData = providerDoc.data();
      } else {
        // Fallback: users collection für Legacy-Kompatibilität
        providerDoc = await db.collection('users').doc(providerId).get();
        if (providerDoc.exists) {
          providerData = providerDoc.data();
        }
      }
      
      if (providerData) {
        providerName = providerData?.companyName || 'Anbieter';
      }
    } catch (error) {
      logger.warn(`[onQuoteCreated] Failed to get provider name: ${error}`);
    }

    // Prepare notification data
    const budgetText = quoteData.budgetRange 
      ? `${quoteData.budgetRange.min?.toLocaleString('de-DE') || 0} - ${quoteData.budgetRange.max?.toLocaleString('de-DE') || 0} ${quoteData.budgetRange.currency || 'EUR'}`
      : 'Budget nicht angegeben';
    
    const urgencyText = quoteData.urgency ? ` (${quoteData.urgency} Priorität)` : '';

    // 1. PROVIDER NOTIFICATION - Neue Angebotsanfrage erhalten
    const providerNotification: Omit<QuoteNotification, 'id'> = {
      userId: providerId,
      type: 'quote_request',
      title: '🔔 Neue Angebotsanfrage!',
      message: `${quoteData.customerName} hat eine Angebotsanfrage für "${quoteData.projectSubcategory || quoteData.projectTitle}" gesendet. Budget: ${budgetText}${urgencyText}`,
      quoteId,
      quoteTitle: `${quoteData.projectSubcategory || quoteData.projectTitle} - ${quoteData.customerName}`,
      link: `/dashboard/company/${providerId}/quotes/incoming/${quoteId}`,
      isRead: false,
      createdAt: new Date(),
      metadata: {
        customerName: quoteData.customerName,
        providerName: providerName,
        subcategory: quoteData.projectSubcategory || quoteData.projectTitle,
        budget: quoteData.budgetRange,
        urgency: quoteData.urgency,
      },
    };

    // 2. CUSTOMER NOTIFICATION - Anfrage gesendet bestätigung
    const customerNotification: Omit<QuoteNotification, 'id'> = {
      userId: customerUid,
      type: 'quote_request',
      title: '✅ Angebotsanfrage gesendet!',
      message: `Ihre Angebotsanfrage für "${quoteData.projectSubcategory || quoteData.projectTitle}" wurde an ${providerName} gesendet. Sie erhalten eine Benachrichtigung, sobald ein Angebot eingeht.`,
      quoteId,
      quoteTitle: `${quoteData.projectSubcategory || quoteData.projectTitle} - ${providerName}`,
      link: `/dashboard/company/${customerUid}/quotes/received/${quoteId}`,
      isRead: false,
      createdAt: new Date(),
      metadata: {
        customerName: quoteData.customerName,
        providerName: providerName,
        subcategory: quoteData.projectSubcategory || quoteData.projectTitle,
        budget: quoteData.budgetRange,
        urgency: quoteData.urgency,
      },
    };

    // Send notifications parallel
    await Promise.all([
      db.collection('notifications').add(providerNotification),
      db.collection('notifications').add(customerNotification),
    ]);

    logger.info(`[onQuoteCreated] ✅ Bell-Notifications sent for quote ${quoteId}`);
  } catch (error) {
    logger.error(`[onQuoteCreated] ❌ Error sending notifications for quote ${quoteId}:`, error);
  }
    },
    1000 // 1 second debounce for quote creation
  );
});

/**
 * Trigger: Angebotsanfrage Status-Änderung
 * Sendet Bell-Notifications bei Status-Änderungen
 */
export const onQuoteStatusChanged = onDocumentUpdated('quotes/{quoteId}', async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined, { quoteId: string }>) => {
  const quoteId = event.params.quoteId;
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) {
    logger.warn(`[onQuoteStatusChanged] Missing data for quote ${quoteId}`);
    return;
  }

  const oldStatus = beforeData.status;
  const newStatus = afterData.status;

  // Check if status actually changed
  if (oldStatus === newStatus) {
    return; // No status change, skip
  }

  logger.info(`[onQuoteStatusChanged] Quote ${quoteId} status changed: ${oldStatus} -> ${newStatus}`);

  try {
    const providerId = afterData.providerId;
    const customerUid = afterData.customerUid;

    if (!providerId || !customerUid) {
      logger.warn(`[onQuoteStatusChanged] Missing providerId or customerUid for quote ${quoteId}`);
      return;
    }

    // Get names for notifications
    const customerName = afterData.customerName || 'Kunde';
    let providerName = 'Anbieter';
    
    try {
      // Versuche zuerst companies collection für Unternehmensdaten
      let providerDoc = await db.collection('companies').doc(providerId).get();
      let providerData;
      
      if (providerDoc.exists) {
        providerData = providerDoc.data();
      } else {
        // Fallback: users collection für Legacy-Kompatibilität
        providerDoc = await db.collection('users').doc(providerId).get();
        if (providerDoc.exists) {
          providerData = providerDoc.data();
        }
      }
      
      if (providerData) {
        providerName = providerData?.companyName || 'Anbieter';
      }
    } catch (error) {
      logger.warn(`[onQuoteStatusChanged] Failed to get provider name: ${error}`);
    }

    // Handle different status changes
    switch (newStatus) {
      case 'responded':
        if (oldStatus === 'pending') {
          // Provider has sent a quote response
          const response = afterData.response;
          const priceText = response?.estimatedPrice 
            ? ` Angebotspreis: ${response.estimatedPrice.toLocaleString('de-DE')} €` 
            : '';
          const durationText = response?.estimatedDuration 
            ? ` (${response.estimatedDuration})` 
            : '';

          const notification: Omit<QuoteNotification, 'id'> = {
            userId: customerUid,
            type: 'quote_response',
            title: '💼 Neues Angebot erhalten!',
            message: `${providerName} hat Ihnen ein Angebot für "${afterData.projectSubcategory || afterData.projectTitle}" gesendet.${priceText}${durationText}`,
            quoteId,
            quoteTitle: `${afterData.projectSubcategory || afterData.projectTitle} - ${providerName}`,
            link: `/dashboard/company/${customerUid}/quotes/received/${quoteId}`,
            isRead: false,
            createdAt: new Date(),
            metadata: {
              providerName: providerName,
              subcategory: afterData.projectSubcategory || afterData.projectTitle,
              estimatedPrice: response?.estimatedPrice,
            },
          };

          await db.collection('notifications').add(notification);
          logger.info(`[onQuoteStatusChanged] ✅ Quote-Response-Notification sent for quote ${quoteId}`);
        }
        break;

      case 'accepted':
        if (oldStatus === 'responded') {
          // Customer accepted the quote - notify provider
          const notification: Omit<QuoteNotification, 'id'> = {
            userId: providerId,
            type: 'quote_accepted',
            title: '🎉 Angebot angenommen!',
            message: `${customerName} hat Ihr Angebot für "${afterData.projectSubcategory || afterData.projectTitle}" angenommen! Provision erforderlich für Kontaktaustausch.`,
            quoteId,
            quoteTitle: `${afterData.projectSubcategory || afterData.projectTitle} - ${customerName}`,
            link: `/dashboard/company/${providerId}/quotes/incoming/${quoteId}`,
            isRead: false,
            createdAt: new Date(),
            metadata: {
              customerName: customerName,
              providerName: providerName,
              subcategory: afterData.projectSubcategory || afterData.projectTitle,
              estimatedPrice: afterData.response?.estimatedPrice,
              isCustomerAction: true,
            },
          };

          await db.collection('notifications').add(notification);
          logger.info(`[onQuoteStatusChanged] ✅ Quote-Accepted-Notification sent for quote ${quoteId}`);
        }
        break;

      case 'declined':
        if (oldStatus === 'responded') {
          // Customer declined the quote - notify provider
          const notification: Omit<QuoteNotification, 'id'> = {
            userId: providerId,
            type: 'quote_declined',
            title: '❌ Angebot abgelehnt',
            message: `${customerName} hat Ihr Angebot für "${afterData.projectSubcategory || afterData.projectTitle}" abgelehnt.`,
            quoteId,
            quoteTitle: `${afterData.projectSubcategory || afterData.projectTitle} - ${customerName}`,
            link: `/dashboard/company/${providerId}/quotes/incoming/${quoteId}`,
            isRead: false,
            createdAt: new Date(),
            metadata: {
              customerName: customerName,
              providerName: providerName,
              subcategory: afterData.projectSubcategory || afterData.projectTitle,
              isCustomerAction: true,
            },
          };

          await db.collection('notifications').add(notification);
          logger.info(`[onQuoteStatusChanged] ✅ Quote-Declined-Notification sent for quote ${quoteId}`);
        }
        break;
    }

    // Check for payment status changes
    const oldPaymentStatus = beforeData.payment?.provisionStatus;
    const newPaymentStatus = afterData.payment?.provisionStatus;

    if (oldPaymentStatus !== newPaymentStatus && newPaymentStatus === 'paid') {
      // Payment was completed - notify both parties about contact exchange
      const providerNotification: Omit<QuoteNotification, 'id'> = {
        userId: providerId,
        type: 'quote_contact_exchange',
        title: '📞 Kontaktdaten verfügbar!',
        message: `Die Provision wurde bezahlt! Sie können nun die Kontaktdaten von ${customerName} für "${afterData.projectSubcategory || afterData.projectTitle}" einsehen.`,
        quoteId,
        quoteTitle: `${afterData.projectSubcategory || afterData.projectTitle} - ${customerName}`,
        link: `/dashboard/company/${providerId}/quotes/incoming/${quoteId}`,
        isRead: false,
        createdAt: new Date(),
        metadata: {
          customerName: customerName,
          providerName: providerName,
          subcategory: afterData.projectSubcategory || afterData.projectTitle,
        },
      };

      const customerNotification: Omit<QuoteNotification, 'id'> = {
        userId: customerUid,
        type: 'quote_contact_exchange',
        title: '🤝 Kontaktaustausch erfolgreich!',
        message: `Die Zahlung war erfolgreich! Sie können nun die Kontaktdaten von ${providerName} für "${afterData.projectSubcategory || afterData.projectTitle}" einsehen.`,
        quoteId,
        quoteTitle: `${afterData.projectSubcategory || afterData.projectTitle} - ${providerName}`,
        link: `/dashboard/company/${customerUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: new Date(),
        metadata: {
          customerName: customerName,
          providerName: providerName,
          subcategory: afterData.projectSubcategory || afterData.projectTitle,
        },
      };

      await Promise.all([
        db.collection('notifications').add(providerNotification),
        db.collection('notifications').add(customerNotification),
      ]);

      logger.info(`[onQuoteStatusChanged] ✅ Contact-Exchange-Notifications sent for quote ${quoteId}`);
    }

  } catch (error) {
    logger.error(`[onQuoteStatusChanged] ❌ Error sending notifications for quote ${quoteId}:`, error);
  }
});
