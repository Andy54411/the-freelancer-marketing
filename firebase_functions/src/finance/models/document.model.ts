// firebase_functions/src/finance/models/document.model.ts

import { Timestamp } from 'firebase-admin/firestore';
import { BaseModel } from './base.model';
import {
    DocumentMetadata,
    DocumentType,
    ReceiptData,
    DocumentSearchFilters,
    UploadDocumentRequest,
    UpdateDocumentRequest,
    DocumentStatistics,
    OCRResult
} from '../types/document.types';

export class DocumentModel extends BaseModel<DocumentMetadata & import('../types').BaseEntity> {

    constructor() {
        super('documents');
    }

    // Document Management

    async createDocument(
        data: UploadDocumentRequest,
        userId: string,
        companyId: string
    ): Promise<DocumentMetadata> {
        // Validierung
        this.validateRequired(data, ['filename', 'type', 'file']);

        if (data.file.length > 50 * 1024 * 1024) { // 50MB Limit
            throw new Error('File size exceeds maximum limit of 50MB');
        }

        const documentData: Omit<DocumentMetadata, keyof import('../types').BaseEntity> & { companyId: string } = {
            companyId,

            filename: data.filename,
            originalFilename: data.filename,
            type: data.type,
            category: data.category,

            storageUrl: '', // Wird nach Upload gesetzt
            thumbnailUrl: undefined,
            fileSize: data.file.length,
            mimeType: data.mimeType,

            processingStatus: 'UPLOADED',

            linkedInvoiceId: data.linkedInvoiceId,
            linkedCustomerId: data.linkedCustomerId,
            linkedExpenseId: data.linkedExpenseId,

            autoDetected: {
                confidence: 0
            },

            gobd: {
                immutable: false,
                archived: false,
                verificationHash: '',
            },

            reviewRequired: data.requireReview || false,

            tags: data.tags || [],

            uploadedBy: userId,
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
            type: updates.type,
            category: updates.category,
            subcategory: updates.subcategory,
            linkedInvoiceId: updates.linkedInvoiceId,
            linkedCustomerId: updates.linkedCustomerId,
            linkedExpenseId: updates.linkedExpenseId,
            linkedTransactionId: updates.linkedTransactionId,
            tags: updates.tags,
            reviewRequired: updates.reviewRequired,
            isApproved: updates.isApproved,
        };

        return await this.update(id, updateData, userId, companyId);
    }

    // OCR Processing

    async processOCR(
        documentId: string,
        companyId: string
    ): Promise<OCRResult> {
        const document = await this.getById(documentId, companyId);
        if (!document) {
            throw new Error('Document not found');
        }

        if (document.processingStatus !== 'UPLOADED') {
            throw new Error('Document is not in uploadable state for OCR processing');
        }

        // Status auf PROCESSING setzen
        await this.update(documentId, {
            processingStatus: 'PROCESSING',
        }, 'system', companyId);

        try {
            // OCR-Verarbeitung simulieren
            const ocrResult = await this.performOCR(document);

            // Ergebnis speichern
            await this.update(documentId, {
                processingStatus: 'PROCESSED',
                ocrText: ocrResult.text,
                ocrConfidence: ocrResult.confidence,
            }, 'system', companyId);

            // Bei Rechnungen: automatische Kategorisierung versuchen
            if (document.type === 'INVOICE_ATTACHMENT' && ocrResult.text) {
                await this.attemptAutomaticCategorization(documentId, ocrResult, companyId);
            }

            return ocrResult;

        } catch (error) {
            // Fehler-Status setzen
            await this.update(documentId, {
                processingStatus: 'FAILED',
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

        if (!document.ocrText) {
            throw new Error('Document has not been processed with OCR yet');
        }

        // Receipt-spezifische Datenextraktion
        const receiptData: ReceiptData = {
            id: `receipt_${documentId}`,
            documentId,
            companyId,
            vendor: this.extractMerchantName(document.ocrText) || 'Unknown',
            vendorAddress: this.extractMerchantAddress(document.ocrText),
            vendorTaxNumber: this.extractTaxNumber(document.ocrText),
            totalAmount: this.extractTotalAmount(document.ocrText) || 0,
            netAmount: undefined,
            taxAmount: this.extractTaxAmount(document.ocrText),
            currency: this.extractCurrency(document.ocrText) || 'EUR',
            taxBreakdown: [],
            receiptDate: this.extractDate(document.ocrText) ? Timestamp.fromDate(this.extractDate(document.ocrText)!) : Timestamp.now(),
            receiptNumber: undefined,
            description: undefined,
            paymentMethod: this.extractPaymentMethod(document.ocrText),
            expenseCategory: undefined,
            businessPurpose: undefined,
            isBusinessExpense: true,
            extractedData: {
                confidence: document.ocrConfidence || 0,
                rawText: document.ocrText,
                extractedFields: {},
            },
            needsReview: false,
            isApproved: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

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
            processingStatus: filters.processingStatus,
            linkedCustomerId: filters.linkedCustomerId,
            linkedInvoiceId: filters.linkedInvoiceId,
            linkedExpenseId: filters.linkedExpenseId,
        });

        // Zusätzliche Memory-Filterung
        let filteredItems = result.items;

        if (filters.dateFrom || filters.dateTo) {
            filteredItems = filteredItems.filter(doc => {
                const docDate = doc.createdAt;
                if (filters.dateFrom && docDate.toMillis() < filters.dateFrom.toMillis()) {
                    return false;
                }
                if (filters.dateTo && docDate.toMillis() > filters.dateTo.toMillis()) {
                    return false;
                }
                return true;
            });
        }

        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(doc =>
                doc.filename.toLowerCase().includes(searchTerm) ||
                doc.originalFilename.toLowerCase().includes(searchTerm) ||
                (doc.ocrText && doc.ocrText.toLowerCase().includes(searchTerm))
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

        const processing = {
            pending: documents.items.filter(d => d.processingStatus === 'UPLOADED').length,
            processing: documents.items.filter(d => d.processingStatus === 'PROCESSING').length,
            completed: documents.items.filter(d => d.processingStatus === 'PROCESSED').length,
            failed: documents.items.filter(d => d.processingStatus === 'FAILED').length,
        };

        return {
            total: totalCount,
            byType,
            processing,

            thisMonth: {
                uploaded: documents.items.filter(d =>
                    d.createdAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000
                ).length,
                processed: documents.items.filter(d =>
                    d.processingStatus === 'PROCESSED' && d.updatedAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000
                ).length,
                totalSize: documents.items.filter(d =>
                    d.createdAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000
                ).reduce((sum, d) => sum + d.fileSize, 0),
            },

            storage: {
                totalSize,
                avgFileSize: totalCount > 0 ? Math.round(totalSize / totalCount) : 0,
                largestFile: Math.max(...documents.items.map(d => d.fileSize), 0),
            },

            automation: {
                autoClassifiedRate: this.calculateAutoClassificationRate(documents.items),
                avgProcessingTime: 0, // Vereinfacht
                ocrSuccessRate: this.calculateOCRSuccessRate(documents.items),
            },
        };
    }

    // Document Validation - Vereinfacht entfernt da DocumentValidationResult nicht existiert

    // Private Helper Methods

    private shouldProcessOCR(type: DocumentType, mimeType: string): boolean {
        const ocrTypes: DocumentType[] = ['RECEIPT', 'INVOICE_ATTACHMENT', 'CONTRACT', 'BANK_STATEMENT'];
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

    private async performOCR(document: DocumentMetadata): Promise<OCRResult> {
        // Vereinfachte OCR-Simulation
        // In der Realität würde hier Google Vision API, AWS Textract, etc. verwendet

        return {
            text: `Simulated OCR text for ${document.filename}`,
            confidence: 0.95,
            blocks: [],
        };
    }

    private async attemptAutomaticCategorization(
        documentId: string,
        ocrResult: OCRResult,
        companyId: string
    ): Promise<void> {
        // Automatische Kategorisierung basierend auf OCR-Text
        let suggestedCategory = 'OTHER';

        const text = ocrResult.text.toLowerCase();

        if (text.includes('rechnung') || text.includes('invoice')) {
            suggestedCategory = 'ACCOUNTING';
        } else if (text.includes('vertrag') || text.includes('contract')) {
            suggestedCategory = 'CONTRACT';
        } else if (text.includes('bank') || text.includes('konto')) {
            suggestedCategory = 'BANK_STATEMENT';
        }

        await this.update(documentId, {
            category: suggestedCategory,
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

    private calculateAutoClassificationRate(documents: DocumentMetadata[]): number {
        const totalDocuments = documents.length;
        if (totalDocuments === 0) return 0;

        const autoClassified = documents.filter(d =>
            d.autoDetected && d.autoDetected.documentType
        ).length;

        return Math.round((autoClassified / totalDocuments) * 100);
    }

    private calculateOCRSuccessRate(documents: DocumentMetadata[]): number {
        const ocrCandidates = documents.filter(d =>
            this.shouldProcessOCR(d.type, d.mimeType)
        );

        if (ocrCandidates.length === 0) return 0;

        const successfulOCR = ocrCandidates.filter(d =>
            d.processingStatus === 'PROCESSED' && d.ocrText
        );

        return Math.round((successfulOCR.length / ocrCandidates.length) * 100);
    }
}
