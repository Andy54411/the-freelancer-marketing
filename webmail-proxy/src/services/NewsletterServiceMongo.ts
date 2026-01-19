/**
 * NewsletterService - MongoDB Version
 * 
 * Vollständiges E-Mail-Marketing-System:
 * - Subscriber-Verwaltung mit Double-Opt-In
 * - Kampagnen-Management
 * - Templates
 * - Analytics/Tracking
 * - DSGVO-konform
 * 
 * MIGRATION: Nutzt MongoDB statt SQLite
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { 
  mongoDBService, 
  NewsletterSubscriber, 
  NewsletterCampaign, 
  NewsletterTemplate, 
  NewsletterSettings,
  NewsletterTracking,
} from './MongoDBService';

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

// Re-export interfaces
export type { NewsletterSubscriber, NewsletterCampaign, NewsletterTemplate, NewsletterSettings };

class NewsletterServiceMongo {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
    this.ensureDefaultSettings();
  }

  private initTransporter(): void {
    if (SMTP_CONFIG.auth.pass) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.secure,
        auth: SMTP_CONFIG.auth,
      });
      console.log('[NewsletterServiceMongo] SMTP Transporter initialisiert');
    } else {
      console.warn('[NewsletterServiceMongo] SMTP_PASS nicht gesetzt - E-Mail-Versand deaktiviert');
    }
  }

  private async ensureDefaultSettings(): Promise<void> {
    try {
      const collection = mongoDBService.getNewsletterSettingsCollection();
      const existing = await collection.findOne({ id: 'default' });
      
      if (!existing) {
        const now = Date.now();
        await collection.insertOne({
          id: 'default',
          defaultFromName: 'Taskilo Newsletter',
          defaultFromEmail: 'newsletter@taskilo.de',
          defaultReplyTo: null,
          doubleOptIn: true,
          welcomeEmailEnabled: true,
          welcomeEmailTemplateId: null,
          unsubscribePageUrl: null,
          footerText: null,
          companyName: 'Taskilo GmbH',
          companyAddress: null,
          createdAt: now,
          updatedAt: now,
        });
        console.log('[NewsletterServiceMongo] Default-Einstellungen erstellt');
      }
    } catch (error) {
      console.error('[NewsletterServiceMongo] Fehler beim Erstellen der Default-Einstellungen:', error);
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
      const collection = mongoDBService.getNewsletterSubscribersCollection();
      
      const existing = await collection.findOne({ email });
      
      if (existing) {
        if (existing.status === 'subscribed') {
          return { success: false, error: 'E-Mail bereits angemeldet' };
        }
        if (existing.status === 'pending') {
          await this.sendConfirmationEmail(existing.id, email, data.firstName);
          return { success: true, subscriberId: existing.id, requiresConfirmation: true };
        }
        if (existing.status === 'unsubscribed') {
          const confirmToken = this.generateToken();
          const now = Date.now();
          
          await collection.updateOne(
            { id: existing.id },
            {
              $set: {
                status: 'pending',
                confirmationToken: confirmToken,
                firstName: data.firstName || existing.firstName,
                lastName: data.lastName || existing.lastName,
                updatedAt: now,
              },
            }
          );
          
          await this.sendConfirmationEmail(existing.id, email, data.firstName);
          return { success: true, subscriberId: existing.id, requiresConfirmation: true };
        }
      }

      const id = uuidv4();
      const confirmToken = this.generateToken();
      const unsubscribeToken = this.generateToken();
      const now = Date.now();

      const subscriber: NewsletterSubscriber = {
        id,
        email,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        status: 'pending',
        source: data.source || 'website',
        tags: data.tags || [],
        confirmationToken: confirmToken,
        unsubscribeToken,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        consentGiven: true,
        consentTimestamp: now,
        confirmedAt: null,
        unsubscribedAt: null,
        unsubscribeReason: null,
        emailsSent: 0,
        emailsOpened: 0,
        linksClicked: 0,
        lastOpenedAt: null,
        lastClickedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await collection.insertOne(subscriber);
      await this.sendConfirmationEmail(id, email, data.firstName);

      return { success: true, subscriberId: id, requiresConfirmation: true };
    } catch (error) {
      console.error('[NewsletterServiceMongo] addSubscriber error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  async confirmSubscription(id: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const collection = mongoDBService.getNewsletterSubscribersCollection();
      const subscriber = await collection.findOne({ id });
      
      if (!subscriber) {
        return { success: false, error: 'Abonnent nicht gefunden' };
      }

      if (subscriber.status === 'subscribed') {
        return { success: true };
      }

      if (subscriber.confirmationToken !== token) {
        return { success: false, error: 'Ungültiger Bestätigungs-Token' };
      }

      const now = Date.now();
      await collection.updateOne(
        { id },
        {
          $set: {
            status: 'subscribed',
            confirmedAt: now,
            confirmationToken: null,
            updatedAt: now,
          },
        }
      );

      await this.sendWelcomeEmail(subscriber.email, subscriber.firstName);

      return { success: true };
    } catch (error) {
      console.error('[NewsletterServiceMongo] confirmSubscription error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  async unsubscribe(email: string, token?: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const collection = mongoDBService.getNewsletterSubscribersCollection();
      const subscriber = await collection.findOne({ email: email.toLowerCase() });
      
      if (!subscriber) {
        return { success: false, error: 'Abonnent nicht gefunden' };
      }

      if (token && subscriber.unsubscribeToken !== token) {
        return { success: false, error: 'Ungültiger Abmelde-Token' };
      }

      const now = Date.now();
      await collection.updateOne(
        { id: subscriber.id },
        {
          $set: {
            status: 'unsubscribed',
            unsubscribedAt: now,
            unsubscribeReason: reason || 'user_request',
            updatedAt: now,
          },
        }
      );

      return { success: true };
    } catch (error) {
      console.error('[NewsletterServiceMongo] unsubscribe error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
    }
  }

  async getSubscribers(options?: {
    status?: string;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<NewsletterSubscriber[]> {
    const collection = mongoDBService.getNewsletterSubscribersCollection();
    const filter: Record<string, unknown> = {};

    if (options?.status) {
      filter.status = options.status;
    }

    if (options?.search) {
      filter.$or = [
        { email: { $regex: options.search, $options: 'i' } },
        { firstName: { $regex: options.search, $options: 'i' } },
        { lastName: { $regex: options.search, $options: 'i' } },
      ];
    }

    if (options?.tags && options.tags.length > 0) {
      filter.tags = { $in: options.tags };
    }

    let query = collection.find(filter).sort({ createdAt: -1 });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.skip(options.offset);
    }

    return await query.toArray();
  }

  async getSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
    return await mongoDBService.getNewsletterSubscribersCollection().findOne({ email: email.toLowerCase() });
  }

  async getSubscriberById(id: string): Promise<NewsletterSubscriber | null> {
    return await mongoDBService.getNewsletterSubscribersCollection().findOne({ id });
  }

  async updateSubscriber(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    tags: string[];
    status: string;
  }>): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (data.firstName !== undefined) updates.firstName = data.firstName;
    if (data.lastName !== undefined) updates.lastName = data.lastName;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.status !== undefined) updates.status = data.status;

    await mongoDBService.getNewsletterSubscribersCollection().updateOne(
      { id },
      { $set: updates }
    );
  }

  async deleteSubscriber(id: string): Promise<void> {
    await mongoDBService.getNewsletterSubscribersCollection().deleteOne({ id });
  }

  async getSubscriberCount(): Promise<{ total: number; subscribed: number; pending: number; unsubscribed: number }> {
    const collection = mongoDBService.getNewsletterSubscribersCollection();
    
    const [total, subscribed, pending, unsubscribed] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ status: 'subscribed' }),
      collection.countDocuments({ status: 'pending' }),
      collection.countDocuments({ status: 'unsubscribed' }),
    ]);

    return { total, subscribed, pending, unsubscribed };
  }

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  async createCampaign(data: {
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
  }): Promise<string> {
    const id = uuidv4();
    const now = Date.now();

    const campaign: NewsletterCampaign = {
      id,
      name: data.name,
      subject: data.subject,
      previewText: data.previewText || null,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyTo: data.replyTo || null,
      htmlContent: data.htmlContent,
      textContent: data.textContent || null,
      templateId: data.templateId || null,
      status: 'draft',
      recipientType: data.recipientType || 'all',
      recipientTags: data.recipientTags || [],
      scheduledAt: null,
      sentAt: null,
      totalRecipients: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      complained: 0,
      createdBy: data.createdBy || null,
      createdAt: now,
      updatedAt: now,
    };

    await mongoDBService.getNewsletterCampaignsCollection().insertOne(campaign);
    return id;
  }

  async getCampaigns(status?: string): Promise<NewsletterCampaign[]> {
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    return await mongoDBService.getNewsletterCampaignsCollection()
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getCampaignById(id: string): Promise<NewsletterCampaign | null> {
    return await mongoDBService.getNewsletterCampaignsCollection().findOne({ id });
  }

  async updateCampaign(id: string, data: Partial<NewsletterCampaign>): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    const allowedFields = [
      'name', 'subject', 'previewText', 'fromName', 'fromEmail', 'replyTo',
      'htmlContent', 'textContent', 'status', 'scheduledAt', 'recipientType', 'recipientTags',
    ];

    for (const field of allowedFields) {
      if (data[field as keyof NewsletterCampaign] !== undefined) {
        updates[field] = data[field as keyof NewsletterCampaign];
      }
    }

    await mongoDBService.getNewsletterCampaignsCollection().updateOne(
      { id },
      { $set: updates }
    );
  }

  async deleteCampaign(id: string): Promise<void> {
    await mongoDBService.getNewsletterCampaignsCollection().deleteOne({ id });
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  async createTemplate(data: {
    name: string;
    description?: string;
    category?: string;
    htmlContent: string;
    textContent?: string;
    thumbnail?: string;
    isDefault?: boolean;
  }): Promise<string> {
    const id = uuidv4();
    const now = Date.now();

    const template: NewsletterTemplate = {
      id,
      name: data.name,
      description: data.description || null,
      category: data.category || 'general',
      htmlContent: data.htmlContent,
      textContent: data.textContent || null,
      thumbnail: data.thumbnail || null,
      isDefault: data.isDefault || false,
      createdAt: now,
      updatedAt: now,
    };

    await mongoDBService.getNewsletterTemplatesCollection().insertOne(template);
    return id;
  }

  async getTemplates(category?: string): Promise<NewsletterTemplate[]> {
    const filter: Record<string, unknown> = {};
    if (category) {
      filter.category = category;
    }

    return await mongoDBService.getNewsletterTemplatesCollection()
      .find(filter)
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();
  }

  async getTemplateById(id: string): Promise<NewsletterTemplate | null> {
    return await mongoDBService.getNewsletterTemplatesCollection().findOne({ id });
  }

  async updateTemplate(id: string, data: Partial<NewsletterTemplate>): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) updates.category = data.category;
    if (data.htmlContent !== undefined) updates.htmlContent = data.htmlContent;
    if (data.textContent !== undefined) updates.textContent = data.textContent;
    if (data.isDefault !== undefined) updates.isDefault = data.isDefault;

    await mongoDBService.getNewsletterTemplatesCollection().updateOne(
      { id },
      { $set: updates }
    );
  }

  async deleteTemplate(id: string): Promise<void> {
    await mongoDBService.getNewsletterTemplatesCollection().deleteOne({ id });
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  async getSettings(): Promise<NewsletterSettings> {
    const settings = await mongoDBService.getNewsletterSettingsCollection().findOne({ id: 'default' });
    
    if (!settings) {
      // Erstelle Default-Einstellungen falls nicht vorhanden
      const now = Date.now();
      const defaultSettings: NewsletterSettings = {
        id: 'default',
        defaultFromName: 'Taskilo Newsletter',
        defaultFromEmail: 'newsletter@taskilo.de',
        defaultReplyTo: null,
        doubleOptIn: true,
        welcomeEmailEnabled: true,
        welcomeEmailTemplateId: null,
        unsubscribePageUrl: null,
        footerText: null,
        companyName: 'Taskilo GmbH',
        companyAddress: null,
        createdAt: now,
        updatedAt: now,
      };
      
      await mongoDBService.getNewsletterSettingsCollection().insertOne(defaultSettings);
      return defaultSettings;
    }

    return settings;
  }

  async updateSettings(data: Partial<NewsletterSettings>): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    const allowedFields = [
      'defaultFromName', 'defaultFromEmail', 'defaultReplyTo',
      'doubleOptIn', 'welcomeEmailEnabled', 'footerText',
      'companyName', 'companyAddress',
    ];

    for (const field of allowedFields) {
      if (data[field as keyof NewsletterSettings] !== undefined) {
        updates[field] = data[field as keyof NewsletterSettings];
      }
    }

    await mongoDBService.getNewsletterSettingsCollection().updateOne(
      { id: 'default' },
      { $set: updates }
    );
  }

  // ============================================================================
  // EMAIL SENDING
  // ============================================================================

  async sendConfirmationEmail(subscriberId: string, email: string, firstName?: string | null): Promise<boolean> {
    if (!this.transporter) {
      console.warn('[NewsletterServiceMongo] E-Mail-Versand deaktiviert (kein SMTP konfiguriert)');
      return false;
    }

    const subscriber = await this.getSubscriberById(subscriberId);
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
        &copy; ${new Date().getFullYear()} Taskilo GmbH<br>
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
      console.log(`[NewsletterServiceMongo] Bestätigungs-E-Mail gesendet an ${email}`);
      return true;
    } catch (error) {
      console.error('[NewsletterServiceMongo] E-Mail-Versand fehlgeschlagen:', error);
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
        &copy; ${new Date().getFullYear()} Taskilo GmbH<br>
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
      console.log(`[NewsletterServiceMongo] Welcome-E-Mail gesendet an ${email}`);
      return true;
    } catch (error) {
      console.error('[NewsletterServiceMongo] E-Mail-Versand fehlgeschlagen:', error);
      return false;
    }
  }

  async sendCampaign(campaignId: string): Promise<{ success: boolean; sent: number; errors: number }> {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      return { success: false, sent: 0, errors: 0 };
    }

    if (!this.transporter) {
      return { success: false, sent: 0, errors: 0 };
    }

    // Aktive Subscribers holen
    let subscribers: NewsletterSubscriber[];
    if (campaign.recipientType === 'tags' && campaign.recipientTags.length > 0) {
      const allSubscribed = await this.getSubscribers({ status: 'subscribed' });
      subscribers = allSubscribed.filter(s =>
        s.tags.some(t => campaign.recipientTags.includes(t))
      );
    } else {
      subscribers = await this.getSubscribers({ status: 'subscribed' });
    }

    // Status auf sending setzen
    await this.updateCampaign(campaignId, { status: 'sending' });

    let sent = 0;
    let errors = 0;
    const collection = mongoDBService.getNewsletterSubscribersCollection();

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
        await collection.updateOne(
          { id: subscriber.id },
          { $inc: { emailsSent: 1 }, $set: { updatedAt: Date.now() } }
        );

        sent++;
      } catch (error) {
        console.error(`[NewsletterServiceMongo] Fehler beim Senden an ${subscriber.email}:`, error);
        errors++;
      }
    }

    // Campaign Stats aktualisieren
    await mongoDBService.getNewsletterCampaignsCollection().updateOne(
      { id: campaignId },
      {
        $set: {
          status: 'sent',
          sentAt: Date.now(),
          totalRecipients: subscribers.length,
          sent,
          updatedAt: Date.now(),
        },
      }
    );

    return { success: true, sent, errors };
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async trackOpen(campaignId: string, subscriberId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const id = uuidv4();
    const now = Date.now();

    const tracking: NewsletterTracking = {
      id,
      campaignId,
      subscriberId,
      eventType: 'open',
      linkUrl: null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: now,
    };

    await mongoDBService.getNewsletterTrackingCollection().insertOne(tracking);

    // Campaign Stats
    await mongoDBService.getNewsletterCampaignsCollection().updateOne(
      { id: campaignId },
      { $inc: { opened: 1 }, $set: { updatedAt: now } }
    );

    // Subscriber Stats
    await mongoDBService.getNewsletterSubscribersCollection().updateOne(
      { id: subscriberId },
      { $inc: { emailsOpened: 1 }, $set: { lastOpenedAt: now, updatedAt: now } }
    );
  }

  async trackClick(campaignId: string, subscriberId: string, linkUrl: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const id = uuidv4();
    const now = Date.now();

    const tracking: NewsletterTracking = {
      id,
      campaignId,
      subscriberId,
      eventType: 'click',
      linkUrl,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: now,
    };

    await mongoDBService.getNewsletterTrackingCollection().insertOne(tracking);

    // Campaign Stats
    await mongoDBService.getNewsletterCampaignsCollection().updateOne(
      { id: campaignId },
      { $inc: { clicked: 1 }, $set: { updatedAt: now } }
    );

    // Subscriber Stats
    await mongoDBService.getNewsletterSubscribersCollection().updateOne(
      { id: subscriberId },
      { $inc: { linksClicked: 1 }, $set: { lastClickedAt: now, updatedAt: now } }
    );
  }

  async getAnalytics(campaignId?: string): Promise<{
    totalSubscribers: number;
    activeSubscribers: number;
    totalCampaigns: number;
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
  }> {
    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;

    if (campaignId) {
      const campaign = await this.getCampaignById(campaignId);
      if (campaign) {
        totalSent = campaign.sent;
        totalOpened = campaign.opened;
        totalClicked = campaign.clicked;
      }
    } else {
      const campaigns = await mongoDBService.getNewsletterCampaignsCollection().find().toArray();
      for (const campaign of campaigns) {
        totalSent += campaign.sent;
        totalOpened += campaign.opened;
        totalClicked += campaign.clicked;
      }
    }

    const counts = await this.getSubscriberCount();
    const campaignCount = await mongoDBService.getNewsletterCampaignsCollection().countDocuments();

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

  async cleanupExpiredPending(hoursOld: number = 48): Promise<number> {
    const cutoff = Date.now() - (hoursOld * 60 * 60 * 1000);
    const result = await mongoDBService.getNewsletterSubscribersCollection().deleteMany({
      status: 'pending',
      createdAt: { $lt: cutoff },
    });
    return result.deletedCount;
  }
}

// Singleton Export
export const newsletterServiceMongo = new NewsletterServiceMongo();
export default newsletterServiceMongo;
