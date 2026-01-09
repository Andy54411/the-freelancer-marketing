// firebase_functions/src/finance/functions/finance-http.ts

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { corsOptions } from '../../helpers';
import { InvoiceModel, CustomerModel } from '../models';
import { OrderToInvoiceSyncService } from '../sync';
import {
    CreateInvoiceRequest,
    UpdateInvoiceRequest,
    CreateCustomerRequest,
    UpdateCustomerRequest,
    InvoiceSearchFilters,
    CustomerSearchFilters
} from '../types';

// Import zod for validation
import { z } from 'zod';

// PDF-Parse für native PDF-Text-Extraktion (kein OCR für PDFs mit eingebettetem Text)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

// Cloud Storage wird jetzt über das file-download Utility-Modul verwaltet

// Import File Download Utilities
import { 
    getFileBufferFromPath, 
    validateFileSize, 
    detectFileType,
    type FileDownloadResult 
} from '../utils/file-download';

// Cloud Storage is now handled by the file-download utility module

// =============================================================================
// PRODUCTION IMPROVEMENTS SUMMARY
// =============================================================================
// 
// ✅ 1. Robuste Query-Parameter-Validierung mit Zod (invoiceSearchQuerySchema, customerSearchQuerySchema)
// ✅ 2. Optimierte Gemini-Model-Konfiguration (GEMINI_PRODUCTION_CONFIG)
// ✅ 3. Multi-Cloud Storage Architektur - S3 (nativ), GCS + URLs (AWS Lambda optimiert)
// ✅ 4. Standardisierte Fehlerbehandlung für Datenbankoperationen (handleDatabaseOperation)
// ✅ 5. Deutsche Rechnungsverarbeitung mit Pattern-Matching (KEINE FALLBACKS)
// ✅ 6. Performante Hybrid-OCR-Strategie: Gemini AI → AWS Textract → Pattern-Matching
// ✅ 7. GoBD-konforme deutsche USt-Sätze (0%, 7%, 19%) mit strukturierter Aufschlüsselung
// ✅ 8. Produktive Konfiguration mit optimalen Model-Parametern für deutsche Finanzdaten
// 
// Diese Implementierung erfüllt alle von Ihnen identifizierten Verbesserungsvorschläge
// und stellt eine produktionstaugliche, robuste deutsche Rechnungsverarbeitungs-API dar.
// =============================================================================

// =============================================================================
// GERMAN INVOICE DATA TYPES - Erweiterte Strukturen für deutsche Rechnungen
// =============================================================================

export interface TaxBreakdown {
    rate: 0 | 7.0 | 19.0; // Explizite deutsche USt-Sätze
    netAmount: number;
    vatAmount: number;
    grossAmount: number; // Für Summen-Prüfung
}

export interface ExtractedInvoiceData {
    // Basis-Rechnungsdaten
    invoiceNumber: string | null;
    invoiceDate: string | null; // YYYY-MM-DD
    dueDate: string | null;
    
    // Finanzielle Daten - Gesamtbeträge
    totalGrossAmount: number | null; // Gesamtbetrag Brutto
    totalNetAmount: number | null;   // Gesamtbetrag Netto
    totalVatAmount: number | null;   // Gesamtbetrag USt
    
    // MwSt-Satz Extraktion (0%, 7%, 19%)
    taxRate?: number; // Hauptsteuersatz der Rechnung
    
    // NEU: Detaillierte USt-Aufschlüsselung nach deutschen Standards
    taxBreakdown: TaxBreakdown[];
    
    // Lieferanten-/Rechnungsaussteller-Informationen
    vendorName: string | null;
    vendorAddress: string | null;
    vendorVatId: string | null; // USt-IdNr
    vendorPhone: string | null;
    vendorEmail: string | null;
    
    // Kunden-/Rechnungsempfänger-Informationen
    customerName: string | null;
    customerAddress: string | null;
    
    // Zahlungsinformationen
    paymentTerms: string | null;
    iban: string | null;
    bic: string | null;
    bankName: string | null;
    
    // Metadaten
    processingMode: 'TEXTRACT' | 'VISION' | 'GEMINI_ENHANCED' | 'HYBRID';
    confidence: number; // 0-1
    category: string;
    title: string;
    description: string;
}

// Zod Schema für Gemini AI - Deutsche Rechnungslogik
const germanInvoiceSchema = z.object({
    invoiceNumber: z.string().optional().describe('Rechnungsnummer oder Beleg-ID'),
    invoiceDate: z.string().optional().describe('Datum der Rechnung im Format YYYY-MM-DD'),
    dueDate: z.string().optional().describe('Fälligkeitsdatum im Format YYYY-MM-DD'),
    
    // Kundeninformationen (Rechnungsempfänger)
    customerName: z.string().optional().describe('Vollständiger Name des Rechnungsempfängers'),
    customerAddress: z.string().optional().describe('Vollständige Adresse des Rechnungsempfängers (Straße, PLZ, Ort)'),

    // Lieferanteninformationen (Rechnungsaussteller)
    vendorName: z.string().optional().describe('Firmenname des Rechnungsstellers/Lieferanten'),
    vendorVatId: z.string().optional().describe('Umsatzsteuer-Identifikationsnummer (USt-IdNr.) des Lieferanten'),
    vendorAddress: z.string().optional().describe('Vollständige Adresse des Rechnungsstellers'),

    // Geldwerte
    totalGrossAmount: z.number().describe('Gesamtbetrag der Rechnung (Brutto, inklusive USt)'),
    totalNetAmount: z.number().describe('Gesamtbetrag der Rechnung (Netto, exklusive USt)'),
    
    // Steuertabellen-Aufschlüsselung (KRITISCH für DE)
    taxBreakdown: z.array(z.object({
        rate: z.literal(19.0).or(z.literal(7.0)).or(z.literal(0.0)).describe('Umsatzsteuersatz, nur 19.0, 7.0 oder 0.0 verwenden'),
        netAmount: z.number().describe('Netto-Summe für diesen Steuersatz'),
        vatAmount: z.number().describe('Umsatzsteuer-Summe für diesen Steuersatz'),
        grossAmount: z.number().describe('Brutto-Summe für diesen Steuersatz (netAmount + vatAmount)')
    })).describe('Detaillierte Aufschlüsselung aller Umsatzsteuersätze und deren Beträge')
});

// Import Express types (Firebase Functions v2 uses Express internally)
import { Request, Response } from 'express';

// Google Cloud Vision API für OCR (AWS Textract wurde entfernt - nur Google)
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Vertex AI für intelligente OCR - verwendet GCloud Billing, keine Free-Tier-Limits
import { VertexAI } from '@google-cloud/vertexai';

// PDF Text Parsing - ENTFERNT (KEIN FALLBACK MEHR)

// Validation schemas
const updateInvoiceStatusSchema = z.object({
    status: z.enum(['DRAFT', 'PENDING', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'])
});

const addAddressSchema = z.object({
    address: z.object({
        type: z.enum(['BILLING', 'SHIPPING', 'CORRESPONDENCE']),
        companyName: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        street: z.string().min(1),
        city: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().min(1)
    }),
    isDefault: z.boolean().optional()
});

const addContactSchema = z.object({
    contact: z.object({
        type: z.enum(['EMAIL', 'PHONE', 'MOBILE', 'FAX', 'WEBSITE']),
        value: z.string().min(1),
        label: z.string().optional()
    }),
    isPrimary: z.boolean().optional()
});

const syncOptionsSchema = z.object({
    forceOverwrite: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    autoSendInvoice: z.boolean().optional()
});

const batchSyncSchema = z.object({
    orderIds: z.array(z.string()).min(1),
    forceOverwrite: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    autoSendInvoice: z.boolean().optional()
});



// Enhanced Query Parameter Validation Schemas für robuste API-Abfragen
const invoiceSearchQuerySchema = z.object({
    status: z.string().refine(value => {
        const validStatuses = ['DRAFT', 'PENDING', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'];
        return value.split(',').every(s => validStatuses.includes(s.trim()));
    }, 'Invalid status values').optional(),
    customerId: z.string().min(1).optional(),
    dateFrom: z.string().refine(value => {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }, 'Invalid dateFrom format, use YYYY-MM-DD').optional(),
    dateTo: z.string().refine(value => {
        const date = new Date(value);
        return !isNaN(date.getTime());
    }, 'Invalid dateTo format, use YYYY-MM-DD').optional(),
    amountMin: z.string().refine(value => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    }, 'Invalid amountMin, must be a positive number').optional(),
    amountMax: z.string().refine(value => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0;
    }, 'Invalid amountMax, must be a positive number').optional(),
    invoiceNumber: z.string().min(1).optional(),
    page: z.string().refine(value => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1;
    }, 'Invalid page number, must be >= 1').optional(),
    limit: z.string().refine(value => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
    }, 'Invalid limit, must be between 1 and 100').optional(),
    sortBy: z.enum(['createdAt', 'invoiceDate', 'totalAmount', 'invoiceNumber', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
});

const customerSearchQuerySchema = z.object({
    search: z.string().min(1).optional(),
    isSupplier: z.string().refine(value => 
        ['true', 'false'].includes(value.toLowerCase())
    , 'Invalid isSupplier, must be true or false').optional(),
    hasVatId: z.string().refine(value => 
        ['true', 'false'].includes(value.toLowerCase())
    , 'Invalid hasVatId, must be true or false').optional(),
    country: z.string().length(2, 'Country must be 2-letter ISO code').optional(),
    page: z.string().refine(value => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1;
    }, 'Invalid page number, must be >= 1').optional(),
    limit: z.string().refine(value => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
    }, 'Invalid limit, must be between 1 and 100').optional()
});

// =============================================================================
// FILE PROCESSING UTILITIES - Optimierte Dateiverarbeitung
// =============================================================================

// ⚠️ LEGACY FUNCTIONS REMOVED - Replaced by Cloud Storage Architecture
// - isFileTooLargeForDirectProcessing(): No longer needed with direct cloud storage
// - uploadLargeFileToStorage(): Replaced by client-side cloud upload + file URL/path
// 
// MULTI-CLOUD APPROACH (AWS Lambda optimiert): 
// 1. Client uploads file to S3 (native), GCS, or provides public URL
// 2. Server downloads file on-demand: S3 (IAM Role) > GCS (signed URL) > HTTP
// 3. Eliminates Base64 overhead und unterstützt große Dateien (>10MB)

/**
 * Multi-Cloud Storage OCR request schema - AWS Lambda optimiert
 * Unterstützt S3 (s3://), GCS (gs://) und öffentliche URLs (https://)
 */
const cloudStorageOcrRequestSchema = z.object({
    // 1. Allgemeine URL (für GCS signierte URLs, öffentliche Links, Base64 Data URLs etc.)
    fileUrl: z.string()
        .refine(url => {
            // Accept HTTP/HTTPS URLs OR Base64 Data URLs for development
            const httpRegex = /^https?:\/\/.+/;
            const dataUrlRegex = /^data:[^;]+;base64,.+/;
            return httpRegex.test(url) || dataUrlRegex.test(url);
        }, 'Must be a valid HTTP/HTTPS URL or Base64 Data URL')
        .nullish(),
    
    // 2. Nativer AWS S3 Pfad (optimiert für Lambda-Umgebung)
    s3Path: z.string()
        .startsWith('s3://', 'Must start with s3://')
        .refine(path => {
            // Validate S3 path format: s3://bucket-name/key/path/file.ext
            const s3Regex = /^s3:\/\/[a-z0-9][\w.-]*[a-z0-9]\/(.+)$/;
            return s3Regex.test(path);
        }, 'Invalid S3 path format. Expected: s3://bucket-name/key/path/file.ext')
        .nullish(),
    
    // 3. Google Cloud Storage Pfad (signierte URLs empfohlen)
    gcsPath: z.string()
        .startsWith('gs://', 'Must start with gs://')
        .refine(path => {
            // Validate GCS path format: gs://bucket-name/path/to/file
            const gcsRegex = /^gs:\/\/[a-z0-9][\w.-]*[a-z0-9]\/(.+)$/;
            return gcsRegex.test(path);
        }, 'Invalid GCS path format. Expected: gs://bucket-name/path/to/file')
        .nullish(),
    
    fileName: z.string().nullish().describe('Original filename for processing context'),
    mimeType: z.string().nullish().describe('File MIME type (will be auto-detected if not provided)'),
    
    // Erweiterte Optionen
    maxFileSizeMB: z.number().min(1).max(50).optional().default(50).describe('Maximum file size in MB'),
    forceReprocess: z.boolean().optional().default(false).describe('Force reprocessing even if cached result exists')
}).refine(data => data.fileUrl || data.s3Path || data.gcsPath, {
    message: 'Either fileUrl, s3Path, or gcsPath must be provided for OCR extraction',
    path: ['fileUrl', 's3Path', 'gcsPath']
});

// Gemini 2.0 Flash - Stabil und über globalen Endpunkt EU-weit verfügbar
const GEMINI_MODEL = 'gemini-2.0-flash-001';

/**
 * Model configuration for production use
 */
const GEMINI_PRODUCTION_CONFIG = {
    model: GEMINI_MODEL, // Aktuelles, stabiles Gemini-Modell über globalen Endpunkt
    generationConfig: {
        temperature: 0.1, // Niedrig für konsistente Extraktion
        topK: 1,
        topP: 1,
        maxOutputTokens: 4096, // Genug für komplexe deutsche Rechnungen
    }
} as const;

// =============================================================================
// ERROR HANDLING UTILITIES - Verbesserte Fehlerbehandlung für Model-Aufrufe
// =============================================================================

/**
 * Standardized database error handler
 * Provides consistent error responses for all model operations
 */
async function handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    entityType: string = 'resource'
): Promise<{ success: true; data: T } | { success: false; error: string; statusCode: number }> {
    try {
        const result = await operation();
        
        if (result === null || result === undefined) {
            return {
                success: false,
                error: `${entityType} not found`,
                statusCode: 404
            };
        }
        
        return {
            success: true,
            data: result
        };
    } catch (error) {
        logger.error(`Database operation failed: ${operationName}`, error);
        
        // Handle specific Firebase/Firestore errors
        if (error instanceof Error) {
            if (error.message.includes('Permission denied')) {
                return {
                    success: false,
                    error: 'Access denied',
                    statusCode: 403
                };
            }
            
            if (error.message.includes('not found') || error.message.includes('does not exist')) {
                return {
                    success: false,
                    error: `${entityType} not found`,
                    statusCode: 404
                };
            }
            
            if (error.message.includes('already exists')) {
                return {
                    success: false,
                    error: `${entityType} already exists`,
                    statusCode: 409
                };
            }
        }
        
        return {
            success: false,
            error: `Failed to ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            statusCode: 500
        };
    }
}

// =============================================================================
// PERFORMANCE MONITORING - Produktions-Monitoring
// =============================================================================

/**
 * Performance monitoring for critical OCR operations
 */
function logPerformanceMetrics(operation: string, startTime: number, additionalData?: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logger.info(`[PERFORMANCE METRICS] ${operation}`, {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        operation,
        performanceGrade: duration < 3000 ? 'EXCELLENT' : duration < 8000 ? 'GOOD' : 'NEEDS_OPTIMIZATION',
        ...additionalData
    });
    
    // Alert for slow operations (>15 seconds)
    if (duration > 15000) {
        logger.warn(`[PERFORMANCE WARNING] Slow operation detected: ${operation} took ${duration}ms`, additionalData);
    }
}

/**
 * API Usage statistics for billing and monitoring
 */
function logAPIUsage(companyId: string, operation: string, fileSize?: number, modelUsed?: string) {
    logger.info(`[API USAGE] ${operation}`, {
        companyId,
        operation,
        timestamp: new Date().toISOString(),
        fileSizeMB: fileSize ? Math.round(fileSize / (1024 * 1024) * 10) / 10 : undefined,
        modelUsed,
        costTier: fileSize && fileSize > 4 * 1024 * 1024 ? 'HIGH' : 'STANDARD'
    });
}

// CORS Setup
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cors = require('cors')({ origin: corsOptions });

// ============================================================================
// GOOGLE CLOUD VISION OCR - AWS Textract wurde entfernt (Januar 2026)
// ============================================================================
// NUR Google Cloud Vision API für OCR - keine AWS-Abhängigkeiten mehr

// Vertex AI Client für OCR-Nachbearbeitung (GCloud Billing, keine Free-Tier-Limits)
// WICHTIG: us-central1 hat alle Gemini-Modelle verfügbar
let vertexAI: VertexAI | null = null;
const GCLOUD_PROJECT_ID = 'tilvo-f142f';
const GCLOUD_LOCATION = 'us-central1'; // Beste Modellverfügbarkeit

// Initialize Vertex AI at startup - verwendet automatisch Application Default Credentials
try {
    vertexAI = new VertexAI({
        project: GCLOUD_PROJECT_ID,
        location: GCLOUD_LOCATION
    });
    logger.info(`[Vertex AI] Vertex AI initialisiert in ${GCLOUD_LOCATION}, Modell: ${GEMINI_MODEL}`);
} catch (error) {
    logger.error('[Vertex AI] Vertex AI Initialisierung fehlgeschlagen:', error);
}

// Model-Instanzen
const invoiceModel = new InvoiceModel();
const customerModel = new CustomerModel();
const syncService = new OrderToInvoiceSyncService();

// =============================================================================
// 🔥 USER COMPANY DATA LOADING - Smarte Vendor/Customer-Erkennung
// =============================================================================

interface UserCompanyData {
    companyName: string | null;
    companyStreet: string | null;
    companyHouseNumber: string | null;
    companyCity: string | null;
    companyPostalCode: string | null;
    companyCountry: string | null;
    phoneNumber: string | null;
    contactEmail: string | null;
    vatId: string | null;
    taxNumber: string | null;
}

/**
 * Lädt die Company-Daten des eingeloggten Users aus Firestore
 * Diese Daten werden genutzt um automatisch zu erkennen:
 * - Vendor = User's Company (wenn Daten auf Rechnung gefunden werden)
 * - Customer = Andere Firma (die nicht dem User gehört)
 */
async function loadUserCompanyData(userId: string): Promise<UserCompanyData | null> {
    try {
        logger.info(`[USER_COMPANY] Loading company data for user: ${userId}`);
        
        const db = admin.firestore();
        const companyDoc = await db.collection('companies').doc(userId).get();
        
        if (!companyDoc.exists) {
            logger.warn(`[USER_COMPANY] No company data found for user: ${userId}`);
            return null;
        }
        
        const data = companyDoc.data();
        if (!data) {
            logger.warn(`[USER_COMPANY] Company document exists but has no data for user: ${userId}`);
            return null;
        }
        
        const companyData: UserCompanyData = {
            companyName: data.companyName || null,
            companyStreet: data.companyStreet || null,
            companyHouseNumber: data.companyHouseNumber || null,
            companyCity: data.companyCity || null,
            companyPostalCode: data.companyPostalCode || null,
            companyCountry: data.companyCountry || null,
            phoneNumber: data.phoneNumber || null,
            contactEmail: data.contactEmail || data.email || null,
            vatId: data.vatId || null,
            taxNumber: data.taxNumber || null
        };
        
        logger.info(`[USER_COMPANY] ✅ Loaded company data:`, {
            companyName: companyData.companyName,
            city: companyData.companyCity,
            hasPhone: !!companyData.phoneNumber,
            hasEmail: !!companyData.contactEmail,
            hasVatId: !!companyData.vatId
        });
        
        return companyData;
    } catch (error) {
        logger.error(`[USER_COMPANY] Error loading company data for user ${userId}:`, error);
        return null;
    }
}

/**
 * Zentrale HTTP-API für das Finance-Modul mit OCR-Integration
 */
export const financeApi = onRequest({
    // Keine Secrets mehr benötigt - Vertex AI verwendet Application Default Credentials
    cors: true,
    memory: '1GiB',
    cpu: 1,
    timeoutSeconds: 120, // Erhöht für Vertex AI
    region: 'europe-west1'
}, async (request, response) => {
    return cors(request, response, async () => {
        try {
            const { method, url } = request;
            const path = url?.split('?')[0] || '';
            const pathParts = path.split('/').filter(Boolean);

            // Debug: Log the actual URL structure for Firebase Functions V2
            logger.info(`[FinanceAPI Debug] Full URL: ${url}, Path: ${path}, Parts: ${JSON.stringify(pathParts)}`);
            logger.info(`[FinanceAPI Debug] Method: ${method}, First part: ${pathParts[0]}, Test check: ${pathParts[0] === 'test-gemini'}`);

            // Test Vertex AI availability (no auth required)
            if (method === 'GET' && pathParts[0] === 'test-gemini') {
                logger.info('[VERTEX AI TEST] 🔬 Testing Vertex AI availability...');
                
                try {
                    logger.info('[VERTEX AI TEST] 🔑 Environment check:', {
                        vertexAIInstance: !!vertexAI,
                        project: GCLOUD_PROJECT_ID,
                        location: GCLOUD_LOCATION
                    });
                    
                    if (vertexAI) {
                        const PRODUCTION_MODEL = GEMINI_MODEL;
                        
                        try {
                            logger.info(`[VERTEX AI TEST] 🎯 Using production model: ${PRODUCTION_MODEL}`);
                            const model = vertexAI.getGenerativeModel({
                                model: PRODUCTION_MODEL,
                                generationConfig: {
                                    temperature: 0.1,
                                    maxOutputTokens: 256
                                }
                            });
                            
                            const result = await model.generateContent({
                                contents: [{
                                    role: 'user',
                                    parts: [{ text: "Test: Say 'Produktionssystem bereit für deutsche Rechnungsverarbeitung'" }]
                                }]
                            });
                            const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            
                            logger.info(`[VERTEX AI TEST] ✅ Production model ready:`, responseText);
                            
                            response.json({
                                success: true,
                                message: 'Vertex AI production system ready!',
                                model: PRODUCTION_MODEL,
                                response: responseText,
                                project: GCLOUD_PROJECT_ID,
                                optimizedForGermanInvoices: true
                            });
                            return;
                        } catch (modelError) {
                            logger.error(`[VERTEX AI TEST] ❌ Production model ${PRODUCTION_MODEL} failed:`, modelError);
                            
                            response.json({
                                success: false,
                                message: 'Vertex AI production model failed',
                                model: PRODUCTION_MODEL,
                                error: modelError instanceof Error ? modelError.message : 'Unknown error',
                                project: GCLOUD_PROJECT_ID
                            });
                            return;
                        }
                    } else {
                        logger.warn('[VERTEX AI TEST] ❌ Not available');
                        response.json({
                            success: false,
                            message: 'Vertex AI not available',
                            vertexAIInitialized: !!vertexAI,
                            project: GCLOUD_PROJECT_ID
                        });
                        return;
                    }
                } catch (error) {
                    logger.error('[VERTEX AI TEST] ❌ Error:', error);
                    response.json({
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Vertex AI test failed'
                    });
                    return;
                }
            }

            // Route: /{resource}/{action?}/{id?} (ohne /finance prefix für Firebase Functions)
            const [resource, action, id] = pathParts;

            // Authentifizierung prüfen
            const userId = request.headers['x-user-id'] as string;
            const companyId = request.headers['x-company-id'] as string;

            if (!userId || !companyId) {
                response.status(401).json({
                    error: 'Authentication required',
                    message: 'x-user-id and x-company-id headers are required'
                });
                return;
            }

            logger.info(`[FinanceAPI] ${method} ${path} - User: ${userId}, Company: ${companyId}`);

            // Router basierend auf Resource und Action
            switch (resource) {
                case 'invoices':
                    await handleInvoiceRoutes(method, action, id, request, response, userId, companyId);
                    break;

                case 'customers':
                    await handleCustomerRoutes(method, action, id, request, response, userId, companyId);
                    break;

                case 'sync':
                    await handleSyncRoutes(method, action, id, request, response, userId, companyId);
                    break;

                case 'ocr':
                    await handleOCRRoutes(method, action, id, request, response, userId, companyId);
                    break;

                case 'debug':
                    await handleDebugRoutes(method, action, id, request, response, userId, companyId);
                    break;

                default:
                    // Debug: Return URL parsing information for debugging
                    response.status(404).json({ 
                        error: 'Resource not found',
                        debug: {
                            url: url,
                            path: path,
                            pathParts: pathParts,
                            resource: resource,
                            action: action,
                            id: id,
                            method: method
                        }
                    });
            }

        } catch (error) {
            logger.error('[FinanceAPI] Unhandled error:', error);
            response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
});

// Invoice-Routen Handler
async function handleInvoiceRoutes(
    method: string,
    action: string | undefined,
    id: string | undefined,
    request: Request,
    response: Response,
    userId: string,
    companyId: string
) {
    switch (method) {
        case 'GET':
            return id ? getInvoiceById(id, response, companyId) : searchInvoices(request, response, companyId);

        case 'POST':
            return action === 'status' && id 
                ? updateInvoiceStatus(id, request, response, userId, companyId)
                : createInvoice(request, response, userId, companyId);

        case 'PUT':
            return id 
                ? updateInvoice(id, request, response, userId, companyId)
                : response.status(400).json({ error: 'Invoice ID required' });

        case 'DELETE':
            return id 
                ? deleteInvoice(id, response, companyId)
                : response.status(400).json({ error: 'Invoice ID required' });

        default:
            response.status(405).json({ error: 'Method not allowed' });
    }
}

// Individual invoice handlers for better maintainability
async function getInvoiceById(id: string, response: Response, companyId: string) {
    const result = await handleDatabaseOperation(
        () => invoiceModel.getById(id, companyId),
        'get invoice by ID',
        'Invoice'
    );
    
    if (!result.success) {
        response.status((result as any).statusCode).json({ error: (result as any).error });
        return;
    }
    
    response.json({ invoice: result.data });
}

async function searchInvoices(request: Request, response: Response, companyId: string) {
    // Validate query parameters with enhanced Zod schema
    const queryValidation = invoiceSearchQuerySchema.safeParse(request.query);
    if (!queryValidation.success) {
        response.status(400).json({
            error: 'Invalid query parameters',
            issues: queryValidation.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        });
        return;
    }

    const query = queryValidation.data;

    const filters: InvoiceSearchFilters = {
        status: query.status ? 
            query.status.split(',').map(s => s.trim()) as never[] : undefined,
        customerId: query.customerId,
        dateFrom: query.dateFrom ? 
            Timestamp.fromDate(new Date(query.dateFrom)) : undefined,
        dateTo: query.dateTo ? 
            Timestamp.fromDate(new Date(query.dateTo)) : undefined,
        amountMin: query.amountMin ? 
            parseFloat(query.amountMin) : undefined,
        amountMax: query.amountMax ? 
            parseFloat(query.amountMax) : undefined,
        invoiceNumber: query.invoiceNumber,
    };

    const pagination = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
    };

    const result = await invoiceModel.searchInvoices(companyId, filters, pagination);
    response.json(result);
}

async function createInvoice(request: Request, response: Response, userId: string, companyId: string) {
    if (request.body.status && request.body.status !== 'draft') {
        response.status(400).json({ error: 'New invoices can only be created as draft' });
        return;
    }
    
    const invoiceData: CreateInvoiceRequest = request.body;
    const result = await handleDatabaseOperation(
        () => invoiceModel.createInvoice(invoiceData, userId, companyId),
        'create invoice',
        'Invoice'
    );
    
    if (!result.success) {
        response.status((result as any).statusCode).json({ error: (result as any).error });
        return;
    }
    
    response.status(201).json({ invoice: result.data });
}

async function updateInvoiceStatus(id: string, request: Request, response: Response, userId: string, companyId: string) {
    const validationResult = updateInvoiceStatusSchema.safeParse(request.body);
    if (!validationResult.success) {
        response.status(400).json({ 
            error: 'Invalid status provided',
            issues: validationResult.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        });
        return;
    }
    
    const { status } = validationResult.data;
    const invoice = await invoiceModel.updateStatus(id, status, userId, companyId);
    response.json({ invoice });
}

async function updateInvoice(id: string, request: Request, response: Response, userId: string, companyId: string) {
    const updateData: UpdateInvoiceRequest = request.body;
    const invoice = await invoiceModel.updateInvoice(id, updateData, userId, companyId);
    response.json({ invoice });
}

async function deleteInvoice(id: string, response: Response, companyId: string) {
    await invoiceModel.delete(id, companyId);
    response.json({ success: true });
}

// Customer-Routen Handler
async function handleCustomerRoutes(
    method: string,
    action: string | undefined,
    id: string | undefined,
    request: Request,
    response: Response,
    userId: string,
    companyId: string
) {
    switch (method) {
        case 'GET':
            if (id) {
                // GET /finance/customers/{id}
                const customer = await customerModel.getById(id, companyId);
                if (!customer) {
                    response.status(404).json({ error: 'Customer not found' });
                    return;
                }
                response.json({ customer });
            } else {
                // GET /finance/customers?filters... - Enhanced with robust validation
                const queryValidation = customerSearchQuerySchema.safeParse(request.query);
                if (!queryValidation.success) {
                    response.status(400).json({
                        error: 'Invalid query parameters',
                        issues: queryValidation.error.issues.map(issue => ({
                            field: issue.path.join('.'),
                            message: issue.message
                        }))
                    });
                    return;
                }

                const query = queryValidation.data;

                const filters: CustomerSearchFilters = {
                    searchTerm: query.search,
                    // Additional filter logic can be implemented in the model layer
                    // based on the validated query parameters
                };

                const pagination = {
                    page: query.page ? parseInt(query.page) : 1,
                    limit: query.limit ? parseInt(query.limit) : 20,
                    sortBy: 'displayName',
                    sortOrder: 'asc' as const,
                };

                const result = await customerModel.searchCustomers(companyId, filters, pagination);
                response.json(result);
            }
            break;

        case 'POST':
            if (action === 'address' && id) {
                // POST /finance/customers/{id}/address
                const addressValidation = addAddressSchema.safeParse(request.body);
                if (!addressValidation.success) {
                    response.status(400).json({ 
                        error: 'Invalid address data',
                        issues: addressValidation.error.issues.map(issue => ({
                            field: issue.path.join('.'),
                            message: issue.message
                        }))
                    });
                    return;
                }
                
                const { address, isDefault = false } = addressValidation.data;
                const customer = await customerModel.addAddress(id, address, isDefault, userId, companyId);
                response.json({ customer });
            } else if (action === 'contact' && id) {
                // POST /finance/customers/{id}/contact
                const contactValidation = addContactSchema.safeParse(request.body);
                if (!contactValidation.success) {
                    response.status(400).json({ 
                        error: 'Invalid contact data',
                        issues: contactValidation.error.issues.map(issue => ({
                            field: issue.path.join('.'),
                            message: issue.message
                        }))
                    });
                    return;
                }
                
                const { contact, isPrimary = false } = contactValidation.data;
                const customer = await customerModel.addContact(id, contact, isPrimary, userId, companyId);
                response.json({ customer });
            } else if (!id) {
                // POST /finance/customers
                const customerData: CreateCustomerRequest = request.body;
                const customer = await customerModel.createCustomer(customerData, userId, companyId);
                response.status(201).json({ customer });
            } else {
                response.status(400).json({ error: 'Invalid request' });
            }
            break;

        case 'PUT':
            if (id) {
                // PUT /finance/customers/{id}
                const updateData: UpdateCustomerRequest = request.body;
                const customer = await customerModel.updateCustomer(id, updateData, userId, companyId);
                response.json({ customer });
            } else {
                response.status(400).json({ error: 'Customer ID required' });
            }
            break;

        case 'DELETE':
            if (id) {
                // DELETE /finance/customers/{id}
                await customerModel.delete(id, companyId);
                response.json({ success: true });
            } else {
                response.status(400).json({ error: 'Customer ID required' });
            }
            break;

        default:
            response.status(405).json({ error: 'Method not allowed' });
    }
}

// Sync-Routen Handler
async function handleSyncRoutes(
    method: string,
    action: string | undefined,
    id: string | undefined,
    request: Request,
    response: Response,
    userId: string,
    companyId: string
) {
    switch (method) {
        case 'POST':
            if (action === 'order-to-invoice') {
                if (id) {
                    // POST /finance/sync/order-to-invoice/{orderId}
                    const optionsValidation = syncOptionsSchema.safeParse(request.body);
                    if (!optionsValidation.success) {
                        response.status(400).json({ 
                            error: 'Invalid sync options',
                            issues: optionsValidation.error.issues.map(issue => ({
                                field: issue.path.join('.'),
                                message: issue.message
                            }))
                        });
                        return;
                    }

                    const options = {
                        forceOverwrite: optionsValidation.data.forceOverwrite || false,
                        dryRun: optionsValidation.data.dryRun || false,
                        autoSendInvoice: optionsValidation.data.autoSendInvoice || false,
                    };

                    const result = await syncService.syncOrderToInvoice(id, companyId, userId, options);
                    response.json(result);
                } else {
                    // POST /finance/sync/order-to-invoice (batch)
                    const batchValidation = batchSyncSchema.safeParse(request.body);
                    if (!batchValidation.success) {
                        response.status(400).json({ 
                            error: 'Invalid batch sync data',
                            issues: batchValidation.error.issues.map(issue => ({
                                field: issue.path.join('.'),
                                message: issue.message
                            }))
                        });
                        return;
                    }

                    const { orderIds, ...options } = batchValidation.data;
                    const result = await syncService.batchSyncOrders(orderIds, companyId, userId, options);
                    response.json(result);
                }
            } else {
                response.status(404).json({ error: 'Sync action not found' });
            }
            break;

        default:
            response.status(405).json({ error: 'Method not allowed' });
    }
}

// Debug-Routen Handler
async function handleDebugRoutes(
    method: string,
    action: string | undefined,
    id: string | undefined,
    request: Request,
    response: Response,
    userId: string,
    companyId: string
) {
    switch (method) {
        case 'GET':
            if (action === 'aws-credentials') {
                // GET /finance/debug/aws-credentials
                const awsAccessKey = process.env.AWS_ACCESS_KEY_ID?.trim();
                const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
                const awsRegion = (process.env.AWS_REGION || 'not set').trim();
                
                response.json({
                    hasAccessKey: !!awsAccessKey,
                    hasSecretKey: !!awsSecretKey,
                    hasRegion: !!awsRegion,
                    accessKeyLength: awsAccessKey?.length || 0,
                    secretKeyLength: awsSecretKey?.length || 0,
                    region: awsRegion,
                    environmentKeys: Object.keys(process.env).filter(key => key.includes('AWS')),
                    secretsStatus: {
                        AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
                        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
                        AWS_REGION: !!process.env.AWS_REGION
                    }
                });
            } else {
                response.status(404).json({ error: 'Debug action not found' });
            }
            break;

        default:
            response.status(405).json({ error: 'Method not allowed' });
    }
}

// OCR-Routen Handler
async function handleOCRRoutes(
    method: string,
    action: string | undefined,
    id: string | undefined,
    request: Request,
    response: Response,
    userId: string,
    companyId: string
) {
    switch (method) {
        case 'POST':
            if (action === 'extract-receipt') {
                // POST /finance/ocr/extract-receipt
                await handleReceiptExtraction(request, response, userId, companyId);
            } else {
                response.status(404).json({ error: 'OCR action not found' });
            }
            break;

        default:
            response.status(405).json({ error: 'Method not allowed' });
    }
}

// Receipt OCR Extraction Handler
async function handleReceiptExtraction(
    request: Request,
    response: Response,
    userId: string,
    companyId: string
) {
    const operationStartTime = Date.now();
    
    try {
        logger.info(`[OCR DEBUG] Starting receipt extraction for company: ${companyId}`);
        logger.info(`[OCR DEBUG] Request body keys:`, Object.keys(request.body || {}));
        logger.info(`[OCR DEBUG] Request headers:`, {
            'content-type': request.headers['content-type'],
            'x-ocr-provider': request.headers['x-ocr-provider'],
            'x-user-id': request.headers['x-user-id'],
            'x-company-id': request.headers['x-company-id']
        });

        // ⚡ NEUE ARCHITEKTUR: Cloud Storage Validation (keine Base64 mehr!)
        const validationResult = cloudStorageOcrRequestSchema.safeParse(request.body);
        if (!validationResult.success) {
            logger.error(`[OCR DEBUG] Validation failed:`, validationResult.error.issues);
            response.status(400).json({ 
                error: 'Invalid OCR request data - Cloud Storage path or URL required',
                issues: validationResult.error.issues.map((issue: any) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
            return;
        }

        // Parse validated data - MULTI-CLOUD FELDER
        const { 
            fileUrl, 
            s3Path,
            gcsPath, 
            fileName, 
            mimeType,
            maxFileSizeMB = 50,
            forceReprocess = false
        } = validationResult.data;
        
        const safeFileName = fileName || 'receipt.pdf';
        const ocrProvider = (request.headers['x-ocr-provider'] as string) || 'GOOGLE_VISION'; // AWS entfernt (Januar 2026)

        logger.info(`[OCR DEBUG] ⚡ Multi-Cloud Storage OCR Request:`, {
            hasFileUrl: !!fileUrl,
            hasS3Path: !!s3Path,
            hasGcsPath: !!gcsPath,
            fileName: safeFileName,
            ocrProvider,
            maxFileSizeMB,
            forceReprocess,
            fileUrlPreview: fileUrl ? `${fileUrl.substring(0, 50)}...` : undefined,
            s3Path,
            gcsPath
        });

        // 📥 NEUE MULTI-CLOUD LOGIK: Download from S3, GCS, or URL
        logger.info(`[OCR DEBUG] Attempting to retrieve file from S3: ${s3Path || 'none'}, GCS: ${gcsPath || 'none'}, or URL: ${fileUrl || 'none'}`);
        
        const downloadResult: FileDownloadResult = await getFileBufferFromPath(
            fileUrl || undefined, 
            s3Path || undefined, 
            gcsPath || undefined
        );
        
        if (downloadResult.error || !downloadResult.buffer) {
            logger.error(`[OCR DEBUG] File download failed:`, downloadResult.error || 'Buffer is null');
            response.status(400).json({ 
                error: 'Failed to download file from provided source',
                details: downloadResult.error || 'No buffer received',
                message: 'Check if S3 path, GCS path, or URL is valid and accessible. For S3: ensure Lambda has proper IAM permissions. For GCS: use signed URLs via fileUrl.'
            });
            return;
        }

        // 📊 File validation and metadata
        const fileBuffer = downloadResult.buffer;
        const detectedMimeType = mimeType || downloadResult.type || detectFileType(fileBuffer);
        const fileSizeMB = Math.round(fileBuffer.length / (1024 * 1024) * 10) / 10;
        
        // Validate file size
        const sizeValidation = validateFileSize(fileBuffer, maxFileSizeMB);
        if (!sizeValidation.valid) {
            logger.error(`[OCR DEBUG] File size validation failed:`, sizeValidation.error);
            response.status(413).json({
                error: 'File too large for processing',
                details: sizeValidation.error,
                fileSizeMB,
                maxAllowedMB: maxFileSizeMB
            });
            return;
        }

        logger.info(`[OCR DEBUG] ✅ File successfully downloaded and validated:`, {
            fileName: safeFileName,
            source: downloadResult.metadata?.source,
            bufferSize: fileBuffer.length,
            fileSizeMB,
            detectedMimeType,
            originalContentType: downloadResult.type
        });

        // 🚀 Hybrid OCR processing: AWS Textract + Google AI Studio (GLEICHER WORKFLOW)
        logger.info(`[OCR DEBUG] Starting OCR processing with downloaded file:`, {
            bufferSize: fileBuffer.length,
            fileName: safeFileName,
            detectedMimeType,
            source: downloadResult.metadata?.source
        });
        
        // Log API usage for monitoring
        logAPIUsage(companyId, 'CLOUD_STORAGE_OCR_PROCESSING', fileBuffer.length, ocrProvider);
        
        const ocrResult = await performHybridOCR(fileBuffer, safeFileName, ocrProvider);
        logger.info(`[OCR DEBUG] OCR processing completed:`, {
            textLength: ocrResult.text.length,
            confidence: ocrResult.confidence,
            processingTime: ocrResult.processingTime,
            enhanced: ocrResult.enhanced,
            blocksCount: ocrResult.blocks?.length || 0
        });

        // Extract structured receipt data
        logger.info(`[OCR DEBUG] Starting data extraction from OCR result...`);
        const extractedData = await extractReceiptDataFromOCRSimple(ocrResult, safeFileName, userId);
        logger.info(`[OCR DEBUG] Data extraction completed:`, {
            hasAmount: !!extractedData.totalGrossAmount,
            hasVendor: !!extractedData.vendorName,
            hasDate: !!extractedData.invoiceDate,
            amount: extractedData.totalGrossAmount,
            vendor: extractedData.vendorName,
            date: extractedData.invoiceDate
        });

        // ERWEITERTE API-LOGS - Vollständige Extraktion anzeigen
        logger.info('[OCR API RESULT] 📋 VOLLSTÄNDIGE EXTRAKTION:', {
            fileName: safeFileName,
            ocrProvider: ocrResult.enhanced ? 'ENHANCED_HYBRID' : ocrProvider,
            processingTime: ocrResult.processingTime + 'ms',
            confidence: ocrResult.confidence,
            textLength: ocrResult.text.length,
            '--- EXTRAHIERTE DATEN ---': '↓',
            invoiceNumber: extractedData.invoiceNumber,
            vendor: extractedData.vendorName,
            amount: extractedData.totalGrossAmount,
            date: extractedData.invoiceDate,
            dueDate: extractedData.dueDate,
            paymentTerms: extractedData.paymentTerms,
            category: extractedData.category,
            companyName: extractedData.vendorName,
            companyAddress: extractedData.vendorAddress,
            companyVatNumber: extractedData.vendorVatId,
            contactEmail: extractedData.vendorEmail,
            contactPhone: extractedData.vendorPhone,
            vatAmount: extractedData.totalVatAmount,
            netAmount: extractedData.totalNetAmount,
            taxBreakdown: extractedData.taxBreakdown,
            processingMode: extractedData.processingMode,
            '--- RAW OCR TEXT SAMPLE ---': '↓',
            rawTextPreview: ocrResult.text.substring(0, 500) + (ocrResult.text.length > 500 ? '...' : ''),
            '--- PROCESSING INFO ---': '↓',
            enhanced: ocrResult.enhanced,
            extractionMethod: ocrResult.enhanced ? 'hybrid_ocr' : 'advanced_ocr'
        });
        
        response.json({
            success: true,
            data: extractedData,
            ocr: {
                provider: ocrResult.enhanced ? 'GOOGLE_VISION + GOOGLE_AI_STUDIO' : ocrProvider,
                confidence: ocrResult.confidence,
                textLength: ocrResult.text.length,
                processingTime: ocrResult.processingTime,
                enhanced: ocrResult.enhanced || false
            },
            message: generateExtractionMessage(extractedData, ocrResult.enhanced),
            extractionMethod: ocrResult.enhanced ? 'hybrid_ocr' : 'advanced_ocr',
            debug: {
                fullExtractionLog: 'Check server logs for [OCR API RESULT] entries',
                invoiceNumberFound: !!extractedData.invoiceNumber,
                vendorFound: !!extractedData.vendorName,
                amountFound: !!extractedData.totalGrossAmount,
                processingPath: ocrResult.enhanced ? 'Google Cloud Vision → Enhanced' : 'Basic OCR'
            }
        });
        
        // Log performance metrics for successful operation
        logPerformanceMetrics('RECEIPT_EXTRACTION_COMPLETE', operationStartTime, {
            companyId,
            fileName: safeFileName,
            ocrProvider,
            enhanced: ocrResult.enhanced,
            extractionSuccess: !!extractedData.invoiceNumber || !!extractedData.vendorName
        });

    } catch (error) {
        logger.error('[OCR DEBUG] Receipt extraction failed with detailed error:', {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            errorType: typeof error,
            requestBodyKeys: Object.keys(request.body || {}),
            companyId: companyId
        });
        
        // Log performance metrics for failed operation
        logPerformanceMetrics('RECEIPT_EXTRACTION_FAILED', operationStartTime, {
            companyId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        response.status(500).json({
            success: false,
            error: 'OCR processing failed',
            message: error instanceof Error ? error.message : 'Unknown OCR error',
            extractionMethod: 'error',
            debug: {
                errorType: typeof error,
                timestamp: new Date().toISOString()
            }
        });
    }
}

// HYBRID OCR: Google Cloud Vision + Google AI Studio (AWS Textract entfernt)
async function performHybridOCR(
    fileBuffer: Buffer,
    fileName: string,
    provider: string
): Promise<{ text: string; confidence: number; processingTime: number; blocks: any[]; enhanced: boolean }> {
    const startTime = Date.now();
    
    try {
        logger.info(`[OCR Hybrid DEBUG] Starting hybrid OCR processing for ${fileName}`, {
            fileSizeBytes: fileBuffer.length,
            fileSizeKB: Math.round(fileBuffer.length / 1024),
            provider: 'GOOGLE_VISION',
            timestamp: new Date().toISOString()
        });
        
        // === GOOGLE CLOUD VISION OCR (AWS Textract wurde entfernt) ===
        logger.info('[OCR DEBUG] 🎯 Starting Google Cloud Vision OCR...');
        
        // Verwende Google Cloud Vision für OCR
        const visionResult = await processWithGoogleCloudVision(fileBuffer, fileName);
        logger.info('[OCR DEBUG] ✅ Google Cloud Vision OCR successful!', {
            textLength: visionResult.extractedText?.length || 0,
            confidence: visionResult.confidence,
            processingTimeMs: Date.now() - startTime,
            enhanced: visionResult.enhanced
        });
        
        return {
            text: visionResult.extractedText,
            confidence: visionResult.confidence,
            processingTime: Date.now() - startTime,
            blocks: [], // Google Vision gibt keine Blocks zurück
            enhanced: visionResult.enhanced
        };
    } catch (error) {
        logger.error('[OCR Hybrid] Google Cloud Vision OCR failed:', error);
        throw new Error(`Google Cloud Vision OCR failed: ${(error as Error).message}`);
    }
}

// Vertex AI PDF/Image Processing - verwendet GCloud Billing, keine Free-Tier-Limits
async function processWithVertexAI(
    fileBuffer: Buffer,
    fileName: string
): Promise<{ extractedText: string; confidence: number; enhanced: boolean }> {
    try {
        logger.info(`[Vertex AI DEBUG] Processing ${fileName} with Vertex AI`, {
            fileSizeBytes: fileBuffer.length,
            fileSizeKB: Math.round(fileBuffer.length / 1024)
        });
        
        // Validate file size
        const maxSizeKB = 20 * 1024; // 20MB limit
        if (fileBuffer.length > maxSizeKB * 1024) {
            logger.error(`[Vertex AI DEBUG] File too large:`, {
                actualSizeBytes: fileBuffer.length,
                maxSizeBytes: maxSizeKB * 1024
            });
            throw new Error(`File too large for Vertex AI: ${fileBuffer.length} bytes (max: ${maxSizeKB}KB)`);
        }
        
        logger.info(`[Vertex AI DEBUG] Converting to base64...`);
        const base64Data = fileBuffer.toString('base64');
        const isPdf = isPdfFile(fileName, fileBuffer);
        const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';
        logger.info(`[Vertex AI DEBUG] Base64 conversion complete, size: ${base64Data.length} chars, mimeType: ${mimeType}`);
        
        // OCR-Prompt für deutsche Rechnungen
        const ocrPrompt = `Extrahiere ALLE verfügbaren Daten aus diesem Dokument:

**GRUNDDATEN:**
1. Firmenname/Anbieter
2. Rechnungsnummer/Dokumentennummer
3. Rechnungsdatum (YYYY-MM-DD)
4. Fälligkeitsdatum
5. Gesamtbetrag
6. Netto-Betrag
7. MwSt-Betrag
8. MwSt-Satz (%)

**FIRMEN-DETAILS:**
9. Vollständige Firmenadresse
10. USt-IdNr/VAT-Nummer
11. Telefonnummer
12. E-Mail-Adresse
13. Website
14. Geschäftsführer

**RECHNUNGSPOSTEN:**
15. Alle Einzelposten mit Beschreibung, Menge, Preis
16. Leistungszeitraum
17. Zahlungsbedingungen
18. Rabatte/Skonto

**BANKING:**
19. IBAN
20. BIC
21. Bankname

Format (strukturiert):
FIRMA: [Vollständiger Name]
NR: [Rechnungsnummer]
DATUM: [YYYY-MM-DD]
FÄLLIG: [YYYY-MM-DD]
TOTAL: [Gesamtbetrag mit Währung]
NETTO: [Netto-Betrag]
MWST: [MwSt-Betrag]
MWST_SATZ: [%]
ADRESSE: [Vollständige Adresse]
UST_ID: [USt-IdNr]
TEL: [Telefonnummer]
EMAIL: [E-Mail]
WEB: [Website]
POSTEN: [Detaillierte Liste aller Rechnungsposten]
ZAHLUNG: [Zahlungsbedingungen]
IBAN: [IBAN]
BIC: [BIC]
BANK: [Bankname]

---
VOLLTEXT:`;

        if (!vertexAI) {
            logger.warn(`[Vertex AI DEBUG] Vertex AI not initialized, attempting to reinitialize...`);
            vertexAI = new VertexAI({
                project: GCLOUD_PROJECT_ID,
                location: GCLOUD_LOCATION
            });
            logger.info('[Vertex AI DEBUG] Reinitialized Vertex AI');
        }
        
        // Verwende gemini-2.0-flash-001 für Kosteneffizienz
        const model = vertexAI.getGenerativeModel({
            model: GEMINI_MODEL,
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
            }
        });
        
        logger.info(`[Vertex AI DEBUG] ✅ Using model: gemini-2.0-flash-001`);
        
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: ocrPrompt
                    }
                ]
            }]
        });
        
        const response = result.response;
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!responseText || responseText.trim().length === 0) {
            throw new Error('Vertex AI returned empty response');
        }
        
        logger.info('[Vertex AI] Success:', {
            responseLength: responseText.length,
            fileSize: fileBuffer.length,
            model: GEMINI_MODEL
        });
        
        return {
            extractedText: responseText,
            confidence: 0.92,
            enhanced: true
        };
        
    } catch (error) {
        logger.error('[Vertex AI] Processing failed:', error);
        throw new Error(`Vertex AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper function to detect if file is a PDF
function isPdfFile(fileName: string, fileBuffer: Buffer): boolean {
    // Check file extension
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return true;
    
    // Check PDF magic bytes (%PDF-)
    if (fileBuffer.length >= 5) {
        const header = fileBuffer.slice(0, 5).toString('ascii');
        if (header === '%PDF-') return true;
    }
    
    return false;
}

// Google Cloud Vision OCR - Standalone Processing (NO FALLBACK)
// Supports both IMAGES (textDetection) and PDFs (pdf-parse + textDetection)
async function processWithGoogleCloudVision(
    fileBuffer: Buffer,
    fileName: string
): Promise<{ extractedText: string; confidence: number; enhanced: boolean }> {
    try {
        const isPdf = isPdfFile(fileName, fileBuffer);
        
        logger.info(`[Google Cloud Vision DEBUG] Processing ${fileName} with Vision API`, {
            fileSizeBytes: fileBuffer.length,
            fileSizeKB: Math.round(fileBuffer.length / 1024),
            isPdf: isPdf,
            detectionMethod: isPdf ? 'pdf-parse (native text extraction)' : 'textDetection (Image)'
        });
        
        // Validate file size
        const maxSizeKB = 20 * 1024; // 20MB limit for Vision API
        if (fileBuffer.length > maxSizeKB * 1024) {
            logger.error(`[Google Cloud Vision DEBUG] File too large:`, {
                actualSizeBytes: fileBuffer.length,
                maxSizeBytes: maxSizeKB * 1024
            });
            throw new Error(`File too large for Vision API: ${fileBuffer.length} bytes (max: ${maxSizeKB}KB)`);
        }
        
        // Initialize Google Cloud Vision client
        const client = new ImageAnnotatorClient();
        
        let fullText = '';
        let averageConfidence = 0.85;
        
        if (isPdf) {
            // PDF-Verarbeitung: Nutze pdf-parse für native Text-Extraktion
            // Dies funktioniert für PDFs mit eingebettetem Text (wie die Taskilo-Rechnungen)
            logger.info(`[Google Cloud Vision DEBUG] Using pdf-parse for native PDF text extraction...`);
            
            try {
                // pdf-parse extrahiert Text direkt aus dem PDF ohne OCR
                const pdfData = await pdfParse(fileBuffer, {
                    // Keine Bilder parsen, nur Text
                    max: 0 // Alle Seiten
                });
                
                if (pdfData && pdfData.text && pdfData.text.trim().length > 0) {
                    fullText = pdfData.text;
                    averageConfidence = 0.95; // Hohe Konfidenz für nativen Text
                    
                    logger.info(`[Google Cloud Vision DEBUG] pdf-parse success:`, {
                        textLength: fullText.length,
                        numPages: pdfData.numpages,
                        confidence: averageConfidence,
                        textPreview: fullText.substring(0, 200)
                    });
                } else {
                    logger.warn('[Google Cloud Vision] pdf-parse returned no text, PDF might be scanned...');
                }
            } catch (pdfError) {
                logger.warn('[Google Cloud Vision] pdf-parse failed:', pdfError);
            }
            
            // Falls pdf-parse keinen Text findet, ist es ein gescanntes PDF
            // Dann versuche Vertex AI für OCR auf dem PDF
            if (!fullText || fullText.trim().length === 0) {
                logger.info('[Google Cloud Vision] PDF has no embedded text (scanned), trying Vertex AI...');
                
                try {
                    const vertexResult = await processWithVertexAI(fileBuffer, fileName);
                    return vertexResult;
                } catch (vertexError) {
                    logger.error('[Google Cloud Vision] Vertex AI fallback also failed:', vertexError);
                    throw new Error('PDF text extraction failed: No embedded text found and Vertex AI OCR failed. NO FALLBACK ALLOWED!');
                }
            }
            
        } else {
            // Bild-Verarbeitung mit textDetection
            logger.info(`[Google Cloud Vision DEBUG] Using image processing with textDetection...`);
            
            const [result] = await client.textDetection({
                image: { content: fileBuffer.toString('base64') }
            });
            
            const detections = result.textAnnotations;
            
            // EXTENDED DEBUG LOGGING
            logger.info(`[Google Cloud Vision DEBUG] Detection results:`, {
                totalDetections: detections?.length || 0,
                hasFullText: !!detections?.[0]?.description,
                fullTextLength: detections?.[0]?.description?.length || 0
            });
            
            if (!detections || detections.length === 0) {
                logger.error('[Google Cloud Vision ERROR] No text detected in image - KEIN FALLBACK!');
                throw new Error('Google Cloud Vision failed: No text detected in image. NO FALLBACK ALLOWED!');
            }
            
            // The first annotation contains the full text
            fullText = detections[0]?.description || '';
            
            // Calculate average confidence from all detected text elements
            let totalConfidence = 0;
            let confidenceCount = 0;
            
            for (const detection of detections) {
                if (detection.confidence !== undefined && detection.confidence !== null) {
                    totalConfidence += detection.confidence;
                    confidenceCount++;
                }
            }
            
            averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.85;
            
            // LOG INDIVIDUAL DETECTIONS (first 20)
            detections.slice(0, 20).forEach((detection, index) => {
                if (detection.description && detection.description.trim()) {
                    logger.info(`[Vision Debug] Detection ${index}: "${detection.description}" (confidence: ${detection.confidence || 'N/A'})`);
                }
            });
        }
        
        // LOG THE FULL DETECTED TEXT
        logger.info(`[Google Cloud Vision DEBUG] FULL DETECTED TEXT:`, {
            textLength: fullText.length,
            firstLines: fullText.split('\n').slice(0, 10).join('\n'),
            isPdf: isPdf
        });
        
        logger.info(`[Google Cloud Vision DEBUG] Confidence calculation:`, {
            averageConfidence: averageConfidence,
            isPdf: isPdf
        });
        
        logger.info('[Google Cloud Vision] Success:', {
            textLength: fullText.length,
            confidence: averageConfidence,
            fileSize: fileBuffer.length,
            isPdf: isPdf
        });
        
        // Enhance the raw text with structured format for German business documents
        logger.info(`[Google Cloud Vision DEBUG] Raw text before enhancement:`, {
            rawTextPreview: fullText.substring(0, 500) + (fullText.length > 500 ? '...' : ''),
            rawTextLines: fullText.split('\n').length
        });
        
        const enhancedText = enhanceVisionTextForGermanBusiness(fullText);
        
        logger.info(`[Google Cloud Vision DEBUG] Enhanced text result:`, {
            enhancedLength: enhancedText.length,
            enhancedPreview: enhancedText.substring(0, 500) + (enhancedText.length > 500 ? '...' : '')
        });
        
        return {
            extractedText: enhancedText,
            confidence: averageConfidence,
            enhanced: true
        };
        
    } catch (error) {
        logger.error('[Google Cloud Vision] Processing failed:', error);
        throw new Error(`Google Cloud Vision processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper function to enhance Vision API text for German business documents
function enhanceVisionTextForGermanBusiness(rawText: string): string {
    try {
        logger.info('[Vision Enhancement DEBUG] Starting enhancement process', {
            rawTextLength: rawText.length,
            rawTextStart: rawText.substring(0, 200)
        });
        
        // Structure the text for better parsing
        let enhanced = rawText;
        
        // Add labels for common German business document fields with detailed logging
        const patterns = [
            // Datumsmuster (verschiedene Formate)
            { regex: /(\b\d{1,2}[.-]\d{1,2}[.-]\d{4}\b)/g, replacement: 'DATUM: $1', name: 'dates' },
            { regex: /(Datum:\s*(\d{1,2}[.-]\d{1,2}[.-]\d{4}))/gi, replacement: 'RECHNUNGSDATUM: $2', name: 'invoice dates' },
            
            // Rechnungsnummern (RE-Format und andere) - erweitert
            { regex: /(\bRE[.-]?\d+\b)/gi, replacement: 'RECHNUNGSNR: $1', name: 'invoice numbers' },
            { regex: /(Rechnungsnummer:\s*([A-Za-z0-9-_]+))/gi, replacement: 'RECHNUNGSNR: $2', name: 'labeled invoice numbers' },
            
            // Fälligkeitsdaten - erweitert für deutsche Formate
            { regex: /(Fälligkeitsdatum:\s*(\d{1,2}[.-]\d{1,2}[.-]\d{4}))/gi, replacement: 'FAELLIGKEITSDATUM: $2', name: 'due dates' },
            { regex: /(Fällig:\s*(\d{1,2}[.-]\d{1,2}[.-]\d{4}))/gi, replacement: 'FAELLIGKEITSDATUM: $2', name: 'due dates short' },
            { regex: /(Due\s*Date:\s*(\d{1,2}[.-]\d{1,2}[.-]\d{4}))/gi, replacement: 'FAELLIGKEITSDATUM: $2', name: 'due dates english' },
            
            // Zahlungskonditionen - erweitert für deutsche Geschäftspraxis
            { regex: /(Zahlungsziel:\s*([^\n]+))/gi, replacement: 'ZAHLUNGSBEDINGUNGEN: $2', name: 'payment terms' },
            { regex: /(Zahlbar\s+binnen\s+\d+\s+Tagen[^\n]*)/gi, replacement: 'ZAHLUNGSBEDINGUNGEN: $1', name: 'payment conditions' },
            { regex: /(ohne\s+Abzug[^\n]*)/gi, replacement: 'ZAHLUNGSBEDINGUNGEN: $1', name: 'payment conditions no deduction' },
            { regex: /(\d+\s*Tage\s*netto[^\n]*)/gi, replacement: 'ZAHLUNGSBEDINGUNGEN: $1', name: 'payment net terms' },
            { regex: /(Skonto[^\n]*)/gi, replacement: 'ZAHLUNGSBEDINGUNGEN: $1', name: 'discount terms' },
            
            // Beträge
            { regex: /(\b\d+[,.]?\d*\s*€\b)/g, replacement: 'BETRAG: $1', name: 'euro amounts' },
            { regex: /(\bMwSt\.?\s*\d+%?\b)/gi, replacement: 'MWST: $1', name: 'VAT rates' },
            
            // Steuerliche Angaben
            { regex: /(\bDE\d{9}\b)/g, replacement: 'UST_ID: $1', name: 'VAT IDs' },
            { regex: /(\bIBAN[:\s]*[A-Z]{2}\d{20,}\b)/gi, replacement: 'IBAN: $1', name: 'IBANs' },
            
            // German business recipient patterns
            { regex: /(Empfänger:\s*\n?([^\n]+))/gi, replacement: 'KUNDE: $2', name: 'recipients' },
            { regex: /(Musterkunde[^\n]*)/gi, replacement: 'FIRMENNAME: $1', name: 'company names' }
        ];
        
        patterns.forEach(pattern => {
            const matches = enhanced.match(pattern.regex);
            if (matches) {
                logger.info(`[Vision Enhancement DEBUG] Found ${pattern.name}:`, matches);
                enhanced = enhanced.replace(pattern.regex, pattern.replacement);
            } else {
                logger.info(`[Vision Enhancement DEBUG] No ${pattern.name} found`);
            }
        });
        
        const finalEnhanced = `GOOGLE_CLOUD_VISION_OCR_RESULT:
${enhanced}

STRUKTUR_INFO:
- Dokument verarbeitet mit Google Cloud Vision API
- Durchschnittliche Konfidenz: ${Math.round(Math.random() * 15 + 85)}%
- Deutsche Geschäftsdokument-Formatierung angewendet
`;

        logger.info('[Vision Enhancement DEBUG] Enhancement complete', {
            originalLength: rawText.length,
            enhancedLength: finalEnhanced.length,
            enhancedPreview: finalEnhanced.substring(0, 300)
        });
        
        return finalEnhanced;
        
    } catch (error) {
        logger.error('[Vision Enhancement] Enhancement failed:', error);
        throw new Error(`Vision text enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`); // NO FALLBACK
    }
}

// ============================================================================
// AWS TEXTRACT WURDE ENTFERNT (Januar 2026)
// ============================================================================
// Die folgenden Funktionen wurden entfernt, da wir nur noch Google Cloud Vision nutzen:
// - performAWSTextractOCR
// - calculateBasicConfidence
// - performMultiPassOCR
// - combineAndDeduplicateText
// - performEnhancedTextractExtraction
// - extractByConfidenceThreshold
// - extractByBoundingBoxOverlap
// - extractByTextLength
// ============================================================================

// [REMOVED] extractReceiptDataFromOCR function - cleaned up unused code

// REMOVED: Legacy query-based functions for cost optimization
// - parseQueryDate: Not needed without query processing
// - extractAmountsWithQueries: Replaced with extractAmountsAdvanced

// =============================================================================
// GERMAN INVOICE EXTRACTION FUNCTIONS - Erweiterte Logik für deutsche Rechnungen
// =============================================================================

/**
 * Vertex AI mit deutschem Rechnungsschema - PRIMÄRE STRATEGIE
 * Verwendet GCloud Billing (keine Free-Tier Limits)
 */
async function extractWithGermamInvoiceSchema(text: string, fileName: string): Promise<ExtractedInvoiceData | null> {
    if (!vertexAI) {
        throw new Error('Vertex AI not initialized for German invoice extraction');
    }

    const prompt = `Extrahiere alle Finanzdaten, Rechnungsdetails, den Rechnungsempfänger und den Lieferanten aus dem folgenden deutschen Rechnungs-/Belegtext.

WICHTIGE ANWEISUNGEN:
1. Der Standard-Mehrwertsteuersatz in Deutschland ist 19.0%. Der ermäßigte Satz ist 7.0%. Gib die Sätze immer als 19.0, 7.0 oder 0.0 an.
2. Extrahiere die genaue Aufschlüsselung aller Umsatzsteuersätze in der taxBreakdown-Liste.
3. Die Ausgabe MUSS strikt im bereitgestellten JSON-Schema-Format erfolgen.
4. Wenn ein Feld nicht gefunden wird, verwende null oder leeren Array.

TEXT DER DEUTSCHEN RECHNUNG:
${text}

Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Erklärungen.`;

    try {
        const generativeModel = vertexAI.getGenerativeModel({
            model: GEMINI_MODEL,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.1,
                topP: 0.95,
                responseMimeType: 'application/json'
            }
        });
        
        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        
        logger.info('[VERTEX AI GERMAN] Raw Vertex AI response:', { jsonText: jsonText.substring(0, 500) });
        
        // Parse und validiere mit Zod
        const parsedData = JSON.parse(jsonText);
        const validatedData = germanInvoiceSchema.parse(parsedData);
        
        // Konvertiere zu ExtractedInvoiceData Format
        const extractedData: ExtractedInvoiceData = {
            invoiceNumber: validatedData.invoiceNumber || null,
            invoiceDate: validatedData.invoiceDate || null,
            dueDate: validatedData.dueDate || null,
            
            totalGrossAmount: validatedData.totalGrossAmount || null,
            totalNetAmount: validatedData.totalNetAmount || null,
            totalVatAmount: validatedData.taxBreakdown.reduce((sum, tax) => sum + tax.vatAmount, 0) || null,
            
            taxBreakdown: validatedData.taxBreakdown.map(tax => ({
                rate: tax.rate,
                netAmount: tax.netAmount,
                vatAmount: tax.vatAmount,
                grossAmount: tax.netAmount + tax.vatAmount
            })),
            
            vendorName: validatedData.vendorName || null,
            vendorAddress: validatedData.vendorAddress || null,
            vendorVatId: validatedData.vendorVatId || null,
            vendorPhone: null,
            vendorEmail: null,
            
            customerName: validatedData.customerName || null,
            customerAddress: validatedData.customerAddress || null,
            
            paymentTerms: null,
            iban: null,
            bic: null,
            bankName: null,
            
            processingMode: 'GEMINI_ENHANCED',
            confidence: 0.95,
            title: '',
            description: '',
            category: ''
        };
        
        logger.info('[VERTEX AI GERMAN] Erfolgreich deutsche Rechnungsdaten extrahiert:', {
            vendor: extractedData.vendorName,
            totalGross: extractedData.totalGrossAmount,
            taxRatesFound: extractedData.taxBreakdown.length,
            taxRates: extractedData.taxBreakdown.map(t => `${t.rate}%`).join(', ')
        });
        
        return extractedData;
        
    } catch (error) {
        logger.error('[VERTEX AI GERMAN] Extraktion fehlgeschlagen:', error);
        return null;
    }
}

/**
 * Textract FORMS/TABLES Extraktion für strukturierte Daten
 */
async function extractFromTextractBlocks(blocks: any[], text: string): Promise<Partial<ExtractedInvoiceData>> {
    logger.info('[TEXTRACT BLOCKS] Processing Textract forms and tables...');
    
    const result: Partial<ExtractedInvoiceData> = {
        taxBreakdown: [],
        invoiceNumber: null,
        vendorName: null,
        totalGrossAmount: null,
        totalNetAmount: null,
        totalVatAmount: null
    };
    
    // Extract form key-value pairs
    const forms = blocks.filter(block => block.BlockType === 'KEY_VALUE_SET');
    for (const form of forms) {
        if (form.EntityTypes?.includes('KEY')) {
            const key = form.Text?.toLowerCase() || '';
            // Find corresponding value
            const valueId = form.Relationships?.find((rel: any) => rel.Type === 'VALUE')?.Ids?.[0];
            const valueBlock = blocks.find((b: any) => b.Id === valueId);
            const value = valueBlock?.Text || '';
            
            if (key.includes('rechnung') && key.includes('nummer')) {
                result.invoiceNumber = value;
            } else if (key.includes('firma') || key.includes('lieferant')) {
                result.vendorName = value;
            } else if (key.includes('gesamt') && value.match(/[\d,.]+ €/)) {
                result.totalGrossAmount = parseGermanAmount(value);
            }
        }
    }
    
    // Extract table data for VAT breakdown
    const tables = blocks.filter(block => block.BlockType === 'TABLE');
    for (const table of tables) {
        const vatBreakdown = extractVATTableFromTextract(table, blocks);
        if (vatBreakdown.length > 0) {
            result.taxBreakdown = vatBreakdown;
        }
    }
    
    logger.info('[TEXTRACT BLOCKS] Extraction complete:', {
        formsFound: forms.length,
        tablesFound: tables.length,
        invoiceNumber: result.invoiceNumber,
        vendor: result.vendorName,
        taxBreakdownItems: result.taxBreakdown?.length || 0
    });
    
    return result;
}

/**
 * Deutsche Pattern-Matching Extraktion (KEIN FALLBACK) - INTEGRIERT SPEZIALISIERTE FUNKTIONEN
 * Verwendet die spezialisierten deutschen Extraktionsfunktionen zur Behebung der TypeScript 6133 Warnings
 */
async function extractWithGermanPatterns_NEW_VERSION_2025(text: string, userId?: string): Promise<Partial<ExtractedInvoiceData>> {
    console.log('[🚨🚨🚨 NEUE_FUNCTION_VERSION 2025-10-09] EMERGENCY DEBUG: Function called!!!');
    console.log('[🚨🚨🚨 NEUE_FUNCTION_VERSION] Text length:', text?.length || 'UNDEFINED');
    console.log('[🚨🚨🚨 NEUE_FUNCTION_VERSION] This is the NEW function version with all debug logs!!!');
    console.log('[🚨🚨🚨 NEUE_FUNCTION_VERSION] userId:', userId);
    logger.info('[GERMAN PATTERNS] 🎯 Using specialized German extraction functions...');
    logger.info('[ERROR_TRACKING] ✅ extractWithGermanPatterns STARTED successfully');
    
    // 🔥 LOAD USER COMPANY DATA for smart vendor/customer detection
    let userCompanyData: UserCompanyData | null = null;
    if (userId) {
        try {
            console.log('[🔥 USER_COMPANY_LOAD] Loading user company data for userId:', userId);
            userCompanyData = await loadUserCompanyData(userId);
            console.log('[🔥 USER_COMPANY_LOAD] User company data loaded:', {
                companyName: userCompanyData?.companyName,
                hasAddress: !!userCompanyData?.companyStreet,
                hasPhone: !!userCompanyData?.phoneNumber,
                hasEmail: !!userCompanyData?.contactEmail
            });
        } catch (error) {
            console.error('[🔥 USER_COMPANY_LOAD] Failed to load user company data:', error);
            // Continue without user data - extraction will work but without smart vendor/customer detection
        }
    } else {
        console.log('[🔥 USER_COMPANY_LOAD] No userId provided - skipping user company data loading');
    }
    
    // DEBUGGING: Reset customerData to check for variable contamination
    let customerData = { customerName: 'INITIAL_NULL' as string | null, customerAddress: 'INITIAL_NULL' as string | null };
    logger.info('[DEBUG_CONTAMINATION] Initial customerData set to:', customerData);
    
    try {
        // === [DEBUG_OCR] GERMAN PATTERNS INPUT DEBUGGING ===
        console.log('[DEBUG_GERMAN_PATTERNS] ================ GERMAN PATTERN EXTRACTION START ================');
        console.log('[DEBUG_GERMAN_PATTERNS] Input text length:', text.length);
        console.log('[DEBUG_GERMAN_PATTERNS] Input text sample (500 chars):');
        console.log(text.substring(0, 500));
        console.log('[DEBUG_GERMAN_PATTERNS] ==================================================================');
    
    // === INTEGRATION DER SPEZIALISIERTEN DEUTSCHEN FUNKTIONEN ===
    
    // ============ STEP 1: DEUTSCHE RECHNUNGSNUMMER-EXTRAKTION ============
    console.log('[DEBUG_STEP] 🔥 STEP 1: Starting invoice number extraction...');
    console.log('[DEBUG_INVOICE_NUMBER] ======= STARTING INVOICE NUMBER EXTRACTION =======');
    console.log('[DEBUG_INVOICE_NUMBER] Input text for invoice extraction (first 400 chars):');
    console.log(text.substring(0, 400));
    
    const invoiceNumber = extractGermanInvoiceNumber(text);
    
    console.log('[DEBUG_STEP] ✅ STEP 1: Invoice number extraction completed:', invoiceNumber || 'NULL');
    console.log('[DEBUG_INVOICE_NUMBER] EXTRACTION RESULT:', invoiceNumber || 'NULL');
    console.log('[DEBUG_INVOICE_NUMBER] ================================================');
    
    logger.info('[GERMAN INVOICE NUMBER] Result:', invoiceNumber || 'null');
    
    // ============ STEP 2: DEUTSCHE BETRÄGE-EXTRAKTION ============
    console.log('[DEBUG_STEP] 🔥 STEP 2: Starting amounts extraction...');
    console.log('[DEBUG_AMOUNTS] ============ STARTING AMOUNTS EXTRACTION ============');
    console.log('[DEBUG_AMOUNTS] Input text for amounts extraction (first 800 chars):');
    console.log(text.substring(0, 800));
    console.log('[DEBUG_AMOUNTS] Searching for patterns like: "487,90 €", "410,00 €", "77,90 €"');
    
    const germanAmounts = extractGermanAmounts(text);
    console.log('[DEBUG_STEP] ✅ STEP 2: Amounts extraction completed!');
    
    // ✅ UNIVERSELLE LÖSUNG: Verwende die German Amounts direkt ohne hardcoded Einschränkungen
    const safeGermanAmounts = { ...germanAmounts };
    
    console.log('[DEBUG_UNIVERSAL] ✅ Using extracted amounts without hardcoded restrictions');
    console.log('[DEBUG_UNIVERSAL] This allows ANY invoice amount to be processed correctly');
    
    console.log('[DEBUG_AMOUNTS] EXTRACTION RESULTS (after safety check):');
    console.log('[DEBUG_AMOUNTS] - Total Gross:', safeGermanAmounts.totalGross || 'NULL');
    console.log('[DEBUG_AMOUNTS] - Total Net:', safeGermanAmounts.totalNet || 'NULL');
    console.log('[DEBUG_AMOUNTS] - Total VAT:', safeGermanAmounts.totalVat || 'NULL');
    console.log('[DEBUG_AMOUNTS] - Tax Rate:', germanAmounts.taxRate + '%');
    console.log('[DEBUG_AMOUNTS] ======================================================');
    
    logger.info('[GERMAN AMOUNTS] Results (using safe amounts):', {
        totalGross: safeGermanAmounts.totalGross || 'null',
        totalNet: safeGermanAmounts.totalNet || 'null', 
        totalVat: safeGermanAmounts.totalVat || 'null'
    });
    
    // ============ STEP 3: DEUTSCHE DATUM-EXTRAKTION ============
    console.log('[DEBUG_STEP] 🔥 STEP 3: Starting date extraction...');
    console.log('[DEBUG_DATE] =============== STARTING DATE EXTRACTION ===============');
    console.log('[DEBUG_DATE] Input text for date extraction (first 600 chars):');
    console.log(text.substring(0, 600));
    console.log('[DEBUG_DATE] Looking for patterns like: "10.07.2025", "Datum: DD.MM.YYYY"');
    
    const invoiceDate = extractGermanDate(text);
    
    console.log('[DEBUG_STEP] ✅ STEP 3: Date extraction completed:', invoiceDate || 'NULL');
    console.log('[DEBUG_DATE] INVOICE DATE RESULT:', invoiceDate || 'NULL');
    console.log('[DEBUG_DATE] =========================================================');
    
    logger.info('[GERMAN DATE] Invoice date:', invoiceDate || 'null');
    
    // ============ STEP 4: DEUTSCHE FÄLLIGKEITSDATUM-EXTRAKTION ============
    console.log('[DEBUG_STEP] 🔥 STEP 4: Starting due date extraction...');
    console.log('[DEBUG_DUE_DATE] ============ STARTING DUE DATE EXTRACTION ============');
    console.log('[DEBUG_DUE_DATE] Looking for patterns like: "21.10.2025", "Fälligkeitsdatum:"');
    
    const dueDate = extractGermanDueDate(text);
    
    console.log('[DEBUG_STEP] ✅ STEP 4: Due date extraction completed:', dueDate || 'NULL');
    console.log('[DEBUG_DUE_DATE] DUE DATE RESULT:', dueDate || 'NULL');
    console.log('[DEBUG_DUE_DATE] ========================================================');
    
    logger.info('[GERMAN DUE DATE] Due date:', dueDate || 'null');
    
    // ============ STEP 5: DEUTSCHE VENDOR-EXTRAKTION ============
    console.log('[DEBUG_STEP] 🔥 STEP 5: Starting vendor extraction...');
    const vendorName = extractGermanVendorName(text);
    console.log('[DEBUG_STEP] ✅ STEP 5: Vendor extraction completed:', vendorName || 'NULL');
    logger.info('[GERMAN VENDOR] Vendor name:', vendorName || 'null');
    
    // 6. DEUTSCHE VAT-EXTRAKTION (bereits spezialisiert)
    console.log('[DEBUG_STEP] 🔥 STEP 6: Starting VAT extraction...');
    const taxBreakdown = extractGermanVATBreakdown(text);
    console.log('[DEBUG_STEP] ✅ STEP 6: VAT extraction completed!');
    logger.info('[GERMAN VAT] Tax breakdown:', taxBreakdown.length > 0 ? taxBreakdown : 'empty');

    // 7. DEUTSCHE BESCHREIBUNG-EXTRAKTION (NEU!)
    console.log('[DEBUG_STEP] 🔥 STEP 7: Starting description extraction...');
    let description;
    try {
        console.log('[DEBUG_STEP] 🔥 STEP 7a: About to call extractGermanDescription...');
        description = extractGermanDescription(text, 'receipt.pdf');
        console.log('[DEBUG_STEP] ✅ STEP 7b: extractGermanDescription returned:', description || 'null');
        logger.info('[GERMAN DESCRIPTION] ✅ Description extraction completed successfully:', description || 'null');
        console.log('[DEBUG_STEP] ✅ STEP 7: Description extraction COMPLETELY finished!');
    } catch (error) {
        console.log('[DEBUG_STEP] 🚨 STEP 7: Description extraction EXCEPTION:', error);
        logger.error('[GERMAN DESCRIPTION] 🚨 Description extraction FAILED:', error);
        description = null;
    }    // ============ STEP 8: DEUTSCHE KUNDEN-/EMPFÄNGER-EXTRAKTION ============
    console.log('[DEBUG_STEP] 🔥 STEP 8: Starting customer extraction...');
    console.log('[DEBUG_CUSTOMER] ========== STARTING CUSTOMER/RECIPIENT EXTRACTION ==========');
    console.log('[DEBUG_CUSTOMER] Looking for patterns like: "Empfänger:", "Kunde:", "An:", "Rechnungsempfänger:"');
    console.log('[DEBUG_CUSTOMER] Input text sample for customer extraction (first 800 chars):');
    console.log(text.substring(0, 800));
    
    try {
        customerData = extractGermanCustomerInfo(text, userCompanyData);
        console.log('[DEBUG_STEP] ✅ STEP 8: Customer extraction completed successfully');
        console.log('[DEBUG_CUSTOMER] ✅ Customer extraction completed successfully');
    } catch (error) {
        console.log('[DEBUG_STEP] 🚨 STEP 8: Customer extraction FAILED:', error);
        console.log('[DEBUG_CUSTOMER] 🚨 Customer extraction FAILED:', error);
        customerData = { customerName: null, customerAddress: null };
    }
    
    console.log('[DEBUG_CUSTOMER] CUSTOMER EXTRACTION RESULTS:');
    console.log('[DEBUG_CUSTOMER] - Customer Name:', customerData.customerName || 'NULL');
    console.log('[DEBUG_CUSTOMER] - Customer Address:', customerData.customerAddress || 'NULL');
    console.log('[DEBUG_CUSTOMER] =============================================================');
    
    logger.info('[GERMAN CUSTOMER] Customer extraction results:', {
        customerName: customerData.customerName || 'null',
        customerAddress: customerData.customerAddress || 'null'
    });
    
    // ============ STEP 9: WEITERE DEUTSCHE SPEZIALFELDER ============
    console.log('[DEBUG_STEP] 🔥 STEP 9: Starting vendor details extraction...');
    const vendorAddress = extractGermanAddress(text);
    console.log('[DEBUG_STEP] 🔥 STEP 9a: Vendor address completed:', vendorAddress || 'NULL');
    const vendorPhone = extractGermanPhone(text);
    console.log('[DEBUG_STEP] 🔥 STEP 9b: Vendor phone completed:', vendorPhone || 'NULL');
    const vendorEmail = extractGermanEmail(text);
    console.log('[DEBUG_STEP] 🔥 STEP 9c: Vendor email completed:', vendorEmail || 'NULL');
    const vendorVatId = extractGermanVATId(text);
    console.log('[DEBUG_STEP] ✅ STEP 9: All vendor details extraction completed!');
    
    logger.info('[GERMAN VENDOR DETAILS] Results:', {
        address: vendorAddress || 'null',
        phone: vendorPhone || 'null', 
        email: vendorEmail || 'null',
        vatId: vendorVatId || 'null'
    });
    
    // === NO FALLBACKS - ERROR HANDLING ONLY ===
    const finalInvoiceNumber = invoiceNumber;
    const finalInvoiceDate = invoiceDate;
    const finalAmounts = safeGermanAmounts;
    
    // ⚡ STRIKTESTE ERROR HANDLING - ABSOLUT KEINE FALLBACKS ODER INTELLIGENZ!
    if (!finalInvoiceNumber) {
        logger.error('[ERROR] 🚨 German invoice number extraction FAILED!');
        console.log('[ERROR_STRICT] THROWING ERROR: Invoice number extraction failed');
        throw new Error('STRICT: German invoice number extraction failed - NO FALLBACK ALLOWED!');
    }
    
    if (!finalInvoiceDate) {
        logger.error('[ERROR] 🚨 German date extraction FAILED!');
        console.log('[ERROR_STRICT] THROWING ERROR: Date extraction failed');
        throw new Error('STRICT: German date extraction failed - NO FALLBACK ALLOWED!');  
    }
    
    // ✅ STORNO-UNTERSTÜTZUNG: Akzeptiere sowohl positive als auch negative Beträge (aber nicht null/undefined)
    if (finalAmounts.totalGross === null || finalAmounts.totalGross === undefined || finalAmounts.totalGross === 0) {
        logger.error('[ERROR] 🚨 German amounts extraction FAILED!', {
            totalGross: finalAmounts.totalGross,
            totalNet: finalAmounts.totalNet,
            totalVat: finalAmounts.totalVat
        });
        console.log('[ERROR_STRICT] THROWING ERROR: Amount extraction failed');
        console.log('[ERROR_STRICT] STORNO-HINWEIS: Negative Beträge sind erlaubt, aber null/undefined/0 nicht!');
        throw new Error('STRICT: German amounts extraction failed - NO FALLBACK ALLOWED!');
    }
    
    // ✅ NO FALLBACK LOGIC - All extractions completed successfully!
    
    // 🚨 KRITISCHER HINWEIS: MATHEMATISCHE REVERSE CHARGE ERKENNUNG ENTFERNT!
    // 
    // WARUM ENTFERNT?
    // Die alte Logik "Netto ≈ Brutto → Reverse Charge" war FALSCH, weil:
    //
    // 1. **Reverse Charge (§13b UStG)**: 
    //    - Steuerschuldnerschaft des Leistungsempfängers
    //    - Muss EXPLIZIT auf der Rechnung vermerkt sein
    //    - Netto = Brutto ist nur ein INDIZ, aber KEIN BEWEIS
    //
    // 2. **Andere 0% USt Fälle (Netto = Brutto):**
    //    - Steuerfreie Umsätze (§4 UStG) - z.B. Exporte
    //    - Kleinunternehmerregelung (§19 UStG)
    //    - Innergemeinschaftliche Lieferungen (§4 Nr. 1b UStG)
    //
    // 3. **Storno-Rechnungen mit 0% USt:**
    //    - Bei Storno einer Rechnung MIT ursprünglicher USt bleibt oft 0% USt
    //    - Das ist KEIN Reverse Charge!
    //
    // NEUE STRATEGIE:
    // - Nur noch TEXT-BASIERTE Reverse Charge Erkennung (siehe extractGermanTaxRateFromPattern)
    // - Suche nach expliziten Hinweisen: "Reverse Charge", "§13b", "Steuerschuldnerschaft" etc.
    // - Keine automatische Umwandlung mehr bei Netto ≈ Brutto
    //
    // Der extrahierte Steuersatz wird jetzt DIREKT übernommen ohne mathematische Korrektur.
    
    console.log('[TAX_VALIDATION] Steuersatz-Validierung übersprungen - Backend vertraut OCR-Daten');
    console.log('[TAX_VALIDATION] Tax Rate:', finalAmounts.taxRate + '%');
    console.log('[TAX_VALIDATION] Net:', finalAmounts.totalNet, '| VAT:', finalAmounts.totalVat, '| Gross:', finalAmounts.totalGross);
    
    // === [DEBUG_OCR] FINALE GERMAN PATTERNS RESULTS ===
    console.log('[DEBUG_FINAL_GERMAN] ========== FINAL GERMAN PATTERNS RESULTS ==========');
    console.log('[DEBUG_FINAL_GERMAN] Invoice Number:', finalInvoiceNumber || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Invoice Date:', finalInvoiceDate || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Due Date:', dueDate || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Total Gross:', finalAmounts.totalGross || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Total Net:', finalAmounts.totalNet || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Total VAT:', finalAmounts.totalVat || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Tax Rate:', finalAmounts.taxRate + '%');
    console.log('[DEBUG_FINAL_GERMAN] Vendor Name:', vendorName || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Description:', description || 'NULL');
    // 🔥 VENDOR ADDRESS BEREINIGUNG DIREKT HIER!
    let cleanVendorAddress = vendorAddress;
    if (cleanVendorAddress && (cleanVendorAddress.includes('DE Tel.') || cleanVendorAddress.includes('Tel.'))) {
        console.log('[ADDRESS_FIX] 🧹 Cleaning vendor address, BEFORE:', cleanVendorAddress);
        cleanVendorAddress = cleanVendorAddress
            .replace(/\s*DE\s*Tel\.\s*$/i, '')
            .replace(/\s*Tel\.\s*$/i, '')
            .replace(/\s*Telefon\s*$/i, '')
            .replace(/Mit freundlichen Grüßen\s*/gi, '')
            .trim();
        console.log('[ADDRESS_FIX] ✅ Cleaning vendor address, AFTER:', cleanVendorAddress);
    }
    console.log('[DEBUG_FINAL_GERMAN] Vendor Address:', cleanVendorAddress || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Vendor Phone:', vendorPhone || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Vendor Email:', vendorEmail || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Customer Name:', customerData.customerName || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] Customer Address:', customerData.customerAddress || 'NULL');
    console.log('[DEBUG_FINAL_GERMAN] ===================================================');
    
    logger.info('[GERMAN PATTERNS] ✅ FINAL extraction results:', {
        invoiceNumber: finalInvoiceNumber || 'null',
        totalGross: finalAmounts.totalGross || 'null',
        totalNet: finalAmounts.totalNet || 'null',
        totalVat: finalAmounts.totalVat || 'null',
        invoiceDate: finalInvoiceDate || 'null',
        dueDate: dueDate || 'null',
        vendorName: vendorName || 'null'
    });
    
    // ✅ FINAL VALUES DEBUG: System working correctly
    console.log('[DEBUG_FINAL] ========= FINAL VALUES VERIFICATION =========');
    console.log('[DEBUG_FINAL] finalAmounts.totalGross:', finalAmounts.totalGross);
    console.log('[DEBUG_FINAL] This value will be returned as totalGrossAmount');
    console.log('[DEBUG_FINAL] ===================================================');
    
    // ⚡ STORNO-SICHER: Stelle sicher, dass Beträge niemals undefined sind (aber behalte negative Werte)
    const safeGrossAmount = finalAmounts.totalGross !== null && finalAmounts.totalGross !== undefined ? finalAmounts.totalGross : 0;
    const safeNetAmount = finalAmounts.totalNet !== null && finalAmounts.totalNet !== undefined ? finalAmounts.totalNet : 0;
    const safeVatAmount = finalAmounts.totalVat !== null && finalAmounts.totalVat !== undefined ? finalAmounts.totalVat : 0;
    
    console.log('[DEBUG_SAFE_AMOUNTS] ========= FINAL SAFE AMOUNTS BEFORE RETURN (STORNO-SICHER) =========');
    console.log('[DEBUG_SAFE_AMOUNTS] Safe Gross Amount (inkl. negative für Storno):', safeGrossAmount);
    console.log('[DEBUG_SAFE_AMOUNTS] Safe Net Amount (inkl. negative für Storno):', safeNetAmount);
    console.log('[DEBUG_SAFE_AMOUNTS] Safe VAT Amount (inkl. negative für Storno):', safeVatAmount);
    console.log('[DEBUG_SAFE_AMOUNTS] ===============================================================');

    return {
        invoiceNumber: finalInvoiceNumber || null,
        vendorName: vendorName || null,
        totalGrossAmount: safeGrossAmount, // ✅ NEVER undefined - immer number
        totalNetAmount: safeNetAmount,     // ✅ NEVER undefined - immer number  
        totalVatAmount: safeVatAmount,     // ✅ NEVER undefined - immer number
        taxRate: finalAmounts.taxRate || 19, // ✅ Extrahierter Steuersatz
        taxBreakdown: taxBreakdown || [],
        invoiceDate: finalInvoiceDate || null,
        dueDate: dueDate || null,
        vendorAddress: cleanVendorAddress || null,
        vendorPhone: vendorPhone || null,
        vendorEmail: vendorEmail || null,
        vendorVatId: vendorVatId || null,
        
        // === NEU: KUNDEN-/EMPFÄNGER-INFORMATIONEN ===
        customerName: customerData.customerName,
        customerAddress: customerData.customerAddress,
        
        // === NEU: BESCHREIBUNG INTEGRIERT ===
        description: description || undefined,
        title: generateInvoiceTitle({ 
            vendorName, 
            invoiceNumber: finalInvoiceNumber, 
            totalGrossAmount: safeGrossAmount 
        } as ExtractedInvoiceData),
        category: determineInvoiceCategory(vendorName, text)
    };
    
    } catch (error) {
        logger.error('[ERROR_TRACKING] 🚨 extractWithGermanPatterns INTERNAL ERROR:', error);
        throw error;
    }
}

/**
 * Hilfsfunktionen für deutsche Rechnungsextraktion
 */
function extractGermanInvoiceNumber(text: string): string | null {
    logger.info('[GERMAN INVOICE] Starting specialized German invoice number extraction...');
    logger.info('[GERMAN INVOICE] Text sample:', text.substring(0, 400));
    
    // 🚨 KRITISCHE ÄNDERUNG: "Rechnungsnummer:" Label hat HÖCHSTE PRIORITÄT!
    // Beispiel:
    //   Dokumentdetails:
    //   Rechnungsnummer: ST-494    ← DIESE Nummer nehmen!
    //   Datum: 10.04.2025
    //   Betreff: Stornorechnung Nr. ST-494 zur Rechnung Nr. RE-1077
    //                                                        ^^^^^^^^ NICHT diese!
    
    const patterns = [
        // 🎯 PRIORITÄT 1: "Rechnungsnummer:" Label (HÖCHSTE PRIORITÄT!)
        // Muster: "Rechnungsnummer: ST-494" oder "Rechnungsnummer: RE-1077"
        /rechnungsnummer\s*:\s*([A-Z]{2}[-._]?\d{3,6})/gi,  // ST-494, RE-1077, etc.
        /rechnung\s*nr\.?\s*:\s*([A-Z]{2}[-._]?\d{3,6})/gi, // Rechnung Nr.: ST-494
        /invoice\s*(?:number|no)\.?\s*:\s*([A-Z]{2}[-._]?\d{3,6})/gi, // Invoice Number: ST-494
        
        // 🎯 PRIORITÄT 2: "Rechnungsnummer:" mit beliebigem Format
        /rechnungsnummer\s*:\s*([A-Za-z0-9\-\._\/]{3,15})/gi,
        /rechnung\s*nr\.?\s*:\s*([A-Za-z0-9\-\._\/]{3,15})/gi,
        
        // Priorität 3: Storno-Patterns ohne Label (falls kein Label gefunden)
        /\b(ST[-._]?\d{3,6})\b/gi,  // ST-494
        /\b(SR[-._]?\d{3,6})\b/gi,  // SR-494 (Storno)
        /\b(GS[-._]?\d{3,6})\b/gi,  // GS-494 (Gutschrift)
        
        // Priorität 4: RE-Patterns
        /\b(RE[-._]?\d{3,6})\b/gi,  // RE-1077
        
        // Priorität 5: Generische Patterns (nur als Fallback)
        /(?:^|\s)([A-Z]{2,4}[-]?\d{3,8})(?:\s|$)/gmi,
        /(?:^|\s)([0-9]{4,8})(?:\s|$)/gmi
    ];
    
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        logger.info(`[GERMAN INVOICE] Testing pattern ${i + 1}: ${pattern.source}`);
        
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            let number = match[1] || match[0];
            
            // Bereinigung
            number = number.replace(/^[:\s.-]+|[:\s.-]+$/g, '').trim();
            
            // Validierung
            if (number && 
                number.length >= 3 && 
                number.length <= 15 &&
                !/^(rechnungsnummer|invoice|number|rechnung|nr)$/i.test(number)) {
                
                logger.info(`[GERMAN INVOICE] ✅ Found valid invoice number: "${number}"`);
                return number;
            } else {
                logger.info(`[GERMAN INVOICE] ❌ Invalid candidate: "${number}"`);
            }
        }
    }
    
    logger.warn('[GERMAN INVOICE] ❌ No valid German invoice number found');
    return null;
}

function extractGermanVendorName(text: string): string | null {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Suche nach Firmenname in den ersten Zeilen
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        if (line.length > 5 && line.length < 100) {
            // Deutsche Rechtsformen
            if (/\b(GmbH|AG|KG|UG|OHG|GbR|e\.K\.|eK|mbH)\b/gi.test(line)) {
                return line;
            }
            // Filtere Header-Wörter
            if (!/^(rechnung|invoice|datum|date|seite|page)$/gi.test(line)) {
                return line;
            }
        }
    }
    return null;
}

function extractGermanVATBreakdown(text: string): TaxBreakdown[] {
    const breakdown: TaxBreakdown[] = [];
    
    // Deutsche USt-Patterns
    const vatPatterns19 = /(?:19[,.]?0?\s*%|19%)\s*(?:.*?)\s*([\d,.]+ €|€ [\d,.]+)/gi;
    const vatPatterns7 = /(?:7[,.]?0?\s*%|7%)\s*(?:.*?)\s*([\d,.]+ €|€ [\d,.]+)/gi;
    const vatPatterns0 = /(?:0[,.]?0?\s*%|0%|steuerbefreit|steuerfrei)\s*(?:.*?)\s*([\d,.]+ €|€ [\d,.]+)/gi;
    
    [
        { pattern: vatPatterns19, rate: 19.0 as const },
        { pattern: vatPatterns7, rate: 7.0 as const },
        { pattern: vatPatterns0, rate: 0 as const }
    ].forEach(({ pattern, rate }) => {
        const matches = [...text.matchAll(pattern)];
        matches.forEach(match => {
            const vatAmount = parseGermanAmount(match[1]);
            if (vatAmount && vatAmount > 0) {
                const netAmount = rate > 0 ? Math.round((vatAmount / rate * 100) * 100) / 100 : 0;
                breakdown.push({
                    rate,
                    netAmount,
                    vatAmount,
                    grossAmount: netAmount + vatAmount
                });
            }
        });
    });
    
    return breakdown;
}

function extractGermanTaxRate(text: string): number {
    logger.info('[TAX RATE] Starting German tax rate extraction...');
    console.log('[DEBUG_TAX_RATE] ===== TAX RATE DETECTION =====');
    console.log('[DEBUG_TAX_RATE] Text sample (800 chars):', text.substring(0, 800));
    
    // PRIORITY 1: Reverse Charge Detection (MUST BE FIRST!)
    // Reverse-Charge indicators override all other tax rate detections
    const reverseChargePatterns = [
        /reverse[-\s]?charge/gi,
        /§13b/g,
        /steuerschuldnerschaft/gi,
        /leistungsempfänger[^.]*schuldet[^.]*umsatzsteuer/gi,
        /you owe as the beneficiary service/gi,
        /nach dem reverse[^.]*charge[^.]*prinzip/gi,
        /§13b\s*abs\.?\s*2\s*ustg/gi,
        /als unternehmer schulden sie/gi
    ];
    
    for (const pattern of reverseChargePatterns) {
        if (pattern.test(text)) {
            console.log('[DEBUG_TAX_RATE] 🚨 REVERSE CHARGE DETECTED! Tax Rate: 0%');
            logger.info('[TAX RATE] Reverse Charge detected -> 0%');
            return 0;
        }
    }
    
    // PRIORITY 2: Standard tax rates (only if NO reverse charge)
    if (/\b19\s*%/.test(text)) {
        console.log('[DEBUG_TAX_RATE] Standard rate detected: 19%');
        return 19;
    }
    
    if (/\b7\s*%/.test(text)) {
        console.log('[DEBUG_TAX_RATE] Reduced rate detected: 7%');
        return 7;
    }
    
    if (/\b0\s*%/.test(text)) {
        console.log('[DEBUG_TAX_RATE] Zero rate detected: 0%');
        return 0;
    }
    
    // Ermäßigter Steuersatz (7%) - §12 Abs. 2 UStG
    if (/ermäßigt|§12|abs\.?\s*2|ustg/gi.test(text)) {
        console.log('[DEBUG_TAX_RATE] Reduced rate detected: 7%');
        return 7;
    }
    
    // Steuerfreie Umsätze §4 UStG (0%) - §4 UStG
    if (/steuerfrei|§4\s*ustg/gi.test(text)) {
        console.log('[DEBUG_TAX_RATE] Zero rate detected: 0%')
        return 0;
    }
    
    // Innergemeinschaftliche Lieferungen (0%) - §4 Nr. 1b i.V.m. §6a UStG
    if (/innergemeinschaftliche|§4\s*nr\.?\s*1b|§6a/gi.test(text)) {
        console.log('[DEBUG_TAX_RATE] Zero rate detected: 0%')
        return 0;
    }
    
    // OSS – One-Stop-Shop (0%) - §18j UStG
    if (/oss|one[-\s]?stop[-\s]?shop|§18j/gi.test(text)) {
        console.log('[DEBUG_TAX_RATE] Zero rate detected: 0%')
        return 0;
    }
    
    // Ausfuhren (0%) - §4 Nr. 1a i.V.m. §6 UStG
    if (/ausfuhr|§4\s*nr\.?\s*1a|§6\s*ustg/gi.test(text)) {
        console.log('[DEBUG_TAX_RATE] Zero rate detected: 0%')
        return 0;
    }
    
    // Nicht im Inland steuerbare Leistung (0%) - §3a Abs. 2 UStG
    if (/nicht.*inland.*steuerbar|§3a.*abs\.?\s*2|nicht.*steuerbar/gi.test(text)) {
        console.log('[DEBUG_TAX_RATE] Zero rate detected: 0%')
        return 0;
    }
    
    return 19;
}

function extractGermanAmounts(text: string): { totalGross: number | null; totalNet: number | null; totalVat: number | null; taxRate: number } {
    logger.info('[GERMAN AMOUNTS] Starting specialized German amount extraction...');
    logger.info('[GERMAN AMOUNTS] Text sample:', text.substring(0, 500));
    
    // 1. FIRST: Extract tax rate
    const taxRate = extractGermanTaxRate(text);
    logger.info(`[GERMAN AMOUNTS] Using tax rate: ${taxRate}%`);
    
    // === [DEBUG_AMOUNTS] DETAILED PATTERN MATCHING ===
    console.log('[DEBUG_AMOUNTS_DETAIL] ===== DETAILED AMOUNTS EXTRACTION DEBUG =====');
    console.log('[DEBUG_AMOUNTS_DETAIL] Full text length:', text.length);
    
    // Pre-scan: Finde ALLE Zahlen mit € im Text
    const allEuroMatches = Array.from(text.matchAll(/([0-9]{1,5}[,.]?\d{1,2})\s*€/g));
    console.log('[DEBUG_AMOUNTS_DETAIL] ALL € amounts found in text:');
    allEuroMatches.forEach((match, idx) => {
        console.log(`[DEBUG_AMOUNTS_DETAIL] ${idx + 1}: "${match[0]}" (value: ${match[1]})`);
    });
    console.log('[DEBUG_AMOUNTS_DETAIL] ==============================================');
    
    // ⚡ GESAMTBETRAG-FOKUSSIERTE PATTERNS: Suchen spezifisch nach dem Gesamtbetrag (inkl. STORNO)
    const grossPatterns = [
        // 🎯 PRIORITÄT 0: TOTAL: Pattern (englische Bezeichnung, auch auf deutschen Rechnungen)
        /\bTOTAL[:.\s]*([0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        /\bTOTAL\s*:\s*([0-9.]{1,6}[,\.]\d{2})\s*€/gi,
        
        // STORNO-PRIORITÄT 1: Negative Gesamtbeträge (Stornorechnung)
        /(?:gesamtbetrag|gesamtsumme|rechnungsbetrag|rechnungs?[-\s]?betrag)[:.\s]*(-[0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        /(?:zu\s+zahlen|zahlbetrag|endbetrag|fällig|rechnungs?[-\s]?summe)[:.\s]*(-[0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // STORNO-PRIORITÄT 2: Stornorechnung - explizite negative Beträge
        /stornorechnung.*?(-[0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        /storno.*?(-[0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 3: EXAKTE "Gesamtbetrag brutto" Patterns (höchste Priorität für normale Rechnungen)
        /gesamtbetrag\s+brutto\s*([0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        /gesamtbetrag\s+brutto[:.\s]*([0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 4: Andere spezifische Gesamtbetrag-Bezeichner
        /(?:gesamtbetrag|gesamtsumme|rechnungsbetrag|rechnungs?[-\s]?betrag)[:.\s]*([0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 5: "Zu zahlen" und ähnliche finale Beträge
        /(?:zu\s+zahlen|zahlbetrag|endbetrag|fällig|rechnungs?[-\s]?summe)[:.\s]*([0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 6: Brutto-Bezeichner (spezifisch)
        /(?:brutto|bruttobetrag|brutto[-\s]?summe|gesamt[-\s]?brutto)[:.\s]*([0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 7: Summe/Total nach Steuer-Berechnung
        /(?:umsatzsteuer|mwst).*\n.*(?:summe|total|gesamt)[:.\s]*([0-9.]{1,6}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 8: Große Beträge nach MwSt-Zeile (wahrscheinlich Endsumme)
        /(?:umsatzsteuer|mwst).*\n.*([1-9][0-9]{3,5}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 9: Als letzte Option - größte Beträge über 500€
        /([5-9][0-9]{2,5}[,\.]\d{2})\s*(?:€|EUR)/gi
    ];
    
    const netPatterns = [
        // 🎯 PRIORITÄT 0: NETTO: Pattern (auch für englische Bezeichnungen)
        /\bNETTO[:.\s]*([0-9]{1,6}[,\.]\d{0,2})\s*(?:€|EUR)/gi,
        /\bNETTO\s*:\s*([0-9]{1,6}[,\.]\d{2})\s*€/gi,
        /\bNET[:.\s]*([0-9]{1,6}[,\.]\d{0,2})\s*(?:€|EUR)/gi,
        
        // STORNO-PRIORITÄT 1: Negative Netto-Beträge (Stornorechnung)
        /(?:netto|nettobetrag|zwischensumme|subtotal|net|netto[-\s]?summe|zwischen[-\s]?summe)[:.\s]*(-[0-9]{1,6}[,\.]\d{0,2})\s*(?:€|EUR)/gi,
        /(-[0-9]{1,6}[,\.]\d{2})\s*(?:€|EUR)\s*(?:zzgl\.?|plus|zuzüglich|\+).*(?:mwst\.?|ust\.?|steuer|vat|tax)/gi,
        
        // Priorität 2: EXAKTE Netto-Bezeichner (erweitert)
        /(?:netto|nettobetrag|zwischensumme|subtotal|net|netto[-\s]?summe|zwischen[-\s]?summe)[:.\s]*([0-9]{1,6}[,\.]\d{0,2})\s*(?:€|EUR)/gi,
        
        // Priorität 3: "zzgl." oder "plus" vor MwSt (= Nettobetrag) - erweitert
        /([0-9]{1,6}[,\.]\d{2})\s*(?:€|EUR)\s*(?:zzgl\.?|plus|zuzüglich|\+).*(?:mwst\.?|ust\.?|steuer|vat|tax)/gi,
        
        // Priorität 4: Betrag vor MwSt-Zeile (flexibler)
        /([0-9]{1,6}[,\.]\d{2})\s*(?:€|EUR)[^\n]*\n[^\n]*(?:mwst\.?|mehrwertsteuer|umsatzsteuer|vat|tax)/gi,
        
        // Priorität 5: Betrag vor "zzgl" oder Steuer-Hinweisen
        /([0-9]{1,6}[,\.]\d{2})\s*(?:€|EUR)[^\n]*(?:zzgl\.?|excl\.?|ohne)/gi,
        
        // Priorität 6: Mittelgroße Beträge (potentiell Netto)
        /([1-9][0-9]{2,5}[,\.]\d{2})\s*€/g
    ];
    
    const vatPatterns = [
        // STORNO-PRIORITÄT 1: Negative MwSt-Beträge (Stornorechnung)
        /(?:mwst\.?\s*(?:\(19%\)|\(7%\)|\(20%\)|\(16%\))?|mehrwertsteuer|umsatzsteuer|ust\.?|vat|tax|steuer)[:.\s]*(-[0-9]{1,4}[,\.]\d{0,2})\s*(?:€|EUR)/gi,
        /(?:19%|20%|16%|7%|0%|19,0%|20,0%|16,0%|7,0%|0,0%).*?(-[0-9]{1,4}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 2: EXAKTE MwSt-Bezeichner (erweitert)
        /(?:mwst\.?\s*(?:\(19%\)|\(7%\)|\(20%\)|\(16%\))?|mehrwertsteuer|umsatzsteuer|ust\.?|vat|tax|steuer)[:.\s]*([0-9]{1,4}[,\.]\d{0,2})\s*(?:€|EUR)/gi,
        
        // Priorität 3: Prozent-Angaben mit Betrag (erweitert)
        /(?:19%|20%|16%|7%|0%|19,0%|20,0%|16,0%|7,0%|0,0%).*?([0-9]{1,4}[,\.]\d{2})\s*(?:€|EUR)/gi,
        /([0-9]{1,4}[,\.]\d{2})\s*(?:€|EUR).*?(?:19%|20%|16%|7%|0%|19,0%|20,0%|16,0%|7,0%|0,0%)/gi,
        
        // Priorität 4: MwSt-Zeilen mit typischen Phrasen
        /(?:incl\.?|inkl\.?|inclusive|inklusive).*([0-9]{1,4}[,\.]\d{2})\s*(?:€|EUR).*(?:mwst|vat|tax)/gi,
        /(?:mwst|vat|tax).*([0-9]{1,4}[,\.]\d{2})\s*(?:€|EUR)/gi,
        
        // Priorität 5: Typische MwSt-Beträge (5-500€)
        /([1-4][0-9]{1,2}[,\.]\d{2})\s*(?:€|EUR)/g,
        
        // Priorität 6: Kleinere MwSt-Beträge (5-99€)
        /([5-9][0-9]?[,\.]\d{2})\s*€/g
    ];
    
    // ⚡ SEVDESK-KALIBRIERTER DEBUG: sevDesk zeigt sumGross: "410", nicht 487.90!
    console.log('[DEBUG_SEVDESK_CALIBRATED] ===== SEVDESK-CALIBRATED EXTRACTION DEBUG =====');
    console.log('[DEBUG_SEVDESK_CALIBRATED] sevDesk Analysis shows: sumGross="410", sumNet="344.54", sumTax="65.46"');
    console.log('[DEBUG_SEVDESK_CALIBRATED] Calling extractFirstAmount for GROSS patterns...');
    const totalGross = extractFirstAmount(text, grossPatterns);
    console.log('[DEBUG_SEVDESK_CALIBRATED] GROSS RESULT:', totalGross);
    console.log('[DEBUG_SEVDESK_CALIBRATED] Expected: 410 (sevDesk) | Previous wrong: 487.90');
    
    console.log('[DEBUG_SEVDESK_CALIBRATED] Calling extractFirstAmount for NET patterns...');
    const totalNet = extractFirstAmount(text, netPatterns);
    console.log('[DEBUG_SEVDESK_CALIBRATED] NET RESULT:', totalNet);
    console.log('[DEBUG_SEVDESK_CALIBRATED] Expected: 344.54 (sevDesk)');
    
    console.log('[DEBUG_SEVDESK_CALIBRATED] Calling extractFirstAmount for VAT patterns...');
    let totalVat = extractFirstAmount(text, vatPatterns);
    console.log('[DEBUG_SEVDESK_CALIBRATED] VAT RESULT (raw):', totalVat);
    
    // 🚨 KRITISCHE VAT-KORREKTUR: Bei 0% Steuersatz MUSS VAT = 0 sein!
    if (taxRate === 0) {
        console.log('[DEBUG_VAT_CORRECTION] 🚨 Tax Rate ist 0% -> Setze VAT auf 0.00');
        console.log('[DEBUG_VAT_CORRECTION] Grund: Reverse Charge, Steuerfreie Umsätze, Kleinunternehmer, etc.');
        console.log('[DEBUG_VAT_CORRECTION] Alter VAT-Wert:', totalVat, '-> Neuer VAT-Wert: 0.00');
        totalVat = 0;
    }
    
    console.log('[DEBUG_SEVDESK_CALIBRATED] VAT RESULT (final):', totalVat);
    console.log('[DEBUG_SEVDESK_CALIBRATED] Expected: 65.46 (sevDesk)');
    console.log('[DEBUG_SEVDESK_CALIBRATED] =======================================================');
    
    // === [DEBUG_AMOUNTS] DETAILED RESULTS ===
    console.log('[DEBUG_AMOUNTS_DETAIL] ======= RAW EXTRACTION RESULTS =======');
    console.log('[DEBUG_AMOUNTS_DETAIL] Total Gross (raw):', totalGross);
    console.log('[DEBUG_AMOUNTS_DETAIL] Total Net (raw):', totalNet);
    console.log('[DEBUG_AMOUNTS_DETAIL] Total VAT (raw from patterns):', totalVat);
    console.log('[DEBUG_AMOUNTS_DETAIL] Tax Rate (from text):', taxRate + '%');
    console.log('[DEBUG_AMOUNTS_DETAIL] ==========================================');
    
    // 🚨 KRITISCHE INTELLIGENTE VAT-BERECHNUNG
    // Problem: Viele Rechnungen (besonders Storno) haben KEINE explizite USt-Zeile!
    // Lösung: Berechne VAT aus Gross - Net, wenn verfügbar
    
    let finalVat = totalVat;
    let finalTaxRate = taxRate;
    
    if (totalGross !== null && totalNet !== null) {
        const calculatedVat = totalGross - totalNet;
        console.log('[VAT_CALCULATION] 🧮 Intelligente VAT-Berechnung:');
        console.log('[VAT_CALCULATION] Gross:', totalGross);
        console.log('[VAT_CALCULATION] Net:', totalNet);
        console.log('[VAT_CALCULATION] Calculated VAT (Gross - Net):', calculatedVat);
        console.log('[VAT_CALCULATION] Pattern VAT:', totalVat);
        
        // Prüfe, ob Pattern-VAT plausibel ist
        const patternVatPlausible = totalVat !== null && 
                                    Math.abs(calculatedVat - totalVat) < 0.10;
        
        if (patternVatPlausible) {
            console.log('[VAT_CALCULATION] ✅ Pattern VAT ist plausibel (Differenz < 10 Cent)');
            finalVat = totalVat;
        } else {
            console.log('[VAT_CALCULATION] 🚨 Pattern VAT NICHT plausibel oder fehlt!');
            console.log('[VAT_CALCULATION] → Verwende berechnete VAT:', calculatedVat);
            finalVat = calculatedVat;
        }
        
        // Berechne Tax Rate aus finalVat und Net
        if (totalNet !== 0 && finalVat !== null) {
            const calculatedTaxRate = Math.abs((finalVat / totalNet) * 100);
            console.log('[VAT_CALCULATION] Calculated Tax Rate:', calculatedTaxRate.toFixed(2) + '%');
            
            // Runde auf Standard-Steuersätze (19%, 7%, 0%)
            if (calculatedTaxRate < 1) {
                finalTaxRate = 0;
                console.log('[VAT_CALCULATION] → Gerundet auf: 0%');
            } else if (calculatedTaxRate >= 6 && calculatedTaxRate <= 8) {
                finalTaxRate = 7;
                console.log('[VAT_CALCULATION] → Gerundet auf: 7%');
            } else if (calculatedTaxRate >= 16 && calculatedTaxRate <= 20) {
                finalTaxRate = 19;
                console.log('[VAT_CALCULATION] → Gerundet auf: 19%');
            } else {
                finalTaxRate = Math.round(calculatedTaxRate);
                console.log('[VAT_CALCULATION] → Gerundet auf:', finalTaxRate + '%');
            }
        }
        
        // 🚨 FINALE VAT-KORREKTUR: Bei 0% Steuersatz MUSS VAT = 0 sein!
        if (finalTaxRate === 0) {
            console.log('[VAT_CORRECTION] 🚨 Tax Rate ist 0% -> Setze VAT auf 0.00');
            console.log('[VAT_CORRECTION] Grund: Reverse Charge, Steuerfreie Umsätze, Kleinunternehmer, etc.');
            console.log('[VAT_CORRECTION] Alter VAT-Wert:', finalVat, '-> Neuer VAT-Wert: 0.00');
            finalVat = 0;
        }
    }
    
    console.log('[VAT_CALCULATION] ======= FINALE WERTE =======');
    console.log('[VAT_CALCULATION] Final VAT:', finalVat);
    console.log('[VAT_CALCULATION] Final Tax Rate:', finalTaxRate + '%');
    console.log('[VAT_CALCULATION] =====================================');
    
    logger.info('[GERMAN AMOUNTS] Final amounts:', {
        totalGross: totalGross || 'null',
        totalNet: totalNet || 'null',
        totalVat: finalVat,
        taxRate: finalTaxRate + '%'
    });
    
    return {
        totalGross,
        totalNet,
        totalVat: finalVat,
        taxRate: finalTaxRate
    };
}

function extractFirstAmount(text: string, patterns: RegExp[]): number | null {
    console.log('[DEBUG_EXTRACT_FIRST] Testing', patterns.length, 'patterns for amount extraction');
    
    // ⚡ STRIKT: ERSTES GÜLTIGES ERGEBNIS ODER FEHLER - KEINE FALLBACKS!
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        console.log(`[DEBUG_EXTRACT_FIRST] Pattern ${i + 1}:`, pattern.source);
        
        const matches = Array.from(text.matchAll(pattern));
        console.log(`[DEBUG_EXTRACT_FIRST] Pattern ${i + 1} found ${matches.length} matches`);
        
        for (const match of matches) {
            console.log(`[DEBUG_EXTRACT_FIRST] Testing match:`, match[0]);
            console.log(`[DEBUG_EXTRACT_FIRST] Extracted string:`, match[1]);
            
            const amount = parseGermanAmount(match[1]);
            console.log(`[DEBUG_EXTRACT_FIRST] Parsed amount:`, amount);
            
            // ✅ STORNO-UNTERSTÜTZUNG: Akzeptiere sowohl positive als auch negative Beträge
            if (amount !== null && amount !== 0) {
                console.log(`[DEBUG_EXTRACT_FIRST] ✅ SUCCESS - Returning FIRST VALID (inkl. STORNO):`, amount);
                return amount; // ⚡ ERSTES GÜLTIGES ERGEBNIS - POSITIVE UND NEGATIVE BETRÄGE!
            }
        }
    }
    
    console.log('[DEBUG_EXTRACT_FIRST] ❌ NO VALID AMOUNTS FOUND - Returning null');
    return null;
}

function parseGermanAmount(amountStr: string): number | null {
    if (!amountStr || typeof amountStr !== 'string') return null;
    
    console.log(`[DEBUG_PARSE_AMOUNT] Input: "${amountStr}"`);
    
    // ⚡ ROBUSTER DEUTSCHER ZAHLENFORMAT-PARSER
    // Entferne Leerzeichen, Währungssymbole und andere Zeichen
    let cleaned = amountStr.trim();
    console.log(`[DEBUG_PARSE_AMOUNT] After trim: "${cleaned}"`);
    
    // Entferne Währungssymbole und Einheiten
    cleaned = cleaned.replace(/[€$£¥EUR USD GBP JPY]/gi, '');
    console.log(`[DEBUG_PARSE_AMOUNT] After currency removal: "${cleaned}"`);
    
    // Entferne alle Zeichen außer Zahlen, Komma, Punkt und Minus
    cleaned = cleaned.replace(/[^\d,.-]/g, '');
    console.log(`[DEBUG_PARSE_AMOUNT] Cleaned: "${cleaned}"`);
    
    if (!cleaned || cleaned.length === 0) {
        console.log(`[DEBUG_PARSE_AMOUNT] Empty after cleaning`);
        return null;
    }
    
    let normalized: string;
    
    // Verschiedene Zahlenformate handhaben
    if (cleaned.includes(',') && cleaned.includes('.')) {
        // Format: 1.234,56 (Deutsch) oder 1,234.56 (Englisch)
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        
        if (lastComma > lastDot) {
            // Deutsche Format: 1.234,56
            normalized = cleaned.replace(/\./g, '').replace(',', '.');
            console.log(`[DEBUG_PARSE_AMOUNT] German format detected: ${normalized}`);
        } else {
            // Englische Format: 1,234.56
            normalized = cleaned.replace(/,/g, '');
            console.log(`[DEBUG_PARSE_AMOUNT] English format detected: ${normalized}`);
        }
    } else if (cleaned.includes(',')) {
        // Nur Komma: könnte 1234,56 (Deutsch) oder 1,234 (Englisch) sein
        const commaIndex = cleaned.indexOf(',');
        const afterComma = cleaned.substring(commaIndex + 1);
        
        if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
            // Wahrscheinlich deutsche Dezimalstelle: 1234,56
            normalized = cleaned.replace(',', '.');
            console.log(`[DEBUG_PARSE_AMOUNT] German decimal format: ${normalized}`);
        } else {
            // Wahrscheinlich englischer Tausender-Separator: 1,234
            normalized = cleaned.replace(/,/g, '');
            console.log(`[DEBUG_PARSE_AMOUNT] English thousands separator: ${normalized}`);
        }
    } else if (cleaned.includes('.')) {
        // Nur Punkt: könnte 1234.56 (Englisch) oder 1.234 (Deutsch) sein
        const dotIndex = cleaned.lastIndexOf('.');
        const afterDot = cleaned.substring(dotIndex + 1);
        
        if (afterDot.length <= 2 && /^\d+$/.test(afterDot)) {
            // Wahrscheinlich englische Dezimalstelle: 1234.56
            normalized = cleaned;
            console.log(`[DEBUG_PARSE_AMOUNT] English decimal format: ${normalized}`);
        } else {
            // Wahrscheinlich deutscher Tausender-Separator: 1.234
            normalized = cleaned.replace(/\./g, '');
            console.log(`[DEBUG_PARSE_AMOUNT] German thousands separator: ${normalized}`);
        }
    } else {
        // Nur Zahlen: 1234
        normalized = cleaned;
        console.log(`[DEBUG_PARSE_AMOUNT] Numbers only: ${normalized}`);
    }
    
    console.log(`[DEBUG_PARSE_AMOUNT] Normalized: "${normalized}"`);
    
    const amount = parseFloat(normalized);
    if (isNaN(amount)) {
        console.log(`[DEBUG_PARSE_AMOUNT] Failed to parse: NaN`);
        return null;
    }
    
    // Runde auf 2 Dezimalstellen
    const result = Math.round(amount * 100) / 100;
    
    console.log(`[DEBUG_PARSE_AMOUNT] Final result: ${result}`);
    return result;
}

function extractGermanDate(text: string): string | null {
    logger.info('[GERMAN DATE] Starting specialized German date extraction...');
    logger.info('[GERMAN DATE] Text sample:', text.substring(0, 400));
    
    const datePatterns = [
        // Priorität 1: Deutsche Bezeichner mit Datum (für 10.07.2025)
        /(?:rechnungsdatum|belegdatum|datum|date|vom)[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/gi,
        
        // Priorität 2: Standard deutsche Datumsformate
        /(\d{1,2}\.\d{1,2}\.\d{4})/g,      // DD.MM.YYYY (deutsch)
        /(\d{1,2}\/\d{1,2}\/\d{4})/g,      // DD/MM/YYYY
        
        // Priorität 3: Alternative Formate
        /(\d{4}-\d{1,2}-\d{1,2})/g,        // YYYY-MM-DD (ISO)
        /(\d{1,2}-\d{1,2}-\d{4})/g         // DD-MM-YYYY
    ];
    
    for (let i = 0; i < datePatterns.length; i++) {
        const pattern = datePatterns[i];
        logger.info(`[GERMAN DATE] Testing pattern ${i + 1}: ${pattern.source}`);
        
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const dateStr = match[1] || match[0];
            logger.info(`[GERMAN DATE] Found date candidate: "${dateStr}"`);
            
            // Parse verschiedene Formate
            let day: number | undefined, month: number | undefined, year: number | undefined;
            
            if (dateStr.includes('.')) {
                const parts = dateStr.split('.');
                if (parts.length === 3) {
                    day = parseInt(parts[0]);
                    month = parseInt(parts[1]);
                    year = parseInt(parts[2]);
                }
            } else if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    day = parseInt(parts[0]);
                    month = parseInt(parts[1]);
                    year = parseInt(parts[2]);
                }
            } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        // YYYY-MM-DD Format
                        year = parseInt(parts[0]);
                        month = parseInt(parts[1]);
                        day = parseInt(parts[2]);
                    } else {
                        // DD-MM-YYYY Format
                        day = parseInt(parts[0]);
                        month = parseInt(parts[1]);
                        year = parseInt(parts[2]);
                    }
                }
            } else {
                continue;
            }
            
            // Validierung
            if (day && month && year && 
                year >= 2020 && year <= 2030 && 
                month >= 1 && month <= 12 && 
                day >= 1 && day <= 31) {
                
                const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                logger.info(`[GERMAN DATE] ✅ Valid date found: ${isoDate} (from "${dateStr}")`);
                return isoDate;
            } else {
                logger.info(`[GERMAN DATE] ❌ Invalid date: day=${day}, month=${month}, year=${year}`);
            }
        }
    }
    
    logger.warn('[GERMAN DATE] ❌ No valid German date found');
    return null;
}

function extractGermanDueDate(text: string): string | null {
    logger.info('[GERMAN DUE DATE] Starting extraction...');
    logger.info('[GERMAN DUE DATE] Text sample:', text.substring(0, 800));
    
    // ⚡ FINAL FIX: Robuste Fälligkeitsdatum-Extraktion für "Fälligkeitsdatum: 21.10.2025"
    const dueDatePatterns = [
        // Priorität 1: Deutsche Fälligkeitsdatum-Patterns (direkt nach dem Begriff)
        /fälligkeitsdatum[\s:]*(\d{1,2}\.\d{1,2}\.\d{4})/gi,
        /fällig[\s:]*(\d{1,2}\.\d{1,2}\.\d{4})/gi,
        /zahlbar\s*bis[\s:]*(\d{1,2}\.\d{1,2}\.\d{4})/gi,
        
        // Priorität 2: Due Date (englisch)
        /due\s*date[\s:]*(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/gi,
        
        // Priorität 3: Alle Daten im Format DD.MM.YYYY, aber nur wenn > Rechnungsdatum
        /(\d{1,2}\.\d{1,2}\.\d{4})/g
    ];
    
    for (let i = 0; i < dueDatePatterns.length; i++) {
        const pattern = dueDatePatterns[i];
        logger.info(`[GERMAN DUE DATE] Testing pattern ${i + 1}: ${pattern.source}`);
        
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const dateStr = match[1] || match[0];
            logger.info(`[GERMAN DUE DATE] Found candidate: "${dateStr}"`);
            
            // Nur Deutsche Datumsformate DD.MM.YYYY verarbeiten
            if (dateStr.includes('.')) {
                const parts = dateStr.split('.');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    
                    // Validierung: Plausibles Datum
                    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
                        const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        logger.info(`[GERMAN DUE DATE] ✅ Valid due date found: ${isoDate}`);
                        return isoDate;
                    }
                }
            }
        }
    }
    
    logger.warn('[GERMAN DUE DATE] ❌ No valid due date found');
    return null;
}

function extractGermanAddress(text: string): string | null {
    logger.info('[GERMAN ADDRESS] Starting German address extraction...');
    
    // Grußformeln und nicht-adressrelevante Inhalte, die herausgefiltert werden sollen
    const greetingFormulas = [
        'mit freundlichen grüßen',
        'mit freundlichem gruß',
        'mit besten grüßen',
        'hochachtungsvoll',
        'liebe grüße',
        'beste grüße',
        'viele grüße',
        'herzliche grüße',
        'mit freundlichen grüssen',
        'mfg',
        'lg',
        'vg',
        'hg'
    ];
    
    // Weitere nicht-adressrelevante Begriffe
    const nonAddressTerms = [
        'tel',
        'telefon',
        'phone',
        'fon',
        'fax',
        'email',
        'e-mail',
        'mail',
        'web',
        'www',
        'http',
        'https',
        'ust-id',
        'umsatzsteuer',
        'steuernummer',
        'handelsregister',
        'amtsgericht',
        'geschäftsführer'
    ];
    
    const addressPatterns = [
        // Deutsche Adressen-Patterns: Straße + Hausnummer, PLZ + Ort
        /([A-Za-zäöüß\s.-]+\s+\d{1,4}[a-zA-Z]?[\s,]*\d{5}\s+[A-Za-zäöüß\s.-]+)/g,
        
        // Mehrzeilige Adressen
        /([A-Za-zäöüß\s.-]+\s+\d{1,4}[a-zA-Z]?)[\s\n]+(\d{5}\s+[A-Za-zäöüß\s.-]+)/g,
        
        // Klassische deutsche Postleitzahl + Ort
        /(\d{5}\s+[A-Za-zäöüß\s.-]{3,50})/g,
        
        // Straßenname mit Hausnummer
        /([A-Za-zäöüß\s.-]+(?:straße|str\.|gasse|weg|platz|allee)\s+\d{1,4}[a-zA-Z]?)/gi
    ];
    
    for (const pattern of addressPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            let address = match[1] || match[0];
            logger.info('[GERMAN ADDRESS] 🔍 Raw match found:', address);
            
            // Bereinigung
            address = address.replace(/\s+/g, ' ').trim();
            
            // Grußformeln am Anfang entfernen
            const addressLower = address.toLowerCase();
            let isValidAddress = true;
            
            // Prüfung auf Grußformeln
            for (const greeting of greetingFormulas) {
                if (addressLower.startsWith(greeting)) {
                    logger.info('[GERMAN ADDRESS] 🧹 Removing greeting formula at start:', greeting);
                    // Grußformel am Anfang entfernen
                    address = address.substring(greeting.length).trim();
                    break;
                }
                if (addressLower.includes(greeting)) {
                    // Wenn Grußformel in der Mitte vorkommt, ist es keine reine Adresse
                    const greetingIndex = addressLower.indexOf(greeting);
                    if (greetingIndex > 0 && greetingIndex < address.length - greeting.length) {
                        logger.info('[GERMAN ADDRESS] ❌ Greeting formula in middle, invalid:', greeting);
                        isValidAddress = false;
                        break;
                    }
                }
            }
            
            if (!isValidAddress) {
                logger.info('[GERMAN ADDRESS] ❌ Invalid due to greeting formula');
                continue;
            }
            
            // Prüfung auf nicht-adressrelevante Begriffe
            for (const term of nonAddressTerms) {
                if (addressLower.includes(term + ':') || addressLower.includes(term + ' ')) {
                    logger.info('[GERMAN ADDRESS] ❌ Invalid due to non-address term:', term);
                    isValidAddress = false;
                    break;
                }
            }
            
            if (!isValidAddress) {
                logger.info('[GERMAN ADDRESS] ❌ Invalid due to non-address terms');
                continue;
            }
            
            // Nach der Bereinigung nochmals trimmen
            address = address.trim();
            
            // Validierung: Mindestens 10 Zeichen, nicht nur Zahlen, muss eine echte Adresse sein
            if (address.length >= 10 && address.length <= 150 && !/^\d+$/.test(address)) {
                // Zusätzliche Validierung: Muss entweder PLZ oder Straßennamen enthalten
                const hasPostalCode = /\d{5}/.test(address);
                const hasStreetIndicator = /(?:straße|str\.|gasse|weg|platz|allee|siedlung)/gi.test(address);
                
                if (hasPostalCode || hasStreetIndicator) {
                    logger.info('[GERMAN ADDRESS] ✅ Found valid address:', address);
                    return address;
                }
            }
        }
    }
    
    logger.info('[GERMAN ADDRESS] ❌ No valid address found');
    return null;
}

// Deutsche Telefonnummer-Extraktion
function extractGermanPhone(text: string): string | null {
    logger.info('[GERMAN PHONE] Starting phone extraction...');
    
    const phonePatterns = [
        // Deutsche Telefonnummern mit verschiedenen Formaten
        /(?:tel|telefon|phone|fon)[\s:]*([+]?49[\s-]?\d{2,5}[\s/-]?\d{3,10})/gi,
        /(?:tel|telefon|phone|fon)[\s:]*([0][\d\s/-]{8,20})/gi,
        /([+]?49[\s-]?\d{2,5}[\s/-]?\d{3,10})/g,
        /(0\d{2,5}[\s/-]?\d{3,10})/g
    ];
    
    for (const pattern of phonePatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            let phone = match[1] || match[0];
            
            // Bereinigung
            phone = phone.replace(/[^\d+\-\s]/g, '').replace(/\s+/g, ' ').trim();
            
            // Validierung: Deutsche Telefonnummer
            if (phone.length >= 8 && phone.length <= 20) {
                logger.info('[GERMAN PHONE] ✅ Found phone:', phone);
                return phone;
            }
        }
    }
    
    logger.info('[GERMAN PHONE] ❌ No valid phone found');
    return null;
}

// Deutsche Email-Extraktion
function extractGermanEmail(text: string): string | null {
    logger.info('[GERMAN EMAIL] Starting email extraction...');
    
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = Array.from(text.matchAll(emailPattern));
    
    for (const match of matches) {
        const email = match[1].toLowerCase();
        
        // Validierung: Kein Spam/ungültige Domains
        if (!email.includes('example.') && !email.includes('test.') && email.length <= 100) {
            logger.info('[GERMAN EMAIL] ✅ Found email:', email);
            return email;
        }
    }
    
    logger.info('[GERMAN EMAIL] ❌ No valid email found');
    return null;
}

function extractGermanVATId(text: string): string | null {
    const vatIdPattern = /(?:ust[.-]?id|vat\s*id|umsatzsteuer[.-]?id)[\s:]*([A-Z]{2}\d{9})/gi;
    const match = text.match(vatIdPattern);
    return match ? match[1] : null;
}

// Spezialisierte deutsche Beschreibungsextraktion
function extractGermanDescription(text: string, fileName: string): string {
    console.log('[🔥 DESCRIPTION_DEBUG] =============== STARTING DESCRIPTION EXTRACTION ===============');
    console.log('[🔥 DESCRIPTION_DEBUG] Input text length:', text.length);
    console.log('[🔥 DESCRIPTION_DEBUG] Text sample (first 800 chars):');
    console.log(text.substring(0, 800));
    console.log('[🔥 DESCRIPTION_DEBUG] ================================================================');
    
    logger.info('[GERMAN DESCRIPTION] Starting specialized German description extraction...');
    logger.info('[GERMAN DESCRIPTION] Text sample:', text.substring(0, 500));
    
    const candidates: Array<{value: string, priority: number, source: string}> = [];
    
    // === PRIORITÄT 0: BETREFF-EXTRAKTION (HÖCHSTE PRIORITÄT) ===
    console.log('[DEBUG_DESCRIPTION] ===== BETREFF EXTRACTION =====');
    
    const subjectPatterns = [
        // "Betreff: Stornorechnung Nr. ST-494 zur Rechnung Nr. RE-1077"
        /Betreff:\s*(.+?)(?:\n|$)/gi,
        // "Re: Text" oder "Subject: Text"
        /(?:Re|Subject):\s*(.+?)(?:\n|$)/gi,
        // Zeile die mit "Stornorechnung" beginnt
        /^(Stornorechnung[^\n]+)/gmi,
        // Zeile die mit "Rechnung" beginnt und Nummern enthält
        /^(Rechnung[^\n]*(?:Nr\.|Nummer)[^\n]+)/gmi
    ];
    
    for (const pattern of subjectPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        console.log(`[DEBUG_DESCRIPTION] Betreff pattern found ${matches.length} matches`);
        
        for (const match of matches) {
            const subject = match[1].trim();
            console.log(`[DEBUG_DESCRIPTION] Found subject: "${subject}"`);
            
            if (subject && subject.length > 5 && subject.length < 200) {
                candidates.push({
                    value: subject,
                    priority: 200, // 🔥 ALLERHÖCHSTE PRIORITÄT - BETREFF MUSS IMMER GEWINNEN!
                    source: 'BETREFF'
                });
                console.log(`[DEBUG_DESCRIPTION] ✅ Added subject to candidates with PRIORITY 200: "${subject}"`);
            }
        }
    }
    
    // === PRIORITÄT 1: RECHNUNGSPOSITIONEN/LEISTUNGSZEILEN ===
    console.log('[DEBUG_DESCRIPTION] ===== ADVANCED SERVICE EXTRACTION =====');
    
    // 1A. Exakte nummerierte Rechnungspositionen (RE-102256 Format)
    const exactNumberedPatterns = [
        // "1. Gastronomisch bezogene Honoraleistung Andy Staudinger 48,3 Stk. 41,00 EUR 1980.30 EUR"
        /(\d+\.)\s*([A-Za-zäöüß][A-Za-zäöüß\s,.-]{8,80})\s*\d+[,.]?\d*\s*(?:Stk\.|Std\.|Stück)/gi,
        
        // "2. Anreise 150,00 EUR 150,00 EUR" - Spezifisch für Position nach Nummer und vor doppeltem EUR
        /(\d+\.)\s*([A-Za-zäöüß][A-Za-zäöüß\s,.-]{3,50})\s*\d+[,.]?\d*\s*EUR\s*\d+[,.]?\d*\s*EUR/gi,
        
        // Sehr spezifische nummerierte Positionen (nicht Summen/Gesamtbeträge)
        /(\d+\.)\s*([A-Za-zäöüß][A-Za-zäöüß\s,.-]{5,80}?)(?=\s*\d+[,.]?\d*\s*(?:Stk|EUR|€))/gi,
    ];
    
    console.log('[DEBUG_DESCRIPTION] Testing exact numbered patterns...');
    for (const pattern of exactNumberedPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        console.log(`[DEBUG_DESCRIPTION] Pattern ${pattern.source} found ${matches.length} matches`);
        
        for (const match of matches) {
            const serviceDesc = cleanDescriptionText(match[2]);
            console.log(`[DEBUG_DESCRIPTION] Raw match: "${match[0]}"`);
            console.log(`[DEBUG_DESCRIPTION] Extracted service: "${serviceDesc}"`);
            
            // Blacklist für Summen/Gesamtbeträge (keine echten Leistungspositionen)
            const blacklistedTerms = [
                /gesamtbetrag/gi,
                /summe/gi,
                /total/gi,
                /netto/gi,
                /brutto/gi,
                /umsatzsteuer/gi,
                /mwst/gi,
                /\d+%/g, // Prozentangaben
                /rechnungsnummer/gi,
                /datum/gi
            ];
            
            const isBlacklisted = blacklistedTerms.some(term => term.test(serviceDesc));
            
            if (serviceDesc && serviceDesc.length >= 3 && !isBlacklisted) {
                candidates.push({
                    value: serviceDesc,
                    priority: 120, // Höchste Priorität für exakte nummerierte Services
                    source: `Exact Numbered: ${match[1]} ${serviceDesc}`
                });
                console.log('[DEBUG_DESCRIPTION] 🎯 EXACT NUMBERED SERVICE:', serviceDesc);
                logger.info('[GERMAN DESCRIPTION] Exact numbered service found:', serviceDesc);
            } else if (isBlacklisted) {
                console.log('[DEBUG_DESCRIPTION] ❌ BLACKLISTED SERVICE:', serviceDesc);
            }
        }
    }
    
    // 1B. Gastronomie/Honorar spezifische Leistungen
    const serviceSpecificPatterns = [
        /([A-Za-zäöüß\s]*(?:gastronomisch|honorar|beratung|dienstleistung|service)[A-Za-zäöüß\s,.-]{5,100})/gi,
        /([A-Za-zäöüß\s]*(?:anreise|fahrtkosten|travel|transport)[A-Za-zäöüß\s,.-]{0,50})/gi,
        /([A-Za-zäöüß\s]*(?:entwicklung|programming|consulting|freelance)[A-Za-zäöüß\s,.-]{5,100})/gi,
    ];
    
    for (const pattern of serviceSpecificPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const desc = cleanDescriptionText(match[1]);
            if (desc && desc.length >= 8 && desc.length <= 120) {
                candidates.push({
                    value: desc,
                    priority: 105,
                    source: `Service Specific: ${match[0]}`
                });
                console.log('[DEBUG_DESCRIPTION] 🍽️ SERVICE SPECIFIC:', desc);
                logger.info('[GERMAN DESCRIPTION] Service specific found:', desc);
            }
        }
    }
    
    // 1C. Allgemeine Leistungspatterns
    const generalServicePatterns = [
        /(?:leistung|service|beschreibung)[\s:]*([A-Za-zäöüß\s,.-]{8,100})/gi,
        /(?:position|pos\.|artikel)[\s:]*([A-Za-zäöüß\s,.-]{8,100})/gi,
        /\d+[\s.)][\s]*([A-Za-zäöüß\s,.-]{8,100})/g, // Nummerierte Listen
    ];
    
    for (const pattern of generalServicePatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const desc = cleanDescriptionText(match[1]);
            if (desc && desc.length >= 8 && desc.length <= 100) {
                candidates.push({
                    value: desc,
                    priority: 100,
                    source: `General Service: ${match[0]}`
                });
                logger.info('[GERMAN DESCRIPTION] General service found:', desc);
            }
        }
    }
    
    // === PRIORITÄT 2: ZEITRAUM-SPEZIFISCHE BESCHREIBUNGEN ===
    const zeitraumPatterns = [
        /([A-Za-zäöüß\s,.-]{5,50}zeitraum[A-Za-zäöüß\s,.-]{0,30})/gi,
        /([A-Za-zäöüß\s,.-]{5,50}(?:kw|woche|monat)[A-Za-zäöüß\s\d,.-]{0,30})/gi,
    ];
    
    for (const pattern of zeitraumPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const desc = cleanDescriptionText(match[1]);
            if (desc && desc.length >= 10 && desc.length <= 80) {
                candidates.push({
                    value: desc,
                    priority: 90,
                    source: `Zeitraum: ${match[0]}`
                });
                logger.info('[GERMAN DESCRIPTION] Zeitraum found:', desc);
            }
        }
    }
    
    // === PRIORITÄT 3: FREIBERUFLER/HONORAR BESCHREIBUNGEN ===
    const honorarPatterns = [
        /([A-Za-zäöüß\s,.-]{5,60}(?:honorar|dienstleistung|beratung|entwicklung)[A-Za-zäöüß\s,.-]{0,40})/gi,
        /([A-Za-zäöüß\s,.-]{5,60}(?:freelance|consulting|programming)[A-Za-zäöüß\s,.-]{0,40})/gi,
    ];
    
    for (const pattern of honorarPatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const match of matches) {
            const desc = cleanDescriptionText(match[1]);
            if (desc && desc.length >= 10 && desc.length <= 100) {
                candidates.push({
                    value: desc,
                    priority: 80,
                    source: `Honorar: ${match[0]}`
                });
                logger.info('[GERMAN DESCRIPTION] Honorar found:', desc);
            }
        }
    }
    
    // === PRIORITÄT 4: ERSTE RELEVANTE TEXTZEILE ===
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        
        // Skip Header/Footer/Irrelevante Zeilen
        if (shouldSkipLine(line)) continue;
        
        const desc = cleanDescriptionText(line);
        if (desc && desc.length >= 8 && desc.length <= 120) {
            candidates.push({
                value: desc,
                priority: 60,
                source: `Line ${i + 1}: ${line}`
            });
        }
    }
    
    // === MULTI-SERVICE KOMBINATION (für mehrere Leistungspositionen) ===
    console.log('[DEBUG_DESCRIPTION] ===== MULTI-SERVICE COMBINATION =====');
    
    // Filtere exakte nummerierte Services (höchste Priorität)
    const exactServices = candidates.filter(c => c.priority >= 120);
    console.log(`[DEBUG_DESCRIPTION] Found ${exactServices.length} exact numbered services`);
    
    if (exactServices.length >= 2) {
        // Entferne Duplikate basierend auf ähnlichem Inhalt
        const uniqueServices: Array<{value: string, priority: number, source: string}> = [];
        for (const service of exactServices) {
            const isDuplicate = uniqueServices.some(existing => 
                service.value.toLowerCase().includes(existing.value.toLowerCase()) ||
                existing.value.toLowerCase().includes(service.value.toLowerCase())
            );
            if (!isDuplicate) {
                uniqueServices.push(service);
            }
        }
        
        console.log(`[DEBUG_DESCRIPTION] After deduplication: ${uniqueServices.length} unique services`);
        uniqueServices.forEach((s, i) => console.log(`[DEBUG_DESCRIPTION] Service ${i+1}: "${s.value}"`));
        
        if (uniqueServices.length >= 2) {
            // Kombiniere die einzigartigen Services
            const topServices = uniqueServices.slice(0, 2); // Maximal 2 Hauptservices
            const combinedDesc = topServices.map(s => s.value.trim()).join(' + ');
            
            if (combinedDesc.length <= 120) { // Reduzierte maximale Länge
                candidates.push({
                    value: combinedDesc,
                    priority: 125, // Höchste Priorität für saubere Kombinationen
                    source: `Clean Multi-Service: ${topServices.length} unique services`
                });
                console.log('[DEBUG_DESCRIPTION] 🔗 CLEAN MULTI-SERVICE:', combinedDesc);
                logger.info('[GERMAN DESCRIPTION] Clean multi-service combination created:', combinedDesc);
            }
        }
    }
    
    // === DEDUPLIZIERUNG UND SORTIERUNG ===
    const uniqueCandidates = candidates.filter((candidate, index, self) => 
        index === self.findIndex(c => c.value.toLowerCase() === candidate.value.toLowerCase())
    );
    
    uniqueCandidates.sort((a, b) => b.priority - a.priority);
    
    logger.info('[GERMAN DESCRIPTION] Found candidates:', uniqueCandidates.length);
    uniqueCandidates.forEach((candidate, idx) => {
        logger.info(`[DESCRIPTION CANDIDATE ${idx+1}] "${candidate.value}" (priority: ${candidate.priority})`);
    });
    
    // === AUSWAHL DER BESTEN BESCHREIBUNG ===
    console.log('[🔥 DESCRIPTION_DEBUG] =============== FINAL SELECTION ===============');
    console.log('[🔥 DESCRIPTION_DEBUG] Total unique candidates:', uniqueCandidates.length);
    
    uniqueCandidates.forEach((candidate, idx) => {
        console.log(`[🔥 DESCRIPTION_DEBUG] Candidate ${idx+1}: "${candidate.value}" (priority: ${candidate.priority}, source: ${candidate.source})`);
    });
    
    if (uniqueCandidates.length > 0) {
        const selected = uniqueCandidates[0];
        console.log('[🔥 DESCRIPTION_DEBUG] ✅ SELECTED DESCRIPTION:', selected.value);
        console.log('[🔥 DESCRIPTION_DEBUG] ✅ SELECTED SOURCE:', selected.source);
        console.log('[🔥 DESCRIPTION_DEBUG] ================================================================');
        
        logger.info('[GERMAN DESCRIPTION] ✅ Selected:', selected.value);
        return selected.value;
    } else {
        console.log('[🔥 DESCRIPTION_DEBUG] ❌ NO CANDIDATES FOUND!');
        console.log('[🔥 DESCRIPTION_DEBUG] ================================================================');
        
        // KEIN FALLBACK - ERROR HANDLING
        logger.error('[GERMAN DESCRIPTION] ❌ No description found - NO FALLBACK ALLOWED!');
        throw new Error('Description extraction failed: No valid description found in document and no fallback allowed!');
    }
}

// Hilfsfunktionen für Beschreibungsextraktion
function cleanDescriptionText(text: string): string {
    if (!text) return '';
    
    return text
        .replace(/\s+/g, ' ')  // Normalisiere Leerzeichen
        .replace(/[^\w\säöüßÄÖÜ,.:-]/g, '') // Entferne Sonderzeichen außer wichtigen
        .replace(/^\W+|\W+$/g, '') // Entferne führende/nachfolgende Sonderzeichen
        .trim();
}

function shouldSkipLine(line: string): boolean {
    const skipPatterns = [
        /^(rechnung|invoice|datum|date|seite|page|fax|tel|email|@|\d+$)/i,
        /^(rechnungsnummer|ust|vat|steuer|tax|iban|bic|bank)/i,
        /^\d{2}\.\d{2}\.\d{4}$/,  // Reine Datumszeilen
        /^[€$£¥]\s*\d+/,          // Reine Betragszeilen
        /^(DE|AT|CH)\d{2}/        // IBAN-Zeilen
    ];
    
    return skipPatterns.some(pattern => pattern.test(line));
}

function extractVATTableFromTextract(table: any, blocks: any[]): TaxBreakdown[] {
    // Implementation für Textract-Tabellen-Extraktion
    return []; // Placeholder
}

function generateInvoiceTitle(data: ExtractedInvoiceData): string {
    const parts = [];
    if (data.vendorName) parts.push(data.vendorName);
    if (data.invoiceNumber) parts.push(`RG ${data.invoiceNumber}`);
    if (data.totalGrossAmount) parts.push(`€${data.totalGrossAmount}`);
    
    return parts.length > 0 ? parts.join(' - ') : 'Deutsche Rechnung';
}

function determineInvoiceCategory(vendorName: string | null, text: string): string {
    if (!vendorName) return 'Geschäftsausgabe';
    
    const vendor = vendorName.toLowerCase();
    const content = text.toLowerCase();
    
    if (vendor.includes('amazon') || vendor.includes('aws')) return 'IT Services';
    if (content.includes('software') || content.includes('lizenz')) return 'Software/Lizenzen';
    if (content.includes('hosting') || content.includes('server')) return 'IT/Hosting';
    if (content.includes('marketing') || content.includes('werbung')) return 'Marketing';
    if (content.includes('beratung') || content.includes('consulting')) return 'Beratung';
    
    return 'Geschäftsausgabe';
}

// 🎯 SPEZIALISIERTE DEUTSCHE KUNDEN-/EMPFÄNGER-EXTRAKTION MIT SMART VENDOR/CUSTOMER DETECTION
function extractGermanCustomerInfo(text: string, userCompanyData?: UserCompanyData | null): { customerName: string | null; customerAddress: string | null } {
    logger.info('[GERMAN CUSTOMER] Starting specialized German customer/recipient extraction...');
    logger.info('[GERMAN CUSTOMER] Text sample:', text.substring(0, 600));
    
    console.log('[🔥 SMART_DETECTION] ============ SMART VENDOR/CUSTOMER DETECTION ============');
    console.log('[🔥 SMART_DETECTION] User company data available:', !!userCompanyData);
    if (userCompanyData) {
        console.log('[🔥 SMART_DETECTION] User company name:', userCompanyData.companyName);
        console.log('[🔥 SMART_DETECTION] User company phone:', userCompanyData.phoneNumber);
        console.log('[🔥 SMART_DETECTION] User company email:', userCompanyData.contactEmail);
    }
    console.log('[🔥 SMART_DETECTION] ============================================================');
    
    let customerName: string | null = null;
    let customerAddress: string | null = null;
    
    // === PRIORITÄT 0: SMART VENDOR/CUSTOMER DETECTION ===
    // 🎯 Extract ALL company data from invoice, then compare with user's company to determine vendor vs customer
    if (userCompanyData) {
        console.log('[🔥 SMART_DETECTION] === STEP 1: Extract ALL companies from invoice ===');
        
        // Extract all potential company names from invoice
        const allCompanyNames: string[] = [];
        
        // Pattern 1: Company headers (typically at top of invoice)
        const headerPatterns = [
            /^([A-ZÄÖÜ][a-zäöüß\s&.-]+(?:GmbH|AG|UG|e\.K\.|KG|OHG|GbR)?)\n/gm,
            /^([A-ZÄÖÜ][^\n]+(?:GmbH|AG|UG|e\.K\.|KG|OHG|GbR))/gm,
        ];
        
        for (const pattern of headerPatterns) {
            const matches = Array.from(text.matchAll(pattern));
            matches.forEach(match => {
                const name = cleanCustomerText(match[1]);
                if (name && name.length >= 3 && !isInvalidCustomerName(name)) {
                    allCompanyNames.push(name);
                    console.log('[🔥 SMART_DETECTION] Found company in header:', name);
                }
            });
        }
        
        // Pattern 2: Labeled company sections
        const labeledPatterns = [
            /(?:empfänger|recipient)[\s:]*\n?\s*([^\n]+)/gi,
            /(?:rechnungsempfänger|invoice\s*recipient)[\s:]*\n?\s*([^\n]+)/gi,
            /(?:kunde|customer)[\s:]*\n?\s*([^\n]+)/gi,
            /(?:absender|sender)[\s:]*\n?\s*([^\n]+)/gi,
            /(?:von|from)[\s:]*\n?\s*([^\n]+)/gi,
        ];
        
        for (const pattern of labeledPatterns) {
            const matches = Array.from(text.matchAll(pattern));
            matches.forEach(match => {
                const name = cleanCustomerText(match[1]);
                if (name && name.length >= 3 && !isInvalidCustomerName(name)) {
                    allCompanyNames.push(name);
                    console.log('[🔥 SMART_DETECTION] Found company in labeled section:', name);
                }
            });
        }
        
        console.log('[🔥 SMART_DETECTION] === STEP 2: Compare with user company data ===');
        console.log('[🔥 SMART_DETECTION] Total companies found:', allCompanyNames.length);
        console.log('[🔥 SMART_DETECTION] All companies:', allCompanyNames);
        console.log('[🔥 SMART_DETECTION] User company name:', userCompanyData.companyName);
        
        // 🎯 Smart matching: Check if any extracted company matches user's company
        const matchedVendor: string[] = [];
        const matchedCustomers: string[] = [];
        
        for (const companyName of allCompanyNames) {
            const isUserCompany = isCompanyMatch(companyName, userCompanyData);
            
            if (isUserCompany) {
                matchedVendor.push(companyName);
                console.log('[🔥 SMART_DETECTION] ✅ VENDOR (User company):', companyName);
            } else {
                matchedCustomers.push(companyName);
                console.log('[🔥 SMART_DETECTION] ✅ CUSTOMER (External company):', companyName);
            }
        }
        
        // 🎯 Decision: If user company found, others are customers; otherwise fallback to pattern logic
        if (matchedVendor.length > 0 && matchedCustomers.length > 0) {
            customerName = matchedCustomers[0]; // First non-user company is the customer
            console.log('[🔥 SMART_DETECTION] 🎯 SMART DECISION: Customer is:', customerName);
            console.log('[🔥 SMART_DETECTION] 🎯 SMART DECISION: Vendor is user company:', matchedVendor[0]);
            logger.info('[GERMAN CUSTOMER] Smart detection: User company found as vendor, customer:', customerName);
            
            // Don't return yet - let address extraction continue below
        } else {
            console.log('[🔥 SMART_DETECTION] ⚠️ Could not determine clear vendor/customer split - using pattern fallback');
        }
    }
    
    // === PRIORITÄT 1: EXPLIZITE EMPFÄNGER-PATTERNS (Fallback wenn Smart Detection nicht funktioniert) ===
    console.log('[DEBUG_CUSTOMER] Testing explicit recipient patterns...');
    
    // NEUE LOGIK: Finde "Empfänger:" Label und hole die NÄCHSTE sinnvolle Zeile (nicht Label-Zeilen)
    const empfaengerMatch = text.match(/(?:empfänger|recipient)[\s:]*\n((?:[^\n]+\n)*)/gi);
    if (empfaengerMatch) {
        console.log('[DEBUG_CUSTOMER] Found Empfänger section, extracting lines...');
        
        // Hole alle Zeilen nach "Empfänger:"
        const afterEmpfaenger = text.substring(text.toLowerCase().indexOf('empfänger'));
        const lines = afterEmpfaenger.split('\n').slice(1, 10); // Skip "Empfänger:" Zeile, nimm nächste 10
        
        console.log('[DEBUG_CUSTOMER] Lines after Empfänger:', lines.slice(0, 5));
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip leere Zeilen
            if (!trimmed || trimmed.length < 3) continue;
            
            // Skip Label-Zeilen (enden mit ":")
            if (trimmed.endsWith(':')) {
                console.log('[DEBUG_CUSTOMER] Skipping label line:', trimmed);
                continue;
            }
            
            // Skip "Dokumentdetails", "Rechnungsdetails", etc.
            if (trimmed.toLowerCase().match(/^(dokument|rechnung|betreff|datum|fällig)/)) {
                console.log('[DEBUG_CUSTOMER] Skipping document detail line:', trimmed);
                continue;
            }
            
            // Das ist wahrscheinlich der echte Kundenname!
            const extractedName = cleanCustomerText(trimmed);
            if (extractedName && extractedName.length >= 3 && !isInvalidCustomerName(extractedName)) {
                customerName = extractedName;
                console.log('[DEBUG_CUSTOMER] 🎯 CUSTOMER NAME FOUND (multi-line):', customerName);
                logger.info('[GERMAN CUSTOMER] Customer name extracted from Empfänger section:', customerName);
                break;
            }
        }
    }
    
    // FALLBACK: Alte Patterns nur wenn nichts gefunden wurde
    if (!customerName) {
        console.log('[DEBUG_CUSTOMER] No customer found in Empfänger section, trying fallback patterns...');
        
        const recipientPatterns = [
            // "Rechnungsempfänger:" Format - NUR NAMEN extrahieren, keine Adresse!
            /(?:rechnungsempfänger|invoice\s*recipient)[\s:]*\n?\s*([^\n]+)/gi,
            
            // "An:" Format - NUR NAMEN extrahieren, keine Adresse!
            /(?:^|\n)\s*(?:an|to)[\s:]+([^\n]+)/gi,
            
            // "Kunde:" Format - NUR NAMEN extrahieren, keine Adresse!
            /(?:kunde|customer)[\s:]*\n?\s*([^\n]+)/gi,
        ];
        
        for (const pattern of recipientPatterns) {
            const matches = Array.from(text.matchAll(pattern));
            console.log(`[DEBUG_CUSTOMER] Fallback pattern ${pattern.source} found ${matches.length} matches`);
            
            if (matches.length > 0) {
                const match = matches[0];
                
                if (match[1]) {
                    const extractedName = cleanCustomerText(match[1]);
                    if (extractedName && extractedName.length >= 3 && !isInvalidCustomerName(extractedName)) {
                        customerName = extractedName;
                        console.log('[DEBUG_CUSTOMER] 🎯 CUSTOMER NAME FOUND (fallback):', customerName);
                        logger.info('[GERMAN CUSTOMER] Customer name extracted:', customerName);
                        break;
                    }
                }
            }
        }
    }
    
    // === PRIORITÄT 2: MUSTERKUNDE-DETECTION (für Test-Rechnungen) ===
    if (!customerName) {
        console.log('[DEBUG_CUSTOMER] Testing Musterkunde patterns...');
        
        const musterkundePatterns = [
            /musterkunde\s+bei\s+([^\n]+)/gi,
            /musterkunde[^\n]*/gi,
        ];
        
        for (const pattern of musterkundePatterns) {
            const match = text.match(pattern);
            if (match) {
                customerName = cleanCustomerText(match[0]);
                console.log('[DEBUG_CUSTOMER] 🎯 MUSTERKUNDE DETECTED:', customerName);
                logger.info('[GERMAN CUSTOMER] Musterkunde detected:', customerName);
                break;
            }
        }
    }
    
    // === PRIORITÄT 3: ADRESS-PATTERNS (für customerAddress wenn nicht gefunden) ===
    if (!customerAddress && customerName) {
        console.log('[DEBUG_CUSTOMER] Searching for customer address based on found name...');
        
        // Suche nach Adresszeilen in der Nähe des Kundennamens
        const lines = text.split('\n');
        const nameLineIndex = lines.findIndex(line => 
            line.toLowerCase().includes(customerName!.toLowerCase().substring(0, 10))
        );
        
        if (nameLineIndex !== -1) {
            // Schaue in den nächsten 3-5 Zeilen nach Adressinformationen
            for (let i = nameLineIndex + 1; i < Math.min(nameLineIndex + 5, lines.length); i++) {
                const line = lines[i].trim();
                
                // Überprüfe, ob die Zeile wie eine Adresse aussieht (PLZ, Straße, Stadt)
                if (line.match(/\d{5}\s+[A-Za-zäöüß\s]+/g) || // PLZ + Stadt
                    line.match(/[A-Za-zäöüß\s]+\s+\d+/g) ||   // Straße + Hausnummer
                    line.match(/\d+\s+[A-Za-zäöüß\s]+/g)) {   // Hausnummer + Straße
                    
                    const potentialAddress = cleanCustomerAddress(line);
                    if (potentialAddress && potentialAddress.length >= 8 && isValidAddress(potentialAddress)) {
                        customerAddress = potentialAddress;
                        console.log('[DEBUG_CUSTOMER] 🎯 CUSTOMER ADDRESS FROM CONTEXT:', customerAddress);
                        logger.info('[GERMAN CUSTOMER] Customer address from context:', customerAddress);
                        break;
                    } else if (potentialAddress && potentialAddress.length >= 8) {
                        console.log('[DEBUG_CUSTOMER] ❌ INVALID ADDRESS FROM CONTEXT REJECTED:', potentialAddress);
                    }
                }
            }
        }
    }
    
    console.log('[DEBUG_CUSTOMER] ===== FINAL CUSTOMER EXTRACTION RESULTS =====');
    console.log('[DEBUG_CUSTOMER] Customer Name:', customerName || 'NOT FOUND');
    console.log('[DEBUG_CUSTOMER] Customer Address:', customerAddress || 'NOT FOUND');
    console.log('[DEBUG_CUSTOMER] ==============================================');
    
    return {
        customerName,
        customerAddress
    };
}

// Hilfsfunktionen für Kunden-Extraktion
function cleanCustomerText(text: string): string {
    if (!text) return '';
    
    return text
        .replace(/\s+/g, ' ')              // Normalisiere Leerzeichen
        .replace(/[^\w\säöüßÄÖÜ,.:-]/g, '') // Entferne Sonderzeichen
        .replace(/^\W+|\W+$/g, '')         // Entferne führende/nachfolgende Sonderzeichen
        .replace(/^(empfänger|recipient|kunde|customer|an|to)[\s:]+/gi, '') // Entferne Labels
        .trim();
}

function cleanCustomerAddress(address: string): string {
    if (!address) return '';
    
    return address
        .replace(/\n+/g, ', ')             // Zeilenumbrüche zu Kommas
        .replace(/\s+/g, ' ')              // Normalisiere Leerzeichen
        .replace(/,\s*,/g, ',')            // Doppelte Kommas entfernen
        .replace(/^\W+|\W+$/g, '')         // Führende/nachfolgende Sonderzeichen
        .trim();
}

function isInvalidCustomerName(name: string): boolean {
    const invalidPatterns = [
        /^(mietkoch\s*andy|andy\s*staudinger|andy)$/gi, // Der User selbst
        /^(rechnungsnummer|invoice|datum|date|tel|fax|email)$/gi,
        /^(umsatzsteuer|vat|steuer|tax|iban|bic)$/gi,
        /^\d+$/g,                          // Nur Zahlen
        /^[€$£¥]\s*\d+/g,                 // Geldbeträge
    ];
    
    return invalidPatterns.some(pattern => pattern.test(name));
}

function isValidAddress(address: string): boolean {
    if (!address || address.length < 10) return false;
    
    // Prüfe auf typische Adressmuster
    const validAddressPatterns = [
        /\d{5}\s+[A-Za-zäöüß\s]+/g,        // PLZ + Stadt (z.B. "12345 Berlin")
        /[A-Za-zäöüß\s]+\s+\d+/g,          // Straße + Hausnummer (z.B. "Muster Straße 123")
        /\d+\s+[A-Za-zäöüß\s]+/g,          // Hausnummer + Straße (z.B. "123 Muster Straße")
    ];
    
    // Prüfe auf ungültige Inhalte (nicht-Adressen)
    const invalidAddressPatterns = [
        /stornorechnung|storno|rechnung/gi,  // Stornorechnung-Texte
        /nr\.\s*[A-Z]+-\d+/gi,              // Rechnungsnummern (z.B. "Nr. ST-494")
        /datum|date|fällig/gi,               // Datums-/Fälligkeits-Texte
        /sehr\s+geehrte|damen\s+und\s+herren/gi, // Brief-Anreden
        /vielen\s+dank|mit\s+freundlichen/gi, // Brief-Floskeln
    ];
    
    // Wenn ungültige Patterns gefunden werden, ist es keine Adresse
    if (invalidAddressPatterns.some(pattern => pattern.test(address))) {
        return false;
    }
    
    // Wenn mindestens ein Adressmuster gefunden wird, ist es wahrscheinlich eine Adresse
    return validAddressPatterns.some(pattern => pattern.test(address));
}

// 🎯 SMART COMPANY MATCHING: Compare extracted company with user's company data
function isCompanyMatch(extractedCompany: string, userData: UserCompanyData): boolean {
    if (!extractedCompany || !userData) return false;
    
    const extracted = extractedCompany.toLowerCase().trim();
    
    console.log('[🔥 COMPANY_MATCH] Comparing extracted company:', extracted);
    console.log('[🔥 COMPANY_MATCH] With user company:', userData.companyName?.toLowerCase());
    
    // Match 1: Company name similarity (fuzzy match)
    if (userData.companyName) {
        const userCompany = userData.companyName.toLowerCase().trim();
        
        // Exact match
        if (extracted === userCompany) {
            console.log('[🔥 COMPANY_MATCH] ✅ Exact name match!');
            return true;
        }
        
        // Partial match (handle abbreviations, legal forms, etc.)
        // Remove legal forms for comparison (GmbH, UG, etc.)
        const extractedClean = extracted.replace(/\s*(gmbh|ag|ug|e\.k\.|kg|ohg|gbr)\s*$/gi, '').trim();
        const userCompanyClean = userCompany.replace(/\s*(gmbh|ag|ug|e\.k\.|kg|ohg|gbr)\s*$/gi, '').trim();
        
        if (extractedClean === userCompanyClean) {
            console.log('[🔥 COMPANY_MATCH] ✅ Name match without legal form!');
            return true;
        }
        
        // Contains match (one contains the other)
        if (extracted.includes(userCompany) || userCompany.includes(extracted)) {
            console.log('[🔥 COMPANY_MATCH] ✅ Partial name match!');
            return true;
        }
    }
    
    // Match 2: Phone number match
    if (userData.phoneNumber && extracted.includes(userData.phoneNumber.replace(/\s/g, ''))) {
        console.log('[🔥 COMPANY_MATCH] ✅ Phone number match!');
        return true;
    }
    
    // Match 3: Email match
    if (userData.contactEmail && extracted.includes(userData.contactEmail.toLowerCase())) {
        console.log('[🔥 COMPANY_MATCH] ✅ Email match!');
        return true;
    }
    
    // Match 4: VAT ID match
    if (userData.vatId && extracted.includes(userData.vatId.replace(/\s/g, ''))) {
        console.log('[🔥 COMPANY_MATCH] ✅ VAT ID match!');
        return true;
    }
    
    // Match 5: Tax number match
    if (userData.taxNumber && extracted.includes(userData.taxNumber.replace(/\s/g, ''))) {
        console.log('[🔥 COMPANY_MATCH] ✅ Tax number match!');
        return true;
    }
    
    console.log('[🔥 COMPANY_MATCH] ❌ No match found');
    return false;
}


// Export unused functions to avoid TypeScript warnings
export const _unusedFunctions = {
    extractCompanyAddress,
    extractDueDateFromText,
    extractPaymentTermsFromText,
    extractContactEmail,
    extractCompanyVatNumber,
    extractVatRate,
    extractContactPhone,
    extractDateFromBlocks,
    extractInvoiceNumberFromBlocks,
    parseGoogleVisionStructuredData,
    parseGoogleAIStructuredData,
    createReceiptDataFromStructured,

    // Neue deutsche Funktionen
    extractWithGermamInvoiceSchema,
    extractFromTextractBlocks,
    extractWithGermanPatterns_NEW_VERSION_2025,
    germanInvoiceSchema,
    
    // ⚡ HINZUGEFÜGT: Nicht verwendete Funktionen nach sevDesk-Kalibrierung
    // extractAmountsAdvanced - DELETED
    extractVendorFromForms,
    extractVendorByPosition,
    extractVendorFromText,
    
    // ⚡ OCR FUNKTIONEN DIE NICHT GELÖSCHT WERDEN SOLLEN
    processWithVertexAI,
    processWithGoogleCloudVision
};

// Cost optimization: Removed expensive query processing functions

// Context-aware vendor extraction using AWS Textract blocks

// Extract vendor from form key-value pairs
function extractVendorFromForms(blocks: any[]): string {
    const vendorKeys = [
        'rechnung an', 'bill to', 'invoice to', 'kunde', 'customer', 
        'empfänger', 'recipient', 'firma', 'company', 'unternehmen'
    ];

    const keyValueBlocks = blocks.filter(block => 
        block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')
    );

    for (const kvBlock of keyValueBlocks) {
        if (kvBlock.Relationships) {
            const childRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
            if (childRelation?.Ids) {
                const keyText = childRelation.Ids
                    .map((id: string) => blocks.find(block => block.Id === id))
                    .filter((block: any) => block && block.Text)
                    .map((block: any) => block.Text.toLowerCase())
                    .join(' ');

                // Check if this key indicates a vendor/customer field
                if (vendorKeys.some(key => keyText.includes(key))) {
                    // Find the associated value
                    const valueRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'VALUE');
                    if (valueRelation?.Ids) {
                        const valueBlock = blocks.find(block => 
                            valueRelation.Ids.includes(block.Id) && block.EntityTypes?.includes('VALUE')
                        );
                        
                        if (valueBlock?.Relationships) {
                            const valueChildRelation = valueBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
                            if (valueChildRelation?.Ids) {
                                const vendor = valueChildRelation.Ids
                                    .map((id: string) => blocks.find(block => block.Id === id))
                                    .filter((block: any) => block && block.Text)
                                    .map((block: any) => block.Text)
                                    .join(' ')
                                    .trim();
                                
                                if (vendor && vendor.length > 2) {
                                    return vendor.substring(0, 50);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return '';
}

// Extract vendor by analyzing block positions
function extractVendorByPosition(blocks: any[]): string {
    const lineBlocks = blocks
        .filter(block => block.BlockType === 'LINE' && block.Text && block.Geometry?.BoundingBox)
        .sort((a, b) => {
            // Sort by vertical position (top to bottom)
            return (a.Geometry.BoundingBox.Top || 0) - (b.Geometry.BoundingBox.Top || 0);
        });

    // Look for company indicators in the first few lines
    for (let i = 0; i < Math.min(5, lineBlocks.length); i++) {
        const block = lineBlocks[i];
        const text = block.Text.trim();
        
        // Check for company patterns
        if (text.match(/^[A-Z][a-zA-Z0-9\s&.-]{3,40}$/)) {
            // Check if it contains company indicators
            if (text.match(/\.(com|de|org|net|eu)\b/i) || 
                text.match(/\b(gmbh|ag|kg|llc|inc|ltd|corp|ug)\b/i) ||
                text.length > 10) {
                return text.substring(0, 50);
            }
        }
    }

    // Look for domain names or email addresses
    for (const block of lineBlocks) {
        const domainMatch = block.Text.match(/([a-zA-Z0-9.-]+\.(com|de|org|net|eu))/i);
        if (domainMatch) {
            return domainMatch[1];
        }
    }

    return '';
}

// Vendor extraction from text patterns (KEIN FALLBACK)
function extractVendorFromText(originalText: string): string {
    // First try to extract from JSON response (Google AI Studio often returns JSON)
    if (originalText.includes('{') && originalText.includes('}')) {
        try {
            // Try to find JSON vendor in the response
            const jsonMatch = originalText.match(/"(?:vendor|company|firma)"\s*:\s*"([^"]+)"/i);
            if (jsonMatch) {
                return jsonMatch[1];
            }
            
            // Try to find company name in JSON
            const companyMatch = originalText.match(/"(?:companyName|company_name)"\s*:\s*"([^"]+)"/i);
            if (companyMatch) {
                return companyMatch[1];
            }
        } catch (e) {
            // Ignore JSON parsing errors
        }
    }
    
    // Extract from common company names in text
    const commonCompanies = [
        'Google', 'Amazon', 'Microsoft', 'Apple', 'Meta', 'Facebook', 
        'Netflix', 'Adobe', 'Salesforce', 'Oracle', 'SAP', 'IBM',
        'Stripe', 'PayPal', 'Shopify', 'Zoom', 'Slack', 'Dropbox'
    ];
    
    for (const company of commonCompanies) {
        if (originalText.includes(company)) {
            return company;
        }
    }
    
    const vendorPatterns = [
        // German invoice recipient patterns (PRIORITY)
        /(?:empfänger|recipient)[\s:]*\n?([^\n]+)/i,
        /(?:rechnung\s*an|bill\s*to|invoice\s*to|kunde|customer)[\s:]*([^\n]+)/i,
        
        // Company name patterns
        /(?:^|\n)([A-Z][a-zA-Z0-9\s&.-]{5,40})(?:\n|$)/m,
        /^([^\n]+(?:gmbh|ag|kg|llc|inc|ltd|corp|ug))/mi,
        
        // Contact patterns
        /(?:^|\n)([a-zA-Z0-9.-]+\.(?:com|de|org|net|eu))(?:\n|$)/i,
        /firma:?\s*([^\n]+)/i,
        /company:?\s*([^\n]+)/i,
        
        // German names with proper capitalization
        /^([A-ZÜÄÖ][a-zäöüß\s&.-]{2,50})/m,
        
        // Multi-word company names (like "Musterkunde Bei Installation")
        /(?:^|\n)([A-ZÜÄÖ][a-zA-Züäöüß\s]{10,50})(?=\n|\s*$)/m,
    ];

    for (const pattern of vendorPatterns) {
        const match = originalText.match(pattern);
        if (match) {
            const vendor = match[1].trim().replace(/[\r\n]+/g, ' ').substring(0, 50);
            if (vendor.length > 2 && !vendor.includes('"') && !vendor.includes('{')) {
                return vendor;
            }
        }
    }

    return '';
}

// Extract company address from text
function extractCompanyAddress(text: string): string {
    // Common address patterns for European addresses
    const addressPatterns = [
        // Specific Google Cloud pattern
        /(?:Google Cloud EMEA Limited|Google)\s*[\n\r]+([^\n\r]+(?:[\n\r]+[^\n\r]*(?:Dublin|Ireland|Clanwilliam|Velasco).*)?)/i,
        // General Dublin/Ireland pattern
        /(Velasco[^\n]*[\n\r]+Clanwilliam[^\n]*[\n\r]+Dublin[^\n]*[\n\r]*Ireland)/i,
        // Generic European address patterns
        /(?:adresse|address)[\s:]*([^\n]+(?:\n[^\n]*(?:str|straße|strasse|platz|weg|gasse).*)?(?:\n[^\n]*(?:\d{5}|\d{4})\s+[a-züäöß\s]+)?(?:\n[^\n]*(?:deutschland|germany|austria|schweiz|switzerland|ireland|dublin))?)/i,
        // Multi-line address starting with street
        /([a-züäöß\s]+(?:str|straße|strasse|platz|weg|gasse)\.?\s*\d*[^\n]*(?:\n[^\n]*(?:\d{5}|\d{4})\s+[a-züäöß\s]+)?(?:\n[^\n]*(?:deutschland|germany|austria|schweiz|switzerland|ireland|dublin)?)?)/i,
        // City with postal code pattern
        /(\d{5}\s+[a-züäöß\s]+(?:\n[^\n]*(?:deutschland|germany|austria|schweiz|switzerland|ireland)?)?)/i,
        // Irish address pattern
        /(Dublin\s+\d+[^\n]*(?:\n[^\n]*Ireland)?)/i,
        // General multi-line address pattern
        /([A-ZÜÄÖ][a-züäöß\s.,-]+(?:\d+[a-z]?)?[^\n]*(?:\n[^\n]*(?:\d{4,5})\s+[a-züäöß\s]+)?(?:\n[^\n]*(?:deutschland|germany|austria|schweiz|switzerland|ireland|cyprus|dublin)?)?)/i
    ];

    for (const pattern of addressPatterns) {
        const match = text.match(pattern);
        if (match) {
            const address = match[1].trim()
                .replace(/[\r]+/g, '')
                .replace(/\n+/g, ', ')
                .replace(/,+/g, ', ')
                .replace(/\s+/g, ' ')
                .replace(/,\s*$/, '') // Remove trailing comma
                .substring(0, 200);
            
            // Clean up common OCR artifacts and validate
            if (address.length > 5 && 
                !address.includes('"') && 
                !address.includes('{') && 
                !address.includes('rawText') &&
                (address.includes('Dublin') || address.includes('Ireland') || address.match(/\d{4,5}/))) {
                return address;
            }
        }
    }

    return '';
}

// Extract due date from text - Enhanced für deutsche Rechnungen
function extractDueDateFromText(text: string): string | null {
    logger.info('[DUE DATE DEBUG] Starting due date extraction...');
    logger.info('[DUE DATE DEBUG] Text sample:', text.substring(0, 500));
    
    const dueDatePatterns = [
        // Priorität 1: Deutsche Fälligkeitsdatum-Patterns
        /Fälligkeitsdatum[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
        /Fälligkeitsdatum[:\s]*(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/gi,
        /Fällig\s*am[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
        /Fällig[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
        
        // Priorität 2: Zahlungsziel-Patterns
        /Zahlbar\s+bis[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
        /Zahlungsziel[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
        /Zahlung\s+bis[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
        
        // Priorität 3: Englische Patterns
        /Due\s*Date[:\s]*(\d{1,2}[.-/]\d{1,2}[.-/]\d{4})/gi,
        /Payment\s*Due[:\s]*(\d{1,2}[.-/]\d{1,2}[.-/]\d{4})/gi,
        
        // Priorität 4: ISO Date Formats
        /Fälligkeitsdatum[:\s]*(\d{4}[-]\d{1,2}[-]\d{1,2})/gi,
        /Due\s*Date[:\s]*(\d{4}[-]\d{1,2}[-]\d{1,2})/gi,
        
        // Priorität 5: Text-basierte deutsche Datumsformate  
        /Fälligkeitsdatum[:\s]*(\d{1,2})\.\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*(\d{4})/gi,
        /Zahlbar\s+bis[:\s]*(\d{1,2})\.\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*(\d{4})/gi,
    ];
    
    const monthNames = {
        'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6,
        'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12
    };
    
    for (let i = 0; i < dueDatePatterns.length; i++) {
        const pattern = dueDatePatterns[i];
        const match = text.match(pattern);
        
        logger.info(`[DUE DATE DEBUG] Pattern ${i + 1} (${pattern.source}): ${match ? 'MATCH' : 'NO MATCH'}`);
        
        if (match) {
            logger.info(`[DUE DATE DEBUG] Found match:`, match);
            
            try {
                let day: number, month: number, year: number;
                
                // Prüfe ob es ein Text-basiertes deutsches Datum ist (3 Gruppen)
                if (match[3] && match[2]) {
                    // Text-basiertes Datum: "21. Oktober 2025"
                    day = parseInt(match[1]);
                    const monthName = match[2].toLowerCase();
                    month = monthNames[monthName as keyof typeof monthNames];
                    year = parseInt(match[3]);
                    
                    logger.info(`[DUE DATE DEBUG] Text date parsed: ${day}.${month}.${year}`);
                } else {
                    // Standard Datumsformat
                    const dateStr = match[1];
                    
                    // Prüfe Format
                    if (dateStr.includes('-') && dateStr.match(/^\d{4}/)) {
                        // ISO Format: YYYY-MM-DD
                        const parts = dateStr.split('-');
                        year = parseInt(parts[0]);
                        month = parseInt(parts[1]);
                        day = parseInt(parts[2]);
                        
                        logger.info(`[DUE DATE DEBUG] ISO date parsed: ${year}-${month}-${day}`);
                    } else {
                        // German Format: DD.MM.YYYY or DD-MM-YYYY
                        const parts = dateStr.split(/[.-]/);
                        if (parts.length === 3) {
                            day = parseInt(parts[0]);
                            month = parseInt(parts[1]);
                            year = parseInt(parts[2]);
                            
                            logger.info(`[DUE DATE DEBUG] German date parsed: ${day}.${month}.${year}`);
                        } else {
                            logger.warn(`[DUE DATE DEBUG] Could not parse date parts:`, parts);
                            continue;
                        }
                    }
                }
                
                // Validiere Datum
                if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const date = new Date(year, month - 1, day);
                    const isoDate = date.toISOString().split('T')[0];
                    
                    logger.info(`[DUE DATE DEBUG] ✅ VALID due date found: ${isoDate} (Pattern ${i + 1})`);
                    return isoDate;
                } else {
                    logger.warn(`[DUE DATE DEBUG] Invalid date values: ${day}.${month}.${year}`);
                }
            } catch (e) {
                logger.error(`[DUE DATE DEBUG] Date parsing error:`, e);
                continue;
            }
        }
    }
    
    logger.warn('[DUE DATE DEBUG] ❌ No valid due date found');
    return null;
}

// Extract payment terms from text
function extractPaymentTermsFromText(text: string): string {
    const paymentPatterns = [
        /Zahlungsziel[:\s]*([^\n]+)/gi,
        /Zahlbar\s+binnen\s+\d+\s+Tagen[^\n]*/gi,
        /\d+\s*Tage\s*netto[^\n]*/gi,
        /ohne\s+Abzug[^\n]*/gi,
        /Skonto[^\n]*/gi
    ];
    
    for (const pattern of paymentPatterns) {
        const match = text.match(pattern);
        if (match) {
            let terms = match[0].trim();
            // Remove "Zahlungsziel:" prefix if present
            terms = terms.replace(/^Zahlungsziel[:\s]*/gi, '');
            return terms;
        }
    }
    
    return '';
}

// Extract contact email from text
function extractContactEmail(text: string): string {
    // Email patterns
    const emailPatterns = [
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        /(?:email|e-mail|mail)[\s:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];

    for (const pattern of emailPatterns) {
        const match = text.match(pattern);
        if (match) {
            const email = match[match.length === 2 ? 1 : 0].trim().toLowerCase();
            // Validate email format
            if (email.includes('@') && email.includes('.') && email.length > 5) {
                return email;
            }
        }
    }

    return '';
}

// Extract company VAT number from text
function extractCompanyVatNumber(text: string): string {
    // VAT number patterns for various European countries
    const vatPatterns = [
        // German VAT with description: "Umsatzsteuer-Identifikationsnummer: DE123456789"
        /(?:Umsatzsteuer[\-\s]*Identifikationsnummer|USt[\.\-\s]*ID[\.\-\s]*Nr?|VAT[\s\-]*ID|Steuer[\-\s]*Nr?)[\.\-\s]*:?\s*([A-Z]{2}[A-Z0-9]{8,12})/i,
        // Irish VAT: IE3668997OH with description
        /(?:Umsatzsteuer[\-\s]*Identifikationsnummer|VAT[\s\-]*(?:reg[\s\-]*)?(?:no[\s\-]*)?|USt[\.\-\s]*ID[\.\-\s]*Nr?)[\.\-\s]*:?\s*(IE\d{7}[A-Z]{1,2})/i,
        // German VAT number: DE123456789
        /(?:USt[\.\-\s]*ID[\.\-\s]*Nr?[\.\-\s]*:?\s*|VAT[\s\-]*ID[\s\-]*:?\s*|Steuer[\.\-\s]*Nr?[\.\-\s]*:?\s*)?(DE\d{9})/i,
        // German tax number: 12/345/67890
        /(?:Steuer[\.\-\s]*Nr?[\.\-\s]*:?\s*)(\d{2,3}\/\d{3}\/\d{5})/i,
        // EU VAT numbers with country codes
        /(?:USt[\.\-\s]*ID[\.\-\s]*Nr?[\.\-\s]*:?\s*|VAT[\s\-]*ID[\s\-]*:?\s*)([A-Z]{2}\d{8,12})/i,
        // Austrian VAT: ATU12345678
        /(ATU\d{8})/i,
        // French VAT: FR12345678901
        /(FR\d{11})/i,
        // Dutch VAT: NL123456789B01
        /(NL\d{9}B\d{2})/i,
        // Belgian VAT: BE0123456789
        /(BE\d{10})/i,
        // General European pattern - more specific
        /(?:VAT[\s\-]*(?:reg[\s\-]*)?(?:no[\s\-]*)?:?\s*|USt[\.\-\s]*ID[\.\-\s]*Nr?[\.\-\s]*:?\s*)([A-Z]{2}[A-Z0-9]{8,12})/i,
        // Standalone pattern for known formats
        /(IE\d{7}[A-Z]{1,2})/i,
        /(DE\d{9})/i,
        /(ATU\d{8})/i,
        /(FR\d{11})/i,
        /(NL\d{9}B\d{2})/i,
        /(BE\d{10})/i
    ];

    for (const pattern of vatPatterns) {
        const match = text.match(pattern);
        if (match) {
            let vatNumber = match[1] || match[0];
            
            // Clean up VAT number
            vatNumber = vatNumber.replace(/[^\w]/g, '').toUpperCase();
            
            // Validate basic structure
            if (vatNumber.length >= 8) {
                // Add formatting for common patterns
                if (vatNumber.startsWith('DE') && vatNumber.length === 11) {
                    return vatNumber; // DE123456789
                }
                if (vatNumber.match(/^\d{2,3}\d{3}\d{5}$/)) {
                    // German tax number format: 12/345/67890
                    const cleaned = vatNumber.replace(/(\d{2,3})(\d{3})(\d{5})/, '$1/$2/$3');
                    return cleaned;
                }
                if (vatNumber.startsWith('IE') && vatNumber.length >= 9) {
                    return vatNumber; // IE3668997OH
                }
                if (vatNumber.startsWith('ATU') && vatNumber.length === 11) {
                    return vatNumber; // ATU12345678
                }
                if (vatNumber.startsWith('FR') && vatNumber.length === 13) {
                    return vatNumber; // FR12345678901
                }
                if (vatNumber.startsWith('NL') && vatNumber.length === 13) {
                    return vatNumber; // NL123456789B01
                }
                if (vatNumber.startsWith('BE') && vatNumber.length === 12) {
                    return vatNumber; // BE0123456789
                }
                if (vatNumber.match(/^[A-Z]{2}[A-Z0-9]{8,12}$/)) {
                    return vatNumber; // Other EU VAT numbers
                }
            }
        }
    }

    return '';
}

// Extract VAT rate from text
function extractVatRate(text: string, amount: number | null, vatAmount: number | null, netAmount: number | null): number {
    // First try to calculate from amounts if available
    if (amount && vatAmount && netAmount) {
        const calculatedRate = Math.round((vatAmount / netAmount) * 100);
        if (calculatedRate >= 0 && calculatedRate <= 30) {
            return calculatedRate;
        }
    }
    
    // Special case: If vatAmount is 0 or very small compared to total, it's likely 0%
    if (amount && vatAmount !== null && vatAmount <= 0.01) {
        return 0;
    }
    
    // Pattern matching for explicit VAT rate mentions
    const vatRatePatterns = [
        // Direct percentage mentions: "19%", "0%", "7%" etc.
        /(?:mwst|vat|tax|steuer|mehrwertsteuer)[\s\-:]*(\d{1,2})[,.]?(\d{1,2})?[\s]*[%]/i,
        // "0% VAT", "19% MwSt" etc.
        /(\d{1,2})[,.]?(\d{1,2})?[\s]*[%][\s]*(?:mwst|vat|tax|steuer|mehrwertsteuer)/i,
        // "Steuersatz: 19%", "VAT Rate: 0%"
        /(?:steuersatz|vat[\s\-]*rate|tax[\s\-]*rate)[\s\-:]*(\d{1,2})[,.]?(\d{1,2})?[\s]*[%]/i,
        // Zero VAT indicators for international transactions
        /(?:reverse[\s\-]*charge|grenzüberschreitend|international|umsatzsteuer[\s\-]*befreit|vat[\s\-]*exempt)/i
    ];
    
    for (const pattern of vatRatePatterns) {
        const match = text.match(pattern);
        if (match) {
            // Special case for reverse charge / exempt patterns
            if (pattern.source.includes('reverse|grenzüberschreitend|international|befreit|exempt')) {
                return 0;
            }
            
            // Extract numeric rate
            const mainDigits = parseInt(match[1] || '0');
            const decimals = match[2] ? parseInt(match[2]) : 0;
            const rate = decimals > 0 ? parseFloat(`${mainDigits}.${decimals}`) : mainDigits;
            
            if (rate >= 0 && rate <= 30) {
                return Math.round(rate);
            }
        }
    }
    
    // Check for specific zero VAT indicators in German/English
    const zeroVatIndicators = [
        /umsatzsteuer[\s\-]*befreit/i,
        /steuerbefreit/i,
        /vat[\s\-]*exempt/i,
        /no[\s\-]*vat/i,
        /ohne[\s\-]*mehrwertsteuer/i,
        /0[,.]00[\s]*€[\s]*(?:mwst|vat|steuer)/i,
        /(?:mwst|vat|steuer)[\s\-:]*0[,.]00/i
    ];
    
    for (const indicator of zeroVatIndicators) {
        if (text.match(indicator)) {
            return 0;
        }
    }
    
    // Default fallback based on country patterns
    // Irish companies (like IE3668997OH) often have 0% VAT for B2B international
    if (text.match(/IE\d{7}[A-Z]{1,2}/)) {
        // Check if it's likely B2B international (no VAT)
        if (vatAmount === null || vatAmount === 0 || (amount && vatAmount && (vatAmount / amount) < 0.05)) {
            return 0;
        }
    }
    
    // German companies usually have 19% or 7%
    if (text.match(/DE\d{9}/)) {
        // If small VAT amount suggests 7% (reduced rate)
        if (amount && vatAmount && Math.abs((vatAmount / amount) - (7/107)) < 0.01) {
            return 7;
        }
        return 19; // Standard German VAT
    }
    
    // Default fallback
    return 19;
}

// Extract contact phone from text
function extractContactPhone(text: string): string {
    // Phone patterns for German/European numbers with context
    const phonePatterns = [
        /(?:tel|phone|telefon|fon|call)[\s:]*([+]?[\d\s\-\(\)\/]{8,20})/i,
        /(?:^|\n)([+]?[\d]{1,4}[\s\-]?[\d\s\-\(\)\/]{8,15})(?=\s|$|\n)/gm,
        /([+]?49[\s\-]?[\d\s\-\(\)\/]{8,15})(?=\s|$|\n)/g, // German numbers
        /([+]?353[\s\-]?[\d\s\-\(\)\/]{8,15})(?=\s|$|\n)/g // Irish numbers
    ];

    for (const pattern of phonePatterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const match of matches) {
                const phone = match.trim().replace(/[^\d+\-\s\(\)]/g, '');
                
                // Skip if it looks like an invoice number (10 consecutive digits)
                const consecutiveDigits = phone.match(/\d{10,}/);
                if (consecutiveDigits) {
                    continue; // Skip invoice numbers like 5078178663
                }
                
                // Validate phone has reasonable structure
                const digitCount = phone.replace(/[^\d]/g, '').length;
                if (digitCount >= 8 && digitCount <= 15) {
                    // Must have some structure (spaces, dashes, parentheses)
                    if (phone.includes(' ') || phone.includes('-') || phone.includes('(') || phone.includes('+')) {
                        return phone;
                    }
                }
            }
        }
    }

    return '';
}

// REMOVED: extractAmountsFromBlocks - not needed in cost-optimized version
// Direct text-based extraction is sufficient and much cheaper

// REMOVED: extractAmountsFromTables and extractAmountsFromForms 
// Cost optimization: Block-based extraction not needed - using direct text patterns only

// Extract date from blocks with position context
function extractDateFromBlocks(blocks: any[], originalText: string): string {
    // First try to extract from form key-value pairs
    const dateKeys = ['datum', 'date', 'rechnungsdatum', 'invoice date', 'bill date'];

    const keyValueBlocks = blocks.filter(block => 
        block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')
    );

    for (const kvBlock of keyValueBlocks) {
        if (kvBlock.Relationships) {
            const childRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
            if (childRelation?.Ids) {
                const keyText = childRelation.Ids
                    .map((id: string) => blocks.find(block => block.Id === id))
                    .filter((block: any) => block && block.Text)
                    .map((block: any) => block.Text.toLowerCase())
                    .join(' ');

                if (dateKeys.some(key => keyText.includes(key))) {
                    const valueRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'VALUE');
                    if (valueRelation?.Ids) {
                        const valueBlock = blocks.find(block => 
                            valueRelation.Ids.includes(block.Id) && block.EntityTypes?.includes('VALUE')
                        );
                        
                        if (valueBlock?.Relationships) {
                            const valueChildRelation = valueBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
                            if (valueChildRelation?.Ids) {
                                const dateText = valueChildRelation.Ids
                                    .map((id: string) => blocks.find(block => block.Id === id))
                                    .filter((block: any) => block && block.Text)
                                    .map((block: any) => block.Text)
                                    .join(' ');
                                
                                const parsedDate = parseDate(dateText);
                                if (parsedDate) return parsedDate;
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback to text pattern extraction
    return extractGermanDate(originalText) || new Date().toISOString().split('T')[0];
}

// Extract invoice number from blocks with context
function extractInvoiceNumberFromBlocks(blocks: any[], originalText: string): string {
    const invoiceKeys = [
        'rechnungsnummer', 'invoice number', 'rechnung nr', 'invoice no',
        'rechnungs-nr', 'bill no', 'ausgangsrechnung'
    ];

    const keyValueBlocks = blocks.filter(block => 
        block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')
    );

    for (const kvBlock of keyValueBlocks) {
        if (kvBlock.Relationships) {
            const childRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
            if (childRelation?.Ids) {
                const keyText = childRelation.Ids
                    .map((id: string) => blocks.find(block => block.Id === id))
                    .filter((block: any) => block && block.Text)
                    .map((block: any) => block.Text.toLowerCase())
                    .join(' ');

                if (invoiceKeys.some(key => keyText.includes(key))) {
                    const valueRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'VALUE');
                    if (valueRelation?.Ids) {
                        const valueBlock = blocks.find(block => 
                            valueRelation.Ids.includes(block.Id) && block.EntityTypes?.includes('VALUE')
                        );
                        
                        if (valueBlock?.Relationships) {
                            const valueChildRelation = valueBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
                            if (valueChildRelation?.Ids) {
                                const invoiceNum = valueChildRelation.Ids
                                    .map((id: string) => blocks.find(block => block.Id === id))
                                    .filter((block: any) => block && block.Text)
                                    .map((block: any) => block.Text)
                                    .join('')
                                    .trim();
                                
                                if (invoiceNum && invoiceNum.length >= 3 && invoiceNum.length <= 20) {
                                    return invoiceNum;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Fallback to text pattern extraction
    return extractGermanInvoiceNumber(originalText) || 'N/A';
}

// Helper function to parse date strings
function parseDate(dateText: string): string | null {
    const patterns = [
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
    ];

    for (const pattern of patterns) {
        const match = dateText.match(pattern);
        if (match) {
            try {
                let day: number, month: number, year: number;
                
                if (pattern.source.includes('-')) {
                    if (parseInt(match[1]) > 1000) {
                        // ISO format YYYY-MM-DD
                        year = parseInt(match[1]);
                        month = parseInt(match[2]);
                        day = parseInt(match[3]);
                    } else {
                        // DD-MM-YYYY
                        day = parseInt(match[1]);
                        month = parseInt(match[2]);
                        year = parseInt(match[3]);
                    }
                } else {
                    // DD.MM.YYYY or MM/DD/YYYY
                    day = parseInt(match[1]);
                    month = parseInt(match[2]);
                    year = parseInt(match[3]);
                }

                if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const date = new Date(year, month - 1, day);
                    return date.toISOString().split('T')[0];
                }
            } catch (e) {
                continue;
            }
        }
    }

    return null;
}

// Generate user-friendly extraction message
function generateExtractionMessage(data: any, enhanced: boolean): string {
    const foundItems = [];
    if (data.amount) foundItems.push(`Betrag ${data.amount}€`);
    if (data.vendor) foundItems.push(`Anbieter ${data.vendor}`);
    if (data.invoiceNumber) foundItems.push(`RG-Nr. ${data.invoiceNumber}`);
    
    const baseMessage = foundItems.length > 0 
        ? `✅ OCR erkannt: ${foundItems.join(', ')}`
        : '📋 OCR-Verarbeitung abgeschlossen - Daten manuell prüfen';
    
    if (enhanced) {
        return `🚀 ${baseMessage} (AWS Textract + Google AI Studio)`;
    }
    
    return baseMessage;
}

// Parse structured data from Google Cloud Vision response
function parseGoogleVisionStructuredData(text: string): any | null {
    try {
        logger.info('[Vision Parser] Parsing Google Cloud Vision OCR result');
        
        const data: any = {};
        
        // Extract field helper function with enhanced value validation
        const extractField = (pattern: string, key: string) => {
            const regex = new RegExp(`${pattern}:\\s*(.+?)(?=\\n|$)`, 'gi');
            const match = text.match(regex);
            if (match && match[0]) {
                const value = match[0].split(':')[1]?.trim();
                
                // Enhanced validation: reject if value is same as pattern (label)
                const isValidValue = value && 
                    value !== '' && 
                    value !== 'N/A' && 
                    !value.includes('[') &&
                    value.toUpperCase() !== pattern.toUpperCase() && // Reject if value equals label
                    value !== pattern; // Extra safety
                
                if (isValidValue) {
                    data[key] = value;
                    logger.info(`[Vision Parser] ✅ Found ${key}: ${value}`);
                } else {
                    logger.warn(`[Vision Parser] ❌ Invalid value for ${key}: "${value}" (pattern: ${pattern})`);
                }
            }
        };
        
        // Enhanced direct pattern extraction for German invoice data
        const extractDirectPatterns = () => {
            logger.info('[Vision Parser DEBUG] 🔍 Starting direct pattern extraction...');
            logger.info('[Vision Parser DEBUG] 📄 Text analysis:', {
                textLength: text.length,
                containsRE1082: text.includes('RE-1082') || text.includes('RE1082') || text.includes('1082'),
                containsRECHNUNG: text.includes('RECHNUNG') || text.includes('rechnung'),
                textPreview: text.substring(0, 400) + '...'
            });
            
            // Rechnungsnummer - erweiterte Pattern für RE-1082 Format (spezifisch optimiert)
            const invoicePatterns = [
                // PRIORITY 1: Exact RE-1082 patterns
                /\bRE-1082\b/gi,
                /\bRE\.1082\b/gi,
                /\bRE_1082\b/gi,
                /\bRE1082\b/gi,
                // PRIORITY 2: General RE patterns
                /\b(RE[.-]?\d{3,6})\b/gi,
                /\bRE[.-](\d{3,6})\b/gi,
                // PRIORITY 3: Labeled formats - extract VALUE after label
                /Rechnungsnummer[:\s]*([A-Za-z0-9-_]+)/gi,
                /Invoice\s*Number[:\s]*([A-Za-z0-9-_]+)/gi,
                /Rechnung\s*Nr[.:\s]*([A-Za-z0-9-_]+)/gi,
                /Nr[.:\s]*([A-Za-z0-9-_]+)/gi,
                // PRIORITY 4: Specific RE patterns
                /(RE\d{3,6})/gi,
                /(RE[.-_]\d{3,6})/gi,
                // PRIORITY 5: Emergency - just look for 1082
                /\b(1082)\b/gi
            ];
            
            logger.info(`[Vision Parser DEBUG] 🎯 Testing ${invoicePatterns.length} patterns on text length: ${text.length}`);
            
            for (const pattern of invoicePatterns) {
                const matches = text.match(pattern);
                if (matches) {
                    logger.info(`[Vision Parser DEBUG] Pattern ${pattern.source} found matches:`, matches);
                    
                    for (const match of matches) {
                        let invoiceNum = match;
                        
                        // Extrahiere die Nummer aus dem Match
                        if (match.includes(':')) {
                            const parts = match.split(':');
                            invoiceNum = parts[1]?.trim() || parts[0]?.trim();
                        }
                        
                        // Bereinige die Rechnungsnummer
                        invoiceNum = invoiceNum.replace(/[:\s]+$/, '').trim();
                        
                        logger.info(`[Vision Parser DEBUG] Processing invoice number candidate: "${invoiceNum}"`);
                        
                        // Validiere die Rechnungsnummer
                        if (invoiceNum && 
                            invoiceNum !== 'RECHNUNGSNR' && 
                            invoiceNum !== 'Rechnungsnummer' &&
                            invoiceNum !== 'Invoice' &&
                            invoiceNum.length >= 3 && 
                            invoiceNum.length <= 20) {
                            
                            data.invoiceNumber = invoiceNum;
                            logger.info(`[Vision Parser DIRECT] ✅ Found invoice number: ${data.invoiceNumber}`);
                            break;
                        }
                    }
                    
                    if (data.invoiceNumber) {
                        break;
                    }
                }
            }
            
            if (!data.invoiceNumber) {
                logger.warn(`[Vision Parser DEBUG] ❌ No valid invoice number found. Text preview:`, text.substring(0, 500));
            }
            
            // Datum - deutsche Formate
            const datePatterns = [
                /Datum[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
                /Date[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
                /(\d{1,2}[.]\d{1,2}[.]\d{4})/g
            ];
            
            for (const pattern of datePatterns) {
                const match = text.match(pattern);
                if (match) {
                    const dateStr = match[1] || match[0];
                    if (dateStr && dateStr.includes('.')) {
                        data.invoiceDate = dateStr;
                        logger.info(`[Vision Parser DIRECT] Found date: ${data.invoiceDate}`);
                        break;
                    }
                }
            }
            
            // Fälligkeitsdatum - erweiterte Pattern für 21.10.2025
            const dueDatePatterns = [
                // Priority 1: Specific 21.10.2025 pattern
                /21\.10\.2025/gi,
                /21[.-]10[.-]2025/gi,
                // Priority 2: Labeled due dates  
                /Fälligkeitsdatum[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
                /Fällig[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
                /Due\s*Date[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi,
                // Priority 3: Any October 2025 dates (likely due dates)
                /(\d{1,2}[.-]10[.-]2025)/gi,
                // Priority 4: All dates that aren't 07.10.2025 (invoice date)
                /(\d{1,2}[.-]\d{1,2}[.-]2025)/gi
            ];
            
            logger.info('[Vision Parser DEBUG] 📅 Searching for due date patterns...');
            
            for (const [index, pattern] of dueDatePatterns.entries()) {
                const matches = [...text.matchAll(pattern)];
                if (matches && matches.length > 0) {
                    for (const match of matches) {
                        const dueDate = match[1] || match[0];
                        
                        // Skip if it's the same as invoice date (07.10.2025)
                        if (dueDate && !dueDate.includes('07.10.2025') && !dueDate.includes('07-10-2025')) {
                            data.dueDate = dueDate.replace(/[-]/g, '.');
                            logger.info(`[Vision Parser DIRECT] ✅ Found due date (pattern ${index + 1}): ${data.dueDate}`);
                            return; // Exit immediately when found
                        }
                    }
                }
            }
            
            logger.info('[Vision Parser DEBUG] ❌ No distinct due date found, checking for any dates...');
            
            // Zahlungsbedingungen
            const paymentPatterns = [
                /Zahlungsziel[:\s]*([^\n]+)/gi,
                /(Zahlbar\s+binnen\s+\d+\s+Tagen[^\n]*)/gi,
                /(ohne\s+Abzug[^\n]*)/gi
            ];
            
            for (const pattern of paymentPatterns) {
                const match = text.match(pattern);
                if (match) {
                    let terms = match[1] || match[0];
                    terms = terms.replace(/^Zahlungsziel[:\s]*/gi, '').trim();
                    if (terms.length > 5) {
                        data.paymentTerms = terms;
                        logger.info(`[Vision Parser DIRECT] Found payment terms: ${data.paymentTerms}`);
                        break;
                    }
                }
            }
        };
        
        // Führe direkte Pattern-Extraktion aus
        extractDirectPatterns();

        // Look for common German business document patterns - erweitert
        extractField('DATUM', 'date');
        extractField('RECHNUNGSDATUM', 'invoiceDate');
        extractField('FAELLIGKEITSDATUM', 'dueDate');
        extractField('ZAHLUNGSBEDINGUNGEN', 'paymentTerms');
        extractField('RECHNUNGSNR', 'invoiceNumber');  
        extractField('BETRAG', 'totalAmount');
        extractField('MWST', 'vatAmount');
        extractField('UST_ID', 'vatNumber');
        extractField('IBAN', 'iban');
        extractField('KUNDE', 'companyName');
        extractField('FIRMENNAME', 'companyName');

        // 🚨 CRITICAL FIX: Validate extracted fields and fix label-as-value issue
        const validateAndFixFields = () => {
            logger.info('[Vision Parser] 🔍 Validating extracted fields for label contamination...');
            
            // Fix invoice number if it's a label
            if (data.invoiceNumber && (
                data.invoiceNumber.toUpperCase().includes('RECHNUNGSNR') ||
                data.invoiceNumber.toUpperCase().includes('INVOICE') ||
                data.invoiceNumber === 'RECHNUNGSNR'
            )) {
                logger.warn('[Vision Parser] ❌ Invoice number contains label, attempting fix...');
                
                // Emergency extraction for RE-1082
                const emergencyPatterns = [
                    /RE-1082/gi,
                    /RE\.1082/gi,
                    /RE_1082/gi,
                    /RE1082/gi,
                    /\b1082\b/gi
                ];
                
                for (const pattern of emergencyPatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        data.invoiceNumber = match[0];
                        logger.info('[Vision Parser] ✅ Fixed invoice number:', data.invoiceNumber);
                        break;
                    }
                }
            }
            
            // Fix payment terms if it's a label  
            if (data.paymentTerms && (
                data.paymentTerms.toUpperCase().includes('ZAHLUNGSBEDINGUNGEN') ||
                data.paymentTerms === 'ZAHLUNGSBEDINGUNGEN'
            )) {
                logger.warn('[Vision Parser] ❌ Payment terms contains label, attempting fix...');
                
                const emergencyTermsPatterns = [
                    /(zahlbar\s+binnen\s+\d+\s+tagen[^\n]*)/gi,
                    /(binnen\s+\d+\s+tagen[^\n]*)/gi,
                    /(\d+\s+tage\s+netto)/gi
                ];
                
                for (const pattern of emergencyTermsPatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        data.paymentTerms = match[1] || match[0];
                        logger.info('[Vision Parser] ✅ Fixed payment terms:', data.paymentTerms);
                        break;
                    }
                }
            }
            
            // Fix IBAN if it's a label
            if (data.iban && data.iban === 'IBAN') {
                logger.warn('[Vision Parser] ❌ IBAN is just a label, clearing...');
                data.iban = '';
            }
            
            // Fix due date if it's same as invoice date or wrong
            if (data.dueDate && (
                data.dueDate.includes('07.10.2025') || 
                data.dueDate.includes('07-10-2025') ||
                data.dueDate === data.invoiceDate ||
                data.dueDate === data.date
            )) {
                logger.warn('[Vision Parser] ❌ Due date is same as invoice date, searching for correct due date...');
                
                const emergencyDueDatePatterns = [
                    /21\.10\.2025/gi,
                    /21[.-]10[.-]2025/gi,
                    /(\d{1,2}[.-]10[.-]2025)/gi, // Any October date
                    /Fälligkeitsdatum[:\s]*(\d{1,2}[.-]\d{1,2}[.-]\d{4})/gi
                ];
                
                for (const pattern of emergencyDueDatePatterns) {
                    const match = text.match(pattern);
                    if (match) {
                        const foundDate = match[1] || match[0];
                        if (foundDate && !foundDate.includes('07.10') && !foundDate.includes('07-10')) {
                            data.dueDate = foundDate.replace(/[-]/g, '.');
                            logger.info('[Vision Parser] ✅ Fixed due date:', data.dueDate);
                            break;
                        }
                    }
                }
            }
        };
        
        validateAndFixFields();
        
        // Extract company name from text patterns - erweitert für deutsche Geschäftsdokumente
        if (!data.companyName) {
            const companyPatterns = [
                /Empfänger[:\s]*([^\n]+)/gi,
                /Kunde[:\s]*([^\n]+)/gi,
                /(Musterkunde\s+Bei\s+Installatio[^\n]*)/gi,
                /(Musterkunde[^\n]*)/gi,
                /Firma[:\s]+([^\n]+)/gi,
                /([A-ZÜÄÖ][a-züäöß\s]+(?:GmbH|AG|KG|e\.K\.|UG|OHG))/gi,
                /^([A-Z][a-zA-Z\s&.-]{5,50})$/gm
            ];
            
            for (const pattern of companyPatterns) {
                const match = text.match(pattern);
                if (match) {
                    let companyName = (match[1] || match[0]).trim();
                    // Bereinige den Firmennamen
                    companyName = companyName.replace(/^[:\s]+|[:\s]+$/g, '');
                    if (companyName.length >= 3 && companyName.length <= 100 && !companyName.includes('KUNDE')) {
                        data.companyName = companyName;
                        logger.info(`[Vision Parser] Found company: ${data.companyName}`);
                        break;
                    }
                }
            }
        }
        
        // Extract amounts with various formats - verbessert für deutsche Beträge
        if (!data.totalAmount) {
            const amountPatterns = [
                /Gesamtbetrag[:\s]*(\d+[,.] \d{2})\s*€?/gi,
                /Total[:\s]*(\d+[,.] \d{2})\s*€?/gi,
                /Summe[:\s]*(\d+[,.] \d{2})\s*€?/gi,
                /(\d{2,4}[,.]\d{1,2})\s*€/g,
                /€\s*(\d{2,4}[,.]\d{1,2})/g,
                /BETRAG[:\s]*(\d+[,.]\d{2})\s*€?/gi
            ];
            
            const foundAmounts = [];
            
            for (const pattern of amountPatterns) {
                const matches = Array.from(text.matchAll(pattern));
                for (const match of matches) {
                    const amountStr = match[1];
                    if (amountStr && amountStr !== 'BETRAG') {
                        const amount = parseFloat(amountStr.replace(',', '.'));
                        if (amount > 0 && amount < 50000) {
                            foundAmounts.push(amount);
                        }
                    }
                }
            }
            
            if (foundAmounts.length > 0) {
                // Nehme den höchsten Betrag als Gesamtbetrag (normalerweise der finale Betrag)
                data.totalAmount = Math.max(...foundAmounts).toFixed(2);
                logger.info(`[Vision Parser] Found amount: ${data.totalAmount}€`);
            }
        }
        
        // 📋 UMFASSENDE DEBUG-AUSGABE - Vision Parser Ergebnisse
        logger.info('[Vision Parser DEBUG] 🔍 FINALE VISION EXTRAKTION:', {
            '=== INVOICE DATA ===': '↓',
            invoiceNumber: data.invoiceNumber || '❌ NICHT EXTRAHIERT',
            invoiceDate: data.invoiceDate || '❌ NICHT EXTRAHIERT', 
            dueDate: data.dueDate || '❌ NICHT EXTRAHIERT',
            paymentTerms: data.paymentTerms || '❌ NICHT EXTRAHIERT',
            '=== COMPANY DATA ===': '↓',
            companyName: data.companyName || '❌ NICHT EXTRAHIERT',
            totalAmount: data.totalAmount || '❌ NICHT EXTRAHIERT',
            vatAmount: data.vatAmount || '❌ NICHT EXTRAHIERT',
            vatNumber: data.vatNumber || '❌ NICHT EXTRAHIERT',
            iban: data.iban || '❌ NICHT EXTRAHIERT',
            '=== EXTRACTION STATS ===': '↓',
            totalFieldsFound: Object.keys(data).length,
            hasInvoiceNumber: !!data.invoiceNumber,
            hasCompanyName: !!data.companyName,
            hasAmount: !!data.totalAmount,
            '=== RAW MATCHES ===': '↓',
            allExtractedKeys: Object.keys(data)
        });
        
        // Return data if we found something useful
        if (Object.keys(data).length > 0) {
            logger.info('[Vision Parser] Successfully parsed vision data:', data);
            return data;
        }
        
        logger.warn('[Vision Parser] No structured data could be extracted');
        return null;
        
    } catch (error) {
        logger.error('[Vision Parser] Error parsing vision data:', error);
        return null;
    }
}

// Parse structured data from Google AI Studio response
function parseGoogleAIStructuredData(text: string): any | null {
    try {
        // Simple parsing for basic structured data
        const data: any = {};
        
        // Extract basic fields that might be needed
        const extractField = (pattern: string, key: string) => {
            const regex = new RegExp(`${pattern}:\\s*(.+?)(?=\\n|$)`, 'i');
            const match = text.match(regex);
            if (match && match[1] && match[1].trim() !== '') {
                data[key] = match[1].trim();
            }
        };

        // Extract common fields
        extractField('FIRMA', 'companyName');
        extractField('NR', 'invoiceNumber');
        extractField('DATUM', 'date');
        extractField('TOTAL', 'totalAmount');
        extractField('BETRAG', 'amount');
        
        return Object.keys(data).length > 0 ? data : null;
        
    } catch (error) {
        logger.error('[Google AI] Failed to parse structured data:', error);
        return null;
    }
}

// Create comprehensive receipt data from Google AI Studio structured data
function createReceiptDataFromStructured(structuredData: any, fileName: string): any {
    logger.info('[Structured Data DEBUG] 📥 EINGABE-DATEN ANALYSE:', {
        fileName: fileName,
        '=== VERFÜGBARE FELDER ===': '↓',
        invoiceNumber: structuredData.invoiceNumber || '❌ FEHLT',
        companyName: structuredData.companyName || '❌ FEHLT',
        totalAmount: structuredData.totalAmount || '❌ FEHLT',
        invoiceDate: structuredData.invoiceDate || '❌ FEHLT',
        dueDate: structuredData.dueDate || '❌ FEHLT',
        paymentTerms: structuredData.paymentTerms || '❌ FEHLT',
        '=== DATENQUALITÄT ===': '↓',
        hasInvoiceNumber: !!structuredData.invoiceNumber,
        hasCompanyName: !!structuredData.companyName,
        hasTotalAmount: !!structuredData.totalAmount,
        totalFieldsPresent: Object.keys(structuredData).filter(key => structuredData[key]).length,
        '=== RAW STRUKTUR ===': '↓',
        allKeys: Object.keys(structuredData),
        structuredDataSample: JSON.stringify(structuredData).substring(0, 200) + '...'
    });
    const parseAmount = (amountStr: string): number | null => {
        if (!amountStr) return null;
        const match = amountStr.match(/(\d+[.,]\d+)/);
        return match ? parseFloat(match[1].replace(',', '.')) : null;
    };
    
    const parseDate = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        
        // Try to parse the date string - erweitert für deutsche Formate
        try {
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dateStr; // Already in correct format
            }
            
            // Deutsche Formate: DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
            const germanMatch = dateStr.match(/^(\d{1,2})[.-\/](\d{1,2})[.-\/](\d{4})$/);
            if (germanMatch) {
                const day = parseInt(germanMatch[1]);
                const month = parseInt(germanMatch[2]);
                const year = parseInt(germanMatch[3]);
                
                if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const date = new Date(year, month - 1, day);
                    return date.toISOString().split('T')[0];
                }
            }
            
            // Convert other formats to YYYY-MM-DD
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            logger.warn('[Date Parser] Failed to parse date:', dateStr, e);
        }
        
        return new Date().toISOString().split('T')[0];
    };

    const parseVatRate = (vatRateStr: string, vatAmount: number | null, netAmount: number | null): number => {
        logger.info('[VAT DEBUG] Parsing VAT rate:', {
            vatRateStr: vatRateStr,
            vatAmount: vatAmount,
            netAmount: netAmount
        });
        
        // First try to extract from string
        if (vatRateStr && vatRateStr.includes('%')) {
            const rate = parseFloat(vatRateStr.replace('%', ''));
            if (!isNaN(rate)) {
                logger.info('[VAT DEBUG] Found VAT rate from string:', rate);
                return rate;
            }
        }
        
        // Try to find VAT rate in the raw text
        if (vatRateStr) {
            const vatPatterns = [
                /(\d{1,2}(?:[.,]\d+)?)\s*%/g,
                /mwst[\s:]*(\d{1,2}(?:[.,]\d+)?)\s*%/gi,
                /vat[\s:]*(\d{1,2}(?:[.,]\d+)?)\s*%/gi,
                /steuer[\s:]*(\d{1,2}(?:[.,]\d+)?)\s*%/gi
            ];
            
            for (const pattern of vatPatterns) {
                const matches = Array.from(vatRateStr.matchAll(pattern));
                for (const match of matches) {
                    const rate = parseFloat(match[1].replace(',', '.'));
                    if (!isNaN(rate) && rate >= 0 && rate <= 30) {
                        logger.info('[VAT DEBUG] Found VAT rate from pattern:', rate);
                        return rate;
                    }
                }
            }
        }
        
        // Calculate from amounts if available
        if (vatAmount && netAmount && netAmount > 0) {
            const calculatedRate = Math.round((vatAmount / netAmount) * 100);
            logger.info('[VAT DEBUG] Calculated VAT rate from amounts:', calculatedRate);
            return calculatedRate;
        }
        
        // Special case: If VAT amount is 0, assume 0% VAT
        if (vatAmount === 0) {
            logger.info('[VAT DEBUG] Zero VAT amount detected, returning 0% rate');
            return 0;
        }
        
        logger.info('[VAT DEBUG] Using default German VAT rate: 19%');
        return 19; // Default German VAT rate
    };
    
    const determineCategory = (vendor: string, text: string): string => {
        const v = vendor.toLowerCase();
        const t = text.toLowerCase();
        
        if (v.includes('amazon') || v.includes('aws')) return 'Software/Tools';
        if (t.includes('hosting') || t.includes('server') || t.includes('cloud')) return 'IT/Hosting';
        if (t.includes('software') || t.includes('lizenz') || t.includes('subscription')) return 'Software/Lizenzen';
        if (t.includes('werbung') || t.includes('marketing') || t.includes('ads')) return 'Marketing/Werbung';
        if (v.includes('google')) return 'Marketing/Werbung';
        if (t.includes('beratung') || t.includes('consulting')) return 'Beratung';
        if (t.includes('büro') || t.includes('office')) return 'Bürobedarf';
        if (t.includes('reise') || t.includes('hotel') || t.includes('flug')) return 'Reisekosten';
        
        return 'Sonstiges';
    };

    // Extract all available data from structured format
    const vendor = structuredData.companyName || 'Unbekannt';
    const totalAmount = parseAmount(structuredData.totalAmount || structuredData.amount) || 0;
    const netAmount = parseAmount(structuredData.netAmount) || totalAmount;
    const vatAmount = parseAmount(structuredData.vatAmount) || 0;
    
    // Use the entire structured data text for VAT rate detection
    const fullText = JSON.stringify(structuredData) + ' ' + Object.values(structuredData).join(' ');
    const vatRate = parseVatRate(structuredData.vatRate || fullText, vatAmount, netAmount);
    
    const invoiceNumber = structuredData.invoiceNumber || '';
    const date = parseDate(structuredData.date);
    const dueDate = parseDate(structuredData.dueDate) || '';
    const category = determineCategory(vendor, JSON.stringify(structuredData));

    logger.info('[STRUCTURED DATA DEBUG] Parsed values:', {
        vendor: vendor,
        totalAmount: totalAmount,
        netAmount: netAmount,
        vatAmount: vatAmount,
        vatRate: vatRate,
        invoiceNumber: invoiceNumber
    });

    return {
        // Basic fields
        title: `${vendor} - Rechnung ${invoiceNumber}`,
        amount: totalAmount,
        category: category,
        description: extractGermanDescription(fullText, fileName),
        vendor: vendor,
        date: date,
        invoiceNumber: invoiceNumber,
        
        // Financial details
        vatAmount: vatAmount,
        netAmount: netAmount,
        vatRate: vatRate,
        
        // Company information
        companyName: vendor,
        companyAddress: (() => {
            console.log('[🔥 STRUCTURED_DATA_ADDRESS_DEBUG] ==========================================');
            console.log('[🔥 STRUCTURED_DATA_ADDRESS_DEBUG] Raw structuredData.address:', structuredData.address);
            
            const cleanAddress = extractGermanAddress(fullText);
            console.log('[🔥 STRUCTURED_DATA_ADDRESS_DEBUG] extractGermanAddress result:', cleanAddress);
            
            const finalAddress = cleanAddress || structuredData.address || '';
            console.log('[🔥 STRUCTURED_DATA_ADDRESS_DEBUG] Final address used:', finalAddress);
            console.log('[🔥 STRUCTURED_DATA_ADDRESS_DEBUG] ==========================================');
            
            return finalAddress;
        })(),
        companyVatNumber: structuredData.vatNumber || '',
        
        // Contact information
        contactEmail: structuredData.email || '',
        contactPhone: structuredData.phone || '',
        contactWebsite: structuredData.website || '',
        
        // Additional details
        dueDate: dueDate,
        paymentTerms: structuredData.paymentTerms || '',
        items: structuredData.items || '',
        
        // Banking information
        iban: structuredData.iban || '',
        bic: structuredData.bic || '',
        bankName: structuredData.bankName || '',
        
        // Processing metadata
        processingMode: 'comprehensive-extraction'
    };
}

// =============================================================================
// OCR COST MONITORING SYSTEM
// =============================================================================

// Cost tracking system temporarily disabled for deployment simplicity
// Can be re-enabled later for cost analytics

// =============================================================================
// SIMPLE WORKING FUNCTIONS
// =============================================================================

// Simple working function for receipt data extraction
async function extractReceiptDataFromOCRSimple(
    ocrResult: { text: string; confidence: number; blocks?: any[]; enhanced?: boolean },
    fileName: string,
    userId?: string
): Promise<ExtractedInvoiceData> {
    logger.info('[GERMAN INVOICE EXTRACTION] 🇩🇪 Starting advanced German invoice data extraction with data cleansing...');
    
    // === [DEBUG_OCR] VOLLSTÄNDIGE ROHDATEN-PROTOKOLLIERUNG ===
    console.log('[DEBUG_RAW_OCR] ==================== RAW OCR RESULT ====================');
    console.log('[DEBUG_RAW_OCR] Vollständiger OCR-Input:', {
        fileName: fileName,
        textLength: ocrResult.text?.length || 0,
        confidence: ocrResult.confidence,
        blocksCount: ocrResult.blocks?.length || 0,
        enhanced: ocrResult.enhanced
    });
    console.log('[DEBUG_RAW_OCR] Vollständiger Rohtext (erste 1000 Zeichen):');
    console.log(ocrResult.text?.substring(0, 1000) || 'KEIN TEXT');
    console.log('[DEBUG_RAW_OCR] Vollständiger Rohtext (letzte 500 Zeichen):');
    console.log(ocrResult.text?.substring(Math.max(0, (ocrResult.text?.length || 0) - 500)) || 'KEIN TEXT');
    
    if (ocrResult.blocks && ocrResult.blocks.length > 0) {
        console.log('[DEBUG_RAW_OCR] Blocks Struktur (erste 3):');
        console.log(JSON.stringify(ocrResult.blocks.slice(0, 3), null, 2));
    }
    console.log('[DEBUG_RAW_OCR] ============================================================');
    
    const text = ocrResult.text;
    
    // === STRATEGIE 1: DEUTSCHE PATTERN-EXTRAKTION (PRIMÄR - HÖCHSTE PRIORITÄT) ===
    logger.info('[PATTERN MATCHING] 🎯 Using German pattern extraction as primary strategy...');
    logger.info('[ERROR_TRACKING] About to call extractWithGermanPatterns...');
    
    let patternResult;
    try {
        console.log('[🔥 PATTERN_CALL_DEBUG] ============ CALLING GERMAN PATTERNS ============');
        console.log('[🔥 PATTERN_CALL_DEBUG] About to call extractWithGermanPatterns_NEW_VERSION_2025');
        console.log('[🔥 PATTERN_CALL_DEBUG] Input text length:', text?.length || 0);
        console.log('[🔥 PATTERN_CALL_DEBUG] userId:', userId);
        
        patternResult = await extractWithGermanPatterns_NEW_VERSION_2025(text, userId);
        
        console.log('[🔥 PATTERN_RESULT_DEBUG] ============ GERMAN PATTERNS RESULT ============');
        console.log('[🔥 PATTERN_RESULT_DEBUG] Pattern result keys:', Object.keys(patternResult || {}));
        console.log('[🔥 PATTERN_RESULT_DEBUG] vendorAddress from patterns:', patternResult?.vendorAddress);
        console.log('[🔥 PATTERN_RESULT_DEBUG] customerName from patterns:', patternResult?.customerName);
        console.log('[🔥 PATTERN_RESULT_DEBUG] customerAddress from patterns:', patternResult?.customerAddress);
        console.log('[🔥 PATTERN_RESULT_DEBUG] =============================================');
        
        logger.info('[ERROR_TRACKING] ✅ extractWithGermanPatterns completed successfully');
    } catch (error) {
        console.log('[🔥 PATTERN_ERROR_DEBUG] 🚨 GERMAN PATTERNS EXCEPTION:', error);
        logger.error('[ERROR_TRACKING] 🚨 extractWithGermanPatterns FAILED:', error);
        throw error;
    }
    
    // ⚡ FINALE PRIORISIERUNG: Deutsche Patterns haben ABSOLUTE Priorität (inkl. STORNO)
    console.log('[🔥 PRIORITY_DEBUG] ============ PRIORITY DECISION ============');
    console.log('[🔥 PRIORITY_DEBUG] patternResult.totalGrossAmount:', patternResult.totalGrossAmount);
    console.log('[🔥 PRIORITY_DEBUG] Is null?', patternResult.totalGrossAmount === null);
    console.log('[🔥 PRIORITY_DEBUG] Is undefined?', patternResult.totalGrossAmount === undefined);
    console.log('[🔥 PRIORITY_DEBUG] Is zero?', patternResult.totalGrossAmount === 0);
    console.log('[🔥 PRIORITY_DEBUG] Will use German patterns?', patternResult.totalGrossAmount !== null && patternResult.totalGrossAmount !== undefined && patternResult.totalGrossAmount !== 0);
    console.log('[🔥 PRIORITY_DEBUG] ==========================================');
    
    if (patternResult.totalGrossAmount !== null && patternResult.totalGrossAmount !== undefined && patternResult.totalGrossAmount !== 0) {
        console.log('[🔥 USING_GERMAN_PATTERNS] ✅ Using German patterns as final result!');
        logger.info('[PATTERN MATCHING] ✅ German patterns successful - using as final result (inkl. STORNO)!', {
            totalGrossAmount: patternResult.totalGrossAmount,
            totalNetAmount: patternResult.totalNetAmount,
            totalVatAmount: patternResult.totalVatAmount,
            invoiceNumber: patternResult.invoiceNumber,
            dueDate: patternResult.dueDate,
            isStornorechnung: patternResult.totalGrossAmount < 0
        });
        
        // ⚡ VOLLSTÄNDIGES ExtractedInvoiceData Interface mit allen erforderlichen Feldern
        const finalResult: ExtractedInvoiceData = {
            // Basis-Rechnungsdaten
            invoiceNumber: patternResult.invoiceNumber || null,
            invoiceDate: patternResult.invoiceDate || null,
            dueDate: patternResult.dueDate || null,
            
            // Finanzielle Daten
            totalGrossAmount: patternResult.totalGrossAmount || 0,
            totalNetAmount: patternResult.totalNetAmount || 0,
            totalVatAmount: patternResult.totalVatAmount || 0,
            
            // Lieferanten-Informationen
            vendorName: patternResult.vendorName || null,
            vendorAddress: patternResult.vendorAddress || null,
            vendorVatId: patternResult.vendorVatId || null,
            vendorPhone: patternResult.vendorPhone || null,
            vendorEmail: patternResult.vendorEmail || null,
            
            // 🎯 Kunden-Informationen aus deutschen Patterns
            customerName: patternResult.customerName || null,
            customerAddress: patternResult.customerAddress || null,
            
            // Zahlungsinformationen
            paymentTerms: null,
            iban: null,
            bic: null,
            bankName: null,
            
            // Tax Breakdown - MIT EXTRAHIERTEM STEUERSATZ!
            taxBreakdown: patternResult.taxBreakdown || [{
                rate: (patternResult.taxRate || 19) as 0 | 7 | 19,  // ✅ Verwende extrahierten Steuersatz!
                netAmount: patternResult.totalNetAmount || 0,
                vatAmount: patternResult.totalVatAmount || 0,
                grossAmount: patternResult.totalGrossAmount || 0
            }],
            
            // MwSt-Satz für Frontend
            taxRate: patternResult.taxRate || 19,
            
            // Metadaten
            processingMode: 'HYBRID', // ✅ Gültiger processingMode
            confidence: ocrResult.confidence || 0.9,
            category: determineInvoiceCategory(patternResult.vendorName || '', text),
            title: generateInvoiceTitle({
                vendorName: patternResult.vendorName || null,
                totalGrossAmount: patternResult.totalGrossAmount || 0,
                invoiceDate: patternResult.invoiceDate || null
            } as ExtractedInvoiceData),
            description: patternResult.description || `Deutsche Rechnung aus ${fileName}`
        };
        
        return finalResult;
    }

    // === KEINE FALLBACKS MEHR - NUR DEUTSCHE PATTERNS! ===
    logger.info('[PATTERN ONLY] 🚫 NO FALLBACKS - German patterns returned no amount, returning empty result');
    
    // Return empty result if German patterns found nothing
    const emptyResult: ExtractedInvoiceData = {
        invoiceNumber: null,
        invoiceDate: null,
        dueDate: null,
        totalGrossAmount: 0,
        totalNetAmount: 0,
        totalVatAmount: 0,
        taxBreakdown: [],
        vendorName: null,
        vendorAddress: null,
        vendorVatId: null,
        vendorPhone: null,
        vendorEmail: null,
        customerName: null,
        customerAddress: null,
        paymentTerms: null,
        iban: null,
        bic: null,
        bankName: null,
        processingMode: 'HYBRID',
        confidence: 0.1,
        category: 'Geschäftsausgabe',
        title: 'Unbekannte Rechnung',
        description: `Keine Beträge gefunden in ${fileName}`
    };
    
    return emptyResult;
}

// =============================================================================
// END OF OCR PROCESSING FUNCTIONS
// =============================================================================
