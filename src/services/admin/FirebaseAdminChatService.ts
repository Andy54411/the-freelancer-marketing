/**
 * Firebase Admin Chat Service
 * 
 * Ersetzt AWS DynamoDB Chat-Monitoring
 * Nutzt die bestehende Firebase 'chats' Collection
 */

import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export interface AdminChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'company' | 'admin' | 'system';
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

export interface AdminChat {
  id: string;
  type: 'job' | 'direct' | 'support';
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: 'active' | 'archived' | 'closed';
  createdAt: string;
  updatedAt: string;
  jobId?: string;
  jobTitle?: string;
}

export interface ChatStats {
  totalChats: number;
  activeChats: number;
  messagesLast24h: number;
  averageResponseTime: number;
  byType: Record<string, number>;
}

const CHATS_COLLECTION = 'chats';
const MESSAGES_SUBCOLLECTION = 'messages';

export class FirebaseAdminChatService {

  /**
   * Get chat overview for admin dashboard
   */
  static async getChatOverview(): Promise<{
    totalChats: number;
    activeChats: number;
    supportChats: number;
    recentActivity: AdminChat[];
  }> {
    if (!db) {
      return { totalChats: 0, activeChats: 0, supportChats: 0, recentActivity: [] };
    }

    const snapshot = await db.collection(CHATS_COLLECTION).get();
    const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminChat[];

    return {
      totalChats: chats.length,
      activeChats: chats.filter(c => c.status === 'active').length,
      supportChats: chats.filter(c => c.type === 'support').length,
      recentActivity: chats
        .filter(c => c.lastMessageAt)
        .sort((a, b) => new Date(b.lastMessageAt!).getTime() - new Date(a.lastMessageAt!).getTime())
        .slice(0, 10),
    };
  }

  /**
   * Get chat statistics
   */
  static async getChatStatistics(): Promise<ChatStats> {
    if (!db) {
      return {
        totalChats: 0,
        activeChats: 0,
        messagesLast24h: 0,
        averageResponseTime: 0,
        byType: {},
      };
    }

    const snapshot = await db.collection(CHATS_COLLECTION).get();
    const chats = snapshot.docs.map(doc => doc.data()) as AdminChat[];

    const stats: ChatStats = {
      totalChats: chats.length,
      activeChats: chats.filter(c => c.status === 'active').length,
      messagesLast24h: 0,
      averageResponseTime: 0,
      byType: {},
    };

    // Count by type
    for (const chat of chats) {
      stats.byType[chat.type] = (stats.byType[chat.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get list of chats with filters
   */
  static async getChatList(filters?: {
    type?: string;
    status?: string;
    limit?: number;
  }): Promise<AdminChat[]> {
    if (!db) {
      return [];
    }

    let query: FirebaseFirestore.Query = db.collection(CHATS_COLLECTION);

    if (filters?.type) {
      query = query.where('type', '==', filters.type);
    }
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    const limit = filters?.limit || 50;
    query = query.limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminChat[];
  }

  /**
   * Get messages for a specific chat
   */
  static async getChatMessages(chatId: string, limit: number = 50): Promise<AdminChatMessage[]> {
    if (!db) {
      return [];
    }

    const snapshot = await db
      .collection(CHATS_COLLECTION)
      .doc(chatId)
      .collection(MESSAGES_SUBCOLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminChatMessage[];
  }

  /**
   * Get a single chat by ID
   */
  static async getChat(chatId: string): Promise<AdminChat | null> {
    if (!db) {
      return null;
    }

    const doc = await db.collection(CHATS_COLLECTION).doc(chatId).get();
    
    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as AdminChat;
  }

  /**
   * Update chat status
   */
  static async updateChatStatus(chatId: string, status: 'active' | 'archived' | 'closed'): Promise<void> {
    if (!db) {
      throw new Error('Datenbank nicht verfügbar');
    }

    await db.collection(CHATS_COLLECTION).doc(chatId).update({
      status,
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Search chats
   */
  static async searchChats(searchTerm: string): Promise<AdminChat[]> {
    if (!db || !searchTerm) {
      return [];
    }

    // Get all chats and filter client-side (Firestore does not support full-text search)
    const allChats = await this.getChatList({ limit: 500 });
    const lowerSearch = searchTerm.toLowerCase();

    return allChats.filter(chat =>
      chat.lastMessage?.toLowerCase().includes(lowerSearch) ||
      Object.values(chat.participantNames || {}).some(name => 
        name.toLowerCase().includes(lowerSearch)
      )
    );
  }

  /**
   * Send admin message to chat
   */
  static async sendAdminMessage(
    chatId: string,
    adminId: string,
    adminName: string,
    content: string
  ): Promise<AdminChatMessage> {
    if (!db) {
      throw new Error('Datenbank nicht verfügbar');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const message: AdminChatMessage = {
      id: messageId,
      chatId,
      senderId: adminId,
      senderName: adminName,
      senderType: 'admin',
      content,
      timestamp: now,
      read: false,
    };

    // Add message to subcollection
    await db
      .collection(CHATS_COLLECTION)
      .doc(chatId)
      .collection(MESSAGES_SUBCOLLECTION)
      .doc(messageId)
      .set(message);

    // Update chat's last message
    await db.collection(CHATS_COLLECTION).doc(chatId).update({
      lastMessage: content,
      lastMessageAt: now,
      updatedAt: now,
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });

    return message;
  }

  /**
   * Get unread messages count for admin
   */
  static async getUnreadCount(): Promise<number> {
    if (!db) {
      return 0;
    }

    // Count support chats with unread messages
    const snapshot = await db
      .collection(CHATS_COLLECTION)
      .where('type', '==', 'support')
      .where('unreadCount', '>', 0)
      .get();

    return snapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.unreadCount || 0);
    }, 0);
  }
}
