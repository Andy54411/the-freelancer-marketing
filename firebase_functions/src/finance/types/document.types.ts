// firebase_functions/src/finance/types/document.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export type DocumentType = 
  | 'RECEIPT'           // Beleg/Quittung
  | 'INVOICE_ATTACHMENT'// Rechnungsanhang
  | 'CONTRACT'          // Vertrag
  | 'BANK_STATEMENT'    // Kontoauszug
  | 'TAX_DOCUMENT'      // Steuerunterlagen
  | 'CORRESPONDENCE'    // Korrespondenz
  | 'OTHER';            // Sonstiges

export type ProcessingStatus = 
  | 'UPLOADED'          // Hochgeladen
  | 'PROCESSING'        // Wird verarbeitet
  | 'PROCESSED'         // Verarbeitet
  | 'FAILED'            // Fehler bei Verarbeitung
  | 'ARCHIVED';         // Archiviert

export interface DocumentMetadata {
  id: string;
  companyId: string;
  
  // Datei-Information
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;               // in Bytes
  
  // Speicherort
  storageUrl: string;
  thumbnailUrl?: string;
  
  // Kategorisierung
  type: DocumentType;
  category?: string;
  subcategory?: string;
  tags: string[];
  
  // OCR & Verarbeitung
  processingStatus: ProcessingStatus;
  ocrText?: string;
  ocrConfidence?: number;         // 0-100%
  
  // Automatische Erkennung
  autoDetected: {
    documentType?: DocumentType;
    vendor?: string;
    amount?: number;              // in Cent
    date?: Timestamp;
    invoiceNumber?: string;
    confidence?: number;          // 0-100%
  };
  
  // Verknüpfungen
  linkedInvoiceId?: string;
  linkedExpenseId?: string;
  linkedCustomerId?: string;
  linkedTransactionId?: string;
  
  // GoBD-Compliance
  gobd: {
    immutable: boolean;
    archived: boolean;
    digitalSignature?: string;
    verificationHash: string;
    exportedAt?: Timestamp;
  };
  
  // Workflow
  reviewRequired: boolean;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  
  // Metadaten
  uploadedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;
}

export interface ReceiptData {
  id: string;
  documentId: string;
  companyId: string;
  
  // Beleg-Details
  vendor: string;
  vendorAddress?: string;
  vendorTaxNumber?: string;
  
  // Beträge
  totalAmount: number;            // in Cent
  netAmount?: number;
  taxAmount?: number;
  currency: string;
  
  // Steuer-Details
  taxBreakdown: {
    rate: number;                 // Steuersatz in %
    netAmount: number;            // Nettobetrag in Cent
    taxAmount: number;            // Steuerbetrag in Cent
  }[];
  
  // Datumsangaben
  receiptDate: Timestamp;
  
  // Zusätzliche Daten
  receiptNumber?: string;
  description?: string;
  paymentMethod?: string;
  
  // Kategorisierung
  expenseCategory?: string;
  businessPurpose?: string;
  isBusinessExpense: boolean;
  
  // OCR-Extraktion
  extractedData: {
    confidence: number;
    rawText: string;
    extractedFields: Record<string, any>;
  };
  
  // Workflow
  needsReview: boolean;
  isApproved: boolean;
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DocumentProcessingJob {
  id: string;
  companyId: string;
  documentId: string;
  
  // Job-Details
  jobType: 'OCR' | 'CLASSIFICATION' | 'EXTRACTION' | 'ARCHIVE';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  
  // Verarbeitung
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  processingTimeMs?: number;
  
  // Provider
  provider: 'GOOGLE_VISION' | 'AWS_TEXTRACT' | 'AZURE_FORM_RECOGNIZER' | 'TESSERACT';
  providerJobId?: string;
  
  // Ergebnisse
  result?: {
    ocrText?: string;
    confidence?: number;
    extractedFields?: Record<string, any>;
    classifications?: {
      type: DocumentType;
      confidence: number;
    }[];
  };
  
  // Fehlerbehandlung
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  nextRetryAt?: Timestamp;
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DocumentSettings {
  companyId: string;
  
  // OCR-Konfiguration
  ocr: {
    enabled: boolean;
    provider: 'GOOGLE_VISION' | 'AWS_TEXTRACT' | 'AZURE_FORM_RECOGNIZER' | 'TESSERACT';
    language: string;
    autoProcess: boolean;
  };
  
  // Automatische Klassifizierung
  autoClassification: {
    enabled: boolean;
    minConfidence: number;        // 0-100%
    autoLink: boolean;            // Automatisch verknüpfen
  };
  
  // Speicher-Einstellungen
  storage: {
    maxFileSize: number;          // in MB
    allowedMimeTypes: string[];
    compressionEnabled: boolean;
    retentionDays: number;        // 0 = unbegrenzt
  };
  
  // Workflow
  workflow: {
    requireReview: boolean;
    requireApproval: boolean;
    autoArchive: boolean;
    autoArchiveDays: number;
  };
  
  // Benachrichtigungen
  notifications: {
    onUpload: boolean;
    onProcessingComplete: boolean;
    onError: boolean;
    recipients: string[];
  };
  
  // Metadaten
  updatedAt: Timestamp;
  updatedBy: string;
}

// Request/Response Types

export interface UploadDocumentRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  type: DocumentType;
  category?: string;
  tags?: string[];
  
  // Verknüpfungen
  linkedInvoiceId?: string;
  linkedExpenseId?: string;
  linkedCustomerId?: string;
  
  // Verarbeitung
  autoProcess?: boolean;
  requireReview?: boolean;
}

export interface UpdateDocumentRequest {
  type?: DocumentType;
  category?: string;
  subcategory?: string;
  tags?: string[];
  
  // Verknüpfungen
  linkedInvoiceId?: string;
  linkedExpenseId?: string;
  linkedCustomerId?: string;
  linkedTransactionId?: string;
  
  // Workflow
  reviewRequired?: boolean;
  isApproved?: boolean;
}

export interface ProcessDocumentRequest {
  documentId: string;
  jobType: 'OCR' | 'CLASSIFICATION' | 'EXTRACTION' | 'ARCHIVE';
  provider?: 'GOOGLE_VISION' | 'AWS_TEXTRACT' | 'AZURE_FORM_RECOGNIZER' | 'TESSERACT';
  forceReprocess?: boolean;
}

export interface DocumentSearchFilters {
  type?: DocumentType[];
  processingStatus?: ProcessingStatus[];
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  tags?: string[];
  category?: string;
  linkedInvoiceId?: string;
  linkedExpenseId?: string;
  linkedCustomerId?: string;
  searchTerm?: string;
  needsReview?: boolean;
  isApproved?: boolean;
}

export interface DocumentListResponse {
  documents: DocumentMetadata[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface DocumentStatistics {
  total: number;
  byType: {
    type: DocumentType;
    count: number;
    totalSize: number;
  }[];
  
  processing: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  
  thisMonth: {
    uploaded: number;
    processed: number;
    totalSize: number;
  };
  
  storage: {
    totalSize: number;            // in Bytes
    avgFileSize: number;          // in Bytes
    largestFile: number;          // in Bytes
  };
  
  automation: {
    autoClassifiedRate: number;   // %
    avgProcessingTime: number;    // in ms
    ocrSuccessRate: number;       // %
  };
}

// Helper Types für OCR und Extraktion

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: {
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
}

export interface FieldExtraction {
  field: string;
  value: string;
  confidence: number;
  source: 'OCR' | 'PATTERN' | 'ML' | 'MANUAL';
}
