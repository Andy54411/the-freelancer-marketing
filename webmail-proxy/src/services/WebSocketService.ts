/**
 * Taskilo Webmail Proxy - WebSocket Service
 * Echtzeit-Benachrichtigungen für neue E-Mails
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server, IncomingMessage } from 'http';
import crypto from 'crypto';
import { imapPool } from './ConnectionPool';

interface WebSocketClient {
  ws: WebSocket;
  email: string;
  authenticated: boolean;
  lastPing: number;
  subscriptions: Set<string>; // Mailboxes to watch
}

interface WSMessage {
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  payload?: {
    email?: string;
    password?: string;
    mailbox?: string;
    channel?: string;  // Alternative zu mailbox für Photos-WebSocket
    token?: string;
  };
}

interface WSNotification {
  type: 'new_email' | 'email_read' | 'email_deleted' | 'mailbox_update' | 'error' | 'auth_success' | 'subscribed' | 'photo_update' | 'photo_classified' | 'categories_changed';
  payload: object;
  timestamp: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private tokens: Map<string, { email: string; expiresAt: number }> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private idleCheckInterval: NodeJS.Timeout | null = null;

  private stats = {
    totalConnections: 0,
    currentConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    notificationsSent: 0,
  };

  initialize(_server: Server): void {
    this.wss = new WebSocketServer({ 
      // WICHTIG: noServer für manuelles Upgrade-Routing bei mehreren WS-Servern
      noServer: true,
      // WICHTIG: Compression deaktivieren um RSV1 Fehler zu vermeiden
      perMessageDeflate: false,
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Ping alle 30 Sekunden
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);

    // Idle-Check alle 60 Sekunden
    this.idleCheckInterval = setInterval(() => {
      this.removeIdleClients();
    }, 60000);

    console.log('[WS] WebSocket server initialized (noServer mode) for /ws');
  }

  // Manuelles Upgrade-Handling für korrektes Routing
  handleUpgrade(request: IncomingMessage, socket: import('stream').Duplex, head: Buffer): void {
    const origin = request.headers.origin as string | undefined;
    console.log('[WS] handleUpgrade called with origin:', origin);
    
    const allowedOrigins = [
      'https://taskilo.de',
      'https://www.taskilo.de',
      'http://localhost:3000',
    ];

    if (origin && !allowedOrigins.includes(origin)) {
      console.warn(`[WS] Rejected upgrade from origin: ${origin}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log('[WS] Upgrade accepted');
    this.wss?.handleUpgrade(request, socket, head, (ws) => {
      console.log('[WS] handleUpgrade callback - emitting connection event');
      this.wss?.emit('connection', ws, request);
    });
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    console.log('[WS] handleConnection called');
    const clientId = crypto.randomUUID();
    const ip = req.socket.remoteAddress || 'unknown';

    const client: WebSocketClient = {
      ws,
      email: '',
      authenticated: false,
      lastPing: Date.now(),
      subscriptions: new Set(),
    };

    this.clients.set(clientId, client);
    this.stats.totalConnections++;
    this.stats.currentConnections++;

    console.log(`[WS] New connection: ${clientId} from ${ip}`);

    ws.on('message', (data: RawData) => {
      console.log(`[WS] Message received from ${clientId}:`, data.toString().substring(0, 200));
      this.handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error: Error) => {
      console.error(`[WS] Error for client ${clientId}:`, error.message);
      this.handleDisconnect(clientId);
    });

    // Timeout für Authentifizierung (30 Sekunden)
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

    try {
      const message: WSMessage = JSON.parse(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawMessage = message as unknown as Record<string, unknown>;

      switch (message.type) {
        case 'auth':
          // Unterstütze sowohl { type: 'auth', payload: { email } } als auch { type: 'auth', email }
          const authPayload = message.payload || { 
            email: rawMessage.email as string | undefined,
            password: rawMessage.password as string | undefined,
            token: rawMessage.token as string | undefined,
          };
          await this.handleAuth(clientId, authPayload);
          break;
        case 'subscribe':
          // Unterstütze sowohl { type: 'subscribe', payload: { channel } } als auch { type: 'subscribe', channel }
          const subscribeChannel = message.payload?.mailbox || message.payload?.channel || rawMessage.channel as string | undefined || rawMessage.mailbox as string | undefined;
          this.handleSubscribe(clientId, subscribeChannel);
          break;
        case 'unsubscribe':
          const unsubscribeChannel = message.payload?.mailbox || message.payload?.channel || rawMessage.channel as string | undefined || rawMessage.mailbox as string | undefined;
          this.handleUnsubscribe(clientId, unsubscribeChannel);
          break;
        case 'ping':
          client.lastPing = Date.now();
          this.sendToClient(clientId, {
            type: 'pong' as 'error',
            payload: {},
            timestamp: new Date().toISOString(),
          });
          break;
        default:
          console.warn(`[WS] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[WS] Invalid message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleAuth(
    clientId: string, 
    payload?: { email?: string; password?: string; token?: string }
  ): Promise<void> {
    console.log(`[WS] handleAuth called for ${clientId} with payload:`, JSON.stringify(payload));
    const client = this.clients.get(clientId);
    if (!client || !payload) {
      console.log(`[WS] handleAuth: client or payload missing - client: ${!!client}, payload: ${!!payload}`);
      return;
    }

    // Token-basierte Auth (für bereits eingeloggte User)
    if (payload.token) {
      const tokenData = this.tokens.get(payload.token);
      if (tokenData && tokenData.expiresAt > Date.now()) {
        client.email = tokenData.email;
        client.authenticated = true;
        this.sendToClient(clientId, {
          type: 'auth_success',
          payload: { email: client.email },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Einfache E-Mail-Auth für Photos (Frontend ist bereits eingeloggt)
    // Erlaubt WebSocket-Verbindung nur mit E-Mail-Adresse für Realtime-Updates
    if (payload.email && !payload.password) {
      // Validiere E-Mail-Format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(payload.email)) {
        client.email = payload.email;
        client.authenticated = true;
        
        console.log(`[WS] Client ${clientId} authenticated via email-only as ${payload.email}`);
        
        this.sendToClient(clientId, {
          type: 'auth_success',
          payload: { email: client.email },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // IMAP-basierte Auth
    if (payload.email && payload.password) {
      try {
        const _imapClient = await imapPool.acquire(payload.email, payload.password);
        imapPool.release(payload.email);

        client.email = payload.email;
        client.authenticated = true;

        // Token generieren für zukünftige Verbindungen
        const token = crypto.randomBytes(32).toString('hex');
        this.tokens.set(token, {
          email: payload.email,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 Stunden
        });

        this.sendToClient(clientId, {
          type: 'auth_success',
          payload: { email: client.email, token },
          timestamp: new Date().toISOString(),
        });

        console.log(`[WS] Client ${clientId} authenticated as ${payload.email}`);
      } catch {
        this.sendToClient(clientId, {
          type: 'error',
          payload: { message: 'Authentication failed' },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private handleSubscribe(clientId: string, mailbox?: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated || !mailbox) return;

    client.subscriptions.add(mailbox);
    
    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: { mailbox },
      timestamp: new Date().toISOString(),
    });

    console.log(`[WS] ${client.email} subscribed to ${mailbox}`);
  }

  private handleUnsubscribe(clientId: string, mailbox?: string): void {
    const client = this.clients.get(clientId);
    if (!client || !mailbox) return;

    client.subscriptions.delete(mailbox);
    console.log(`[WS] ${client.email} unsubscribed from ${mailbox}`);
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`[WS] Client disconnected: ${clientId} (${client.email || 'unauthenticated'})`);
    }
    this.clients.delete(clientId);
    this.stats.currentConnections--;
  }

  private sendToClient(clientId: string, notification: WSNotification): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(notification));
      this.stats.messagesSent++;
    } catch (error) {
      console.error(`[WS] Failed to send to ${clientId}:`, error);
    }
  }

  // Öffentliche Methode zum Senden von Benachrichtigungen
  notifyNewEmail(email: string, mailbox: string, messageInfo: object): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (
        client.authenticated && 
        client.email === email && 
        client.subscriptions.has(mailbox)
      ) {
        this.sendToClient(clientId, {
          type: 'new_email',
          payload: { mailbox, message: messageInfo },
          timestamp: new Date().toISOString(),
        });
        this.stats.notificationsSent++;
      }
    }
  }

  notifyMailboxUpdate(email: string, mailbox: string, stats: object): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (
        client.authenticated && 
        client.email === email && 
        client.subscriptions.has(mailbox)
      ) {
        this.sendToClient(clientId, {
          type: 'mailbox_update',
          payload: { mailbox, stats },
          timestamp: new Date().toISOString(),
        });
        this.stats.notificationsSent++;
      }
    }
  }

  // ==================== PHOTOS REALTIME UPDATES ====================

  /**
   * Benachrichtigt Client über Foto-Update (Kategorie geändert, neu klassifiziert)
   */
  notifyPhotoUpdate(email: string, photoId: string, updates: {
    primaryCategory?: string;
    primaryCategoryDisplay?: string;
    primaryConfidence?: number;
    locationName?: string;
  }): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.authenticated && client.email === email) {
        this.sendToClient(clientId, {
          type: 'photo_update',
          payload: { photoId, updates },
          timestamp: new Date().toISOString(),
        });
        this.stats.notificationsSent++;
        console.log(`[WS] Photo update sent to ${email}: ${photoId} -> ${updates.primaryCategoryDisplay}`);
      }
    }
  }

  /**
   * Benachrichtigt Client dass ein Foto klassifiziert wurde
   */
  notifyPhotoClassified(email: string, photo: {
    id: string;
    primaryCategory: string;
    primaryCategoryDisplay: string;
    primaryConfidence: number;
  }): void {
    let clientsFound = 0;
    for (const [clientId, client] of this.clients.entries()) {
      if (client.authenticated && client.email === email) {
        clientsFound++;
        this.sendToClient(clientId, {
          type: 'photo_classified',
          payload: { photo },
          timestamp: new Date().toISOString(),
        });
        this.stats.notificationsSent++;
        console.log(`[WS] Photo classified sent to ${clientId}: ${photo.id} -> ${photo.primaryCategoryDisplay}`);
      }
    }
    if (clientsFound === 0) {
      console.log(`[WS] No authenticated clients found for ${email} (total clients: ${this.clients.size})`);
    }
  }

  /**
   * Benachrichtigt Client dass sich Kategorien geändert haben (neue Kategorie erstellt, etc.)
   */
  notifyCategoriesChanged(email: string, action: 'created' | 'deleted' | 'updated', category?: {
    key: string;
    display: string;
    group: string;
  }): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.authenticated && client.email === email) {
        this.sendToClient(clientId, {
          type: 'categories_changed',
          payload: { action, category },
          timestamp: new Date().toISOString(),
        });
        this.stats.notificationsSent++;
        console.log(`[WS] Categories changed for ${email}: ${action}`);
      }
    }
  }

  private pingClients(): void {
    for (const [_clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }
  }

  private removeIdleClients(): void {
    const now = Date.now();
    const idleTimeout = 5 * 60 * 1000; // 5 Minuten

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastPing > idleTimeout) {
        console.log(`[WS] Removing idle client: ${clientId}`);
        client.ws.close();
        this.clients.delete(clientId);
        this.stats.currentConnections--;
      }
    }
  }

  getStats() {
    return {
      ...this.stats,
      authenticatedClients: Array.from(this.clients.values())
        .filter(c => c.authenticated).length,
    };
  }

  shutdown(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.idleCheckInterval) clearInterval(this.idleCheckInterval);
    
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    console.log('[WS] WebSocket server shut down');
  }
}

// Singleton
export const wsService = new WebSocketService();
