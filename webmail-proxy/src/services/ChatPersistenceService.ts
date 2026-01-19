/**
 * Taskilo Chat Persistence Service
 * Speichert Chatnachrichten und Konversationen in MongoDB
 * 
 * Collections:
 * - chat_conversations: Konversationen/Gruppenchats
 * - chat_messages: Alle Chatnachrichten
 * - chat_read_status: Gelesen-Status pro User
 */

import { mongoDBService, ObjectId } from './MongoDBService';

// ==================== Interfaces ====================

export interface ChatConversation {
  _id?: ObjectId;
  conversationId: string;
  type: 'direct' | 'group';
  name?: string;  // Nur für Gruppenchats
  participants: string[];  // E-Mail-Adressen
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  lastMessage?: string;
  createdBy: string;  // E-Mail des Erstellers
  isActive: boolean;
}

export interface ChatMessage {
  _id?: ObjectId;
  messageId: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'system';
  attachments?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }[];
  replyTo?: string;  // messageId der Antwort
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;  // Soft-Delete
  reactions?: {
    emoji: string;
    userEmail: string;
  }[];
}

export interface ChatReadStatus {
  _id?: ObjectId;
  conversationId: string;
  userEmail: string;
  lastReadMessageId: string;
  lastReadAt: Date;
  unreadCount: number;
}

export interface UndeliveredMessage {
  _id?: ObjectId;
  messageId: string;
  conversationId: string;
  recipientEmail: string;
  message: ChatMessage;
  createdAt: Date;
  deliveredAt?: Date;
  attempts: number;
}

// ==================== Service ====================

class ChatPersistenceService {
  private readonly DB_NAME = 'taskilo_ki';
  private readonly CONVERSATIONS_COLLECTION = 'chat_conversations';
  private readonly MESSAGES_COLLECTION = 'chat_messages';
  private readonly READ_STATUS_COLLECTION = 'chat_read_status';
  private readonly UNDELIVERED_COLLECTION = 'chat_undelivered';

  // ==================== Conversations ====================

  /**
   * Erstellt eine neue Konversation
   */
  async createConversation(
    type: 'direct' | 'group',
    participants: string[],
    createdBy: string,
    name?: string
  ): Promise<ChatConversation> {
    const collection = await mongoDBService.getCollectionFromDb<ChatConversation>(
      this.DB_NAME,
      this.CONVERSATIONS_COLLECTION
    );

    // Für Direktchats prüfen ob bereits existiert
    if (type === 'direct' && participants.length === 2) {
      const existing = await collection.findOne({
        type: 'direct',
        participants: { $all: participants, $size: 2 },
        isActive: true,
      });

      if (existing) {
        return existing;
      }
    }

    const conversation: ChatConversation = {
      conversationId: this.generateId(),
      type,
      name,
      participants,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      isActive: true,
    };

    await collection.insertOne(conversation);
    console.log(`[ChatPersistence] Created conversation ${conversation.conversationId} (${type})`);
    
    return conversation;
  }

  /**
   * Holt eine Konversation nach ID
   */
  async getConversation(conversationId: string): Promise<ChatConversation | null> {
    const collection = await mongoDBService.getCollectionFromDb<ChatConversation>(
      this.DB_NAME,
      this.CONVERSATIONS_COLLECTION
    );

    return collection.findOne({ conversationId, isActive: true });
  }

  /**
   * Holt alle Konversationen eines Users
   */
  async getConversationsForUser(email: string): Promise<ChatConversation[]> {
    const collection = await mongoDBService.getCollectionFromDb<ChatConversation>(
      this.DB_NAME,
      this.CONVERSATIONS_COLLECTION
    );

    const conversations = await collection.find({
      participants: email,
      isActive: true,
    }).toArray();

    // Nach letzter Nachricht sortieren (neueste zuerst)
    return conversations.sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() || a.createdAt.getTime();
      const bTime = b.lastMessageAt?.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });
  }

  /**
   * Aktualisiert letzte Nachricht einer Konversation
   */
  async updateLastMessage(conversationId: string, message: string): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<ChatConversation>(
      this.DB_NAME,
      this.CONVERSATIONS_COLLECTION
    );

    await collection.updateOne(
      { conversationId },
      {
        $set: {
          lastMessage: message.substring(0, 100),
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  // ==================== Messages ====================

  /**
   * Speichert eine neue Nachricht
   */
  async saveMessage(
    conversationId: string,
    senderEmail: string,
    senderName: string,
    content: string,
    contentType: 'text' | 'image' | 'file' | 'system' = 'text',
    replyTo?: string,
    attachments?: ChatMessage['attachments']
  ): Promise<ChatMessage> {
    const collection = await mongoDBService.getCollectionFromDb<ChatMessage>(
      this.DB_NAME,
      this.MESSAGES_COLLECTION
    );

    const message: ChatMessage = {
      messageId: this.generateId(),
      conversationId,
      senderEmail,
      senderName,
      content,
      contentType,
      attachments,
      replyTo,
      createdAt: new Date(),
      reactions: [],
    };

    await collection.insertOne(message);
    
    // Letzte Nachricht in Konversation aktualisieren
    await this.updateLastMessage(conversationId, content);

    // Unread-Count für andere Teilnehmer erhöhen
    await this.incrementUnreadForOthers(conversationId, senderEmail);

    console.log(`[ChatPersistence] Saved message ${message.messageId} in ${conversationId}`);
    
    return message;
  }

  /**
   * Holt Nachrichten einer Konversation (paginiert)
   */
  async getMessages(
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
  ): Promise<ChatMessage[]> {
    const collection = await mongoDBService.getCollectionFromDb<ChatMessage>(
      this.DB_NAME,
      this.MESSAGES_COLLECTION
    );

    const query: { conversationId: string; deletedAt?: undefined; createdAt?: { $lt: Date } } = { 
      conversationId,
      deletedAt: undefined as undefined,
    };

    // Pagination: Nachrichten vor einer bestimmten Nachricht laden
    if (beforeMessageId) {
      const beforeMessage = await collection.findOne({ messageId: beforeMessageId });
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    const messages = await collection
      .find(query)
      .limit(limit)
      .toArray();

    // Nach Datum sortieren (älteste zuerst für Chat-Darstellung)
    return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Löscht eine Nachricht (Soft-Delete)
   */
  async deleteMessage(messageId: string, userEmail: string): Promise<boolean> {
    const collection = await mongoDBService.getCollectionFromDb<ChatMessage>(
      this.DB_NAME,
      this.MESSAGES_COLLECTION
    );

    const result = await collection.updateOne(
      { messageId, senderEmail: userEmail },
      { $set: { deletedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Bearbeitet eine Nachricht
   */
  async editMessage(messageId: string, userEmail: string, newContent: string): Promise<boolean> {
    const collection = await mongoDBService.getCollectionFromDb<ChatMessage>(
      this.DB_NAME,
      this.MESSAGES_COLLECTION
    );

    const result = await collection.updateOne(
      { messageId, senderEmail: userEmail, deletedAt: undefined },
      { $set: { content: newContent, editedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Fügt eine Reaktion hinzu
   */
  async addReaction(messageId: string, userEmail: string, emoji: string): Promise<boolean> {
    const collection = await mongoDBService.getCollectionFromDb<ChatMessage>(
      this.DB_NAME,
      this.MESSAGES_COLLECTION
    );

    // Entferne existierende Reaktion des Users für dieses Emoji
    await collection.updateOne(
      { messageId },
      { $pull: { reactions: { userEmail, emoji } } }
    );

    // Füge neue Reaktion hinzu
    const result = await collection.updateOne(
      { messageId },
      { $push: { reactions: { emoji, userEmail } } }
    );

    return result.modifiedCount > 0;
  }

  // ==================== Read Status ====================

  /**
   * Markiert Nachrichten als gelesen
   */
  async markAsRead(conversationId: string, userEmail: string, lastMessageId: string): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<ChatReadStatus>(
      this.DB_NAME,
      this.READ_STATUS_COLLECTION
    );

    await collection.updateOne(
      { conversationId, userEmail },
      {
        $set: {
          lastReadMessageId: lastMessageId,
          lastReadAt: new Date(),
          unreadCount: 0,
        },
      },
      { upsert: true }
    );
  }

  /**
   * Erhöht Unread-Count für alle Teilnehmer außer dem Sender
   */
  private async incrementUnreadForOthers(conversationId: string, senderEmail: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return;

    const collection = await mongoDBService.getCollectionFromDb<ChatReadStatus>(
      this.DB_NAME,
      this.READ_STATUS_COLLECTION
    );

    for (const participant of conversation.participants) {
      if (participant !== senderEmail) {
        await collection.updateOne(
          { conversationId, userEmail: participant },
          { $inc: { unreadCount: 1 } },
          { upsert: true }
        );
      }
    }
  }

  /**
   * Holt Unread-Counts für einen User
   */
  async getUnreadCounts(userEmail: string): Promise<Map<string, number>> {
    const collection = await mongoDBService.getCollectionFromDb<ChatReadStatus>(
      this.DB_NAME,
      this.READ_STATUS_COLLECTION
    );

    const statuses = await collection.find({
      userEmail,
      unreadCount: { $gt: 0 },
    }).toArray();

    const counts = new Map<string, number>();
    for (const status of statuses) {
      counts.set(status.conversationId, status.unreadCount);
    }

    return counts;
  }

  // ==================== Undelivered Messages ====================

  /**
   * Speichert eine nicht zugestellte Nachricht
   */
  async saveUndeliveredMessage(
    recipientEmail: string,
    message: ChatMessage
  ): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<UndeliveredMessage>(
      this.DB_NAME,
      this.UNDELIVERED_COLLECTION
    );

    await collection.insertOne({
      messageId: message.messageId,
      conversationId: message.conversationId,
      recipientEmail,
      message,
      createdAt: new Date(),
      attempts: 0,
    });

    console.log(`[ChatPersistence] Saved undelivered message ${message.messageId} for ${recipientEmail}`);
  }

  /**
   * Holt unzugestellte Nachrichten für einen User
   */
  async getUndeliveredMessages(recipientEmail: string): Promise<UndeliveredMessage[]> {
    const collection = await mongoDBService.getCollectionFromDb<UndeliveredMessage>(
      this.DB_NAME,
      this.UNDELIVERED_COLLECTION
    );

    return collection.find({
      recipientEmail,
      deliveredAt: undefined,
    }).toArray();
  }

  /**
   * Markiert Nachrichten als zugestellt
   */
  async markAsDelivered(messageIds: string[], recipientEmail: string): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<UndeliveredMessage>(
      this.DB_NAME,
      this.UNDELIVERED_COLLECTION
    );

    await collection.updateMany(
      { messageId: { $in: messageIds }, recipientEmail },
      { $set: { deliveredAt: new Date() } }
    );

    console.log(`[ChatPersistence] Marked ${messageIds.length} messages as delivered for ${recipientEmail}`);
  }

  // ==================== Utilities ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Sucht Nachrichten nach Inhalt
   */
  async searchMessages(
    userEmail: string,
    query: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    const collection = await mongoDBService.getCollectionFromDb<ChatMessage>(
      this.DB_NAME,
      this.MESSAGES_COLLECTION
    );

    // Erst Konversationen des Users holen
    const conversations = await this.getConversationsForUser(userEmail);
    const conversationIds = conversations.map(c => c.conversationId);

    // Dann Nachrichten suchen
    const messages = await collection.find({
      conversationId: { $in: conversationIds },
      content: { $regex: query, $options: 'i' },
      deletedAt: undefined,
    }).limit(limit).toArray();

    return messages;
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    conversationsCount?: number;
    messagesCount?: number;
    error?: string;
  }> {
    try {
      const conversationsCol = await mongoDBService.getCollectionFromDb<ChatConversation>(
        this.DB_NAME,
        this.CONVERSATIONS_COLLECTION
      );
      const messagesCol = await mongoDBService.getCollectionFromDb<ChatMessage>(
        this.DB_NAME,
        this.MESSAGES_COLLECTION
      );

      const [conversationsCount, messagesCount] = await Promise.all([
        conversationsCol.countDocuments(),
        messagesCol.countDocuments(),
      ]);

      return {
        status: 'healthy',
        conversationsCount,
        messagesCount,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton
export const chatPersistenceService = new ChatPersistenceService();
