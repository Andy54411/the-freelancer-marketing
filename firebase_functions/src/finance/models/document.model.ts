// firebase_functions/src/finance/models/document.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import { 
  DocumentMetadata,
  DocumentType,
  DocumentStatus,
  ReceiptData,
  OCRProcessingResult,
  DocumentSearchFilters,
  DocumentUploadRequest,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentStatistics,
  DocumentValidationResult,
  DocumentCategory
} from '../types/document.types';

export class DocumentModel extends BaseModel<DocumentMetadata & import('../types').BaseEntity> {

  constructor() {
    super('documents');
  }

  // Document Management

  async createDocument(
    data: CreateDocumentRequest,
    userId: string,
    companyId: string
  ): Promise<DocumentMetadata> {
    // Validierung
    this.validateRequired(data, ['fileName', 'type', 'storageUrl', 'fileSize']);
    
    if (data.fileSize > 50 * 1024 * 1024) { // 50MB Limit
      throw new Error('File size exceeds maximum limit of 50MB');
    }

    const documentData: Omit<DocumentMetadata, keyof import('../types').BaseEntity> & { companyId: string } = {
      companyId,
      
      fileName: data.fileName,
      originalFileName: data.originalFileName || data.fileName,
      type: data.type,
      category: data.category,
      
      storageUrl: data.storageUrl,
      thumbnailUrl: data.thumbnailUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      
      status: 'UPLOADED',
      
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      expenseId: data.expenseId,
      
      metadata: data.metadata || {},
      
      isPublic: data.isPublic || false,
      requiresApproval: data.requiresApproval || false,
      
      tags: data.tags || [],
      notes: data.notes,
      
      retentionDate: data.retentionDate,
      archiveDate: data.archiveDate,
      
      uploadedAt: Timestamp.now(),
      processedAt: undefined,
    };

    const document = await this.create(documentData, userId);

    // OCR-Verarbeitung für bestimmte Typen starten
    if (this.shouldProcessOCR(data.type, data.mimeType)) {
      await this.scheduleOCRProcessing(document.id, companyId);
    }

    return document;
  }

  async updateDocument(
    id: string,
    updates: UpdateDocumentRequest,
    userId: string,
    companyId: string
  ): Promise<DocumentMetadata> {
    const existing = await this.getById(id, companyId);
    if (!existing) {
      throw new Error('Document not found');
    }

    const updateData: any = {
      fileName: updates.fileName,
      category: updates.category,
      invoiceId: updates.invoiceId,
      customerId: updates.customerId,
      expenseId: updates.expenseId,
      metadata: updates.metadata,
      isPublic: updates.isPublic,
      requiresApproval: updates.requiresApproval,
      tags: updates.tags,
      notes: updates.notes,
      status: updates.status,
      retentionDate: updates.retentionDate,
      archiveDate: updates.archiveDate,
    };

    return await this.update(id, updateData, userId, companyId);
  }

  // OCR Processing

  async processOCR(
    documentId: string,
    companyId: string
  ): Promise<OCRProcessingResult> {
    const document = await this.getById(documentId, companyId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.status !== 'UPLOADED') {
      throw new Error('Document is not in uploadable state for OCR processing');
    }

    // Status auf PROCESSING setzen
    await this.update(documentId, { 
      status: 'PROCESSING',
      processedAt: Timestamp.now(),
    }, 'system', companyId);

    try {
      // OCR-Verarbeitung simulieren
      const ocrResult = await this.performOCR(document);

      // Ergebnis speichern
      await this.update(documentId, {
        status: 'PROCESSED',
        ocrData: ocrResult,
        processedAt: Timestamp.now(),
      }, 'system', companyId);

      // Bei Rechnungen: automatische Kategorisierung versuchen
      if (document.type === 'INVOICE_RECEIVED' && ocrResult.extractedText) {
        await this.attemptAutomaticCategorization(documentId, ocrResult, companyId);
      }

      return ocrResult;

    } catch (error) {
      // Fehler-Status setzen
      await this.update(documentId, {
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : 'OCR processing failed',
      }, 'system', companyId);

      throw error;
    }
  }

  async extractReceiptData(
    documentId: string,
    companyId: string
  ): Promise<ReceiptData | null> {
    const document = await this.getById(documentId, companyId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.ocrData) {
      throw new Error('Document has not been processed with OCR yet');
    }

    // Receipt-spezifische Datenextraktion
    const receiptData: ReceiptData = {
      merchantName: this.extractMerchantName(document.ocrData.extractedText),
      date: this.extractDate(document.ocrData.extractedText),
      totalAmount: this.extractTotalAmount(document.ocrData.extractedText),
      taxAmount: this.extractTaxAmount(document.ocrData.extractedText),
      currency: this.extractCurrency(document.ocrData.extractedText) || 'EUR',
      
      lineItems: this.extractLineItems(document.ocrData.extractedText),
      
      merchantAddress: this.extractMerchantAddress(document.ocrData.extractedText),
      taxNumber: this.extractTaxNumber(document.ocrData.extractedText),
      
      paymentMethod: this.extractPaymentMethod(document.ocrData.extractedText),
      
      confidence: document.ocrData.confidence,
      rawText: document.ocrData.extractedText,
    };

    // Receipt-Daten im Document speichern
    await this.update(documentId, {
      receiptData,
      metadata: {
        ...document.metadata,
        autoExtracted: true,
        extractedAt: Timestamp.now().toDate().toISOString(),
      },
    }, 'system', companyId);

    return receiptData;
  }

  // Search & Statistics

  async searchDocuments(
    companyId: string,
    filters: DocumentSearchFilters,
    pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<{ documents: DocumentMetadata[]; total: number; page: number; limit: number; hasNext: boolean }> {
    const result = await this.list(companyId, pagination, {
      type: filters.type,
      category: filters.category,
      status: filters.status,
      customerId: filters.customerId,
      invoiceId: filters.invoiceId,
    });

    // Zusätzliche Memory-Filterung
    let filteredItems = result.items;

    if (filters.uploadedFrom || filters.uploadedTo) {
      filteredItems = filteredItems.filter(doc => {
        const uploadDate = doc.uploadedAt;
        if (filters.uploadedFrom && uploadDate.toMillis() < filters.uploadedFrom.toMillis()) {
          return false;
        }
        if (filters.uploadedTo && uploadDate.toMillis() > filters.uploadedTo.toMillis()) {
          return false;
        }
        return true;
      });
    }

    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(doc =>
        doc.fileName.toLowerCase().includes(searchTerm) ||
        doc.originalFileName.toLowerCase().includes(searchTerm) ||
        (doc.notes && doc.notes.toLowerCase().includes(searchTerm)) ||
        (doc.ocrData?.extractedText && doc.ocrData.extractedText.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredItems = filteredItems.filter(doc =>
        filters.tags!.some(tag => doc.tags.includes(tag))
      );
    }

    return {
      documents: filteredItems,
      total: filteredItems.length,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      hasNext: false, // Vereinfacht
    };
  }

  async getDocumentStatistics(
    companyId: string,
    filters: { dateFrom?: Timestamp; dateTo?: Timestamp } = {}
  ): Promise<DocumentStatistics> {
    const documents = await this.list(companyId, { limit: 1000 });
    
    const totalCount = documents.total;
    const totalSize = documents.items.reduce((sum, doc) => sum + doc.fileSize, 0);

    // Statistiken berechnen
    const byType = Object.values(DocumentType).map(type => ({
      type,
      count: documents.items.filter(d => d.type === type).length,
      totalSize: documents.items.filter(d => d.type === type).reduce((sum, d) => sum + d.fileSize, 0),
    }));

    const byStatus = Object.values(DocumentStatus).map(status => ({
      status,
      count: documents.items.filter(d => d.status === status).length,
    }));

    return {
      totalDocuments: totalCount,
      totalSize,
      
      byType,
      byStatus,
      
      thisMonth: {
        uploaded: documents.items.filter(d => 
          d.uploadedAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000
        ).length,
        processed: documents.items.filter(d => 
          d.processedAt && d.processedAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000
        ).length,
      },
      
      ocrStatistics: {
        totalProcessed: documents.items.filter(d => d.ocrData).length,
        averageConfidence: this.calculateAverageConfidence(documents.items),
        successRate: this.calculateOCRSuccessRate(documents.items),
      },
      
      storageUsage: {
        totalSize,
        averageFileSize: totalCount > 0 ? Math.round(totalSize / totalCount) : 0,
        largestFile: Math.max(...documents.items.map(d => d.fileSize), 0),
      },
    };
  }

  // Document Validation

  async validateDocument(documentId: string, companyId: string): Promise<DocumentValidationResult> {
    const document = await this.getById(documentId, companyId);
    if (!document) {
      throw new Error('Document not found');
    }

    const issues: string[] = [];
    const warnings: string[] = [];

    // Basis-Validierungen
    if (document.fileSize === 0) {
      issues.push('Document file is empty');
    }

    if (document.fileSize > 50 * 1024 * 1024) {
      issues.push('Document exceeds maximum file size limit');
    }

    if (!document.mimeType || !this.isSupportedMimeType(document.mimeType)) {
      warnings.push('Unsupported or unknown file type');
    }

    // Status-spezifische Validierungen
    if (document.status === 'ERROR' && !document.errorMessage) {
      warnings.push('Document is in error state but no error message is recorded');
    }

    // OCR-spezifische Validierungen
    if (document.ocrData && document.ocrData.confidence < 0.7) {
      warnings.push('OCR confidence is low - manual review recommended');
    }

    // Receipt-spezifische Validierungen
    if (document.type === 'RECEIPT' && document.receiptData) {
      if (!document.receiptData.totalAmount) {
        warnings.push('Receipt has no total amount extracted');
      }
      if (!document.receiptData.date) {
        warnings.push('Receipt has no date extracted');
      }
      if (!document.receiptData.merchantName) {
        warnings.push('Receipt has no merchant name extracted');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      score: Math.max(0, 100 - (issues.length * 20) - (warnings.length * 5)),
    };
  }

  // Private Helper Methods

  private shouldProcessOCR(type: DocumentType, mimeType: string): boolean {
    const ocrTypes: DocumentType[] = ['RECEIPT', 'INVOICE_RECEIVED', 'CONTRACT', 'BANK_STATEMENT'];
    const supportedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    
    return ocrTypes.includes(type) && supportedMimeTypes.includes(mimeType);
  }

  private async scheduleOCRProcessing(documentId: string, companyId: string): Promise<void> {
    // Hier würde eine Queue-System Integration implementiert
    // z.B. Cloud Tasks, Bull Queue, etc.
    setTimeout(() => {
      this.processOCR(documentId, companyId).catch(console.error);
    }, 1000);
  }

  private async performOCR(document: DocumentMetadata): Promise<OCRProcessingResult> {
    // Vereinfachte OCR-Simulation
    // In der Realität würde hier Google Vision API, AWS Textract, etc. verwendet
    
    return {
      extractedText: `Simulated OCR text for ${document.fileName}`,
      confidence: 0.95,
      boundingBoxes: [],
      detectedLanguage: 'de',
      pageCount: 1,
      processedAt: Timestamp.now(),
      engine: 'GOOGLE_VISION',
      version: '1.0',
    };
  }

  private async attemptAutomaticCategorization(
    documentId: string,
    ocrResult: OCRProcessingResult,
    companyId: string
  ): Promise<void> {
    // Automatische Kategorisierung basierend auf OCR-Text
    let suggestedCategory: DocumentCategory = 'OTHER';
    
    const text = ocrResult.extractedText.toLowerCase();
    
    if (text.includes('rechnung') || text.includes('invoice')) {
      suggestedCategory = 'ACCOUNTING';
    } else if (text.includes('vertrag') || text.includes('contract')) {
      suggestedCategory = 'CONTRACT';
    } else if (text.includes('bank') || text.includes('konto')) {
      suggestedCategory = 'BANK_STATEMENT';
    }

    await this.update(documentId, {
      category: suggestedCategory,
      metadata: {
        autoCategorizationApplied: true,
        suggestedAt: Timestamp.now().toDate().toISOString(),
      },
    }, 'system', companyId);
  }

  private extractMerchantName(text: string): string | undefined {
    // Vereinfachte Merchant-Name Extraktion
    const lines = text.split('\n');
    return lines.find(line => line.length > 3 && line.length < 50)?.trim();
  }

  private extractDate(text: string): Date | undefined {
    // Vereinfachte Datums-Extraktion
    const dateRegex = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/;
    const match = text.match(dateRegex);
    
    if (match) {
      const [, day, month, year] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return undefined;
  }

  private extractTotalAmount(text: string): number | undefined {
    // Vereinfachte Gesamtbetrag-Extraktion
    const amountRegex = /(\d+[,.]?\d*)\s*€?/g;
    const matches = Array.from(text.matchAll(amountRegex));
    
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      return parseFloat(lastMatch[1].replace(',', '.'));
    }
    
    return undefined;
  }

  private extractTaxAmount(text: string): number | undefined {
    // Vereinfachte MwSt-Extraktion
    const taxRegex = /(?:mwst|steuer|tax)[:\s]*(\d+[,.]?\d*)/i;
    const match = text.match(taxRegex);
    
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    
    return undefined;
  }

  private extractCurrency(text: string): string | undefined {
    const currencyRegex = /(EUR|€|USD|\$|CHF)/i;
    const match = text.match(currencyRegex);
    
    if (match) {
      const currency = match[1].toUpperCase();
      return currency === '€' ? 'EUR' : currency === '$' ? 'USD' : currency;
    }
    
    return undefined;
  }

  private extractLineItems(text: string): any[] {
    // Vereinfachte Einzelposten-Extraktion
    // In der Realität wäre das viel komplexer
    return [];
  }

  private extractMerchantAddress(text: string): string | undefined {
    // Vereinfachte Adress-Extraktion
    return undefined;
  }

  private extractTaxNumber(text: string): string | undefined {
    // Vereinfachte Steuernummer-Extraktion
    const taxNumberRegex = /(?:steuernr|ust-id)[:\s]*([A-Z0-9\/\-\s]+)/i;
    const match = text.match(taxNumberRegex);
    
    return match ? match[1].trim() : undefined;
  }

  private extractPaymentMethod(text: string): string | undefined {
    // Vereinfachte Zahlungsmethoden-Extraktion
    const methods = ['bar', 'karte', 'ec', 'visa', 'mastercard', 'cash', 'card'];
    const lowerText = text.toLowerCase();
    
    return methods.find(method => lowerText.includes(method));
  }

  private isSupportedMimeType(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    return supportedTypes.includes(mimeType);
  }

  private calculateAverageConfidence(documents: DocumentMetadata[]): number {
    const documentsWithOCR = documents.filter(d => d.ocrData);
    if (documentsWithOCR.length === 0) return 0;
    
    const totalConfidence = documentsWithOCR.reduce((sum, d) => sum + (d.ocrData?.confidence || 0), 0);
    return Math.round((totalConfidence / documentsWithOCR.length) * 100) / 100;
  }

  private calculateOCRSuccessRate(documents: DocumentMetadata[]): number {
    const ocrCandidates = documents.filter(d => 
      this.shouldProcessOCR(d.type, d.mimeType)
    );
    
    if (ocrCandidates.length === 0) return 0;
    
    const successfulOCR = ocrCandidates.filter(d => 
      d.status === 'PROCESSED' && d.ocrData
    );
    
    return Math.round((successfulOCR.length / ocrCandidates.length) * 100);
  }
}
