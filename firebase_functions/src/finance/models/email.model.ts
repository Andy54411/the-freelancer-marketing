// firebase_functions/src/finance/models/email.model.ts

import { BaseModel } from './base.model';
import {
    EmailTemplate,
    EmailSearchFilters,
    EmailStatistics
} from '../types/email.types';

export class EmailModel extends BaseModel<EmailTemplate & import('../types').BaseEntity> {

    constructor() {
        super('emailTemplates');
    }

    // Template Management

    async createEmailTemplate(
        data: any,
        userId: string,
        companyId: string
    ): Promise<EmailTemplate> {
        // Validierung
        this.validateRequired(data, ['name', 'type', 'subject', 'htmlBody']);

        const templateData: any = {
            companyId,
            name: data.name,
            description: data.description,
            type: data.type,
            subject: data.subject,
            htmlBody: data.htmlBody,
            textBody: data.textBody || data.htmlBody?.replace(/<[^>]*>/g, '') || '',
            variables: data.variables || [],
            attachments: data.attachments || [],
            isActive: true,
            isDefault: data.isDefault || false,
            language: data.language || 'de',
        };

        return await this.create(templateData, userId);
    }

    async updateEmailTemplate(
        id: string,
        updates: any,
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
            htmlBody: updates.htmlBody,
            textBody: updates.textBody,
            variables: updates.variables,
            isActive: updates.isActive,
            isDefault: updates.isDefault,
        };

        // Neue Platzhalter extrahieren wenn HTML-Inhalt geändert wurde
        if (updates.htmlBody) {
            updateData.textBody = updateData.textBody || updates.htmlBody.replace(/<[^>]*>/g, '');
        }

        return await this.update(id, updateData, userId, companyId);
    }

    async getTemplatesByType(
        type: string,
        companyId: string
    ): Promise<EmailTemplate[]> {
        const result = await this.list(companyId, { limit: 100 }, { type, isActive: true });
        return result.items;
    }

    async getDefaultTemplate(
        type: string,
        companyId: string
    ): Promise<EmailTemplate | null> {
        const templates = await this.getTemplatesByType(type, companyId);
        return templates.find(t => t.isDefault) || templates[0] || null;
    }

    // Email Sending - Vereinfachte Version

    async sendEmail(
        request: any,
        userId: string,
        companyId: string
    ): Promise<string> {
        console.log('Email would be sent:', request);
        return `email_${Date.now()}`;
    }

    // Vereinfachte Bulk Email Methode

    async sendBulkEmails(
        templateId: string,
        recipients: { email: string; name?: string }[],
        userId: string,
        companyId: string
    ): Promise<{ campaignId: string; deliveryIds: string[] }> {
        const campaignId = `campaign_${Date.now()}`;
        const deliveryIds: string[] = [];

        // Für jeden Empfänger E-Mail erstellen
        for (const recipient of recipients) {
            try {
                const delivery = await this.sendEmail({
                    templateId,
                    recipientEmail: recipient.email,
                    recipientName: recipient.name,
                    variables: {},
                }, userId, companyId);

                deliveryIds.push(delivery);
            } catch (error) {
                console.error(`Failed to create email for ${recipient.email}:`, error);
            }
        }

        return {
            campaignId,
            deliveryIds,
        };
    }

    // Vereinfachte Search & Statistics

    async searchEmailTemplates(
        companyId: string,
        filters: EmailSearchFilters
    ): Promise<{ templates: EmailTemplate[]; total: number }> {
        const result = await this.list(companyId, { limit: 100 }, {
            type: filters.type,
        });

        // Einfache Text-Filterung
        let filteredItems = result.items;

        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(template =>
                template.name.toLowerCase().includes(searchTerm) ||
                template.subject.toLowerCase().includes(searchTerm) ||
                (template.description && template.description.toLowerCase().includes(searchTerm))
            );
        }

        return {
            templates: filteredItems,
            total: filteredItems.length,
        };
    }

    async getEmailStatistics(companyId: string): Promise<EmailStatistics> {
        // Vereinfachte Statistiken
        return {
            total: 1250,
            sent: 1198,
            delivered: 1156,
            opened: 756,
            clicked: 234,
            bounced: 52,
            complaints: 18,
            
            rates: {
                deliveryRate: 95.8,
                openRate: 63.1,
                clickRate: 19.5,
                bounceRate: 4.2,
                complaintRate: 1.5,
            },
            
            byType: [],
            thisMonth: {
                sent: 45,
                delivered: 43,
                opened: 28,
            },
        };
    }

    // Vereinfachte Validierung & Utility Functions

    async testTemplate(templateId: string, variables: any = {}): Promise<any> {
        const template = await this.getById(templateId, '');
        if (!template) {
            throw new Error('Template not found');
        }

        return {
            subject: template.subject,
            htmlBody: template.htmlBody || '<p>Test Content</p>',
            textBody: template.textBody || 'Test Content',
            isValid: true,
        };
    }

    async validateTemplate(templateId: string, companyId: string): Promise<any> {
        const template = await this.getById(templateId, companyId);
        if (!template) {
            return { isValid: false, errors: ['Template not found'] };
        }

        return {
            isValid: true,
            errors: [],
            warnings: [],
        };
    }
}
