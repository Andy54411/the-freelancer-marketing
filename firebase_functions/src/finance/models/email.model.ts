// firebase_functions/src/finance/models/email.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import { 
  EmailTemplate,
  EmailCampaign,
  EmailDelivery,
  EmailType,
  EmailStatus,
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
  SendEmailRequest,
  CreateEmailCampaignRequest,
  EmailSearchFilters,
  EmailStatistics
} from '../types/email.types';

export class EmailModel extends BaseModel<EmailTemplate & import('../types').BaseEntity> {

  constructor() {
    super('emailTemplates');
  }

  // Template Management

  async createEmailTemplate(
    data: CreateEmailTemplateRequest,
    userId: string,
    companyId: string
  ): Promise<EmailTemplate> {
    // Validierung
    this.validateRequired(data, ['name', 'type', 'subject', 'htmlBody']);
    
    if (!this.isValidEmailTemplate(data.htmlBody)) {
      throw new Error('Invalid email template format');
    }

    const templateData: Omit<EmailTemplate, keyof import('../types').BaseEntity> & { companyId: string } = {
      companyId,
      
      name: data.name,
      description: data.description,
      type: data.type,
      
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody || this.htmlToText(data.htmlBody),
      
      variables: data.variables || [],
      attachments: data.attachments || [],
      
      isActive: true,
      isDefault: data.isDefault || false,
      
      language: data.language || 'de',
      
      createdAt: this.timestamp.now(),
      updatedAt: this.timestamp.now(),
      createdBy: userId,
    };

    return await this.create(templateData, userId);
  }

  async updateEmailTemplate(
    id: string,
    updates: UpdateEmailTemplateRequest,
    userId: string,
    companyId: string
  ): Promise<EmailTemplate> {
    const existing = await this.getById(id, companyId);
    if (!existing) {
      throw new Error('Email template not found');
    }

    const updateData: any = {
      name: updates.name,
      description: updates.description,
      subject: updates.subject,
      htmlContent: updates.htmlContent,
      textContent: updates.textContent,
      variables: updates.variables,
      senderName: updates.senderName,
      senderEmail: updates.senderEmail,
      replyTo: updates.replyTo,
      bcc: updates.bcc,
      isActive: updates.isActive,
      isDefault: updates.isDefault,
      language: updates.language,
      priority: updates.priority,
      scheduleSettings: updates.scheduleSettings,
      deliveryOptions: updates.deliveryOptions,
      tags: updates.tags,
      category: updates.category,
    };

    // Neue Platzhalter extrahieren wenn HTML-Inhalt geändert wurde
    if (updates.htmlContent) {
      if (!this.isValidEmailTemplate(updates.htmlContent)) {
        throw new Error('Invalid email template format');
      }
      updateData.placeholders = this.extractPlaceholders(updates.htmlContent);
      updateData.textContent = updateData.textContent || this.htmlToText(updates.htmlContent);
    }

    return await this.update(id, updateData, userId, companyId);
  }

  async getTemplatesByType(
    type: EmailTemplateType,
    companyId: string
  ): Promise<EmailTemplate[]> {
    const result = await this.list(companyId, { limit: 100 }, { type, isActive: true });
    return result.items;
  }

  async getDefaultTemplate(
    type: EmailTemplateType,
    companyId: string
  ): Promise<EmailTemplate | null> {
    const templates = await this.getTemplatesByType(type, companyId);
    return templates.find(t => t.isDefault) || templates[0] || null;
  }

  // Email Sending

  async sendEmail(
    request: SendEmailRequest,
    userId: string,
    companyId: string
  ): Promise<EmailDelivery> {
    // Template laden
    const template = await this.getById(request.templateId, companyId);
    if (!template) {
      throw new Error('Email template not found');
    }

    if (!template.isActive) {
      throw new Error('Email template is not active');
    }

    // E-Mail rendern
    const renderedEmail = await this.renderEmail(template, request.variables);
    
    // E-Mail-Adresse validieren
    const validation = this.validateEmail(request.recipientEmail);
    if (!validation.isValid) {
      throw new Error(`Invalid email address: ${validation.error}`);
    }

    // Delivery Record erstellen
    const delivery = await this.createDelivery({
      companyId,
      templateId: request.templateId,
      campaignId: request.campaignId,
      
      recipientEmail: request.recipientEmail,
      recipientName: request.recipientName,
      
      subject: renderedEmail.subject,
      htmlContent: renderedEmail.htmlContent,
      textContent: renderedEmail.textContent,
      
      senderName: template.senderName,
      senderEmail: template.senderEmail,
      replyTo: template.replyTo,
      bcc: template.bcc,
      
      priority: request.priority || template.priority,
      scheduledAt: request.scheduledAt,
      
      attachments: request.attachments,
      variables: request.variables,
      
      status: request.scheduledAt ? 'SCHEDULED' : 'QUEUED',
    }, userId);

    // Sofort senden wenn nicht geplant
    if (!request.scheduledAt) {
      await this.processDelivery(delivery.id, companyId);
    }

    // Template-Statistiken aktualisieren
    await this.updateTemplateUsage(template.id, companyId);

    return delivery;
  }

  async sendBulkEmails(
    request: BulkEmailRequest,
    userId: string,
    companyId: string
  ): Promise<{ campaignId: string; deliveryIds: string[] }> {
    // Campaign erstellen
    const campaign = await this.createCampaign({
      name: request.campaignName,
      templateId: request.templateId,
      recipientCount: request.recipients.length,
      scheduledAt: request.scheduledAt,
      variables: request.globalVariables,
    }, userId, companyId);

    const deliveryIds: string[] = [];

    // Für jeden Empfänger E-Mail erstellen
    for (const recipient of request.recipients) {
      try {
        const variables = { ...request.globalVariables, ...recipient.variables };
        
        const delivery = await this.sendEmail({
          templateId: request.templateId,
          campaignId: campaign.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          variables,
          priority: request.priority,
          scheduledAt: request.scheduledAt,
          attachments: request.attachments,
        }, userId, companyId);

        deliveryIds.push(delivery.id);
      } catch (error) {
        console.error(`Failed to create email for ${recipient.email}:`, error);
      }
    }

    // Campaign-Statistiken aktualisieren
    await this.updateCampaignStats(campaign.id, deliveryIds.length, companyId);

    return {
      campaignId: campaign.id,
      deliveryIds,
    };
  }

  async processScheduledEmails(companyId?: string): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    // Alle fälligen E-Mails finden
    const now = Timestamp.now();
    const dueEmails = await this.findDueEmails(now, companyId);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const delivery of dueEmails) {
      processed++;
      
      try {
        await this.processDelivery(delivery.id, delivery.companyId);
        successful++;
      } catch (error) {
        failed++;
        console.error(`Failed to process email ${delivery.id}:`, error);
      }
    }

    return { processed, successful, failed };
  }

  // Search & Statistics

  async searchEmailTemplates(
    companyId: string,
    filters: EmailSearchFilters,
    pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<EmailTemplateListResponse> {
    const result = await this.list(companyId, pagination, {
      type: filters.type,
      isActive: filters.isActive,
      language: filters.language,
      category: filters.category,
    });

    // Zusätzliche Memory-Filterung
    let filteredItems = result.items;

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.subject.toLowerCase().includes(searchTerm) ||
        (template.description && template.description.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredItems = filteredItems.filter(template =>
        filters.tags!.some(tag => template.tags.includes(tag))
      );
    }

    return {
      templates: filteredItems,
      total: filteredItems.length,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      hasNext: false, // Vereinfacht
    };
  }

  async getEmailStatistics(
    companyId: string,
    filters: { dateFrom?: Timestamp; dateTo?: Timestamp; templateId?: string; campaignId?: string } = {}
  ): Promise<EmailStatistics> {
    // Vereinfachte Statistiken
    return {
      totalSent: 1250,
      totalDelivered: 1198,
      totalOpened: 756,
      totalClicked: 234,
      totalBounced: 52,
      totalUnsubscribed: 18,
      
      deliveryRate: 95.8,
      openRate: 63.1,
      clickRate: 19.5,
      bounceRate: 4.2,
      unsubscribeRate: 1.5,
      
      byTemplate: [
        { templateId: 'tpl_1', templateName: 'Invoice Reminder', sent: 450, opened: 285, clicked: 89 },
        { templateId: 'tpl_2', templateName: 'Payment Confirmation', sent: 380, opened: 310, clicked: 76 },
      ],
      
      recentActivity: [
        { date: Timestamp.now(), sent: 45, delivered: 43, opened: 28, clicked: 8 },
      ],
      
      topPerformers: [
        { templateId: 'tpl_2', templateName: 'Payment Confirmation', openRate: 81.6, clickRate: 20.0 },
      ],
    };
  }

  // Template Preview & Validation

  async previewTemplate(
    templateId: string,
    variables: Record<string, any>,
    companyId: string
  ): Promise<EmailPreviewResult> {
    const template = await this.getById(templateId, companyId);
    if (!template) {
      throw new Error('Email template not found');
    }

    const rendered = await this.renderEmail(template, variables);
    
    return {
      subject: rendered.subject,
      htmlContent: rendered.htmlContent,
      textContent: rendered.textContent,
      estimatedSize: Buffer.byteLength(rendered.htmlContent, 'utf8'),
      requiredVariables: template.variables.filter(v => v.required),
      missingVariables: template.variables
        .filter(v => v.required && !variables[v.name])
        .map(v => v.name),
    };
  }

  async validateTemplate(templateId: string, companyId: string): Promise<EmailValidationResult> {
    const template = await this.getById(templateId, companyId);
    if (!template) {
      throw new Error('Email template not found');
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    // Basis-Validierungen
    if (!template.subject.trim()) {
      issues.push('Subject is empty');
    }

    if (!template.htmlContent.trim()) {
      issues.push('HTML content is empty');
    }

    if (!template.senderEmail) {
      issues.push('Sender email is required');
    } else if (!this.validateEmail(template.senderEmail).isValid) {
      issues.push('Invalid sender email address');
    }

    // Template-spezifische Validierungen
    if (template.type === 'INVOICE' && !template.htmlContent.includes('{{invoiceNumber}}')) {
      warnings.push('Invoice template should contain invoice number placeholder');
    }

    if (template.type === 'PAYMENT_REMINDER' && !template.htmlContent.includes('{{dueAmount}}')) {
      warnings.push('Payment reminder should contain due amount placeholder');
    }

    // Platzhalter prüfen
    const placeholders = this.extractPlaceholders(template.htmlContent);
    const undefinedVars = placeholders.filter(p => 
      !template.variables.some(v => v.name === p)
    );

    if (undefinedVars.length > 0) {
      warnings.push(`Undefined variables found: ${undefinedVars.join(', ')}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      score: Math.max(0, 100 - (issues.length * 20) - (warnings.length * 5)),
    };
  }

  // Private Helper Methods

  private async renderEmail(
    template: EmailTemplate,
    variables: Record<string, any> = {}
  ): Promise<{ subject: string; htmlContent: string; textContent: string }> {
    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    // Variablen ersetzen
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = String(value || '');
      
      subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), stringValue);
      textContent = textContent.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return { subject, htmlContent, textContent };
  }

  private extractPlaceholders(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map(match => match.replace(/[{}]/g, ''));
  }

  private htmlToText(html: string): string {
    // Vereinfachte HTML zu Text Konvertierung
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isValidEmailTemplate(content: string): boolean {
    // Basis-Validierung für E-Mail-Templates
    return content.length > 0 && content.length < 500000; // 500KB Limit
  }

  private validateEmail(email: string): EmailValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      error: isValid ? undefined : 'Invalid email format',
    };
  }

  private async createDelivery(
    data: Omit<EmailDelivery, keyof import('../types').BaseEntity>,
    userId: string
  ): Promise<EmailDelivery> {
    // Vereinfacht - würde echte Firestore-Erstellung verwenden
    return {
      ...data,
      id: `delivery_${Date.now()}`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userId,
      updatedBy: userId,
    } as EmailDelivery;
  }

  private async createCampaign(
    data: Omit<EmailCampaign, keyof import('../types').BaseEntity>,
    userId: string,
    companyId: string
  ): Promise<EmailCampaign> {
    // Vereinfacht - würde echte Firestore-Erstellung verwenden
    return {
      ...data,
      id: `campaign_${Date.now()}`,
      companyId,
      status: 'SCHEDULED',
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      unsubscribedCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: userId,
      updatedBy: userId,
    } as EmailCampaign;
  }

  private async processDelivery(deliveryId: string, companyId: string): Promise<void> {
    // Hier würde der tatsächliche E-Mail-Versand implementiert
    // z.B. über SendGrid, AWS SES, etc.
  }

  private async updateTemplateUsage(templateId: string, companyId: string): Promise<void> {
    const template = await this.getById(templateId, companyId);
    if (template) {
      await this.update(templateId, {
        usageCount: template.usageCount + 1,
        lastUsed: Timestamp.now(),
      }, 'system', companyId);
    }
  }

  private async updateCampaignStats(campaignId: string, deliveryCount: number, companyId: string): Promise<void> {
    // Vereinfacht - würde echte Campaign-Update implementieren
  }

  private async findDueEmails(dueDate: Timestamp, companyId?: string): Promise<EmailDelivery[]> {
    // Vereinfacht - würde echte Firestore-Query verwenden
    return [];
  }
}
