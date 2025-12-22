/**
 * Taskilo Webmail Proxy - Search Service
 * Volltextsuche über E-Mails mit IMAP SEARCH und lokalem Index
 */

import { imapPool } from './ConnectionPool';
import { cacheService } from './CacheService';

interface SearchQuery {
  text?: string;         // Volltext-Suche
  from?: string;         // Absender
  to?: string;           // Empfänger
  subject?: string;      // Betreff
  body?: string;         // Nur Inhalt
  since?: Date;          // Nach Datum
  before?: Date;         // Vor Datum
  hasAttachment?: boolean;
  unread?: boolean;
  flagged?: boolean;
}

interface SearchResult {
  uid: number;
  messageId: string;
  subject: string;
  from: { name?: string; address: string }[];
  to: { name?: string; address: string }[];
  date: Date;
  preview: string;
  matchScore: number;
  matchedFields: string[];
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  total: number;
  searchTime: number;
  cached: boolean;
  error?: string;
}

class SearchService {
  private stats = {
    totalSearches: 0,
    cachedSearches: 0,
    averageTime: 0,
  };

  // Hauptsuchmethode
  async search(
    email: string,
    password: string,
    mailbox: string,
    query: SearchQuery,
    limit = 50,
    offset = 0
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    this.stats.totalSearches++;

    // Cache-Key basierend auf Query
    const cacheKey = this.generateCacheKey(email, mailbox, query);
    
    // Versuche Cache
    const cachedResults = await this.getCachedSearch(cacheKey);
    if (cachedResults) {
      this.stats.cachedSearches++;
      return {
        success: true,
        results: cachedResults.slice(offset, offset + limit),
        total: cachedResults.length,
        searchTime: Date.now() - startTime,
        cached: true,
      };
    }

    const client = await imapPool.acquire(email, password);

    try {
      await client.mailboxOpen(mailbox);

      // IMAP SEARCH Kriterien aufbauen
      const searchCriteria = this.buildSearchCriteria(query);
      
      // IMAP SEARCH ausführen
      const uids = await client.search(searchCriteria, { uid: true });

      if (!uids || uids.length === 0) {
        return {
          success: true,
          results: [],
          total: 0,
          searchTime: Date.now() - startTime,
          cached: false,
        };
      }

      // Messages fetchen (mit Limit für Performance)
      const fetchUids = uids.slice(0, 200); // Max 200 für Performance
      const results: SearchResult[] = [];

      for await (const message of client.fetch(fetchUids, {
        envelope: true,
        flags: true,
        bodyStructure: true,
        uid: true,
      })) {
        const result = this.mapMessageToResult(message, query);
        if (result) {
          results.push(result);
        }
      }

      // Nach Relevanz sortieren
      results.sort((a, b) => b.matchScore - a.matchScore);

      // Cachen
      await this.cacheSearch(cacheKey, results);

      const searchTime = Date.now() - startTime;
      this.updateAverageTime(searchTime);

      return {
        success: true,
        results: results.slice(offset, offset + limit),
        total: results.length,
        searchTime,
        cached: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      return {
        success: false,
        results: [],
        total: 0,
        searchTime: Date.now() - startTime,
        cached: false,
        error: errorMessage,
      };
    } finally {
      imapPool.release(email);
    }
  }

  // IMAP SEARCH Kriterien bauen
  private buildSearchCriteria(query: SearchQuery): object {
    const criteria: object[] = [];

    if (query.text) {
      // TEXT sucht in Header UND Body
      criteria.push({ text: query.text });
    }

    if (query.from) {
      criteria.push({ from: query.from });
    }

    if (query.to) {
      criteria.push({ to: query.to });
    }

    if (query.subject) {
      criteria.push({ subject: query.subject });
    }

    if (query.body) {
      criteria.push({ body: query.body });
    }

    if (query.since) {
      criteria.push({ since: query.since });
    }

    if (query.before) {
      criteria.push({ before: query.before });
    }

    if (query.unread === true) {
      criteria.push({ unseen: true });
    } else if (query.unread === false) {
      criteria.push({ seen: true });
    }

    if (query.flagged === true) {
      criteria.push({ flagged: true });
    }

    // Wenn keine Kriterien, alle zurückgeben
    if (criteria.length === 0) {
      return { all: true };
    }

    // Mehrere Kriterien mit AND verknüpfen
    if (criteria.length === 1) {
      return criteria[0];
    }

    return { and: criteria };
  }

  // Message zu SearchResult mappen
  private mapMessageToResult(
    message: {
      uid?: number;
      envelope?: {
        messageId?: string;
        subject?: string;
        from?: Array<{ name?: string; address?: string }>;
        to?: Array<{ name?: string; address?: string }>;
        date?: Date;
      };
      flags?: Set<string>;
      bodyStructure?: unknown;
    },
    query: SearchQuery
  ): SearchResult | null {
    if (!message.envelope) return null;

    const matchedFields: string[] = [];
    let matchScore = 0;

    // Match-Score berechnen
    const envelope = message.envelope;
    
    if (query.text) {
      const searchTerm = query.text.toLowerCase();
      if (envelope.subject?.toLowerCase().includes(searchTerm)) {
        matchedFields.push('subject');
        matchScore += 10;
      }
      const fromMatch = envelope.from?.some(f => 
        f.name?.toLowerCase().includes(searchTerm) ||
        f.address?.toLowerCase().includes(searchTerm)
      );
      if (fromMatch) {
        matchedFields.push('from');
        matchScore += 5;
      }
    }

    if (query.from && envelope.from?.some(f => 
      f.address?.toLowerCase().includes(query.from!.toLowerCase())
    )) {
      matchedFields.push('from');
      matchScore += 8;
    }

    if (query.subject && envelope.subject?.toLowerCase().includes(query.subject.toLowerCase())) {
      matchedFields.push('subject');
      matchScore += 8;
    }

    // Aktualität bonus
    if (envelope.date) {
      const age = Date.now() - new Date(envelope.date).getTime();
      const daysOld = age / (1000 * 60 * 60 * 24);
      if (daysOld < 1) matchScore += 5;
      else if (daysOld < 7) matchScore += 3;
      else if (daysOld < 30) matchScore += 1;
    }

    return {
      uid: message.uid || 0,
      messageId: envelope.messageId || '',
      subject: envelope.subject || '(Kein Betreff)',
      from: (envelope.from || []).map(f => ({
        name: f.name,
        address: f.address || '',
      })),
      to: (envelope.to || []).map(t => ({
        name: t.name,
        address: t.address || '',
      })),
      date: envelope.date || new Date(),
      preview: '', // Wird separat geladen wenn nötig
      matchScore,
      matchedFields,
    };
  }

  // Schnellsuche nur nach Betreff
  async quickSearch(
    email: string,
    password: string,
    mailbox: string,
    term: string,
    limit = 20
  ): Promise<SearchResponse> {
    return this.search(
      email,
      password,
      mailbox,
      { text: term },
      limit,
      0
    );
  }

  // Suche in allen Ordnern
  async searchAll(
    email: string,
    password: string,
    query: SearchQuery,
    limit = 50
  ): Promise<{ mailbox: string; results: SearchResult[] }[]> {
    const client = await imapPool.acquire(email, password);
    const allResults: { mailbox: string; results: SearchResult[] }[] = [];

    try {
      const mailboxes = await client.list();
      
      for (const mb of mailboxes) {
        // Skip spezielle Ordner
        if (mb.flags?.has('\\Noselect')) continue;

        const response = await this.search(
          email,
          password,
          mb.path,
          query,
          limit / mailboxes.length,
          0
        );

        if (response.results.length > 0) {
          allResults.push({
            mailbox: mb.path,
            results: response.results,
          });
        }
      }

      return allResults;
    } finally {
      imapPool.release(email);
    }
  }

  // Cache-Methoden
  private generateCacheKey(email: string, mailbox: string, query: SearchQuery): string {
    const queryHash = JSON.stringify(query);
    return `search:${email}:${mailbox}:${Buffer.from(queryHash).toString('base64').substring(0, 32)}`;
  }

  private async getCachedSearch(key: string): Promise<SearchResult[] | null> {
    // Nutze CacheService
    const cached = await cacheService.getMessage('search', 'cache', parseInt(key.split(':').pop() || '0'));
    return cached as SearchResult[] | null;
  }

  private async cacheSearch(key: string, results: SearchResult[]): Promise<void> {
    await cacheService.cacheMessage('search', 'cache', parseInt(key.split(':').pop() || '0'), results);
  }

  private updateAverageTime(time: number): void {
    const totalSearches = this.stats.totalSearches;
    this.stats.averageTime = 
      (this.stats.averageTime * (totalSearches - 1) + time) / totalSearches;
  }

  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalSearches > 0
        ? ((this.stats.cachedSearches / this.stats.totalSearches) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

// Singleton
export const searchService = new SearchService();
