/**
 * NewsletterService - Newsletter-System auf Hetzner SQLite
 * 
 * Vollständiges E-Mail-Marketing-System:
 * - Subscriber-Verwaltung mit Double-Opt-In
 * - Kampagnen-Management
 * - Templates
 * - Analytics/Tracking
 * - DSGVO-konform
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

// Pfade
const DATA_DIR = process.env.DRIVE_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
const DB_PATH = path.join(DATA_DIR, 'newsletter.db');

// SMTP Konfiguration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'mail.taskilo.de',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'support@taskilo.de',
    pass: process.env.SMTP_PASS || '',
  },
};

// Interfaces
export interface NewsletterSubscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'pending' | 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  source: 'website' | 'import' | 'api' | 'manual' | 'footer';
  tags: string[];
  confirmationToken: string | null;
  unsubscribeToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  consentGiven: boolean;
  consentTimestamp: number;
  confirmedAt: number | null;
  unsubscribedAt: number | null;
  unsubscribeReason: string | null;
  emailsSent: number;
  emailsOpened: number;
  linksClicked: number;
  lastOpenedAt: number | null;
  lastClickedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewsletterCampaign {
  id: string;
  name: string;
  subject: string;
  previewText: string | null;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  htmlContent: string;
  textContent: string | null;
  templateId: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  recipientType: 'all' | 'segment' | 'tags';
  recipientTags: string[];
  scheduledAt: number | null;
  sentAt: number | null;
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewsletterTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  htmlContent: string;
  textContent: string | null;
  thumbnail: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NewsletterSettings {
  id: string;
  defaultFromName: string;
  defaultFromEmail: string;
  defaultReplyTo: string | null;
  doubleOptIn: boolean;
  welcomeEmailEnabled: boolean;
  welcomeEmailTemplateId: string | null;
  unsubscribePageUrl: string | null;
  footerText: string | null;
  companyName: string | null;
  companyAddress: string | null;
  createdAt: number;
  updatedAt: number;
}

class NewsletterService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Verzeichnis erstellen
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Datenbank initialisieren
    this.db = new Database(DB_PATH);
    this.initDatabase();
    this.initTransporter();
  }

  private initDatabase(): void {
    // Subscribers Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        status TEXT DEFAULT 'pending',
        source TEXT DEFAULT 'website',
        tags TEXT DEFAULT '[]',
        confirmation_token TEXT,
        unsubscribe_token TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        consent_given INTEGER DEFAULT 0,
        consent_timestamp INTEGER,
        confirmed_at INTEGER,
        unsubscribed_at INTEGER,
        unsubscribe_reason TEXT,
        emails_sent INTEGER DEFAULT 0,
        emails_opened INTEGER DEFAULT 0,
        links_clicked INTEGER DEFAULT 0,
        last_opened_at INTEGER,
        last_clicked_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_subscribers_email ON newsletter_subscribers(email);
      CREATE INDEX IF NOT EXISTS idx_subscribers_status ON newsletter_subscribers(status);
    `);

    // Campaigns Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS newsletter_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        preview_text TEXT,
        from_name TEXT NOT NULL,
        from_email TEXT NOT NULL,
        reply_to TEXT,
        html_content TEXT NOT NULL,
        text_content TEXT,
        template_id TEXT,
        status TEXT DEFAULT 'draft',
        recipient_type TEXT DEFAULT 'all',
        recipient_tags TEXT DEFAULT '[]',
        scheduled_at INTEGER,
        sent_at INTEGER,
        total_recipients INTEGER DEFAULT 0,
        sent INTEGER DEFAULT 0,
        delivered INTEGER DEFAULT 0,
        opened INTEGER DEFAULT 0,
        clicked INTEGER DEFAULT 0,
        bounced INTEGER DEFAULT 0,
        unsubscribed INTEGER DEFAULT 0,
        complained INTEGER DEFAULT 0,
        created_by TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_campaigns_status ON newsletter_campaigns(status);
    `);

    // Templates Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS newsletter_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        html_content TEXT NOT NULL,
        text_content TEXT,
        thumbnail TEXT,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Settings Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS newsletter_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        default_from_name TEXT DEFAULT 'Taskilo Newsletter',
        default_from_email TEXT DEFAULT 'newsletter@taskilo.de',
        default_reply_to TEXT,
        double_opt_in INTEGER DEFAULT 1,
        welcome_email_enabled INTEGER DEFAULT 1,
        welcome_email_template_id TEXT,
        unsubscribe_page_url TEXT,
        footer_text TEXT,
        company_name TEXT DEFAULT 'Taskilo GmbH',
        company_address TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Tracking Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS newsletter_tracking (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        subscriber_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        link_url TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES newsletter_campaigns(id),
        FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_tracking_campaign ON newsletter_tracking(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_tracking_subscriber ON newsletter_tracking(subscriber_id);
    `);

    // Default Settings einfügen
    const existingSettings = this.db.prepare('SELECT id FROM newsletter_settings WHERE id = ?').get('default');
    if (!existingSettings) {
      const now = Date.now();
      this.db.prepare(`
        INSERT INTO newsletter_settings (id, created_at, updated_at)
        VALUES (?, ?, ?)
      `).run('default', now, now);
    }

    console.log('[NewsletterService] SQLite Datenbank initialisiert:', DB_PATH);
  }

  private initTransporter(): void {
    if (SMTP_CONFIG.auth.pass) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.secure,
        auth: SMTP_CONFIG.auth,
      });
      console.log('[NewsletterService] SMTP Transporter initialisiert');
    } else {
      console.warn('[NewsletterService] SMTP_PASS nicht gesetzt - E-Mail-Versand deaktiviert');
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ============================================================================
  // SUBSCRIBER MANAGEMENT
  // ============================================================================

  async addSubscriber(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    source?: 'website' | 'import' | 'api' | 'manual' | 'footer';
    tags?: string[];
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; subscriberId?: string; requiresConfirmation?: boolean; error?: string }> {
    try {
      const email = data.email.toLowerCase().trim();
      
      // Prüfen ob bereits existiert
      const existing = this.db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email);
      
      if (existing) {
        if (existing.status === 'subscribed') {
          return { success: false, error: 'E-Mail bereits angemeldet' };
        }
        if (existing.status === 'pending') {
          // Neue Bestätigungs-E-Mail senden
          await this.sendConfirmationEmail(existing.id, email, data.firstName);
          return { success: true, subscriberId: existing.id, requiresConfirmation: true };
        }
        // Reaktivieren wenn unsubscribed
        if (existing.status === 'unsubscribed') {
          const confirmToken = this.generateToken();
          const now = Date.now();
          this.db.prepare(`
            UPDATE newsletter_subscribers 
            SET status = 'pending', confirmation_token = ?, updated_at = ?, 
                first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name)
            WHERE id = ?
          `).run(confirmToken, now, data.firstName || null, data.lastName || null, existing.id);
          
          await this.sendConfirmationEmail(existing.id, email, data.firstName);
          return { success: true, subscriberId: existing.id, requiresConfirmation: true };
        }
      }

      // Neuen Subscriber erstellen
      const id = uuidv4();
      const confirmToken = this.generateToken();
      const unsubscribeToken = this.generateToken();
      const now = Date.now();

      this.db.prepare(`
        INSERT INTO newsletter_subscribers (
          id, email, first_name, last_name, status, source, tags,
          confirmation_token, unsubscribe_token, ip_address, user_agent,
          consent_given, consent_timestamp, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(
        id, email, data.firstName || null, data.lastName || null,
        data.source || 'website', JSON.stringify(data.tags || []),
        confirmToken, unsubscribeToken, data.ipAddress || null, data.userAgent || null,
        now, now, now
      );

      // Bestätigungs-E-Mail senden
      await this.sendConfirmationEmail(id, email, data.firstName);

      return { success: true, subscriberId: id, requiresConfirmation: true };
    } catch (error) {
      console.error('[NewsletterService] addSubscriber error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  async confirmSubscription(id: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriber = this.db.prepare('SELECT * FROM newsletter_subscribers WHERE id = ?').get(id);
      
      if (!subscriber) {
        return { success: false, error: 'Abonnent nicht gefunden' };
      }

      if (subscriber.status === 'subscribed') {
        return { success: true }; // Bereits bestätigt
      }

      if (subscriber.confirmation_token !== token) {
        return { success: false, error: 'Ungültiger Bestätigungs-Token' };
      }

      const now = Date.now();
      this.db.prepare(`
        UPDATE newsletter_subscribers 
        SET status = 'subscribed', confirmed_at = ?, confirmation_token = NULL, updated_at = ?
        WHERE id = ?
      `).run(now, now, id);

      // Welcome E-Mail senden
      await this.sendWelcomeEmail(subscriber.email, subscriber.first_name);

      return { success: true };
    } catch (error) {
      console.error('[NewsletterService] confirmSubscription error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  async unsubscribe(email: string, token?: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriber = this.db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email.toLowerCase());
      
      if (!subscriber) {
        return { success: false, error: 'Abonnent nicht gefunden' };
      }

      if (token && subscriber.unsubscribe_token !== token) {
        return { success: false, error: 'Ungültiger Abmelde-Token' };
      }

      const now = Date.now();
      this.db.prepare(`
        UPDATE newsletter_subscribers 
        SET status = 'unsubscribed', unsubscribed_at = ?, unsubscribe_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(now, reason || 'user_request', now, subscriber.id);

      return { success: true };
    } catch (error) {
      console.error('[NewsletterService] unsubscribe error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  getSubscribers(options?: {
    status?: string;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): NewsletterSubscriber[] {
    let sql = 'SELECT * FROM newsletter_subscribers WHERE 1=1';
    const params: (string | number)[] = [];

    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options?.search) {
      sql += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(this.mapSubscriberRow);
  }

  getSubscriberByEmail(email: string): NewsletterSubscriber | null {
    const row = this.db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email.toLowerCase());
    return row ? this.mapSubscriberRow(row) : null;
  }

  getSubscriberById(id: string): NewsletterSubscriber | null {
    const row = this.db.prepare('SELECT * FROM newsletter_subscribers WHERE id = ?').get(id);
    return row ? this.mapSubscriberRow(row) : null;
  }

  updateSubscriber(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    tags: string[];
    status: string;
  }>): void {
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(data.lastName);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    this.db.prepare(`UPDATE newsletter_subscribers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  deleteSubscriber(id: string): void {
    this.db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(id);
  }

  getSubscriberCount(): { total: number; subscribed: number; pending: number; unsubscribed: number } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers').get().count;
    const subscribed = this.db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = ?').get('subscribed').count;
    const pending = this.db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = ?').get('pending').count;
    const unsubscribed = this.db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = ?').get('unsubscribed').count;
    return { total, subscribed, pending, unsubscribed };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSubscriberRow(row: any): NewsletterSubscriber {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      status: row.status,
      source: row.source,
      tags: JSON.parse(row.tags || '[]'),
      confirmationToken: row.confirmation_token,
      unsubscribeToken: row.unsubscribe_token,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      consentGiven: !!row.consent_given,
      consentTimestamp: row.consent_timestamp,
      confirmedAt: row.confirmed_at,
      unsubscribedAt: row.unsubscribed_at,
      unsubscribeReason: row.unsubscribe_reason,
      emailsSent: row.emails_sent || 0,
      emailsOpened: row.emails_opened || 0,
      linksClicked: row.links_clicked || 0,
      lastOpenedAt: row.last_opened_at,
      lastClickedAt: row.last_clicked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  createCampaign(data: {
    name: string;
    subject: string;
    previewText?: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    htmlContent: string;
    textContent?: string;
    templateId?: string;
    recipientType?: 'all' | 'segment' | 'tags';
    recipientTags?: string[];
    createdBy?: string;
  }): string {
    const id = uuidv4();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO newsletter_campaigns (
        id, name, subject, preview_text, from_name, from_email, reply_to,
        html_content, text_content, template_id, recipient_type, recipient_tags,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.subject, data.previewText || null,
      data.fromName, data.fromEmail, data.replyTo || null,
      data.htmlContent, data.textContent || null, data.templateId || null,
      data.recipientType || 'all', JSON.stringify(data.recipientTags || []),
      data.createdBy || null, now, now
    );

    return id;
  }

  getCampaigns(status?: string): NewsletterCampaign[] {
    let sql = 'SELECT * FROM newsletter_campaigns';
    const params: string[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(this.mapCampaignRow);
  }

  getCampaignById(id: string): NewsletterCampaign | null {
    const row = this.db.prepare('SELECT * FROM newsletter_campaigns WHERE id = ?').get(id);
    return row ? this.mapCampaignRow(row) : null;
  }

  updateCampaign(id: string, data: Partial<NewsletterCampaign>): void {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      subject: 'subject',
      previewText: 'preview_text',
      fromName: 'from_name',
      fromEmail: 'from_email',
      replyTo: 'reply_to',
      htmlContent: 'html_content',
      textContent: 'text_content',
      status: 'status',
      scheduledAt: 'scheduled_at',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key as keyof NewsletterCampaign] !== undefined) {
        updates.push(`${column} = ?`);
        params.push(data[key as keyof NewsletterCampaign] as string | number | null);
      }
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    this.db.prepare(`UPDATE newsletter_campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  deleteCampaign(id: string): void {
    this.db.prepare('DELETE FROM newsletter_campaigns WHERE id = ?').run(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCampaignRow(row: any): NewsletterCampaign {
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      previewText: row.preview_text,
      fromName: row.from_name,
      fromEmail: row.from_email,
      replyTo: row.reply_to,
      htmlContent: row.html_content,
      textContent: row.text_content,
      templateId: row.template_id,
      status: row.status,
      recipientType: row.recipient_type,
      recipientTags: JSON.parse(row.recipient_tags || '[]'),
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      totalRecipients: row.total_recipients,
      sent: row.sent,
      delivered: row.delivered,
      opened: row.opened,
      clicked: row.clicked,
      bounced: row.bounced,
      unsubscribed: row.unsubscribed,
      complained: row.complained,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  createTemplate(data: {
    name: string;
    description?: string;
    category?: string;
    htmlContent: string;
    textContent?: string;
    thumbnail?: string;
    isDefault?: boolean;
  }): string {
    const id = uuidv4();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO newsletter_templates (
        id, name, description, category, html_content, text_content, thumbnail, is_default, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.description || null, data.category || 'general',
      data.htmlContent, data.textContent || null, data.thumbnail || null,
      data.isDefault ? 1 : 0, now, now
    );

    return id;
  }

  getTemplates(category?: string): NewsletterTemplate[] {
    let sql = 'SELECT * FROM newsletter_templates';
    const params: string[] = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY is_default DESC, created_at DESC';

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(this.mapTemplateRow);
  }

  getTemplateById(id: string): NewsletterTemplate | null {
    const row = this.db.prepare('SELECT * FROM newsletter_templates WHERE id = ?').get(id);
    return row ? this.mapTemplateRow(row) : null;
  }

  updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    htmlContent?: string;
    textContent?: string;
    isDefault?: boolean;
  }): void {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.htmlContent !== undefined) {
      updates.push('html_content = ?');
      params.push(data.htmlContent);
    }
    if (data.textContent !== undefined) {
      updates.push('text_content = ?');
      params.push(data.textContent);
    }
    if (data.isDefault !== undefined) {
      updates.push('is_default = ?');
      params.push(data.isDefault ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(Date.now());
      params.push(id);

      this.db.prepare(`
        UPDATE newsletter_templates SET ${updates.join(', ')} WHERE id = ?
      `).run(...params);
    }
  }

  deleteTemplate(id: string): void {
    this.db.prepare('DELETE FROM newsletter_templates WHERE id = ?').run(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTemplateRow(row: any): NewsletterTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      htmlContent: row.html_content,
      textContent: row.text_content,
      thumbnail: row.thumbnail,
      isDefault: !!row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  getSettings(): NewsletterSettings {
    const row = this.db.prepare('SELECT * FROM newsletter_settings WHERE id = ?').get('default');
    return {
      id: row.id,
      defaultFromName: row.default_from_name,
      defaultFromEmail: row.default_from_email,
      defaultReplyTo: row.default_reply_to,
      doubleOptIn: !!row.double_opt_in,
      welcomeEmailEnabled: !!row.welcome_email_enabled,
      welcomeEmailTemplateId: row.welcome_email_template_id,
      unsubscribePageUrl: row.unsubscribe_page_url,
      footerText: row.footer_text,
      companyName: row.company_name,
      companyAddress: row.company_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  updateSettings(data: Partial<NewsletterSettings>): void {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    const fieldMap: Record<string, string> = {
      defaultFromName: 'default_from_name',
      defaultFromEmail: 'default_from_email',
      defaultReplyTo: 'default_reply_to',
      doubleOptIn: 'double_opt_in',
      welcomeEmailEnabled: 'welcome_email_enabled',
      footerText: 'footer_text',
      companyName: 'company_name',
      companyAddress: 'company_address',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      const value = data[key as keyof NewsletterSettings];
      if (value !== undefined) {
        updates.push(`${column} = ?`);
        if (typeof value === 'boolean') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value as string | number | null);
        }
      }
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    params.push(Date.now());

    this.db.prepare(`UPDATE newsletter_settings SET ${updates.join(', ')} WHERE id = 'default'`).run(...params);
  }

  // ============================================================================
  // EMAIL SENDING
  // ============================================================================

  async sendConfirmationEmail(subscriberId: string, email: string, firstName?: string | null): Promise<boolean> {
    if (!this.transporter) {
      console.warn('[NewsletterService] E-Mail-Versand deaktiviert (kein SMTP konfiguriert)');
      return false;
    }

    const subscriber = this.getSubscriberById(subscriberId);
    if (!subscriber || !subscriber.confirmationToken) return false;

    const confirmUrl = `https://taskilo.de/newsletter/confirm?id=${subscriberId}&token=${subscriber.confirmationToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Newsletter-Anmeldung bestätigen</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #14b8a6; margin: 0; font-size: 28px;">Willkommen bei Taskilo!</h1>
    </div>

    <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hallo${firstName ? ` ${firstName}` : ''},</p>

    <p style="font-size: 16px; line-height: 1.6; color: #374151;">
      vielen Dank für Ihr Interesse an unserem Newsletter! Um Ihre Anmeldung abzuschließen,
      bestätigen Sie bitte Ihre E-Mail-Adresse:
    </p>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${confirmUrl}"
         style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 16px 40px; 
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; 
                display: inline-block; box-shadow: 0 4px 14px rgba(20, 184, 166, 0.4);">
        Newsletter-Anmeldung bestätigen
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Falls der Button nicht funktioniert:<br>
      <a href="${confirmUrl}" style="color: #14b8a6; word-break: break-all;">${confirmUrl}</a>
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      Diese E-Mail wurde automatisch versendet. Falls Sie sich nicht angemeldet haben,
      können Sie diese E-Mail ignorieren.
    </p>

    <div style="text-align: center; margin-top: 20px;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        © ${new Date().getFullYear()} Taskilo GmbH<br>
        <a href="https://taskilo.de" style="color: #14b8a6;">taskilo.de</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Taskilo Newsletter" <${SMTP_CONFIG.auth.user}>`,
        to: email,
        subject: 'Newsletter-Anmeldung bestätigen - Taskilo',
        html,
      });
      console.log(`[NewsletterService] Bestätigungs-E-Mail gesendet an ${email}`);
      return true;
    } catch (error) {
      console.error('[NewsletterService] E-Mail-Versand fehlgeschlagen:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, firstName?: string | null): Promise<boolean> {
    if (!this.transporter) return false;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Willkommen beim Taskilo Newsletter</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #14b8a6; margin: 0; font-size: 28px;">Anmeldung bestätigt!</h1>
    </div>

    <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hallo${firstName ? ` ${firstName}` : ''},</p>

    <p style="font-size: 16px; line-height: 1.6; color: #374151;">
      Ihre Newsletter-Anmeldung wurde erfolgreich bestätigt. Sie erhalten ab jetzt
      regelmäßig Updates zu:
    </p>

    <ul style="font-size: 16px; line-height: 1.8; color: #374151;">
      <li>Neue Funktionen und Updates</li>
      <li>Tipps zur Optimierung Ihres Geschäfts</li>
      <li>Exklusive Angebote und Rabatte</li>
      <li>Branchen-News und Best Practices</li>
    </ul>

    <div style="text-align: center; margin: 40px 0;">
      <a href="https://taskilo.de/dashboard"
         style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 16px 40px; 
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; 
                display: inline-block; box-shadow: 0 4px 14px rgba(20, 184, 166, 0.4);">
        Zum Dashboard
      </a>
    </div>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

    <div style="text-align: center;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        © ${new Date().getFullYear()} Taskilo GmbH<br>
        <a href="https://taskilo.de" style="color: #14b8a6;">taskilo.de</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Taskilo Newsletter" <${SMTP_CONFIG.auth.user}>`,
        to: email,
        subject: 'Willkommen beim Taskilo Newsletter!',
        html,
      });
      console.log(`[NewsletterService] Welcome-E-Mail gesendet an ${email}`);
      return true;
    } catch (error) {
      console.error('[NewsletterService] E-Mail-Versand fehlgeschlagen:', error);
      return false;
    }
  }

  async sendCampaign(campaignId: string): Promise<{ success: boolean; sent: number; errors: number }> {
    const campaign = this.getCampaignById(campaignId);
    if (!campaign) {
      return { success: false, sent: 0, errors: 0 };
    }

    if (!this.transporter) {
      return { success: false, sent: 0, errors: 0 };
    }

    // Aktive Subscribers holen
    let subscribers: NewsletterSubscriber[];
    if (campaign.recipientType === 'tags' && campaign.recipientTags.length > 0) {
      subscribers = this.getSubscribers({ status: 'subscribed' }).filter(s =>
        s.tags.some(t => campaign.recipientTags.includes(t))
      );
    } else {
      subscribers = this.getSubscribers({ status: 'subscribed' });
    }

    // Status auf sending setzen
    this.updateCampaign(campaignId, { status: 'sending' } as Partial<NewsletterCampaign>);

    let sent = 0;
    let errors = 0;

    for (const subscriber of subscribers) {
      try {
        // Personalisierung
        let html = campaign.htmlContent;
        html = html.replace(/{{firstName}}/g, subscriber.firstName || '');
        html = html.replace(/{{lastName}}/g, subscriber.lastName || '');
        html = html.replace(/{{email}}/g, subscriber.email);

        // Unsubscribe-Link hinzufügen
        const unsubscribeUrl = `https://taskilo.de/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}&token=${subscriber.unsubscribeToken}`;
        html = html.replace(/{{unsubscribeUrl}}/g, unsubscribeUrl);

        await this.transporter.sendMail({
          from: `"${campaign.fromName}" <${SMTP_CONFIG.auth.user}>`,
          to: subscriber.email,
          subject: campaign.subject,
          html,
          text: campaign.textContent || undefined,
        });

        // Stats aktualisieren
        this.db.prepare('UPDATE newsletter_subscribers SET emails_sent = emails_sent + 1, updated_at = ? WHERE id = ?')
          .run(Date.now(), subscriber.id);

        sent++;
      } catch (error) {
        console.error(`[NewsletterService] Fehler beim Senden an ${subscriber.email}:`, error);
        errors++;
      }
    }

    // Campaign Stats aktualisieren
    this.db.prepare(`
      UPDATE newsletter_campaigns 
      SET status = 'sent', sent_at = ?, total_recipients = ?, sent = ?, updated_at = ?
      WHERE id = ?
    `).run(Date.now(), subscribers.length, sent, Date.now(), campaignId);

    return { success: true, sent, errors };
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  trackOpen(campaignId: string, subscriberId: string, ipAddress?: string, userAgent?: string): void {
    const id = uuidv4();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO newsletter_tracking (id, campaign_id, subscriber_id, event_type, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, 'open', ?, ?, ?)
    `).run(id, campaignId, subscriberId, ipAddress || null, userAgent || null, now);

    // Campaign Stats
    this.db.prepare('UPDATE newsletter_campaigns SET opened = opened + 1, updated_at = ? WHERE id = ?')
      .run(now, campaignId);

    // Subscriber Stats
    this.db.prepare('UPDATE newsletter_subscribers SET emails_opened = emails_opened + 1, last_opened_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, subscriberId);
  }

  trackClick(campaignId: string, subscriberId: string, linkUrl: string, ipAddress?: string, userAgent?: string): void {
    const id = uuidv4();
    const now = Date.now();

    this.db.prepare(`
      INSERT INTO newsletter_tracking (id, campaign_id, subscriber_id, event_type, link_url, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, 'click', ?, ?, ?, ?)
    `).run(id, campaignId, subscriberId, linkUrl, ipAddress || null, userAgent || null, now);

    // Campaign Stats
    this.db.prepare('UPDATE newsletter_campaigns SET clicked = clicked + 1, updated_at = ? WHERE id = ?')
      .run(now, campaignId);

    // Subscriber Stats
    this.db.prepare('UPDATE newsletter_subscribers SET links_clicked = links_clicked + 1, last_clicked_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, subscriberId);
  }

  getAnalytics(campaignId?: string): {
    totalSubscribers: number;
    activeSubscribers: number;
    totalCampaigns: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
  } {
    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;

    if (campaignId) {
      const campaign = this.getCampaignById(campaignId);
      if (campaign) {
        totalSent = campaign.sent;
        totalOpened = campaign.opened;
        totalClicked = campaign.clicked;
      }
    } else {
      const stats = this.db.prepare('SELECT SUM(sent) as sent, SUM(opened) as opened, SUM(clicked) as clicked FROM newsletter_campaigns').get();
      totalSent = stats.sent || 0;
      totalOpened = stats.opened || 0;
      totalClicked = stats.clicked || 0;
    }

    const counts = this.getSubscriberCount();
    const campaignCount = this.db.prepare('SELECT COUNT(*) as count FROM newsletter_campaigns').get().count;

    return {
      totalSubscribers: counts.total,
      activeSubscribers: counts.subscribed,
      totalCampaigns: campaignCount,
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
    };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanupExpiredPending(hoursOld: number = 48): number {
    const cutoff = Date.now() - (hoursOld * 60 * 60 * 1000);
    const result = this.db.prepare('DELETE FROM newsletter_subscribers WHERE status = ? AND created_at < ?')
      .run('pending', cutoff);
    return result.changes;
  }
}

// Singleton Export
export const newsletterService = new NewsletterService();
export default newsletterService;
