// firebase_functions/src/finance/functions/finance-http.ts

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
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

// Import Express types (Firebase Functions v2 uses Express internally)
import { Request, Response } from 'express';

// AWS SDK for Textract
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

// Google AI Studio für intelligente OCR-Nachbearbeitung
import { GoogleGenerativeAI } from '@google/generative-ai';

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

const ocrRequestSchema = z.object({
    file: z.string().min(1, 'Base64 file data is required'),
    fileName: z.string().optional(),
    mimeType: z.string().optional()
});

// CORS Setup
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cors = require('cors')({ origin: corsOptions });

// Global TextractClient (initialized once for better performance)
const textractClient = new TextractClient({
    region: (process.env.AWS_REGION || 'eu-central-1').trim(),
    credentials: {
        accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
        secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim()
    }
});

// Validate AWS credentials at startup
const awsAccessKey = process.env.AWS_ACCESS_KEY_ID?.trim();
const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
const awsRegion = (process.env.AWS_REGION || 'eu-central-1').trim();

logger.info('[AWS] Environment check:', {
    hasAccessKey: !!awsAccessKey,
    hasSecretKey: !!awsSecretKey,
    region: awsRegion,
    accessKeyLength: awsAccessKey?.length || 0,
    isFromSecret: !!process.env.AWS_ACCESS_KEY_ID // This will be true if loaded from Firebase Secret
});

if (!awsAccessKey || !awsSecretKey) {
    logger.warn('[AWS] AWS credentials not fully configured - OCR may fall back to mock mode');
} else {
    logger.info('[AWS] ✅ AWS Textract configured with region:', awsRegion);
}

// Google AI Studio Client für OCR-Nachbearbeitung
let genAI: GoogleGenerativeAI | null = null;

// Initialize Google AI Studio immediately at startup
try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        genAI = new GoogleGenerativeAI(apiKey);
        logger.info('[Google AI] ✅ Google AI Studio initialized successfully with API key from Firebase Secret');
    } else {
        logger.warn('[Google AI] ⚠️ GEMINI_API_KEY not found in environment variables');
    }
} catch (error) {
    logger.error('[Google AI] ❌ Failed to initialize Google AI Studio:', error);
}

// Model-Instanzen
const invoiceModel = new InvoiceModel();
const customerModel = new CustomerModel();
const syncService = new OrderToInvoiceSyncService();

/**
 * Zentrale HTTP-API für das Finance-Modul mit OCR-Integration
 */
export const financeApi = onRequest({
    secrets: [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY', 
        'AWS_REGION',
        'GEMINI_API_KEY'
    ],
    cors: true,
    memory: '1GiB',
    cpu: 1,
    timeoutSeconds: 60,
    region: 'europe-west1'
}, async (request, response) => {
    return cors(request, response, async () => {
        try {
            const { method, url } = request;
            const path = url?.split('?')[0] || '';
            const pathParts = path.split('/').filter(Boolean);

            // Route: /finance/{resource}/{action?}/{id?}
            const [, resource, action, id] = pathParts;

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
                    response.status(404).json({ error: 'Resource not found' });
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
    const invoice = await invoiceModel.getById(id, companyId);
    if (!invoice) {
        response.status(404).json({ error: 'Invoice not found' });
        return;
    }
    response.json({ invoice });
}

async function searchInvoices(request: Request, response: Response, companyId: string) {
    const filters: InvoiceSearchFilters = {
        status: request.query.status ? 
            (request.query.status as string).split(',').filter(s => 
                ['DRAFT', 'PENDING', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'].includes(s)
            ) as never[] : undefined,
        customerId: request.query.customerId as string | undefined,
        dateFrom: request.query.dateFrom ? 
            Timestamp.fromDate(new Date(request.query.dateFrom as string)) : undefined,
        dateTo: request.query.dateTo ? 
            Timestamp.fromDate(new Date(request.query.dateTo as string)) : undefined,
        amountMin: request.query.amountMin ? 
            parseInt(request.query.amountMin as string) : undefined,
        amountMax: request.query.amountMax ? 
            parseInt(request.query.amountMax as string) : undefined,
        invoiceNumber: request.query.invoiceNumber as string | undefined,
    };

    const pagination = {
        page: request.query.page ? parseInt(request.query.page as string) : 1,
        limit: request.query.limit ? parseInt(request.query.limit as string) : 20,
        sortBy: (request.query.sortBy as string) || 'createdAt',
        sortOrder: request.query.sortOrder === 'asc' ? 'asc' as const : 'desc' as const,
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
    const invoice = await invoiceModel.createInvoice(invoiceData, userId, companyId);
    response.status(201).json({ invoice });
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
                // GET /finance/customers?filters...
                const filters: CustomerSearchFilters = {
                    status: request.query.status ? (request.query.status as string).split(',') as never[] : undefined,
                    type: request.query.type ? (request.query.type as string).split(',') as never[] : undefined,
                    searchTerm: request.query.searchTerm as string | undefined,
                    tags: request.query.tags ? (request.query.tags as string).split(',') : undefined,
                    hasOutstandingInvoices: request.query.hasOutstandingInvoices === 'true',
                };

                const pagination = {
                    page: request.query.page ? parseInt(request.query.page as string) : 1,
                    limit: request.query.limit ? parseInt(request.query.limit as string) : 20,
                    sortBy: (request.query.sortBy as string) || 'displayName',
                    sortOrder: request.query.sortOrder === 'asc' ? 'asc' as const : 'desc' as const,
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
    try {
        logger.info(`[OCR] Starting receipt extraction for company: ${companyId}`);

        // Validate request body
        const validationResult = ocrRequestSchema.safeParse(request.body);
        if (!validationResult.success) {
            response.status(400).json({ 
                error: 'Invalid OCR request data',
                issues: validationResult.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            });
            return;
        }

        // Parse validated data
        const { file: base64File, fileName = 'receipt.pdf', mimeType = 'application/pdf' } = validationResult.data;
        const ocrProvider = (request.headers['x-ocr-provider'] as string) || 'AWS_TEXTRACT';

        logger.info(`[OCR] Processing file: ${fileName} with provider: ${ocrProvider}`);
        logger.info(`[OCR] File details: size=${base64File.length} chars, type=${mimeType}`);

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(base64File, 'base64');

        // Hybrid OCR processing: AWS Textract + Google AI Studio
        const ocrResult = await performHybridOCR(fileBuffer, fileName, ocrProvider);

        // Extract structured receipt data
        const extractedData = await extractReceiptDataFromOCR(ocrResult, fileName);

        logger.info(`[OCR] Extraction complete for ${fileName}:`, {
            hasAmount: !!extractedData.amount,
            hasVendor: !!extractedData.vendor,
            hasDate: !!extractedData.date,
            confidence: ocrResult.confidence
        });

        response.json({
            success: true,
            data: extractedData,
            ocr: {
                provider: ocrResult.enhanced ? 'AWS_TEXTRACT + GOOGLE_AI_STUDIO' : ocrProvider,
                confidence: ocrResult.confidence,
                textLength: ocrResult.text.length,
                processingTime: ocrResult.processingTime,
                enhanced: ocrResult.enhanced || false
            },
            message: generateExtractionMessage(extractedData, ocrResult.enhanced),
            extractionMethod: ocrResult.enhanced ? 'hybrid_ocr' : 'advanced_ocr'
        });

    } catch (error) {
        logger.error('[OCR] Receipt extraction failed:', error);
        response.status(500).json({
            success: false,
            error: 'OCR processing failed',
            message: error instanceof Error ? error.message : 'Unknown OCR error',
            extractionMethod: 'error'
        });
    }
}

// Hybrid OCR Processing: AWS Textract + Google AI Studio
async function performHybridOCR(
    fileBuffer: Buffer,
    fileName: string,
    provider: string
): Promise<{ text: string; confidence: number; processingTime: number; blocks: any[]; enhanced: boolean }> {
    const startTime = Date.now();
    
    try {
        logger.info(`[OCR Hybrid] Starting hybrid processing for ${fileName}, size: ${fileBuffer.length} bytes`);
        
        // Step 1: Versuche AWS Textract für initiale OCR
        let textractResult: { text: string; confidence: number; processingTime: number; blocks: any[] } | null = null;
        let awsError: Error | null = null;
        
        try {
            textractResult = await performAWSTextractOCR(fileBuffer, fileName);
            logger.info('[OCR Hybrid] ✅ AWS Textract successful');
        } catch (error) {
            awsError = error as Error;
            logger.warn('[OCR Hybrid] ⚠️ AWS Textract failed, will try Google AI Studio only:', (error as Error).message);
        }
        
        // Step 2: Google AI Studio Processing
        if (textractResult && textractResult.text.trim()) {
            // AWS Textract successful -> Use as enhancement base
            try {
                const enhancedResult = await enhanceOCRWithGoogleAI(textractResult.text, fileName);
                logger.info('[OCR Hybrid] ✅ Hybrid processing successful (AWS + Google AI)');
                
                return {
                    text: enhancedResult.enhancedText,
                    confidence: Math.max(textractResult.confidence, enhancedResult.confidence),
                    processingTime: Date.now() - startTime,
                    blocks: textractResult.blocks,
                    enhanced: enhancedResult.enhanced
                };
            } catch (enhancementError) {
                logger.warn('[OCR Hybrid] Google AI enhancement failed, using AWS only:', enhancementError);
                return {
                    ...textractResult,
                    enhanced: false
                };
            }
        } else {
            // AWS Textract failed -> Try Google AI Studio with direct PDF processing
            try {
                logger.info('[OCR Hybrid] 🤖 Attempting Google AI Studio direct PDF processing...');
                const directResult = await processWithGoogleAIStudioDirect(fileBuffer, fileName);
                logger.info('[OCR Hybrid] ✅ Google AI Studio direct processing successful');
                
                return {
                    text: directResult.extractedText,
                    confidence: directResult.confidence,
                    processingTime: Date.now() - startTime,
                    blocks: [],
                    enhanced: true
                };
            } catch (googleError) {
                logger.error('[OCR Hybrid] Both AWS Textract and Google AI Studio failed:', {
                    awsError: awsError?.message,
                    googleError: (googleError as Error).message
                });
                
                // Final fallback to mock OCR
                logger.info('[OCR Hybrid] 📄 Using filename-based fallback extraction');
                const mockResult = await performMockOCR(fileBuffer, fileName);
                return {
                    ...mockResult,
                    enhanced: false
                };
            }
        }
        
    } catch (error) {
        logger.error('[OCR Hybrid] Complete hybrid processing failed:', error);
        throw new Error(`Hybrid OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Google AI Studio direktes PDF Processing
async function processWithGoogleAIStudioDirect(
    fileBuffer: Buffer,
    fileName: string
): Promise<{ extractedText: string; confidence: number; enhanced: boolean }> {
    try {
        logger.info(`[Google AI Studio Direct] Processing ${fileName} directly with Google AI`);
        
        // Konvertiere Buffer zu Base64 für Google AI Studio
        const base64Data = fileBuffer.toString('base64');
        const mimeType = 'application/pdf';
        
        // Structured prompt für direkte OCR-Verarbeitung
        const ocrPrompt = `
Extrahiere ALLE Informationen aus diesem PDF-Dokument und strukturiere sie als JSON.

**WICHTIG:** Ich benötige eine vollständige OCR-Extraktion mit strukturierten Daten.

**Ausgabe-Format (JSON):**
{
  "documentType": "receipt|invoice|document",
  "rawText": "VOLLSTÄNDIGER extrahierter Text",
  "structured": {
    "company": "Firmenname",
    "date": "YYYY-MM-DD",
    "amount": "XX.XX",
    "items": [{"description": "Artikel", "price": "XX.XX"}],
    "address": "Vollständige Adresse",
    "metadata": {"documentNumber": "", "paymentMethod": "", "category": ""}
  },
  "confidence": 0.95
}

**Verarbeitungsregeln:**
- Extrahiere JEDEN sichtbaren Text im Dokument
- Erkenne Rechnungen, Quittungen, Lieferscheine
- Strukturiere Daten intelligent
- Bei unlesbaren Bereichen: kennzeichne als "[UNCLEAR]"
- Gib realistische Confidence-Werte an (0.0-1.0)
- Verwende deutsche Datumsformate falls erkannt

Beginne die Verarbeitung:
`;

        // Google AI Studio Request
        if (!genAI) {
            throw new Error('Google AI Studio not initialized - API key missing');
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            },
            ocrPrompt
        ]);
        
        const response = await result.response;
        const responseText = response.text();
        
        logger.info('[Google AI Studio Direct] Raw response length:', responseText.length);
        
        // Verwende die rohe Antwort direkt - Google AI kann PDF-Inhalte sehr gut extrahieren
        return {
            extractedText: responseText,
            confidence: 0.85, // Google AI Studio ist sehr zuverlässig
            enhanced: true
        };
        
    } catch (error) {
        logger.error('[Google AI Studio Direct] Processing failed:', error);
        throw new Error(`Google AI Studio direct processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Google AI Studio OCR Enhancement
async function enhanceOCRWithGoogleAI(
    rawOcrText: string,
    fileName: string
): Promise<{ enhancedText: string; confidence: number; processingTime: number; enhanced: boolean }> {
    const startTime = Date.now();
    
    try {
        logger.info('[Google AI] Starting OCR enhancement...');
        
        if (!genAI) {
            throw new Error('Google AI Studio not initialized - API key missing');
        }
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-latest",
            generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 0.1,
                maxOutputTokens: 2048,
            }
        });

        const prompt = `Du bist ein OCR-Verbesserungs-Experte. Analysiere den folgenden fragmentierten OCR-Text von einer Rechnung und strukturiere ihn intelligent.

Roher OCR-Text:
${rawOcrText}

Aufgabe:
1. Korrigiere OCR-Fehler und verbinde fragmentierte Textteile
2. Identifiziere und extrahiere folgende Daten:
   - Rechnungsnummer
   - Rechnungsdatum (Format: YYYY-MM-DD)
   - Anbieter/Firma
   - Gesamtbetrag (nur Zahlen mit Dezimalstellen)
   - MwSt-Betrag
   - Netto-Betrag
   - MwSt-Satz
   - Firmenadresse
   - USt-IdNr./Steuernummer
   - Kontaktdaten

Gib eine strukturierte Antwort im folgenden Format zurück:
---
VENDOR: [Firmenname]
INVOICE_NUMBER: [Rechnungsnummer]
DATE: [YYYY-MM-DD]
TOTAL_AMOUNT: [Betrag]
VAT_AMOUNT: [MwSt-Betrag]
NET_AMOUNT: [Netto-Betrag]
VAT_RATE: [MwSt-Satz in %]
COMPANY_ADDRESS: [Adresse]
COMPANY_VAT_NUMBER: [USt-IdNr./Steuernummer]
CONTACT_EMAIL: [E-Mail]
CONTACT_PHONE: [Telefon]
---

Verbesserter Text:
[Hier den vollständig korrigierten und strukturierten Text einfügen]`;

        const result = await model.generateContent(prompt);
        const enhancedText = result.response.text();
        
        const processingTime = Date.now() - startTime;
        
        logger.info('[Google AI] OCR enhancement completed:', {
            originalLength: rawOcrText.length,
            enhancedLength: enhancedText.length,
            processingTime
        });
        
        return {
            enhancedText,
            confidence: 0.95, // Google AI Studio ist sehr zuverlässig bei Textverbesserung
            processingTime,
            enhanced: true
        };
        
    } catch (error) {
        logger.error('[Google AI] Enhancement failed:', error);
        
        // Fallback zum ursprünglichen Text
        return {
            enhancedText: rawOcrText,
            confidence: 0.7,
            processingTime: Date.now() - startTime,
            enhanced: false
        };
    }
}

// Advanced AWS Textract OCR Processing with Queries
async function performAWSTextractOCR(
    fileBuffer: Buffer,
    fileName: string
): Promise<{ text: string; confidence: number; processingTime: number; blocks: any[] }> {
    const startTime = Date.now();

    // Validate input parameters
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('Invalid file buffer - empty or null');
    }

    if (fileBuffer.length > 10 * 1024 * 1024) { // 10MB limit for AWS Textract
        throw new Error('File too large - AWS Textract has a 10MB limit');
    }

    try {
        logger.info('[OCR] Starting AWS Textract OCR for file:', fileName, 'Size:', fileBuffer.length);

        // First try with QUERIES (advanced feature - may not be available in all EU regions)
        let response;
        try {
            logger.info('[OCR] Attempting advanced Textract with Queries in EU region...');
            response = await textractClient.send(new AnalyzeDocumentCommand({
                Document: { Bytes: fileBuffer },
                FeatureTypes: ['FORMS', 'TABLES', 'QUERIES'],
                QueriesConfig: {
                    Queries: [
                        { Text: 'Wie lautet die Rechnungsnummer?', Alias: 'INVOICE_ID' },
                        { Text: 'Wie lautet das Rechnungsdatum?', Alias: 'INVOICE_DATE' },
                        { Text: 'Wer ist der Rechnungssteller?', Alias: 'VENDOR_NAME' },
                        { Text: 'Wie lautet der Gesamtbetrag?', Alias: 'TOTAL_AMOUNT' }
                    ]
                }
            }));
            logger.info('[OCR] ✅ Advanced Textract with Queries successful in EU');
        } catch (queryError) {
            const errorMsg = (queryError as Error).message;
            logger.warn('[OCR] ⚠️ Queries not supported in EU region, falling back to FORMS & TABLES...', {
                error: errorMsg
            });
            
            // Fallback to FORMS and TABLES only (widely supported in EU)
            response = await textractClient.send(new AnalyzeDocumentCommand({
                Document: { Bytes: fileBuffer },
                FeatureTypes: ['FORMS', 'TABLES']
            }));
            logger.info('[OCR] ✅ Standard Textract with FORMS & TABLES successful in EU');
        }

        const allBlocks = response.Blocks || [];

        if (!allBlocks.length) {
            throw new Error('No blocks returned from AWS Textract');
        }

        // Extract query results for precise data
        const queryResults = extractQueryResults(allBlocks);
        logger.info('[OCR] Query results extracted:', queryResults);

        // Enhanced text extraction with context awareness
        const extractedText = extractStructuredText(allBlocks);
        
        // Calculate weighted confidence based on block types
        const averageConfidence = calculateWeightedConfidence(allBlocks);

        const processingTime = Date.now() - startTime;

        logger.info('[OCR] Advanced AWS Textract completed:', {
            textLength: extractedText.length,
            confidence: averageConfidence,
            processingTime,
            totalBlocks: allBlocks.length,
            queryResults: Object.keys(queryResults).length,
            advancedExtraction: true
        });

        return {
            text: extractedText,
            confidence: averageConfidence,
            processingTime,
            blocks: allBlocks
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[OCR] AWS Textract error in EU region:', {
            message: errorMessage,
            fileName,
            region: 'eu-central-1'
        });
        
        // Check for specific AWS parameter errors common in EU regions
        if (errorMessage.includes('invalid parameters') || 
            errorMessage.includes('ValidationException') ||
            errorMessage.includes('InvalidParameterException') ||
            errorMessage.includes('UnsupportedDocumentException')) {
            logger.error('[OCR] ❌ AWS parameter validation failed in EU - check document format and regional capabilities');
        }
        
        // Only use mock in development environment
        if (process.env.NODE_ENV !== 'production') {
            logger.warn('[OCR] Falling back to mock OCR (development mode only)');
            return await performMockOCR(fileBuffer, fileName);
        }

        // In production, throw clear error instead of silent fallback
        throw new Error(`AWS Textract processing failed: ${errorMessage}`);
    }
}

// Extract query results from AWS Textract QUERY_RESULT blocks
function extractQueryResults(blocks: any[]): { [key: string]: string } {
    const queryResults: { [key: string]: string } = {};
    
    blocks.forEach(block => {
        if (block.BlockType === 'QUERY_RESULT' && block.Query?.Alias) {
            const alias = block.Query.Alias;
            const answer = block.Text || 'N/A';
            queryResults[alias] = answer;
            
            logger.info(`[OCR] Query result: ${alias} = ${answer}`);
        }
    });
    
    return queryResults;
}

// Extract structured text with context awareness
function extractStructuredText(blocks: any[]): string {
    const lines: string[] = [];
    const tableData: string[] = [];
    const formData: string[] = [];

    // Group blocks by type for structured extraction
    const lineBlocks = blocks.filter(block => block.BlockType === 'LINE');
    const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
    const keyValueBlocks = blocks.filter(block => block.BlockType === 'KEY_VALUE_SET');

    // Extract line text (preserves document structure)
    lineBlocks
        .sort((a, b) => {
            // Sort by geometry position (top to bottom, left to right)
            const aTop = a.Geometry?.BoundingBox?.Top || 0;
            const bTop = b.Geometry?.BoundingBox?.Top || 0;
            if (Math.abs(aTop - bTop) > 0.01) return aTop - bTop;
            
            const aLeft = a.Geometry?.BoundingBox?.Left || 0;
            const bLeft = b.Geometry?.BoundingBox?.Left || 0;
            return aLeft - bLeft;
        })
        .forEach(block => {
            if (block.Text && block.Text.trim()) {
                lines.push(block.Text.trim());
            }
        });

    // Extract table data
    tableBlocks.forEach(table => {
        if (table.Relationships) {
            const cellTexts: string[] = [];
            table.Relationships.forEach((relationship: any) => {
                if (relationship.Type === 'CHILD') {
                    relationship.Ids?.forEach((cellId: string) => {
                        const cell = blocks.find(block => block.Id === cellId);
                        if (cell && cell.Text) {
                            cellTexts.push(cell.Text.trim());
                        }
                    });
                }
            });
            if (cellTexts.length > 0) {
                tableData.push(cellTexts.join(' | '));
            }
        }
    });

    // Extract key-value pairs from forms
    const keyValuePairs = extractKeyValuePairs(blocks, keyValueBlocks);
    formData.push(...keyValuePairs);

    // Combine all extracted text with clear separation
    const allText = [
        ...lines,
        ...(tableData.length > 0 ? ['--- TABLE DATA ---', ...tableData] : []),
        ...(formData.length > 0 ? ['--- FORM DATA ---', ...formData] : [])
    ];

    return allText.join('\n');
}

// Extract key-value pairs from form blocks
function extractKeyValuePairs(allBlocks: any[], keyValueBlocks: any[]): string[] {
    const pairs: string[] = [];
    
    keyValueBlocks.forEach(kvBlock => {
        if (kvBlock.EntityTypes?.includes('KEY')) {
            let keyText = '';
            let valueText = '';
            
            // Extract key text
            if (kvBlock.Relationships) {
                const childRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
                if (childRelation?.Ids) {
                    const keyWords = childRelation.Ids
                        .map((id: string) => allBlocks.find(block => block.Id === id))
                        .filter((block: any) => block && block.Text)
                        .map((block: any) => block.Text);
                    keyText = keyWords.join(' ').trim();
                }
                
                // Find associated value
                const valueRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'VALUE');
                if (valueRelation?.Ids) {
                    const valueBlock = allBlocks.find(block => 
                        valueRelation.Ids.includes(block.Id) && block.EntityTypes?.includes('VALUE')
                    );
                    
                    if (valueBlock?.Relationships) {
                        const valueChildRelation = valueBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
                        if (valueChildRelation?.Ids) {
                            const valueWords = valueChildRelation.Ids
                                .map((id: string) => allBlocks.find(block => block.Id === id))
                                .filter((block: any) => block && block.Text)
                                .map((block: any) => block.Text);
                            valueText = valueWords.join(' ').trim();
                        }
                    }
                }
            }
            
            if (keyText && valueText) {
                pairs.push(`${keyText}: ${valueText}`);
            }
        }
    });
    
    return pairs;
}

// Calculate weighted confidence based on block importance
function calculateWeightedConfidence(blocks: any[]): number {
    let totalWeight = 0;
    let weightedSum = 0;
    
    blocks.forEach(block => {
        if (block.Confidence !== undefined) {
            let weight = 1;
            
            // Give higher weight to important block types
            switch (block.BlockType) {
                case 'LINE':
                    weight = 2; // Lines are most important for text extraction
                    break;
                case 'WORD':
                    weight = 1;
                    break;
                case 'KEY_VALUE_SET':
                    weight = 3; // Key-value pairs are very important for invoices
                    break;
                case 'TABLE':
                    weight = 2.5; // Tables contain structured data
                    break;
                case 'CELL':
                    weight = 1.5; // Table cells are moderately important
                    break;
                default:
                    weight = 1;
            }
            
            weightedSum += block.Confidence * weight;
            totalWeight += weight;
        }
    });
    
    return totalWeight > 0 ? (weightedSum / totalWeight) / 100 : 0.9;
}

// Mock OCR for fallback - THROWS ERROR TO FORCE REAL OCR
async function performMockOCR(
    fileBuffer: Buffer,
    fileName: string
): Promise<{ text: string; confidence: number; processingTime: number; blocks: any[] }> {
    
    logger.error('[Mock OCR] ❌ Mock OCR called - this should not happen! Real OCR should be used.');
    throw new Error(`Mock OCR should not be used for production. File: ${fileName}, Size: ${fileBuffer.length} bytes. Please fix OCR configuration.`);
}

// Advanced amount extraction with international currency support
function extractAmountsAdvanced(text: string): { amount: number | null; netAmount: number | null; vatAmount: number | null } {
    // Comprehensive amount patterns for multiple currencies and formats
    const amountPatterns = [
        // German/European formats
        /(?:gesamtbetrag|total|summe|betrag|gesamt|brutto)[\s:]*([0-9]{1,5}[.,]\d{2})[\s]*[€$£¥]/gi,
        /(?:total|grand\s*total|final\s*amount)[\s:]*([0-9]{1,5}[.,]\d{2})[\s]*[€$£¥]/gi,
        
        // Table-style amounts (common in invoices)
        /([0-9]{1,5}[.,]\d{2})[\s]*[€$£¥][\s]*$/gm, // End of line amounts
        
        // Amount with explicit currency
        /[€$£¥][\s]*([0-9]{1,5}[.,]\d{2})/g,
        /([0-9]{1,5}[.,]\d{2})[\s]*[€$£¥]/g,
        
        // Specific invoice terms
        /(?:zu\s*zahlen|payable|amount\s*due)[\s:]*([0-9]{1,5}[.,]\d{2})/gi,
        
        // Pattern for amounts in table format
        /\|\s*([0-9]{1,5}[.,]\d{2})\s*[€$£¥]?\s*\|/g,
    ];

    const vatPatterns = [
        /(?:mwst|vat|tax|steuer)[\s:]*([0-9]{1,4}[.,]\d{2})[\s]*[€$£¥]/gi,
        /(?:mehrwertsteuer|umsatzsteuer)[\s:]*([0-9]{1,4}[.,]\d{2})[\s]*[€$£¥]/gi,
    ];

    const netPatterns = [
        /(?:netto|net|subtotal|zwischensumme)[\s:]*([0-9]{1,5}[.,]\d{2})[\s]*[€$£¥]/gi,
    ];

    // Extract all potential amounts
    const allAmounts: number[] = [];
    
    for (const pattern of amountPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            const amountStr = match[1].replace(',', '.');
            const amount = parseFloat(amountStr);
            if (amount > 0 && amount < 50000) { // Reasonable range
                allAmounts.push(amount);
            }
        }
    }

    // Extract VAT amount
    let vatAmount: number | null = null;
    for (const pattern of vatPatterns) {
        const match = text.match(pattern);
        if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            if (amount > 0 && amount < 10000) {
                vatAmount = amount;
                break;
            }
        }
    }

    // Extract net amount
    let netAmount: number | null = null;
    for (const pattern of netPatterns) {
        const match = text.match(pattern);
        if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            if (amount > 0 && amount < 50000) {
                netAmount = amount;
                break;
            }
        }
    }

    // Find the main amount (usually the highest, but consider context)
    let amount: number | null = null;
    if (allAmounts.length > 0) {
        // Sort amounts and pick the highest reasonable one
        allAmounts.sort((a, b) => b - a);
        amount = allAmounts[0];
        
        // If we have VAT and net, check if total = net + vat
        if (netAmount && vatAmount) {
            const calculatedTotal = netAmount + vatAmount;
            const tolerance = 0.02; // 2 cent tolerance
            
            for (const candidate of allAmounts) {
                if (Math.abs(candidate - calculatedTotal) <= tolerance) {
                    amount = candidate;
                    break;
                }
            }
        }
    }

    return { amount, netAmount, vatAmount };
}

// Advanced date extraction with multiple formats
function extractDateAdvanced(text: string): string {
    const datePatterns = [
        // German format: DD.MM.YYYY
        /datum[\s:]*(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
        /date[\s:]*(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
        
        // US format: MM/DD/YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        
        // ISO format: YYYY-MM-DD
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        
        // European format: DD-MM-YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/,
        
        // Text date formats
        /(\d{1,2})\.\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*(\d{4})/i,
        /(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})/i,
    ];

    const monthNames = {
        'januar': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6,
        'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12,
        'january': 1, 'february': 2, 'march': 3, 'may': 5, 'june': 6,
        'july': 7, 'october': 10, 'december': 12
    };

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            try {
                let day: number, month: number, year: number;

                if (match[0].includes('januar') || match[0].includes('january')) {
                    // Text-based date
                    day = parseInt(match[1]);
                    const monthName = match[2].toLowerCase();
                    month = monthNames[monthName as keyof typeof monthNames];
                    year = parseInt(match[3]);
                } else if (pattern.source.includes('datum') || pattern.source.includes('date')) {
                    // Labeled date (DD.MM.YYYY)
                    day = parseInt(match[1]);
                    month = parseInt(match[2]);
                    year = parseInt(match[3]);
                } else if (match[0].includes('-')) {
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
                    // Default DD.MM.YYYY or MM/DD/YYYY
                    day = parseInt(match[1]);
                    month = parseInt(match[2]);
                    year = parseInt(match[3]);
                }

                // Validate date
                if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const date = new Date(year, month - 1, day);
                    return date.toISOString().split('T')[0];
                }
            } catch (e) {
                continue;
            }
        }
    }

    // Default to today
    return new Date().toISOString().split('T')[0];
}

// Enhanced invoice number extraction
function extractInvoiceNumber(text: string): string {
    const invoicePatterns = [
        /rechnungsnummer[\s:]*([a-zA-Z0-9-_/]+)/i,
        /invoice[\s]*number[\s:]*([a-zA-Z0-9-_/]+)/i,
        /rechnung[\s]*nr\.?[\s:]*([a-zA-Z0-9-_/]+)/i,
        /invoice[\s]*no\.?[\s:]*([a-zA-Z0-9-_/]+)/i,
        /rechnungs-nr\.?[\s:]*([a-zA-Z0-9-_/]+)/i,
        /bill[\s]*no\.?[\s:]*([a-zA-Z0-9-_/]+)/i,
        
        // Pattern for invoice numbers at start of line
        /^([A-Z]{2,4}[-_]?\d{4,8})/m,
        /^(INV[-_]?\d{4,8})/mi,
        /^(RG[-_]?\d{4,8})/mi,
        /^(\d{4,8}[-_][A-Z0-9]{2,6})/m,
    ];

    for (const pattern of invoicePatterns) {
        const match = text.match(pattern);
        if (match) {
            const invoiceNum = match[1].trim();
            // Validate invoice number format
            if (invoiceNum.length >= 3 && invoiceNum.length <= 20) {
                return invoiceNum;
            }
        }
    }

    return '';
}

// Extract structured data from OCR text with enhanced AWS Textract + Google AI Studio
async function extractReceiptDataFromOCR(
    ocrResult: { text: string; confidence: number; blocks?: any[]; enhanced?: boolean },
    fileName: string
) {
    const text = ocrResult.text.toLowerCase();
    const originalText = ocrResult.text;
    const blocks = ocrResult.blocks || [];
    
    logger.info('[OCR] Processing extraction with enhanced:', ocrResult.enhanced || false);
    
    // If enhanced by Google AI Studio, try to parse structured format first
    if (ocrResult.enhanced) {
        const structuredData = parseGoogleAIStructuredData(originalText);
        if (structuredData) {
            logger.info('[OCR] Using Google AI Studio structured data');
            return createReceiptDataFromStructured(structuredData, fileName);
        }
    }
    
    // Fallback to traditional extraction methods
    logger.info('[OCR] Using traditional extraction methods');
    
    // Extract query results first (most reliable)
    const queryResults = extractQueryResults(blocks);
    
    // Use query results with fallback to block-based extraction
    const vendor = queryResults.VENDOR_NAME || queryResults.VENDOR_NAME_EN || extractVendorFromBlocks(blocks, originalText);
    const invoiceNumber = queryResults.INVOICE_ID || queryResults.INVOICE_ID_EN || extractInvoiceNumberFromBlocks(blocks, originalText);
    const date = parseQueryDate(queryResults.INVOICE_DATE || queryResults.INVOICE_DATE_EN) || extractDateFromBlocks(blocks, originalText);
    
    // Enhanced amount extraction with query results
    const { amount, netAmount, vatAmount } = extractAmountsWithQueries(queryResults, blocks, originalText);

    // Extract VAT rate dynamically based on amounts and text content
    const vatRate = extractVatRate(originalText, amount, vatAmount, netAmount);

    // Determine category based on vendor and content
    let category = 'Sonstiges';
    if (vendor.toLowerCase().includes('amazon')) category = 'Software/Tools';
    else if (text.includes('hosting') || text.includes('server')) category = 'IT/Hosting';
    else if (text.includes('software') || text.includes('lizenz')) category = 'Software/Lizenzen';
    else if (text.includes('werbung') || text.includes('marketing')) category = 'Marketing/Werbung';
    else if (vendor.toLowerCase().includes('freelancer') || vendor.toLowerCase().includes('marketing')) category = 'Marketing/Werbung';

    // Generate title
    let title = 'Rechnung';
    if (vendor && invoiceNumber) {
        title = `${vendor} - Rechnung ${invoiceNumber}`;
    } else if (vendor) {
        title = `${vendor} - Rechnung`;
    } else if (invoiceNumber) {
        title = `Rechnung ${invoiceNumber}`;
    }

    const extractedData = {
        title,
        amount,
        category,
        description: `Rechnung: ${fileName}`,
        vendor: vendor || '',
        date,
        invoiceNumber,
        vatAmount: vatAmount || (amount && netAmount ? amount - netAmount : (amount ? Math.round((amount * (vatRate/100) / (1 + vatRate/100)) * 100) / 100 : null)),
        netAmount: netAmount || (amount ? Math.round((amount / (1 + vatRate/100)) * 100) / 100 : null),
        vatRate,
        companyName: vendor || '',
        companyAddress: extractCompanyAddress(originalText),
        companyVatNumber: extractCompanyVatNumber(originalText),
        contactEmail: extractContactEmail(originalText),
        contactPhone: extractContactPhone(originalText),
        // Add query results for debugging
        queryResults: queryResults
    };

    logger.info('[OCR] Final extracted data:', {
        vendor: extractedData.vendor,
        amount: extractedData.amount,
        invoiceNumber: extractedData.invoiceNumber,
        date: extractedData.date,
        queryResultsCount: Object.keys(queryResults).length
    });

    return extractedData;
}

// Parse date from query results
function parseQueryDate(dateString: string | undefined): string | null {
    if (!dateString || dateString === 'N/A') return null;
    
    // Try to parse various date formats from query results
    const datePatterns = [
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // DD.MM.YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
        /(\d{1,2})-(\d{1,2})-(\d{4})/,   // DD-MM-YYYY
    ];

    for (const pattern of datePatterns) {
        const match = dateString.match(pattern);
        if (match) {
            try {
                let day: number, month: number, year: number;
                
                if (pattern.source.includes('-') && parseInt(match[1]) > 1000) {
                    // ISO format YYYY-MM-DD
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                } else {
                    // DD.MM.YYYY or DD-MM-YYYY
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

// Enhanced amount extraction with query results
function extractAmountsWithQueries(
    queryResults: { [key: string]: string }, 
    blocks: any[], 
    originalText: string
): { amount: number | null; netAmount: number | null; vatAmount: number | null } {
    
    // Try to get amounts from query results first
    let amount: number | null = null;
    let netAmount: number | null = null;
    let vatAmount: number | null = null;

    // Parse amounts from query results
    const totalAmountStr = queryResults.TOTAL_AMOUNT || queryResults.TOTAL_AMOUNT_EN;
    const netAmountStr = queryResults.NET_AMOUNT;
    const vatAmountStr = queryResults.VAT_AMOUNT;

    if (totalAmountStr && totalAmountStr !== 'N/A') {
        amount = parseAmountString(totalAmountStr);
    }

    if (netAmountStr && netAmountStr !== 'N/A') {
        netAmount = parseAmountString(netAmountStr);
    }

    if (vatAmountStr && vatAmountStr !== 'N/A') {
        vatAmount = parseAmountString(vatAmountStr);
    }

    // If query results didn't provide amounts, fall back to block-based extraction
    if (!amount && !netAmount && !vatAmount) {
        return extractAmountsFromBlocks(blocks, originalText);
    }

    logger.info('[OCR] Query-based amounts extracted:', { amount, netAmount, vatAmount });
    return { amount, netAmount, vatAmount };
}

// Parse amount string from various formats
function parseAmountString(amountStr: string): number | null {
    if (!amountStr) return null;
    
    // Remove common currency symbols and text
    const cleanedStr = amountStr
        .replace(/[€$£¥]/g, '')
        .replace(/EUR|USD|GBP|JPY/gi, '')
        .replace(/[^\d.,]/g, '')
        .trim();

    // Handle German number format (1.234,56) vs English (1,234.56)
    let numericStr = cleanedStr;
    
    // If there's a comma as the last separator, it's likely decimal
    if (numericStr.includes(',') && numericStr.includes('.')) {
        // Both comma and dot present, determine which is decimal
        const lastComma = numericStr.lastIndexOf(',');
        const lastDot = numericStr.lastIndexOf('.');
        
        if (lastComma > lastDot) {
            // Comma is decimal separator (German format)
            numericStr = numericStr.replace(/\./g, '').replace(',', '.');
        } else {
            // Dot is decimal separator (English format)
            numericStr = numericStr.replace(/,/g, '');
        }
    } else if (numericStr.includes(',')) {
        // Only comma present, assume it's decimal separator
        numericStr = numericStr.replace(',', '.');
    }

    const parsed = parseFloat(numericStr);
    
    // Validate reasonable range
    if (isNaN(parsed) || parsed <= 0 || parsed > 1000000) {
        return null;
    }

    return Math.round(parsed * 100) / 100; // Round to 2 decimal places
}

// Context-aware vendor extraction using AWS Textract blocks
function extractVendorFromBlocks(blocks: any[], originalText: string): string {
    // First try to extract from form key-value pairs
    const formVendor = extractVendorFromForms(blocks);
    if (formVendor) return formVendor;

    // Then try positional analysis
    const positionalVendor = extractVendorByPosition(blocks);
    if (positionalVendor) return positionalVendor;

    // Fallback to regex patterns on original text
    return extractVendorFromText(originalText);
}

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

// Fallback vendor extraction from text patterns
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
        /(?:rechnung\s*an|bill\s*to|invoice\s*to|kunde|customer)[\s:]*([^\n]+)/i,
        /(?:^|\n)([A-Z][a-zA-Z0-9\s&.-]{5,40})(?:\n|$)/m,
        /^([^\n]+(?:gmbh|ag|kg|llc|inc|ltd|corp|ug))/mi,
        /(?:^|\n)([a-zA-Z0-9.-]+\.(?:com|de|org|net|eu))(?:\n|$)/i,
        /firma:?\s*([^\n]+)/i,
        /company:?\s*([^\n]+)/i,
        /^([A-ZÜÄÖ][a-zäöüß\s&.-]{2,50})/m,
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

// Enhanced amount extraction using block context
function extractAmountsFromBlocks(blocks: any[], originalText: string): { amount: number | null; netAmount: number | null; vatAmount: number | null } {
    // First try to extract from table cells
    const tableAmounts = extractAmountsFromTables(blocks);
    if (tableAmounts.amount || tableAmounts.netAmount || tableAmounts.vatAmount) {
        return tableAmounts;
    }

    // Then try form key-value pairs
    const formAmounts = extractAmountsFromForms(blocks);
    if (formAmounts.amount || formAmounts.netAmount || formAmounts.vatAmount) {
        return formAmounts;
    }

    // Fallback to text patterns
    return extractAmountsAdvanced(originalText);
}

// Extract amounts from table structures
function extractAmountsFromTables(blocks: any[]): { amount: number | null; netAmount: number | null; vatAmount: number | null } {
    const cellBlocks = blocks.filter(block => block.BlockType === 'CELL' && block.Text);
    
    const amounts: number[] = [];
    let netAmount: number | null = null;
    let vatAmount: number | null = null;

    cellBlocks.forEach(cell => {
        const text = cell.Text.toLowerCase();
        const amountMatch = text.match(/([0-9]{1,5}[.,]\d{2})\s*[€$£¥]/);
        
        if (amountMatch) {
            const amount = parseFloat(amountMatch[1].replace(',', '.'));
            if (amount > 0 && amount < 50000) {
                amounts.push(amount);
                
                // Check context for amount type
                if (text.includes('netto') || text.includes('net') || text.includes('subtotal')) {
                    netAmount = amount;
                } else if (text.includes('mwst') || text.includes('vat') || text.includes('tax')) {
                    vatAmount = amount;
                }
            }
        }
    });

    // Find the highest amount as total
    const amount = amounts.length > 0 ? Math.max(...amounts) : null;

    return { amount, netAmount, vatAmount };
}

// Extract amounts from form key-value pairs
function extractAmountsFromForms(blocks: any[]): { amount: number | null; netAmount: number | null; vatAmount: number | null } {
    const amountKeys = [
        'gesamtbetrag', 'total', 'summe', 'betrag', 'gesamt',
        'nettobetrag', 'netto', 'net', 'subtotal',
        'mwst', 'vat', 'tax', 'steuer', 'mehrwertsteuer'
    ];

    let amount: number | null = null;
    let netAmount: number | null = null;
    let vatAmount: number | null = null;

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

                // Check if this key indicates an amount field
                const matchedKey = amountKeys.find(key => keyText.includes(key));
                if (matchedKey) {
                    // Find the associated value
                    const valueRelation = kvBlock.Relationships.find((rel: any) => rel.Type === 'VALUE');
                    if (valueRelation?.Ids) {
                        const valueBlock = blocks.find(block => 
                            valueRelation.Ids.includes(block.Id) && block.EntityTypes?.includes('VALUE')
                        );
                        
                        if (valueBlock?.Relationships) {
                            const valueChildRelation = valueBlock.Relationships.find((rel: any) => rel.Type === 'CHILD');
                            if (valueChildRelation?.Ids) {
                                const valueText = valueChildRelation.Ids
                                    .map((id: string) => blocks.find(block => block.Id === id))
                                    .filter((block: any) => block && block.Text)
                                    .map((block: any) => block.Text)
                                    .join(' ');
                                
                                const amountMatch = valueText.match(/([0-9]{1,5}[.,]\d{2})/);
                                if (amountMatch) {
                                    const parsedAmount = parseFloat(amountMatch[1].replace(',', '.'));
                                    if (parsedAmount > 0 && parsedAmount < 50000) {
                                        if (matchedKey.includes('netto') || matchedKey.includes('net') || matchedKey.includes('subtotal')) {
                                            netAmount = parsedAmount;
                                        } else if (matchedKey.includes('mwst') || matchedKey.includes('vat') || matchedKey.includes('tax')) {
                                            vatAmount = parsedAmount;
                                        } else {
                                            amount = parsedAmount;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return { amount, netAmount, vatAmount };
}

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
    return extractDateAdvanced(originalText);
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
    return extractInvoiceNumber(originalText);
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
function generateExtractionMessage(data: any, enhanced?: boolean): string {
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

// Parse structured data from Google AI Studio response
function parseGoogleAIStructuredData(text: string): any | null {
    try {
        // Look for the structured data section between --- markers
        const structuredMatch = text.match(/---\s*([\s\S]*?)\s*---/);
        if (!structuredMatch) return null;
        
        const structuredText = structuredMatch[1];
        const data: any = {};
        
        // Parse each line: KEY: VALUE
        const lines = structuredText.split('\n');
        for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                
                if (value && value !== '[' && value !== 'N/A' && value !== '') {
                    data[key] = value.replace(/[\[\]]/g, ''); // Remove brackets
                }
            }
        }
        
        logger.info('[Google AI] Parsed structured data:', data);
        return Object.keys(data).length > 0 ? data : null;
        
    } catch (error) {
        logger.error('[Google AI] Failed to parse structured data:', error);
        return null;
    }
}

// Create receipt data from Google AI Studio structured data
function createReceiptDataFromStructured(structuredData: any, fileName: string): any {
    const parseAmount = (amountStr: string): number | null => {
        if (!amountStr) return null;
        const match = amountStr.match(/(\d+[.,]\d+)/);
        return match ? parseFloat(match[1].replace(',', '.')) : null;
    };
    
    const parseDate = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        
        // Try to parse the date string
        try {
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dateStr; // Already in correct format
            }
            
            // Convert other formats to YYYY-MM-DD
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            // Ignore parsing errors
        }
        
        return new Date().toISOString().split('T')[0];
    };
    
    const determineCategory = (vendor: string, text: string): string => {
        const v = vendor.toLowerCase();
        const t = text.toLowerCase();
        
        if (v.includes('amazon') || v.includes('aws')) return 'Software/Tools';
        if (t.includes('hosting') || t.includes('server') || t.includes('cloud')) return 'IT/Hosting';
        if (t.includes('software') || t.includes('lizenz') || t.includes('subscription')) return 'Software/Lizenzen';
        if (t.includes('werbung') || t.includes('marketing') || t.includes('ads')) return 'Marketing/Werbung';
        if (t.includes('büro') || t.includes('office') || t.includes('material')) return 'Büroausstattung';
        return 'Sonstiges';
    };
    
    const vendor = structuredData.VENDOR || '';
    const invoiceNumber = structuredData.INVOICE_NUMBER || '';
    const totalAmount = parseAmount(structuredData.TOTAL_AMOUNT);
    const netAmount = parseAmount(structuredData.NET_AMOUNT);
    const vatAmount = parseAmount(structuredData.VAT_AMOUNT);
    const vatRate = structuredData.VAT_RATE ? parseInt(structuredData.VAT_RATE) : 19;
    const date = parseDate(structuredData.DATE);
    const category = determineCategory(vendor, JSON.stringify(structuredData));
    
    // Generate appropriate title
    let title = 'Google AI - Rechnung';
    if (vendor && invoiceNumber) {
        title = `${vendor} - Rechnung ${invoiceNumber}`;
    } else if (vendor) {
        title = `${vendor} - Rechnung`;
    } else if (invoiceNumber) {
        title = `Rechnung ${invoiceNumber}`;
    }
    
    const result = {
        title,
        amount: totalAmount,
        category,
        description: `Google AI Studio OCR: ${fileName}`,
        vendor,
        date,
        invoiceNumber,
        vatAmount: vatAmount || (totalAmount && netAmount ? totalAmount - netAmount : null),
        netAmount: netAmount || (totalAmount ? Math.round((totalAmount / 1.19) * 100) / 100 : null),
        vatRate,
        companyName: vendor,
        companyAddress: structuredData.COMPANY_ADDRESS || '',
        companyVatNumber: structuredData.COMPANY_VAT_NUMBER || '',
        contactEmail: structuredData.CONTACT_EMAIL || '',
        contactPhone: structuredData.CONTACT_PHONE || '',
        enhanced: true
    };
    
    logger.info('[Google AI] Created structured receipt data:', {
        vendor: result.vendor,
        amount: result.amount,
        invoiceNumber: result.invoiceNumber,
        category: result.category
    });
    
    return result;
}
