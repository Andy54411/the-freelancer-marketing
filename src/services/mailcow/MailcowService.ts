/**
 * Mailcow API Service
 * Manages mailboxes, aliases, and domains via Mailcow REST API
 * 
 * API Docs: https://mailcow.github.io/mailcow-dockerized-docs/api/
 */

import { z } from 'zod';

// Validation schemas
export const CreateMailboxSchema = z.object({
  localPart: z.string()
    .min(3, 'Mindestens 3 Zeichen')
    .max(64, 'Maximal 64 Zeichen')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Nur Buchstaben, Zahlen, Punkte, Bindestriche und Unterstriche'),
  domain: z.string().default('taskilo.de'),
  password: z.string().min(8, 'Mindestens 8 Zeichen'),
  displayName: z.string().min(1, 'Name erforderlich'),
  quota: z.number().default(1024), // MB
});

export const MailboxInfoSchema = z.object({
  username: z.string(),
  domain: z.string(),
  name: z.string(),
  quota: z.number(),
  quotaUsed: z.number(),
  active: z.boolean(),
  createdAt: z.string(),
});

export type CreateMailboxInput = z.infer<typeof CreateMailboxSchema>;
export type MailboxInfo = z.infer<typeof MailboxInfoSchema>;

// Environment config
const MAILCOW_API_URL = process.env.MAILCOW_API_URL || 'https://mail.taskilo.de/api/v1';
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY || '';

interface MailcowApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export class MailcowService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = MAILCOW_API_URL;
    this.apiKey = MAILCOW_API_KEY;
    
    if (!this.apiKey) {
      console.warn('[MailcowService] No API key configured. Set MAILCOW_API_KEY environment variable.');
    }
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<MailcowApiResponse<T>> {
    if (!this.apiKey) {
      return { success: false, error: 'Mailcow API key not configured' };
    }

    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.msg || data.error || `HTTP ${response.status}`,
          details: JSON.stringify(data),
        };
      }

      // Mailcow returns array with success message or error
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        if (result.type === 'success') {
          return { success: true, data: result as T };
        } else if (result.type === 'danger' || result.type === 'error') {
          return { success: false, error: result.msg || 'Unknown error' };
        }
      }

      return { success: true, data: data as T };
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if a mailbox address is available
   */
  async checkAvailability(localPart: string, domain: string = 'taskilo.de'): Promise<boolean> {
    const email = `${localPart}@${domain}`;
    const result = await this.request<{ username: string }[]>(`/get/mailbox/${email}`);
    
    // If we get an empty array or error, the address is available
    if (!result.success || !result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return true;
    }
    
    return false;
  }

  /**
   * Create a new mailbox
   */
  async createMailbox(input: CreateMailboxInput): Promise<MailcowApiResponse<{ email: string }>> {
    // Validate input
    const validation = CreateMailboxSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map(e => e.message).join(', '),
      };
    }

    const { localPart, domain, password, displayName, quota } = validation.data;
    const email = `${localPart}@${domain}`;

    // Check availability first
    const isAvailable = await this.checkAvailability(localPart, domain);
    if (!isAvailable) {
      return {
        success: false,
        error: 'Diese E-Mail-Adresse ist bereits vergeben',
      };
    }

    // Create mailbox via Mailcow API
    const result = await this.request('/add/mailbox', 'POST', {
      local_part: localPart,
      domain: domain,
      name: displayName,
      password: password,
      password2: password,
      quota: quota, // in MB
      active: 1,
      force_pw_update: 0,
      tls_enforce_in: 1,
      tls_enforce_out: 1,
    });

    if (result.success) {
      return {
        success: true,
        data: { email },
      };
    }

    return result as MailcowApiResponse<{ email: string }>;
  }

  /**
   * Get mailbox information
   */
  async getMailbox(email: string): Promise<MailcowApiResponse<MailboxInfo>> {
    const result = await this.request<Record<string, unknown>>(`/get/mailbox/${email}`);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Mailbox not found' };
    }

    const data = result.data;
    
    return {
      success: true,
      data: {
        username: String(data.username || email),
        domain: String(data.domain || email.split('@')[1]),
        name: String(data.name || ''),
        quota: Number(data.quota) || 0,
        quotaUsed: Number(data.quota_used) || 0,
        active: Boolean(data.active),
        createdAt: String(data.created || new Date().toISOString()),
      },
    };
  }

  /**
   * Update mailbox password
   */
  async updatePassword(email: string, newPassword: string): Promise<MailcowApiResponse> {
    if (newPassword.length < 8) {
      return { success: false, error: 'Passwort muss mindestens 8 Zeichen haben' };
    }

    return this.request('/edit/mailbox', 'POST', {
      items: [email],
      attr: {
        password: newPassword,
        password2: newPassword,
      },
    });
  }

  /**
   * Update mailbox quota
   */
  async updateQuota(email: string, quotaMB: number): Promise<MailcowApiResponse> {
    return this.request('/edit/mailbox', 'POST', {
      items: [email],
      attr: {
        quota: quotaMB,
      },
    });
  }

  /**
   * Enable/disable mailbox
   */
  async setActive(email: string, active: boolean): Promise<MailcowApiResponse> {
    return this.request('/edit/mailbox', 'POST', {
      items: [email],
      attr: {
        active: active ? 1 : 0,
      },
    });
  }

  /**
   * Delete mailbox
   */
  async deleteMailbox(email: string): Promise<MailcowApiResponse> {
    return this.request('/delete/mailbox', 'POST', {
      items: [email],
    });
  }

  /**
   * List all mailboxes for a domain
   */
  async listMailboxes(domain: string = 'taskilo.de'): Promise<MailcowApiResponse<MailboxInfo[]>> {
    const result = await this.request<Record<string, unknown>[]>(`/get/mailbox/all/${domain}`);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to list mailboxes' };
    }

    const mailboxes: MailboxInfo[] = (result.data as Record<string, unknown>[]).map((mb) => ({
      username: String(mb.username || ''),
      domain: String(mb.domain || domain),
      name: String(mb.name || ''),
      quota: Number(mb.quota) || 0,
      quotaUsed: Number(mb.quota_used) || 0,
      active: Boolean(mb.active),
      createdAt: String(mb.created || new Date().toISOString()),
    }));

    return { success: true, data: mailboxes };
  }

  /**
   * Create email alias
   */
  async createAlias(
    aliasAddress: string,
    targetAddress: string
  ): Promise<MailcowApiResponse> {
    return this.request('/add/alias', 'POST', {
      address: aliasAddress,
      goto: targetAddress,
      active: 1,
    });
  }

  /**
   * Delete email alias
   */
  async deleteAlias(aliasId: number): Promise<MailcowApiResponse> {
    return this.request('/delete/alias', 'POST', {
      items: [aliasId],
    });
  }

  /**
   * Get domain quota usage
   */
  async getDomainQuota(domain: string = 'taskilo.de'): Promise<MailcowApiResponse<{ used: number; total: number }>> {
    const result = await this.request<Record<string, unknown>>(`/get/domain/${domain}`);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Domain not found' };
    }

    const data = result.data;
    return {
      success: true,
      data: {
        used: Number(data.bytes_total) || 0,
        total: Number(data.quota) || 0,
      },
    };
  }

  // ============================================
  // DOMAIN MANAGEMENT METHODS
  // ============================================

  /**
   * Add a new domain to Mailcow
   * Required for custom customer domains (e.g., @company.de)
   */
  async addDomain(domain: string, options?: {
    description?: string;
    aliases?: number;
    mailboxes?: number;
    quotaMB?: number;
    backupmx?: boolean;
    relayHost?: string;
  }): Promise<MailcowApiResponse<{ domain: string }>> {
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return { success: false, error: 'Ungültiges Domain-Format' };
    }

    const result = await this.request('/add/domain', 'POST', {
      domain: domain.toLowerCase(),
      description: options?.description || `Kunden-Domain: ${domain}`,
      aliases: options?.aliases || 100,
      mailboxes: options?.mailboxes || 50,
      maxquota: options?.quotaMB || 10240, // 10 GB default
      quota: options?.quotaMB || 10240,
      active: 1,
      restart_sogo: 1,
      backupmx: options?.backupmx ? 1 : 0,
      relay_host: options?.relayHost || '',
      relay_all_recipients: 0,
      gal: 1, // Global Address List
    });

    if (result.success) {
      return {
        success: true,
        data: { domain: domain.toLowerCase() },
      };
    }

    return result as MailcowApiResponse<{ domain: string }>;
  }

  /**
   * Get domain information
   */
  async getDomain(domain: string): Promise<MailcowApiResponse<{
    domain: string;
    active: boolean;
    mailboxCount: number;
    aliasCount: number;
    quotaUsed: number;
    quotaTotal: number;
    createdAt: string;
  }>> {
    const result = await this.request<Record<string, unknown>>(`/get/domain/${domain}`);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Domain nicht gefunden' };
    }

    const data = result.data;
    return {
      success: true,
      data: {
        domain: String(data.domain_name || domain),
        active: Boolean(data.active),
        mailboxCount: Number(data.mboxes_in_domain) || 0,
        aliasCount: Number(data.aliases_in_domain) || 0,
        quotaUsed: Number(data.bytes_total) || 0,
        quotaTotal: Number(data.quota) || 0,
        createdAt: String(data.created || new Date().toISOString()),
      },
    };
  }

  /**
   * Delete a domain from Mailcow
   * WARNING: This will delete all mailboxes and aliases on this domain!
   */
  async deleteDomain(domain: string): Promise<MailcowApiResponse> {
    // First check if domain exists
    const domainInfo = await this.getDomain(domain);
    if (!domainInfo.success) {
      return { success: false, error: 'Domain nicht gefunden' };
    }

    // Check if domain has mailboxes
    if (domainInfo.data && domainInfo.data.mailboxCount > 0) {
      return {
        success: false,
        error: `Domain hat noch ${domainInfo.data.mailboxCount} Postfächer. Bitte zuerst alle Postfächer löschen.`,
      };
    }

    return this.request('/delete/domain', 'POST', {
      items: [domain],
    });
  }

  /**
   * Get DKIM key for a domain
   * Returns the public DKIM key that needs to be added to DNS
   */
  async getDKIMKey(domain: string): Promise<MailcowApiResponse<{
    selector: string;
    publicKey: string;
    dnsRecord: string;
  }>> {
    const result = await this.request<Record<string, unknown>>(`/get/dkim/${domain}`);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'DKIM nicht gefunden' };
    }

    const data = result.data;
    const selector = String(data.dkim_selector || 'dkim');
    const publicKey = String(data.pubkey || '');

    // Format DNS record value
    const dnsRecord = `v=DKIM1; k=rsa; p=${publicKey}`;

    return {
      success: true,
      data: {
        selector,
        publicKey,
        dnsRecord,
      },
    };
  }

  /**
   * Generate new DKIM key for a domain
   */
  async generateDKIM(domain: string, keySize: 1024 | 2048 = 2048): Promise<MailcowApiResponse> {
    return this.request('/add/dkim', 'POST', {
      domains: domain,
      dkim_selector: 'dkim',
      key_size: keySize,
    });
  }

  /**
   * Update domain settings
   */
  async updateDomain(domain: string, settings: {
    active?: boolean;
    description?: string;
    aliases?: number;
    mailboxes?: number;
    quotaMB?: number;
  }): Promise<MailcowApiResponse> {
    const attr: Record<string, unknown> = {};
    
    if (settings.active !== undefined) attr.active = settings.active ? 1 : 0;
    if (settings.description !== undefined) attr.description = settings.description;
    if (settings.aliases !== undefined) attr.aliases = settings.aliases;
    if (settings.mailboxes !== undefined) attr.mailboxes = settings.mailboxes;
    if (settings.quotaMB !== undefined) {
      attr.maxquota = settings.quotaMB;
      attr.quota = settings.quotaMB;
    }

    return this.request('/edit/domain', 'POST', {
      items: [domain],
      attr,
    });
  }

  /**
   * List all domains in Mailcow
   */
  async listDomains(): Promise<MailcowApiResponse<Array<{
    domain: string;
    active: boolean;
    mailboxCount: number;
    aliasCount: number;
  }>>> {
    const result = await this.request<Array<Record<string, unknown>>>('/get/domain/all');
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Domains konnten nicht abgerufen werden' };
    }

    const domains = result.data.map((d) => ({
      domain: String(d.domain_name || ''),
      active: Boolean(d.active),
      mailboxCount: Number(d.mboxes_in_domain) || 0,
      aliasCount: Number(d.aliases_in_domain) || 0,
    }));

    return { success: true, data: domains };
  }
}

// Singleton instance
export const mailcowService = new MailcowService();
