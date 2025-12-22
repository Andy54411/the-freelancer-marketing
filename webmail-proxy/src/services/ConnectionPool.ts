/**
 * Taskilo Webmail Proxy - Connection Pool
 * IMAP-Verbindungen effizient wiederverwenden
 */

import { ImapFlow, ImapFlowOptions } from 'imapflow';

interface PooledConnection {
  client: ImapFlow;
  email: string;
  lastUsed: number;
  inUse: boolean;
  createdAt: number;
}

interface PoolConfig {
  maxConnections: number;
  maxIdleTime: number;      // Max Zeit ohne Nutzung (ms)
  maxConnectionAge: number; // Max Alter einer Verbindung (ms)
  cleanupInterval: number;  // Cleanup-Intervall (ms)
}

const DEFAULT_CONFIG: PoolConfig = {
  maxConnections: 50,
  maxIdleTime: 5 * 60 * 1000,        // 5 Minuten
  maxConnectionAge: 30 * 60 * 1000,   // 30 Minuten
  cleanupInterval: 60 * 1000,         // Jede Minute
};

class IMAPConnectionPool {
  private connections: Map<string, PooledConnection[]> = new Map();
  private config: PoolConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats = {
    totalCreated: 0,
    totalReused: 0,
    totalClosed: 0,
    currentActive: 0,
  };

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [email, pool] of this.connections.entries()) {
      const activeConnections = pool.filter(conn => {
        const isExpired = 
          now - conn.lastUsed > this.config.maxIdleTime ||
          now - conn.createdAt > this.config.maxConnectionAge;
        
        if (isExpired && !conn.inUse) {
          this.closeConnection(conn);
          return false;
        }
        
        return true;
      });
      
      if (activeConnections.length === 0) {
        this.connections.delete(email);
      } else {
        this.connections.set(email, activeConnections);
      }
    }
    
    console.log(`[POOL] Cleanup complete. Active connections: ${this.stats.currentActive}`);
  }

  private async closeConnection(conn: PooledConnection): Promise<void> {
    try {
      if (conn.client.usable) {
        await conn.client.logout();
      }
      this.stats.totalClosed++;
      this.stats.currentActive--;
    } catch {
      // Ignore close errors
    }
  }

  private generateKey(email: string): string {
    return email.toLowerCase();
  }

  async acquire(
    email: string, 
    password: string, 
    imapHost = 'mail.taskilo.de', 
    imapPort = 993
  ): Promise<ImapFlow> {
    const key = this.generateKey(email);
    const pool = this.connections.get(key) || [];
    
    // Suche nach verfügbarer Verbindung
    const availableConn = pool.find(conn => !conn.inUse && conn.client.usable);
    
    if (availableConn) {
      availableConn.inUse = true;
      availableConn.lastUsed = Date.now();
      this.stats.totalReused++;
      console.log(`[POOL] Reusing connection for ${email}. Reused: ${this.stats.totalReused}`);
      return availableConn.client;
    }
    
    // Prüfe ob Pool-Limit erreicht
    const totalConnections = Array.from(this.connections.values())
      .reduce((sum, p) => sum + p.length, 0);
    
    if (totalConnections >= this.config.maxConnections) {
      // Schließe älteste unbenutzte Verbindung
      let oldestConn: PooledConnection | null = null;
      let oldestEmail: string | null = null;
      
      for (const [e, p] of this.connections.entries()) {
        for (const conn of p) {
          if (!conn.inUse && (!oldestConn || conn.lastUsed < oldestConn.lastUsed)) {
            oldestConn = conn;
            oldestEmail = e;
          }
        }
      }
      
      if (oldestConn && oldestEmail) {
        await this.closeConnection(oldestConn);
        const oldPool = this.connections.get(oldestEmail) || [];
        this.connections.set(
          oldestEmail, 
          oldPool.filter(c => c !== oldestConn)
        );
      }
    }
    
    // Erstelle neue Verbindung
    const options: ImapFlowOptions = {
      host: imapHost,
      port: imapPort,
      secure: true,
      auth: {
        user: email,
        pass: password,
      },
      logger: false,
    };
    
    const client = new ImapFlow(options);
    await client.connect();
    
    const newConn: PooledConnection = {
      client,
      email,
      lastUsed: Date.now(),
      inUse: true,
      createdAt: Date.now(),
    };
    
    pool.push(newConn);
    this.connections.set(key, pool);
    
    this.stats.totalCreated++;
    this.stats.currentActive++;
    
    console.log(`[POOL] Created new connection for ${email}. Total: ${this.stats.currentActive}`);
    
    return client;
  }

  release(email: string): void {
    const key = this.generateKey(email);
    const pool = this.connections.get(key);
    
    if (!pool) return;
    
    const conn = pool.find(c => c.inUse);
    if (conn) {
      conn.inUse = false;
      conn.lastUsed = Date.now();
    }
  }

  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    for (const pool of this.connections.values()) {
      for (const conn of pool) {
        await this.closeConnection(conn);
      }
    }
    
    this.connections.clear();
    console.log('[POOL] All connections closed');
  }

  getStats() {
    return {
      ...this.stats,
      poolSize: Array.from(this.connections.values())
        .reduce((sum, p) => sum + p.length, 0),
      emailsInPool: this.connections.size,
    };
  }
}

// Singleton Instance
export const imapPool = new IMAPConnectionPool();

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('[POOL] Shutting down...');
  await imapPool.destroy();
});

process.on('SIGINT', async () => {
  console.log('[POOL] Shutting down...');
  await imapPool.destroy();
  process.exit(0);
});
