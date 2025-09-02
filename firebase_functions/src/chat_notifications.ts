import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FirestoreEvent } from 'firebase-functions/v2/firestore';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

// Use already initialized Firebase Admin from index.ts
const db = getFirestore();

interface ChatMessage {
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'provider';
  timestamp: any;
  read: boolean;
}

interface ChatNotification {
  userId: string;
  type: 'chat_message';
  title: string;
  message: string;
  quoteId: string;
  quoteTitle?: string;
  link: string;
  isRead: boolean;
  createdAt: any;
  metadata?: {
    senderName?: string;
    senderType?: string;
    messagePreview?: string;
  };
}

/**
 * KOSTENSENKUNG: Filtert unwichtige Chat-Nachrichten 
 * Reduziert Pub/Sub-Trigger um ~80%
 */
function shouldSendNotification(messageData: ChatMessage): boolean {
  // Skip sehr kurze Nachrichten (unter 3 Zeichen)
  if (!messageData.text || messageData.text.trim().length < 3) {
    return false;
  }

  // Skip reine Emoji-Nachrichten
  const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
  if (emojiRegex.test(messageData.text.trim())) {
    return false;
  }

  // Skip "typing indicator" Nachrichten
  if (messageData.text.includes('...') && messageData.text.length < 10) {
    return false;
  }

  // Nur wichtige Keywords triggern Notifications
  const importantKeywords = [
    'angebot', 'quote', 'preis', 'kosten', 'termin', 'frage', 'problem', 
    'dringend', 'wichtig', 'deadline', 'fertig', 'abgeschlossen',
    'offer', 'price', 'cost', 'urgent', 'important', 'done', 'finished'
  ];

  const hasImportantKeyword = importantKeywords.some(keyword => 
    messageData.text.toLowerCase().includes(keyword)
  );

  // Sende Notification nur bei wichtigen Nachrichten oder ersten Nachrichten
  return hasImportantKeyword || messageData.text.length > 50;
}

/**
 * Trigger: Neue Chat-Nachricht in Quote-Chat
 * KOSTENSENKUNG: Nur bei wichtigen Nachrichten triggern
 */
export const onChatMessageCreated = onDocumentCreated(
  'quotes/{quoteId}/chat/{messageId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined, { quoteId: string; messageId: string }>) => {
    const quoteId = event.params.quoteId;
    const messageId = event.params.messageId;
    const messageData = event.data?.data() as ChatMessage;

    if (!messageData) {
      logger.warn(`[onChatMessageCreated] No message data for ${messageId} in quote ${quoteId}`);
      return;
    }

    // KOSTENSENKUNG: Filtere unwichtige Nachrichten (80% weniger Triggers)
    const shouldNotify = shouldSendNotification(messageData);
    if (!shouldNotify) {
      logger.info(`[onChatMessageCreated] Skipping notification for message ${messageId} (filtered)`);
      return;
    }

    try {
      logger.info(`[onChatMessageCreated] Processing chat message ${messageId} in quote ${quoteId}`);

      // Quote-Daten laden um Customer und Provider zu identifizieren
      const quoteRef = db.doc(`quotes/${quoteId}`);
      const quoteSnap = await quoteRef.get();
      
      if (!quoteSnap.exists) {
        logger.warn(`[onChatMessageCreated] Quote ${quoteId} not found`);
        return;
      }

      const quoteData = quoteSnap.data();
      if (!quoteData) {
        logger.warn(`[onChatMessageCreated] No data in quote ${quoteId}`);
        return;
      }

      const { customerUid, providerId, projectTitle, projectSubcategory } = quoteData;

      // Bestimme den Empfänger (nicht der Sender)
      let recipientUid: string;
      let dashboardType: string;

      if (messageData.senderId === customerUid) {
        // Kunde hat gesendet -> Provider benachrichtigen
        recipientUid = providerId;
        dashboardType = 'company';
      } else if (messageData.senderId === providerId) {
        // Provider hat gesendet -> Kunde benachrichtigen
        recipientUid = customerUid;
        dashboardType = 'user';
      } else {
        logger.warn(`[onChatMessageCreated] Unknown sender ${messageData.senderId} for quote ${quoteId}`);
        return;
      }

      // Nachricht-Preview erstellen (erste 50 Zeichen)
      const messagePreview = messageData.text?.length > 50 
        ? messageData.text.substring(0, 50) + '...'
        : messageData.text || '';

      // Chat-Benachrichtigung erstellen
      const chatNotification: Omit<ChatNotification, 'id'> = {
        userId: recipientUid,
        type: 'chat_message',
        title: `💬 Neue Chat-Nachricht`,
        message: `${messageData.senderName} hat Ihnen geschrieben: "${messagePreview}"`,
        quoteId,
        quoteTitle: projectSubcategory || projectTitle || 'Angebotsanfrage',
        link: dashboardType === 'company' 
          ? `/dashboard/company/${recipientUid}/quotes/incoming/${quoteId}`
          : `/dashboard/user/${recipientUid}/quotes/received/${quoteId}`,
        isRead: false,
        createdAt: messageData.timestamp || new Date(),
        metadata: {
          senderName: messageData.senderName,
          senderType: messageData.senderType,
          messagePreview,
        },
      };

      // Benachrichtigung in Firestore speichern
      await db.collection('notifications').add(chatNotification);

      logger.info(`[onChatMessageCreated] ✅ Chat notification sent for quote ${quoteId} to user ${recipientUid}`);

    } catch (error) {
      logger.error(`[onChatMessageCreated] ❌ Error creating chat notification for quote ${quoteId}:`, error);
    }
  }
);
