/**
 * Taskilo Webmail Proxy - Redis Cache Service
 * Caching für häufig abgerufene E-Mails und Metadaten
 */

import IORedis from 'ioredis';

type RedisClient = IORedis | null;

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  keyPrefix: string;
  defaultTTL: number; // Sekunden
}

interface CachedMessage {
  uid: number;
  messageId: string;
  subject: string;
  from: Array<{ name?: string; address: string }>;
  to: Array<{ name?: string; address: string }>;
  date: string;
  preview: string;
  hasAttachments: boolean;
  cachedAt: number;
}

interface CachedMailbox {
  path: string;
  name: string;
  exists: number;
  unseen: number;
  cachedAt: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'taskilo:webmail:',
  defaultTTL: 300, // 5 Minuten
};

class CacheService {
  private redis: RedisClient = null;
  private config: CacheConfig;
  private connected = false;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<boolean> {
    if (this.connected && this.redis) return true;

    try {
      this.redis = new IORedis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        keyPrefix: this.config.keyPrefix,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.warn('[CACHE] Redis connection failed, running without cache');
            return null;
          }
          return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
      });

      await this.redis.connect();
      this.connected = true;
      console.log('[CACHE] Redis connected successfully');
      return true;
    } catch (error) {
      console.warn('[CACHE] Redis connection failed:', error);
      this.redis = null;
      this.connected = false;
      return false;
    }
  }

  private generateKey(type: string, email: string, ...parts: string[]): string {
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '');
    return [type, sanitizedEmail, ...parts].join(':');
  }

  // Mailbox-Liste cachen
  async cacheMailboxes(email: string, mailboxes: CachedMailbox[]): Promise<void> {
    if (!this.redis || !this.connected) return;

    try {
      const key = this.generateKey('mailboxes', email);
      const data = JSON.stringify({
        mailboxes,
        cachedAt: Date.now(),
      });
      await this.redis.setex(key, this.config.defaultTTL, data);
      this.stats.sets++;
    } catch (error) {
      console.error('[CACHE] Error caching mailboxes:', error);
    }
  }

  async getMailboxes(email: string): Promise<CachedMailbox[] | null> {
    if (!this.redis || !this.connected) return null;

    try {
      const key = this.generateKey('mailboxes', email);
      const data = await this.redis.get(key);
      
      if (data) {
        this.stats.hits++;
        const parsed = JSON.parse(data);
        return parsed.mailboxes;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[CACHE] Error getting mailboxes:', error);
      return null;
    }
  }

  // Nachrichten-Liste cachen
  async cacheMessages(
    email: string, 
    mailbox: string, 
    messages: CachedMessage[], 
    page = 1
  ): Promise<void> {
    if (!this.redis || !this.connected) return;

    try {
      const key = this.generateKey('messages', email, mailbox, `page-${page}`);
      const data = JSON.stringify({
        messages,
        cachedAt: Date.now(),
      });
      // Kürzere TTL für Nachrichten-Listen (schneller veraltet)
      await this.redis.setex(key, 60, data);
      this.stats.sets++;
    } catch (error) {
      console.error('[CACHE] Error caching messages:', error);
    }
  }

  async getMessages(email: string, mailbox: string, page = 1): Promise<CachedMessage[] | null> {
    if (!this.redis || !this.connected) return null;

    try {
      const key = this.generateKey('messages', email, mailbox, `page-${page}`);
      const data = await this.redis.get(key);
      
      if (data) {
        this.stats.hits++;
        const parsed = JSON.parse(data);
        return parsed.messages;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[CACHE] Error getting messages:', error);
      return null;
    }
  }

  // Einzelne Nachricht cachen (längere TTL für gelesene Nachrichten)
  async cacheMessage(
    email: string, 
    mailbox: string, 
    uid: number, 
    content: object
  ): Promise<void> {
    if (!this.redis || !this.connected) return;

    try {
      const key = this.generateKey('message', email, mailbox, uid.toString());
      const data = JSON.stringify({
        content,
        cachedAt: Date.now(),
      });
      // Längere TTL für einzelne Nachrichten (10 Minuten)
      await this.redis.setex(key, 600, data);
      this.stats.sets++;
    } catch (error) {
      console.error('[CACHE] Error caching message:', error);
    }
  }

  async getMessage(email: string, mailbox: string, uid: number): Promise<object | null> {
    if (!this.redis || !this.connected) return null;

    try {
      const key = this.generateKey('message', email, mailbox, uid.toString());
      const data = await this.redis.get(key);
      
      if (data) {
        this.stats.hits++;
        const parsed = JSON.parse(data);
        return parsed.content;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[CACHE] Error getting message:', error);
      return null;
    }
  }

  // Cache invalidieren nach Aktionen (lesen, löschen, verschieben)
  async invalidateMailbox(email: string, mailbox: string): Promise<void> {
    if (!this.redis || !this.connected) return;

    try {
      const pattern = this.generateKey('messages', email, mailbox, '*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        // Keys ohne Prefix für delete
        const keysWithoutPrefix = keys.map((k: string) => k.replace(this.config.keyPrefix, ''));
        await this.redis.del(...keysWithoutPrefix);
        this.stats.deletes += keys.length;
      }
      
      // Mailbox-Liste auch invalidieren
      const mailboxKey = this.generateKey('mailboxes', email);
      await this.redis.del(mailboxKey.replace(this.config.keyPrefix, ''));
      this.stats.deletes++;
      
      console.log(`[CACHE] Invalidated cache for ${email}/${mailbox}`);
    } catch (error) {
      console.error('[CACHE] Error invalidating cache:', error);
    }
  }

  // Kompletten User-Cache löschen (z.B. bei Logout)
  async invalidateUser(email: string): Promise<void> {
    if (!this.redis || !this.connected) return;

    try {
      const patterns = [
        this.generateKey('mailboxes', email),
        this.generateKey('messages', email, '*'),
        this.generateKey('message', email, '*'),
      ];
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          const keysWithoutPrefix = keys.map((k: string) => k.replace(this.config.keyPrefix, ''));
          await this.redis.del(...keysWithoutPrefix);
          this.stats.deletes += keys.length;
        }
      }
      
      console.log(`[CACHE] Invalidated all cache for ${email}`);
    } catch (error) {
      console.error('[CACHE] Error invalidating user cache:', error);
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      connected: this.connected,
    };
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.connected = false;
      console.log('[CACHE] Redis disconnected');
    }
  }
}

// Singleton Instance
export const cacheService = new CacheService();

// Auto-connect bei Start
cacheService.connect().catch(() => {
  console.warn('[CACHE] Running without Redis cache');
});
