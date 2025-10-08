"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const zod_1 = require("zod");
const lambda_file_download_1 = require("./lambda-file-download");
// =============================================================================
// AWS LAMBDA OCR API HANDLER - Multi-Cloud Storage Support
// =============================================================================
/**
 * Multi-Cloud Storage OCR request schema - AWS Lambda optimiert
 * Unterstützt S3 (s3://), GCS (gs://) und öffentliche URLs (https://)
 */
const lambdaOcrRequestSchema = zod_1.z.object({
    // 1. Allgemeine URL (für GCS signierte URLs, öffentliche Links, etc.)
    fileUrl: zod_1.z.string().url('Must be a valid URL').optional(),
    // 2. Nativer AWS S3 Pfad (optimiert für Lambda-Umgebung)
    s3Path: zod_1.z.string()
        .startsWith('s3://', 'Must start with s3://')
        .refine(path => {
        // Validate S3 path format: s3://bucket-name/key/path/file.ext
        const s3Regex = /^s3:\/\/[a-z0-9][\w.-]*[a-z0-9]\/(.+)$/;
        return s3Regex.test(path);
    }, 'Invalid S3 path format. Expected: s3://bucket-name/key/path/file.ext')
        .optional(),
    // 3. Google Cloud Storage Pfad (fallback über signierte URLs empfohlen)
    gcsPath: zod_1.z.string()
        .startsWith('gs://', 'Must start with gs://')
        .refine(path => {
        // Validate GCS path format: gs://bucket-name/path/to/file
        const gcsRegex = /^gs:\/\/[a-z0-9][\w.-]*[a-z0-9]\/(.+)$/;
        return gcsRegex.test(path);
    }, 'Invalid GCS path format. Expected: gs://bucket-name/path/to/file')
        .optional(),
    fileName: zod_1.z.string().optional().describe('Original filename for processing context'),
    mimeType: zod_1.z.string().optional().describe('File MIME type (will be auto-detected if not provided)'),
    // Erweiterte Optionen
    maxFileSizeMB: zod_1.z.number().min(1).max(50).optional().default(50).describe('Maximum file size in MB'),
    forceReprocess: zod_1.z.boolean().optional().default(false).describe('Force reprocessing even if cached result exists')
}).refine(data => data.fileUrl || data.s3Path || data.gcsPath, {
    message: 'Either fileUrl, s3Path, or gcsPath must be provided for OCR extraction',
    path: ['fileUrl', 's3Path', 'gcsPath']
});
/**
 * AWS Lambda Handler für Multi-Cloud OCR Processing
 */
const handler = async (event, context) => {
    console.log('[LAMBDA OCR] Starting processing', {
        requestId: context.awsRequestId,
        httpMethod: event.httpMethod,
        path: event.path
    });
    // CORS Headers für API Gateway
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-company-id',
        'Content-Type': 'application/json'
    };
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Method not allowed',
                message: 'Only POST requests are supported'
            })
        };
    }
    try {
        // Parse request body
        const requestBody = event.body ? JSON.parse(event.body) : {};
        // Validate request schema
        const validationResult = lambdaOcrRequestSchema.safeParse(requestBody);
        if (!validationResult.success) {
            console.error('[LAMBDA OCR] Validation failed:', validationResult.error.issues);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid OCR request data - Multi-cloud storage path or URL required',
                    issues: validationResult.error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message
                    }))
                })
            };
        }
        // Extract validated data
        const { fileUrl, s3Path, gcsPath, fileName = 'document.pdf', mimeType, maxFileSizeMB = 50, forceReprocess = false } = validationResult.data;
        console.log('[LAMBDA OCR] Multi-Cloud OCR Request:', {
            hasFileUrl: !!fileUrl,
            hasS3Path: !!s3Path,
            hasGcsPath: !!gcsPath,
            fileName,
            maxFileSizeMB,
            forceReprocess,
            fileUrlPreview: fileUrl ? `${fileUrl.substring(0, 50)}...` : undefined,
            s3Path,
            gcsPath
        });
        // Download file from cloud storage
        console.log('[LAMBDA OCR] Downloading file with params:', { fileUrl, s3Path, gcsPath });
        const downloadResult = await (0, lambda_file_download_1.getFileBufferFromPath)({
            fileUrl,
            s3Path,
            gcsPath
        });
        if (!downloadResult.buffer) {
            console.error('[LAMBDA OCR] File download failed: No buffer received');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'FILE_DOWNLOAD_FAILED',
                    details: 'No buffer received',
                    timestamp: new Date().toISOString()
                })
            };
        }
        const fileBuffer = downloadResult.buffer;
        const detectedMimeType = mimeType || downloadResult.contentType || (0, lambda_file_download_1.detectFileType)(fileBuffer, downloadResult.fileName);
        // Validate file size
        const sizeValidation = (0, lambda_file_download_1.validateFileSize)(fileBuffer, maxFileSizeMB);
        if (!sizeValidation) {
            console.error('[LAMBDA OCR] File size validation failed: File too large');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'FILE_TOO_LARGE',
                    details: `File exceeds ${maxFileSizeMB}MB limit`,
                    timestamp: new Date().toISOString()
                })
            };
        }
        // TODO: Hier würde die OCR-Verarbeitung stattfinden
        // const ocrResult = await performOCRProcessing(fileBuffer, fileName);
        // Mock OCR result für Demonstration
        const mockOcrResult = {
            success: true,
            extractedText: `Extracted from ${downloadResult.fileName} (${(downloadResult.fileSize / (1024 * 1024)).toFixed(2)}MB)`,
            confidence: 0.95,
            processingTime: 1200,
            source: s3Path || gcsPath || fileUrl || 'unknown',
            metadata: {
                fileName: downloadResult.fileName,
                fileSize: fileBuffer.length,
                mimeType: detectedMimeType,
                downloadSource: s3Path || gcsPath || fileUrl || 'unknown'
            }
        };
        console.log('[LAMBDA OCR] Processing completed successfully');
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: mockOcrResult,
                message: 'Multi-cloud OCR processing completed successfully',
                cloudStorage: {
                    source: s3Path || gcsPath || fileUrl || 'unknown',
                    originalSize: downloadResult.fileSize,
                    detectedMimeType
                }
            })
        };
    }
    catch (error) {
        console.error('[LAMBDA OCR] Unexpected error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
                requestId: context.awsRequestId
            })
        };
    }
};
exports.handler = handler;
/**
 * Beispiel-Funktionen für OCR-Integration
 * Diese würden in einer echten Implementierung die spezifische OCR-Logik enthalten
 */
// async function performOCRProcessing(fileBuffer: Buffer, fileName: string) {
//     // Hier würde die eigentliche OCR-Verarbeitung stattfinden
//     // z.B. AWS Textract, Google Cloud Vision, etc.
//     return {
//         extractedText: "Sample extracted text",
//         confidence: 0.95,
//         processingTime: 1200
//     };
// }
/**
 * Beispiel für IAM-Rolle Permissions, die diese Lambda benötigt:
 *
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [
 *     {
 *       "Effect": "Allow",
 *       "Action": [
 *         "s3:GetObject",
 *         "s3:GetObjectVersion"
 *       ],
 *       "Resource": [
 *         "arn:aws:s3:::your-bucket/*"
 *       ]
 *     },
 *     {
 *       "Effect": "Allow",
 *       "Action": [
 *         "textract:AnalyzeDocument",
 *         "textract:DetectDocumentText"
 *       ],
 *       "Resource": "*"
 *     }
 *   ]
 * }
 */ 
