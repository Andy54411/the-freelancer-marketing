/**
 * INWX Domain Registrar API Service
 * 
 * API Documentation: https://www.inwx.de/de/offer/api
 * Uses JSON-RPC protocol
 */

import { z } from 'zod';
import type { 
  DomainContact, 
  DomainRegisterRequest, 
  DomainRegisterResult,
  INWXDomainInfo,
  INWXContactInfo 
} from './types';

// Validation schemas
const DomainCheckRequestSchema = z.object({
  domain: z.string().min(1),
});

interface INWXConfig {
  username: string;
  password: string;
  apiUrl: string;
}

interface DomainCheckResult {
  domain: string;
  tld: string;
  available: boolean;
  status: string;
  price?: number;
  currency?: string;
}

interface INWXResponse {
  code: number;
  msg: string;
  resData?: Record<string, unknown>;
}

// TLD pricing in EUR (yearly) - INWX Reseller prices
const TLD_PRICES: Record<string, number> = {
  'de': 4.65,
  'com': 10.69,
  'net': 12.59,
  'org': 11.89,
  'eu': 7.42,
  'info': 14.99,
  'biz': 16.79,
  'online': 29.99,
  'shop': 34.99,
  'io': 44.99,
  'co': 26.99,
  'me': 18.99,
  'at': 11.89,
  'ch': 11.89,
  'uk': 8.99,
  'fr': 9.99,
  'es': 9.99,
  'it': 9.99,
  'nl': 8.99,
  'pl': 11.99,
};

// Markup for reselling (percentage)
const MARKUP_PERCENTAGE = 30;

export class INWXService {
  private config: INWXConfig;

  constructor() {
    this.config = {
      username: process.env.INWX_USERNAME || '',
      password: process.env.INWX_PASSWORD || '',
      apiUrl: process.env.INWX_API_URL || 'https://api.domrobot.com/jsonrpc/',
    };
  }

  /**
   * Build JSON-RPC request
   */
  private buildRequest(method: string, params: Record<string, unknown> = {}): string {
    return JSON.stringify({
      method,
      params: {
        user: this.config.username,
        pass: this.config.password,
        ...params,
      },
    });
  }

  /**
   * Execute API call
   */
  private async execute(method: string, params: Record<string, unknown> = {}): Promise<INWXResponse> {
    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: this.buildRequest(method, params),
    });

    if (!response.ok) {
      throw new Error(`INWX API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as INWXResponse;
  }

  /**
   * Check domain availability for multiple TLDs
   */
  async checkDomain(domainName: string, tlds?: string[]): Promise<DomainCheckResult[]> {
    // Validate input
    DomainCheckRequestSchema.parse({ domain: domainName });

    // Clean domain name (remove any TLD if present)
    const cleanName = domainName.replace(/\.[a-z]+$/i, '').toLowerCase().trim();
    
    // Default TLDs to check
    const tldsToCheck = tlds || ['de', 'com', 'net', 'eu', 'io', 'org'];
    
    // Build domains array
    const domains = tldsToCheck.map(tld => `${cleanName}.${tld}`);

    try {
      const response = await this.execute('domain.check', {
        domain: domains,
      });

      if (response.code !== 1000) {
        throw new Error(`INWX API error: ${response.msg}`);
      }

      const results: DomainCheckResult[] = [];
      const resData = response.resData as { domain?: Array<{ domain: string; avail: number; status: string }> };

      if (resData?.domain) {
        for (const item of resData.domain) {
          const tld = item.domain.split('.').pop() || '';
          const basePrice = TLD_PRICES[tld] || 14.99;
          const sellingPrice = basePrice * (1 + MARKUP_PERCENTAGE / 100);

          results.push({
            domain: item.domain,
            tld: `.${tld}`,
            available: item.avail === 1,
            status: item.status,
            price: Math.round(sellingPrice * 100) / 100,
            currency: 'EUR',
          });
        }
      }

      // Sort: available first, then by TLD popularity
      const tldOrder = ['de', 'com', 'eu', 'net', 'io', 'org'];
      results.sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        const aOrder = tldOrder.indexOf(a.tld.slice(1));
        const bOrder = tldOrder.indexOf(b.tld.slice(1));
        return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
      });

      return results;
    } catch (error) {
      // If API fails, return mock results with "unknown" status
      // This allows the UI to still function during development
      if (process.env.NODE_ENV === 'development' && !this.config.username) {
        return tldsToCheck.map(tld => ({
          domain: `${cleanName}.${tld}`,
          tld: `.${tld}`,
          available: Math.random() > 0.3, // Random for demo
          status: 'demo',
          price: TLD_PRICES[tld] || 14.99,
          currency: 'EUR',
        }));
      }
      throw error;
    }
  }

  /**
   * Get domain price for a specific TLD
   */
  getDomainPrice(tld: string): { yearly: number; monthly: number } {
    const cleanTld = tld.replace(/^\./, '');
    const basePrice = TLD_PRICES[cleanTld] || 14.99;
    const sellingPrice = basePrice * (1 + MARKUP_PERCENTAGE / 100);
    
    return {
      yearly: Math.round(sellingPrice * 100) / 100,
      monthly: Math.round((sellingPrice / 12) * 100) / 100,
    };
  }

  /**
   * Get all available TLDs with prices
   */
  getAllTLDPrices(): Array<{ tld: string; yearly: number; monthly: number }> {
    return Object.entries(TLD_PRICES).map(([tld, basePrice]) => {
      const sellingPrice = basePrice * (1 + MARKUP_PERCENTAGE / 100);
      return {
        tld: `.${tld}`,
        yearly: Math.round(sellingPrice * 100) / 100,
        monthly: Math.round((sellingPrice / 12) * 100) / 100,
      };
    });
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.username && this.config.password);
  }

  /**
   * Create contact for domain registration (INWX contact.create)
   */
  async createContact(contact: DomainContact): Promise<number> {
    const response = await this.execute('contact.create', {
      type: contact.type,
      name: `${contact.firstname} ${contact.lastname}`,
      org: contact.organization,
      street: contact.street,
      city: contact.city,
      pc: contact.postalCode,
      cc: contact.countryCode,
      voice: contact.phone,
      email: contact.email,
    });

    if (response.code !== 1000) {
      throw new Error(`Kontakt konnte nicht erstellt werden: ${response.msg}`);
    }

    const resData = response.resData as { id?: number };
    if (!resData?.id) {
      throw new Error('Keine Kontakt-ID in der Antwort');
    }

    return resData.id;
  }

  /**
   * Register a domain (INWX domain.create)
   */
  async registerDomain(request: DomainRegisterRequest): Promise<DomainRegisterResult> {
    // Erst Kontakt erstellen
    let contactId: number;
    try {
      contactId = await this.createContact(request.contact);
    } catch (error) {
      return {
        success: false,
        domain: request.domain,
        status: 'contact_error',
        error: error instanceof Error ? error.message : 'Kontakt konnte nicht erstellt werden',
      };
    }

    // Default Nameserver (INWX)
    const nameservers = request.nameservers || [
      'ns.inwx.de',
      'ns2.inwx.de',
      'ns3.inwx.eu',
    ];

    try {
      const response = await this.execute('domain.create', {
        domain: request.domain,
        period: `${request.period}Y`,
        registrant: contactId,
        admin: contactId,
        tech: contactId,
        billing: contactId,
        ns: nameservers,
        renewalMode: request.autoRenew ? 'AUTORENEW' : 'AUTOEXPIRE',
      });

      if (response.code !== 1000 && response.code !== 1001) {
        return {
          success: false,
          domain: request.domain,
          status: 'registration_failed',
          error: response.msg,
        };
      }

      const resData = response.resData as { 
        domain?: string; 
        orderId?: string;
        exDate?: string;
      };

      return {
        success: true,
        domain: request.domain,
        orderId: resData?.orderId,
        expirationDate: resData?.exDate,
        status: 'registered',
      };
    } catch (error) {
      return {
        success: false,
        domain: request.domain,
        status: 'api_error',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Get domain info (INWX domain.info)
   */
  async getDomainInfo(domain: string): Promise<INWXDomainInfo | null> {
    try {
      const response = await this.execute('domain.info', { domain });

      if (response.code !== 1000) {
        return null;
      }

      const resData = response.resData as {
        domain?: string;
        status?: string;
        exDate?: string;
        registrant?: number;
        renewalMode?: string;
        ns?: string[];
      };

      return {
        domain: resData?.domain || domain,
        status: resData?.status || 'unknown',
        expirationDate: resData?.exDate || '',
        registrant: String(resData?.registrant || ''),
        autoRenew: resData?.renewalMode === 'AUTORENEW',
        nameservers: resData?.ns || [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get contact info (INWX contact.info)
   */
  async getContactInfo(contactId: number): Promise<INWXContactInfo | null> {
    try {
      const response = await this.execute('contact.info', { id: contactId });

      if (response.code !== 1000) {
        return null;
      }

      const resData = response.resData as {
        id?: number;
        type?: string;
        name?: string;
        org?: string;
        street?: string;
        city?: string;
        pc?: string;
        cc?: string;
        voice?: string;
        email?: string;
      };

      return {
        id: resData?.id || contactId,
        type: resData?.type || 'person',
        name: resData?.name || '',
        organization: resData?.org,
        street: resData?.street || '',
        city: resData?.city || '',
        postalCode: resData?.pc || '',
        countryCode: resData?.cc || 'DE',
        phone: resData?.voice || '',
        email: resData?.email || '',
      };
    } catch {
      return null;
    }
  }

  /**
   * Get account balance (INWX account.info)
   */
  async getAccountBalance(): Promise<{ balance: number; currency: string }> {
    const response = await this.execute('account.info', {});

    if (response.code !== 1000) {
      throw new Error(`Kontoinfo konnte nicht abgerufen werden: ${response.msg}`);
    }

    const resData = response.resData as { 
      balance?: number; 
      currency?: string;
    };

    return {
      balance: resData?.balance || 0,
      currency: resData?.currency || 'EUR',
    };
  }

  /**
   * List all registered domains (INWX domain.list)
   */
  async listDomains(): Promise<Array<{ domain: string; expirationDate: string; status: string }>> {
    const response = await this.execute('domain.list', {});

    if (response.code !== 1000) {
      throw new Error(`Domainliste konnte nicht abgerufen werden: ${response.msg}`);
    }

    const resData = response.resData as {
      domain?: Array<{
        domain: string;
        exDate: string;
        status: string;
      }>;
    };

    return (resData?.domain || []).map(d => ({
      domain: d.domain,
      expirationDate: d.exDate,
      status: d.status,
    }));
  }
}

// Singleton instance
let inwxServiceInstance: INWXService | null = null;

export function getINWXService(): INWXService {
  if (!inwxServiceInstance) {
    inwxServiceInstance = new INWXService();
  }
  return inwxServiceInstance;
}
