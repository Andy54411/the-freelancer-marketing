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
    token?: string;
  };
}

interface WSNotification {
  type: 'new_email' | 'email_read' | 'email_deleted' | 'mailbox_update' | 'error' | 'auth_success' | 'subscribed';
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

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: (info: { origin?: string; req: IncomingMessage }, callback: (result: boolean, code?: number, message?: string) => void) => {
        // Origin-Check
        const origin = info.origin || info.req.headers.origin as string | undefined;
        const allowedOrigins = [
          'https://taskilo.de',
          'https://www.taskilo.de',
          'http://localhost:3000',
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(true);
        } else {
          console.warn(`[WS] Rejected connection from origin: ${origin}`);
          callback(false, 403, 'Forbidden');
        }
      },
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

    console.log('[WS] WebSocket server initialized on /ws');
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
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

      switch (message.type) {
        case 'auth':
          await this.handleAuth(clientId, message.payload);
          break;
        case 'subscribe':
          this.handleSubscribe(clientId, message.payload?.mailbox);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message.payload?.mailbox);
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
    const client = this.clients.get(clientId);
    if (!client || !payload) return;

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
