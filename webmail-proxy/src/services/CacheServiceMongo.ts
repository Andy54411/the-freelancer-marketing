/**
 * Taskilo Webmail Proxy - MongoDB Cache Service
 * Ersetzt Redis - Caching direkt in MongoDB mit TTL-Indizes
 */

import { mongoDBService, WebmailCache } from './MongoDBService';
import { Collection, Document } from 'mongodb';

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

class CacheServiceMongo {
  private collection: Collection<WebmailCache> | null = null;
  private connected = false;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  async connect(): Promise<boolean> {
    if (this.connected && this.collection) return true;

    try {
      await mongoDBService.connect();
      this.collection = mongoDBService.getCollection<WebmailCache>('webmail_cache');
      
      // TTL-Index erstellen für automatisches Löschen abgelaufener Einträge
      await this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
      
      // Compound-Index für schnelle Suche
      await this.collection.createIndex(
        { type: 1, email: 1, key: 1 },
        { unique: true }
      );
      
      this.connected = true;
      console.log('[CACHE] MongoDB Cache verbunden');
      return true;
    } catch (error) {
      console.error('[CACHE] MongoDB Cache Verbindungsfehler:', error);
      this.connected = false;
      return false;
    }
  }

  private generateKey(type: string, email: string, ...parts: string[]): string {
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '');
    return [type, sanitizedEmail, ...parts].join(':');
  }

  private getExpiresAt(ttlSeconds: number): Date {
    return new Date(Date.now() + ttlSeconds * 1000);
  }

  // Mailbox-Liste cachen
  async cacheMailboxes(email: string, mailboxes: CachedMailbox[]): Promise<void> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return;
    }

    try {
      const key = this.generateKey('mailboxes', email);
      await this.collection.updateOne(
        { type: 'mailboxes', email, key },
        {
          $set: {
            type: 'mailboxes',
            email,
            key,
            data: { mailboxes, cachedAt: Date.now() },
            expiresAt: this.getExpiresAt(300), // 5 Minuten
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      this.stats.sets++;
    } catch (error) {
      console.error('[CACHE] Fehler beim Cachen der Mailboxen:', error);
    }
  }

  async getMailboxes(email: string): Promise<CachedMailbox[] | null> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return null;
    }

    try {
      const key = this.generateKey('mailboxes', email);
      const cached = await this.collection.findOne({
        type: 'mailboxes',
        email,
        key,
        expiresAt: { $gt: new Date() }
      });
      
      if (cached?.data) {
        this.stats.hits++;
        return (cached.data as { mailboxes: CachedMailbox[] }).mailboxes;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[CACHE] Fehler beim Abrufen der Mailboxen:', error);
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
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return;
    }

    try {
      const key = this.generateKey('messages', email, mailbox, `page-${page}`);
      await this.collection.updateOne(
        { type: 'messages', email, key },
        {
          $set: {
            type: 'messages',
            email,
            key,
            mailbox,
            page,
            data: { messages, cachedAt: Date.now() },
            expiresAt: this.getExpiresAt(60), // 1 Minute (schneller veraltet)
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      this.stats.sets++;
    } catch (error) {
      console.error('[CACHE] Fehler beim Cachen der Nachrichten:', error);
    }
  }

  async getMessages(email: string, mailbox: string, page = 1): Promise<CachedMessage[] | null> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return null;
    }

    try {
      const key = this.generateKey('messages', email, mailbox, `page-${page}`);
      const cached = await this.collection.findOne({
        type: 'messages',
        email,
        key,
        expiresAt: { $gt: new Date() }
      });
      
      if (cached?.data) {
        this.stats.hits++;
        return (cached.data as { messages: CachedMessage[] }).messages;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[CACHE] Fehler beim Abrufen der Nachrichten:', error);
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
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return;
    }

    try {
      const key = this.generateKey('message', email, mailbox, uid.toString());
      await this.collection.updateOne(
        { type: 'message', email, key },
        {
          $set: {
            type: 'message',
            email,
            key,
            mailbox,
            uid,
            data: { content, cachedAt: Date.now() },
            expiresAt: this.getExpiresAt(600), // 10 Minuten
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      this.stats.sets++;
    } catch (error) {
      console.error('[CACHE] Fehler beim Cachen der Nachricht:', error);
    }
  }

  async getMessage(email: string, mailbox: string, uid: number): Promise<object | null> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return null;
    }

    try {
      const key = this.generateKey('message', email, mailbox, uid.toString());
      const cached = await this.collection.findOne({
        type: 'message',
        email,
        key,
        expiresAt: { $gt: new Date() }
      });
      
      if (cached?.data) {
        this.stats.hits++;
        return (cached.data as { content: object }).content;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[CACHE] Fehler beim Abrufen der Nachricht:', error);
      return null;
    }
  }

  // Cache invalidieren nach Aktionen (lesen, löschen, verschieben)
  async invalidateMailbox(email: string, mailbox: string): Promise<void> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return;
    }

    try {
      // Alle Nachrichten für diese Mailbox löschen
      const result = await this.collection.deleteMany({
        email,
        $or: [
          { type: 'messages', mailbox },
          { type: 'message', mailbox },
          { type: 'mailboxes' }
        ]
      });
      
      this.stats.deletes += result.deletedCount;
      console.log(`[CACHE] Cache invalidiert für ${email}/${mailbox}: ${result.deletedCount} Einträge`);
    } catch (error) {
      console.error('[CACHE] Fehler beim Invalidieren des Cache:', error);
    }
  }

  // Kompletten User-Cache löschen (z.B. bei Logout)
  async invalidateUser(email: string): Promise<void> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return;
    }

    try {
      const result = await this.collection.deleteMany({ email });
      this.stats.deletes += result.deletedCount;
      console.log(`[CACHE] Kompletter Cache invalidiert für ${email}: ${result.deletedCount} Einträge`);
    } catch (error) {
      console.error('[CACHE] Fehler beim Invalidieren des User-Cache:', error);
    }
  }

  // Generischer Cache für beliebige Daten
  async set(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return;
    }

    try {
      await this.collection.updateOne(
        { type: 'generic', key },
        {
          $set: {
            type: 'generic',
            email: '',
            key,
            data,
            expiresAt: this.getExpiresAt(ttlSeconds),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      this.stats.sets++;
    } catch (error) {
      console.error('[CACHE] Fehler beim Setzen des Cache:', error);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return null;
    }

    try {
      const cached = await this.collection.findOne({
        type: 'generic',
        key,
        expiresAt: { $gt: new Date() }
      });
      
      if (cached?.data) {
        this.stats.hits++;
        return cached.data as T;
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[CACHE] Fehler beim Abrufen des Cache:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return;
    }

    try {
      await this.collection.deleteOne({ type: 'generic', key });
      this.stats.deletes++;
    } catch (error) {
      console.error('[CACHE] Fehler beim Löschen des Cache:', error);
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      connected: this.connected,
      backend: 'MongoDB'
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('[CACHE] MongoDB Cache getrennt');
  }

  // Cleanup abgelaufener Einträge (optional, MongoDB macht das automatisch via TTL-Index)
  async cleanup(): Promise<number> {
    if (!this.collection || !this.connected) {
      await this.connect();
      if (!this.collection) return 0;
    }

    try {
      const result = await this.collection.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      return result.deletedCount;
    } catch (error) {
      console.error('[CACHE] Fehler beim Cleanup:', error);
      return 0;
    }
  }
}

// Singleton Instance
export const cacheService = new CacheServiceMongo();

// Auto-connect bei Start
cacheService.connect().catch(() => {
  console.warn('[CACHE] MongoDB Cache nicht verfügbar');
});
