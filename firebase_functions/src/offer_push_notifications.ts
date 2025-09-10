import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FirestoreEvent } from 'firebase-functions/v2/firestore';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';

// Use already initialized Firebase Admin from index.ts
const db = getFirestore();
const messaging = getMessaging();

interface OfferData {
  providerId: string;
  providerName: string;
  proposedPrice: number;
  proposedTimeline: string;
  message?: string;
  createdAt: any;
}

interface QuoteData {
  customerUid: string;
  customerName: string;
  projectTitle: string;
  projectSubcategory: string;
}

/**
 * Trigger: Neues Angebot in Quote erstellt
 * Sendet Push Notification an Customer
 */
export const onOfferCreated = onDocumentCreated(
  'quotes/{quoteId}/offers/{offerId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { quoteId: string; offerId: string }>) => {
    const { quoteId, offerId } = event.params;

    if (!event.data) {
      logger.warn(`[onOfferCreated] No data found for offer ${offerId} in quote ${quoteId}`);
      return;
    }

    try {
      const offerData = event.data.data() as OfferData;
      logger.info(`[onOfferCreated] Processing new offer ${offerId} in quote ${quoteId} from provider ${offerData.providerName}`);

      // Quote-Daten abrufen
      const quoteDoc = await db.collection('quotes').doc(quoteId).get();
      if (!quoteDoc.exists) {
        logger.warn(`[onOfferCreated] Quote ${quoteId} not found`);
        return;
      }

      const quoteData = quoteDoc.data() as QuoteData;
      const customerUid = quoteData.customerUid;

      // Customer FCM Token abrufen
      const userDoc = await db.collection('users').doc(customerUid).get();
      if (!userDoc.exists) {
        logger.warn(`[onOfferCreated] User ${customerUid} not found`);
        return;
      }

      const userData = userDoc.data();
      if (!userData) {
        logger.warn(`[onOfferCreated] User data not found for ${customerUid}`);
        return;
      }
      
      const fcmTokens = userData.fcmTokens || [];

      if (fcmTokens.length === 0) {
        logger.info(`[onOfferCreated] No FCM tokens found for user ${customerUid}`);
        return;
      }

      // Push Notification Payload erstellen
      const title = '🎉 Neues Angebot erhalten!';
      const body = `${offerData.providerName} hat ein Angebot für "${quoteData.projectSubcategory}" abgegeben. Preis: €${offerData.proposedPrice.toFixed(0)}`;

      const notificationPayload = {
        notification: {
          title,
          body,
        },
        data: {
          type: 'new_offer',
          quoteId,
          offerId,
          screen: 'incoming_offers',
          projectTitle: quoteData.projectTitle,
          projectSubcategory: quoteData.projectSubcategory,
          providerName: offerData.providerName,
          proposedPrice: offerData.proposedPrice.toString(),
        },
        android: {
          notification: {
            channelId: 'taskilo_offers',
            priority: 'high' as const,
            defaultSound: true,
            defaultVibrateTimings: true,
            color: '#14AD9F',
            icon: 'launcher_icon',
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      // Sende an alle FCM Tokens des Users
      const failedTokens: string[] = [];
      const sendPromises = fcmTokens.map(async (token: string) => {
        try {
          await messaging.send({
            token,
            ...notificationPayload,
          });
          logger.info(`[onOfferCreated] ✅ Push notification sent to token ${token.substring(0, 20)}...`);
        } catch (error: any) {
          logger.error(`[onOfferCreated] ❌ Failed to send to token ${token.substring(0, 20)}...:`, error);
          
          // Entferne ungültige Tokens
          if (error.code === 'messaging/registration-token-not-registered' || 
              error.code === 'messaging/invalid-registration-token') {
            failedTokens.push(token);
          }
        }
      });

      await Promise.all(sendPromises);

      // Entferne ungültige Tokens aus Firestore
      if (failedTokens.length > 0 && userData.fcmTokens) {
        await db.collection('users').doc(customerUid).update({
          fcmTokens: userData.fcmTokens.filter((token: string) => !failedTokens.includes(token)),
        });
        logger.info(`[onOfferCreated] Removed ${failedTokens.length} invalid FCM tokens`);
      }

      // Bell-Notification in Firestore speichern
      await db.collection('notifications').add({
        userId: customerUid,
        type: 'new_offer',
        title,
        message: body,
        quoteId,
        offerId,
        link: `/dashboard/user/${customerUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: new Date(),
        metadata: {
          providerName: offerData.providerName,
          proposedPrice: offerData.proposedPrice,
          projectTitle: quoteData.projectTitle,
          projectSubcategory: quoteData.projectSubcategory,
        },
      });

      logger.info(`[onOfferCreated] ✅ Successfully processed offer ${offerId} notifications`);

    } catch (error) {
      logger.error(`[onOfferCreated] ❌ Error processing offer ${offerId}:`, error);
    }
  }
);

/**
 * HTTP Function: Test Push Notification senden
 * Für Development und Testing
 */
export const sendTestPushNotification = async (data: any, context: any) => {
  try {
    const { userId } = data;
    
    if (!userId) {
      throw new Error('userId is required');
    }

    // User FCM Token abrufen
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found`);
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new Error(`User data not found for ${userId}`);
    }
    
    const fcmTokens = userData.fcmTokens || [];

    if (fcmTokens.length === 0) {
      throw new Error(`No FCM tokens found for user ${userId}`);
    }

    // Test Notification senden
    const testPayload = {
      notification: {
        title: '🧪 Test Notification',
        body: 'Dies ist eine Test-Benachrichtigung für neue Angebote von Taskilo!',
      },
      data: {
        type: 'test',
        screen: 'incoming_offers',
      },
      android: {
        notification: {
          channelId: 'taskilo_offers',
          priority: 'high' as const,
          color: '#14AD9F',
        },
      },
    };

    const sendPromises = fcmTokens.map((token: string) =>
      messaging.send({ token, ...testPayload })
    );

    await Promise.all(sendPromises);
    
    logger.info(`[sendTestPushNotification] ✅ Test notification sent to ${fcmTokens.length} tokens`);
    
    return { success: true, message: `Test notification sent to ${fcmTokens.length} devices` };
  } catch (error) {
    logger.error(`[sendTestPushNotification] ❌ Error:`, error);
    throw error;
  }
};
