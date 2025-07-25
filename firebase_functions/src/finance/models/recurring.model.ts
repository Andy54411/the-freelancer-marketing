// firebase_functions/src/finance/models/recurring.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import { InvoiceModel } from './invoice.model';
import { 
  RecurringInvoiceTemplate,
  RecurringExecution,
  RecurringFrequency,
  RecurringStatus,
  CreateRecurringInvoiceRequest,
  UpdateRecurringInvoiceRequest,
  RecurringInvoiceSearchFilters,
  RecurringInvoiceListResponse,
  RecurringStatistics,
  DateCalculationResult
} from '../types/recurring.types';

export class RecurringInvoiceModel extends BaseModel<RecurringInvoiceTemplate & import('../types').BaseEntity> {
  private invoiceModel: InvoiceModel;

  constructor() {
    super('recurringInvoices');
    this.invoiceModel = new InvoiceModel();
  }

  // Template Management

  async createRecurringTemplate(
    data: CreateRecurringInvoiceRequest,
    userId: string,
    companyId: string
  ): Promise<RecurringInvoiceTemplate> {
    // Validierung
    this.validateRequired(data, ['templateName', 'customerId', 'lineItems', 'frequency', 'startDate']);
    
    if (!data.lineItems || data.lineItems.length === 0) {
      throw new Error('Recurring invoice must have at least one line item');
    }

    // Nächstes Ausführungsdatum berechnen
    const nextExecution = this.calculateNextDate(data.startDate, data.frequency, data.interval || 1);

    const templateData: Omit<RecurringInvoiceTemplate, keyof import('../types').BaseEntity> & { companyId: string } = {
      companyId,
      
      templateName: data.templateName,
      description: data.description,
      
      customerId: data.customerId,
      lineItems: data.lineItems,
      introduction: data.introduction,
      conclusion: data.conclusion,
      notes: data.notes,
      paymentTerms: data.paymentTerms,
      
      frequency: data.frequency,
      interval: data.interval || 1,
      
      startDate: data.startDate,
      endDate: data.endDate,
      maxOccurrences: data.maxOccurrences,
      
      status: 'ACTIVE',
      
      autoSend: data.autoSend || false,
      sendDaysBefore: data.sendDaysBefore,
      
      nextExecutionDate: nextExecution.nextDate,
      lastExecutionDate: undefined,
      
      totalGenerated: 0,
      totalAmount: 0,
    };

    const template = await this.create(templateData, userId);
    
    // Erste Ausführung planen
    await this.scheduleNextExecution(template.id, companyId);
    
    return template;
  }

  async updateRecurringTemplate(
    id: string,
    updates: UpdateRecurringInvoiceRequest,
    userId: string,
    companyId: string
  ): Promise<RecurringInvoiceTemplate> {
    const existing = await this.getById(id, companyId);
    if (!existing) {
      throw new Error('Recurring template not found');
    }

    const updateData: any = {
      templateName: updates.templateName,
      description: updates.description,
      lineItems: updates.lineItems,
      introduction: updates.introduction,
      conclusion: updates.conclusion,
      notes: updates.notes,
      paymentTerms: updates.paymentTerms,
      frequency: updates.frequency,
      interval: updates.interval,
      endDate: updates.endDate,
      maxOccurrences: updates.maxOccurrences,
      status: updates.status,
      autoSend: updates.autoSend,
      sendDaysBefore: updates.sendDaysBefore,
    };

    // Wenn Frequenz oder Interval geändert wurde, nächstes Datum neu berechnen
    if (updates.frequency || updates.interval) {
      const frequency = updates.frequency || existing.frequency;
      const interval = updates.interval || existing.interval;
      const nextExecution = this.calculateNextDate(
        existing.lastExecutionDate || existing.startDate,
        frequency,
        interval
      );
      updateData.nextExecutionDate = nextExecution.nextDate;
    }

    return await this.update(id, updateData, userId, companyId);
  }

  // Execution Management

  async executeRecurringInvoice(
    templateId: string,
    companyId: string,
    executionDate?: Timestamp
  ): Promise<{ success: boolean; invoiceId?: string; executionId: string; error?: string }> {
    const template = await this.getById(templateId, companyId);
    if (!template) {
      throw new Error('Recurring template not found');
    }

    if (template.status !== 'ACTIVE') {
      throw new Error('Template is not active');
    }

    const execDate = executionDate || Timestamp.now();
    
    // Execution Record erstellen
    const execution = await this.createExecution(templateId, execDate, companyId);

    try {
      // Rechnung aus Template generieren
      const invoiceData = await this.templateToInvoiceData(template);
      const invoice = await this.invoiceModel.createInvoice(invoiceData, 'system', companyId);

      // Template-Statistiken aktualisieren
      await this.updateTemplateStats(template, invoice, execDate, companyId);

      // Nächste Ausführung planen
      await this.scheduleNextExecution(templateId, companyId);

      // Execution als erfolgreich markieren
      await this.updateExecution(execution.id, {
        status: 'COMPLETED',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      }, companyId);

      // Auto-Send wenn aktiviert
      if (template.autoSend) {
        // Hier würde E-Mail-Versand implementiert
      }

      return {
        success: true,
        invoiceId: invoice.id,
        executionId: execution.id,
      };

    } catch (error) {
      // Execution als fehlgeschlagen markieren
      await this.updateExecution(execution.id, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        attempts: 1,
      }, companyId);

      return {
        success: false,
        executionId: execution.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async processScheduledExecutions(companyId?: string): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    // Alle fälligen Templates finden
    const now = Timestamp.now();
    const dueTemplates = await this.findDueTemplates(now, companyId);

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const template of dueTemplates) {
      processed++;
      
      const result = await this.executeRecurringInvoice(template.id, template.companyId);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { processed, successful, failed };
  }

  // Search & Statistics

  async searchRecurringTemplates(
    companyId: string,
    filters: RecurringInvoiceSearchFilters,
    pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<RecurringInvoiceListResponse> {
    const result = await this.list(companyId, pagination, {
      status: filters.status,
      customerId: filters.customerId,
      frequency: filters.frequency,
    });

    // Zusätzliche Memory-Filterung
    let filteredItems = result.items;

    if (filters.nextExecutionFrom || filters.nextExecutionTo) {
      filteredItems = filteredItems.filter(template => {
        const execDate = template.nextExecutionDate;
        if (filters.nextExecutionFrom && execDate.toMillis() < filters.nextExecutionFrom.toMillis()) {
          return false;
        }
        if (filters.nextExecutionTo && execDate.toMillis() > filters.nextExecutionTo.toMillis()) {
          return false;
        }
        return true;
      });
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(template =>
        template.templateName.toLowerCase().includes(searchTerm) ||
        (template.description && template.description.toLowerCase().includes(searchTerm))
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

  async getRecurringStatistics(
    companyId: string,
    filters: { dateFrom?: Timestamp; dateTo?: Timestamp } = {}
  ): Promise<RecurringStatistics> {
    const templates = await this.list(companyId, { limit: 1000 });
    
    const activeTemplates = templates.items.filter(t => t.status === 'ACTIVE');
    const pausedTemplates = templates.items.filter(t => t.status === 'PAUSED');

    // Vereinfachte Statistiken
    return {
      totalTemplates: templates.total,
      activeTemplates: activeTemplates.length,
      pausedTemplates: pausedTemplates.length,
      
      thisMonth: {
        scheduled: 0,
        generated: 0,
        failed: 0,
        totalAmount: 0,
      },
      
      nextWeek: {
        scheduled: 0,
        estimatedAmount: 0,
      },
      
      byFrequency: [
        { frequency: 'MONTHLY', count: 0, totalAmount: 0 },
        { frequency: 'QUARTERLY', count: 0, totalAmount: 0 },
        { frequency: 'ANNUALLY', count: 0, totalAmount: 0 },
      ],
      
      performance: {
        successRate: 95.0,
        avgGenerationTime: 2500,
        totalRevenue: activeTemplates.reduce((sum, t) => sum + t.totalAmount, 0),
      },
    };
  }

  // Private Helper Methods

  private calculateNextDate(
    fromDate: Timestamp,
    frequency: RecurringFrequency,
    interval: number
  ): DateCalculationResult {
    const date = fromDate.toDate();
    let nextDate: Date;

    switch (frequency) {
      case 'WEEKLY':
        nextDate = new Date(date.getTime() + (7 * interval * 24 * 60 * 60 * 1000));
        break;
      
      case 'BIWEEKLY':
        nextDate = new Date(date.getTime() + (14 * interval * 24 * 60 * 60 * 1000));
        break;
      
      case 'MONTHLY':
        nextDate = new Date(date);
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      
      case 'QUARTERLY':
        nextDate = new Date(date);
        nextDate.setMonth(nextDate.getMonth() + (3 * interval));
        break;
      
      case 'SEMIANNUALLY':
        nextDate = new Date(date);
        nextDate.setMonth(nextDate.getMonth() + (6 * interval));
        break;
      
      case 'ANNUALLY':
        nextDate = new Date(date);
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }

    const daysDifference = Math.floor((nextDate.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

    return {
      nextDate: Timestamp.fromDate(nextDate),
      isValid: nextDate > date,
      daysDifference,
    };
  }

  private async templateToInvoiceData(template: RecurringInvoiceTemplate): Promise<any> {
    // Template zu Invoice-Request konvertieren
    return {
      customerId: template.customerId,
      lineItems: template.lineItems,
      introduction: template.introduction,
      conclusion: template.conclusion,
      notes: template.notes,
      paymentTerms: template.paymentTerms,
      type: 'STANDARD',
    };
  }

  private async createExecution(
    templateId: string,
    executionDate: Timestamp,
    companyId: string
  ): Promise<RecurringExecution> {
    // Vereinfacht - würde echte Firestore-Erstellung verwenden
    return {
      id: `exec_${Date.now()}`,
      companyId,
      templateId,
      executionDate,
      scheduledDate: executionDate,
      status: 'PROCESSING',
      attempts: 0,
      maxAttempts: 3,
      notificationSent: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  private async updateExecution(
    executionId: string,
    updates: Partial<RecurringExecution>,
    companyId: string
  ): Promise<void> {
    // Vereinfacht - würde echte Firestore-Update verwenden
  }

  private async updateTemplateStats(
    template: RecurringInvoiceTemplate,
    invoice: any,
    executionDate: Timestamp,
    companyId: string
  ): Promise<void> {
    const updateData = {
      totalGenerated: template.totalGenerated + 1,
      totalAmount: template.totalAmount + invoice.grossAmount,
      lastExecutionDate: executionDate,
    };

    await this.update(template.id, updateData, 'system', companyId);
  }

  private async scheduleNextExecution(templateId: string, companyId: string): Promise<void> {
    const template = await this.getById(templateId, companyId);
    if (!template) return;

    // Prüfen ob Template beendet werden soll
    if (template.endDate && template.nextExecutionDate.toMillis() > template.endDate.toMillis()) {
      await this.update(templateId, { status: 'COMPLETED' }, 'system', companyId);
      return;
    }

    if (template.maxOccurrences && template.totalGenerated >= template.maxOccurrences) {
      await this.update(templateId, { status: 'COMPLETED' }, 'system', companyId);
      return;
    }

    // Nächstes Datum berechnen
    const nextExecution = this.calculateNextDate(
      template.nextExecutionDate,
      template.frequency,
      template.interval
    );

    await this.update(templateId, { nextExecutionDate: nextExecution.nextDate }, 'system', companyId);
  }

  private async findDueTemplates(
    dueDate: Timestamp,
    companyId?: string
  ): Promise<RecurringInvoiceTemplate[]> {
    // Vereinfacht - würde echte Firestore-Query verwenden
    // Sucht Templates mit nextExecutionDate <= dueDate und status = 'ACTIVE'
    return [];
  }
}
