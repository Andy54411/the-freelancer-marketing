/**
 * Taskilo Chat WebSocket Service
 * Echtzeit-Chat mit MongoDB-Persistenz
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server, IncomingMessage } from 'http';
import crypto from 'crypto';
import { chatPersistenceService, ChatMessage } from './ChatPersistenceService';

interface ChatClient {
  ws: WebSocket;
  clientId: string;
  email: string;
  name: string;
  authenticated: boolean;
  lastPing: number;
  activeConversation?: string;
}

interface ChatWSMessage {
  type: 
    | 'auth'
    | 'ping'
    | 'pong'
    // Conversation Management
    | 'create_conversation'
    | 'get_conversations'
    | 'join_conversation'
    | 'leave_conversation'
    // Messages
    | 'send_message'
    | 'get_messages'
    | 'edit_message'
    | 'delete_message'
    | 'add_reaction'
    // Read Status
    | 'mark_read'
    | 'typing';
  payload?: {
    // Auth
    email?: string;
    name?: string;
    token?: string;
    // Conversation
    conversationId?: string;
    type?: 'direct' | 'group';
    participants?: string[];
    conversationName?: string;
    // Messages
    messageId?: string;
    content?: string;
    contentType?: 'text' | 'image' | 'file' | 'system';
    replyTo?: string;
    attachments?: ChatMessage['attachments'];
    // Pagination
    limit?: number;
    beforeMessageId?: string;
    // Reactions
    emoji?: string;
  };
}

interface ChatWSResponse {
  type: string;
  payload: object;
  timestamp: string;
}

class ChatWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ChatClient> = new Map();
  private conversationClients: Map<string, Set<string>> = new Map(); // conversationId -> clientIds
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private stats = {
    totalConnections: 0,
    currentConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    chatMessagesSent: 0,
  };

  initialize(_server: Server): void {
    this.wss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Ping alle 30 Sekunden
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);

    // Cleanup alle 60 Sekunden
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleClients();
    }, 60000);

    console.log('[Chat WS] WebSocket server initialized (noServer mode) for /ws/chat');
  }

  handleUpgrade(request: IncomingMessage, socket: import('stream').Duplex, head: Buffer): void {
    const origin = request.headers.origin as string | undefined;
    console.log('[Chat WS] handleUpgrade called with origin:', origin);
    
    const allowedOrigins = [
      'https://taskilo.de',
      'https://www.taskilo.de',
      'http://localhost:3000',
    ];

    if (origin && !allowedOrigins.includes(origin)) {
      console.warn(`[Chat WS] Rejected upgrade from origin: ${origin}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    this.wss?.handleUpgrade(request, socket, head, (ws) => {
      this.wss?.emit('connection', ws, request);
    });
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = crypto.randomUUID();
    const ip = req.socket.remoteAddress || 'unknown';

    const client: ChatClient = {
      ws,
      clientId,
      email: '',
      name: '',
      authenticated: false,
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);
    this.stats.totalConnections++;
    this.stats.currentConnections++;

    console.log(`[Chat WS] New connection: ${clientId} from ${ip}`);

    ws.on('message', (data: RawData) => {
      console.log(`[Chat WS] Message from ${clientId}:`, data.toString().substring(0, 200));
      this.handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error: Error) => {
      console.error(`[Chat WS] Error for client ${clientId}:`, error.message);
      this.handleDisconnect(clientId);
    });

    // Auth Timeout
    setTimeout(() => {
      const c = this.clients.get(clientId);
      if (c && !c.authenticated) {
        this.sendToClient(clientId, {
          type: 'error',
          payload: { message: 'Authentication timeout' },
          timestamp: new Date().toISOString(),
        });
        ws.close();
      }
    }, 30000);
  }

  private async handleMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.stats.messagesReceived++;
    client.lastPing = Date.now();

    try {
      const message: ChatWSMessage = JSON.parse(data);

      switch (message.type) {
        case 'auth':
          await this.handleAuth(clientId, message.payload);
          break;
        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            payload: {},
            timestamp: new Date().toISOString(),
          });
          break;

        // Conversation Management
        case 'create_conversation':
          await this.handleCreateConversation(clientId, message.payload);
          break;
        case 'get_conversations':
          await this.handleGetConversations(clientId);
          break;
        case 'join_conversation':
          await this.handleJoinConversation(clientId, message.payload?.conversationId);
          break;
        case 'leave_conversation':
          await this.handleLeaveConversation(clientId);
          break;

        // Messages
        case 'send_message':
          await this.handleSendMessage(clientId, message.payload);
          break;
        case 'get_messages':
          await this.handleGetMessages(clientId, message.payload);
          break;
        case 'edit_message':
          await this.handleEditMessage(clientId, message.payload);
          break;
        case 'delete_message':
          await this.handleDeleteMessage(clientId, message.payload?.messageId);
          break;
        case 'add_reaction':
          await this.handleAddReaction(clientId, message.payload);
          break;

        // Read Status
        case 'mark_read':
          await this.handleMarkRead(clientId, message.payload);
          break;
        case 'typing':
          await this.handleTyping(clientId);
          break;

        default:
          console.warn(`[Chat WS] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[Chat WS] Invalid message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ==================== Auth ====================

  private async handleAuth(
    clientId: string,
    payload?: { email?: string; name?: string; token?: string }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !payload?.email) {
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Email required for authentication' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid email format' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    client.email = payload.email;
    client.name = payload.name || payload.email.split('@')[0];
    client.authenticated = true;

    console.log(`[Chat WS] Client ${clientId} authenticated as ${client.email}`);

    // Unzugestellte Nachrichten senden
    await this.deliverUndeliveredMessages(clientId);

    // Unread Counts senden
    const unreadCounts = await chatPersistenceService.getUnreadCounts(client.email);
    const unreadObject: Record<string, number> = {};
    unreadCounts.forEach((count, convId) => {
      unreadObject[convId] = count;
    });

    this.sendToClient(clientId, {
      type: 'auth_success',
      payload: { 
        email: client.email,
        name: client.name,
        unreadCounts: unreadObject,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== Conversations ====================

  private async handleCreateConversation(
    clientId: string,
    payload?: { type?: 'direct' | 'group'; participants?: string[]; conversationName?: string }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !payload?.participants?.length) {
      return;
    }

    // Eigene E-Mail zu Teilnehmern hinzufügen
    const allParticipants = [...new Set([...payload.participants, client.email])];

    const conversation = await chatPersistenceService.createConversation(
      payload.type || 'direct',
      allParticipants,
      client.email,
      payload.conversationName
    );

    this.sendToClient(clientId, {
      type: 'conversation_created',
      payload: { conversation },
      timestamp: new Date().toISOString(),
    });

    // Andere Teilnehmer benachrichtigen
    this.notifyUsersAboutConversation(allParticipants, conversation, clientId);
  }

  private async handleGetConversations(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated) return;

    const conversations = await chatPersistenceService.getConversationsForUser(client.email);
    const unreadCounts = await chatPersistenceService.getUnreadCounts(client.email);

    this.sendToClient(clientId, {
      type: 'conversations_list',
      payload: { 
        conversations: conversations.map(c => ({
          ...c,
          unreadCount: unreadCounts.get(c.conversationId) || 0,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleJoinConversation(clientId: string, conversationId?: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !conversationId) return;

    // Aus vorheriger Konversation entfernen
    if (client.activeConversation) {
      this.conversationClients.get(client.activeConversation)?.delete(clientId);
    }

    // Zu neuer Konversation hinzufügen
    if (!this.conversationClients.has(conversationId)) {
      this.conversationClients.set(conversationId, new Set());
    }
    this.conversationClients.get(conversationId)?.add(clientId);
    client.activeConversation = conversationId;

    console.log(`[Chat WS] ${client.email} joined conversation ${conversationId}`);

    // Letzte Nachrichten laden
    const messages = await chatPersistenceService.getMessages(conversationId, 50);

    this.sendToClient(clientId, {
      type: 'joined_conversation',
      payload: { conversationId, messages },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleLeaveConversation(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.activeConversation) return;

    this.conversationClients.get(client.activeConversation)?.delete(clientId);
    console.log(`[Chat WS] ${client.email} left conversation ${client.activeConversation}`);
    client.activeConversation = undefined;
  }

  // ==================== Messages ====================

  private async handleSendMessage(
    clientId: string,
    payload?: {
      content?: string;
      contentType?: 'text' | 'image' | 'file' | 'system';
      replyTo?: string;
      attachments?: ChatMessage['attachments'];
    }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !client.activeConversation || !payload?.content) {
      return;
    }

    const message = await chatPersistenceService.saveMessage(
      client.activeConversation,
      client.email,
      client.name,
      payload.content,
      payload.contentType || 'text',
      payload.replyTo,
      payload.attachments
    );

    this.stats.chatMessagesSent++;

    // An alle in der Konversation senden
    this.broadcastToConversation(client.activeConversation, {
      type: 'new_message',
      payload: { message },
      timestamp: new Date().toISOString(),
    });

    // Offline-User als unzugestellte Nachricht speichern
    const conversation = await chatPersistenceService.getConversation(client.activeConversation);
    if (conversation) {
      for (const participant of conversation.participants) {
        if (participant !== client.email && !this.isUserOnline(participant)) {
          await chatPersistenceService.saveUndeliveredMessage(participant, message);
        }
      }
    }

    console.log(`[Chat WS] Message sent by ${client.email} in ${client.activeConversation}`);
  }

  private async handleGetMessages(
    clientId: string,
    payload?: { limit?: number; beforeMessageId?: string }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !client.activeConversation) return;

    const messages = await chatPersistenceService.getMessages(
      client.activeConversation,
      payload?.limit || 50,
      payload?.beforeMessageId
    );

    this.sendToClient(clientId, {
      type: 'messages_loaded',
      payload: { messages, hasMore: messages.length === (payload?.limit || 50) },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleEditMessage(
    clientId: string,
    payload?: { messageId?: string; content?: string }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !payload?.messageId || !payload?.content) return;

    const success = await chatPersistenceService.editMessage(
      payload.messageId,
      client.email,
      payload.content
    );

    if (success && client.activeConversation) {
      this.broadcastToConversation(client.activeConversation, {
        type: 'message_edited',
        payload: { messageId: payload.messageId, content: payload.content },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleDeleteMessage(clientId: string, messageId?: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !messageId) return;

    const success = await chatPersistenceService.deleteMessage(messageId, client.email);

    if (success && client.activeConversation) {
      this.broadcastToConversation(client.activeConversation, {
        type: 'message_deleted',
        payload: { messageId },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleAddReaction(
    clientId: string,
    payload?: { messageId?: string; emoji?: string }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !payload?.messageId || !payload?.emoji) return;

    const success = await chatPersistenceService.addReaction(
      payload.messageId,
      client.email,
      payload.emoji
    );

    if (success && client.activeConversation) {
      this.broadcastToConversation(client.activeConversation, {
        type: 'reaction_added',
        payload: { 
          messageId: payload.messageId, 
          emoji: payload.emoji,
          userEmail: client.email,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ==================== Read Status & Typing ====================

  private async handleMarkRead(
    clientId: string,
    payload?: { messageId?: string }
  ): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !client.activeConversation || !payload?.messageId) return;

    await chatPersistenceService.markAsRead(
      client.activeConversation,
      client.email,
      payload.messageId
    );

    // Anderen mitteilen
    this.broadcastToConversation(client.activeConversation, {
      type: 'message_read',
      payload: { 
        conversationId: client.activeConversation,
        userEmail: client.email,
        lastReadMessageId: payload.messageId,
      },
      timestamp: new Date().toISOString(),
    }, clientId);
  }

  private async handleTyping(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated || !client.activeConversation) return;

    this.broadcastToConversation(client.activeConversation, {
      type: 'user_typing',
      payload: { 
        userEmail: client.email,
        userName: client.name,
      },
      timestamp: new Date().toISOString(),
    }, clientId);
  }

  // ==================== Helpers ====================

  private async deliverUndeliveredMessages(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client?.authenticated) return;

    const undelivered = await chatPersistenceService.getUndeliveredMessages(client.email);
    if (undelivered.length === 0) return;

    for (const item of undelivered) {
      this.sendToClient(clientId, {
        type: 'offline_message',
        payload: { 
          message: item.message,
          sentWhileOffline: true,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Als zugestellt markieren
    const messageIds = undelivered.map(u => u.messageId);
    await chatPersistenceService.markAsDelivered(messageIds, client.email);

    console.log(`[Chat WS] Delivered ${undelivered.length} offline messages to ${client.email}`);
  }

  private isUserOnline(email: string): boolean {
    for (const client of this.clients.values()) {
      if (client.authenticated && client.email === email) {
        return true;
      }
    }
    return false;
  }

  private notifyUsersAboutConversation(
    emails: string[],
    conversation: object,
    excludeClientId: string
  ): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (clientId !== excludeClientId && client.authenticated && emails.includes(client.email)) {
        this.sendToClient(clientId, {
          type: 'new_conversation',
          payload: { conversation },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client?.activeConversation) {
      this.conversationClients.get(client.activeConversation)?.delete(clientId);
    }
    this.clients.delete(clientId);
    this.stats.currentConnections--;
    console.log(`[Chat WS] Client disconnected: ${clientId}`);
  }

  private sendToClient(clientId: string, response: ChatWSResponse): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(response));
      this.stats.messagesSent++;
    } catch (error) {
      console.error(`[Chat WS] Failed to send to ${clientId}:`, error);
    }
  }

  private broadcastToConversation(
    conversationId: string,
    response: ChatWSResponse,
    excludeClientId?: string
  ): void {
    const clientIds = this.conversationClients.get(conversationId);
    if (!clientIds) return;

    for (const clientId of clientIds) {
      if (excludeClientId && clientId === excludeClientId) continue;
      this.sendToClient(clientId, response);
    }
  }

  private pingClients(): void {
    for (const [_clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }
  }

  private cleanupIdleClients(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 Minuten

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > timeout) {
        console.log(`[Chat WS] Removing idle client: ${clientId}`);
        client.ws.close();
        this.handleDisconnect(clientId);
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      activeConversations: this.conversationClients.size,
      onlineUsers: new Set(
        Array.from(this.clients.values())
          .filter(c => c.authenticated)
          .map(c => c.email)
      ).size,
    };
  }

  shutdown(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    for (const client of this.clients.values()) {
      client.ws.close();
    }

    if (this.wss) {
      this.wss.close();
    }

    console.log('[Chat WS] WebSocket server shut down');
  }
}

// Singleton
export const chatWsService = new ChatWebSocketService();
