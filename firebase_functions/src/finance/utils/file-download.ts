import { Storage } from '@google-cloud/storage';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { logger } from 'firebase-functions/v2';
import { Readable } from 'stream';

// Initialize Google Cloud Storage client
const storage = new Storage();

// Initialize AWS S3 Client for Lambda environment
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    // AWS SDK automatisch lädt Credentials aus Lambda-Umgebung (IAM Role)
    // Alternativ können explizite Credentials gesetzt werden:
    // credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    // }
});

/**
 * Download file from GCS path or HTTP(S) URL and return as Buffer
 * Supports both Google Cloud Storage paths (gs://) and direct HTTP URLs
 */
export interface FileDownloadResult {
    buffer: Buffer | null;
    type: string;
    error: string | null;
    metadata?: {
        size: number;
        contentType?: string;
        source: 'gcs' | 'url' | 's3';
    };
}

/**
 * Download file from multiple cloud storage sources
 * @param fileUrl - HTTP(S) URL to download file from (includes GCS signed URLs)
 * @param s3Path - AWS S3 path (s3://bucket/key)
 * @param gcsPath - Google Cloud Storage path (gs://bucket/path)
 * @returns FileDownloadResult with buffer and metadata
 */
export async function getFileBufferFromPath(
    fileUrl?: string,
    s3Path?: string,
    gcsPath?: string
): Promise<FileDownloadResult> {
    try {
        logger.info('[FILE DOWNLOAD] Starting multi-cloud file download process', {
            hasFileUrl: !!fileUrl,
            hasS3Path: !!s3Path,
            hasGcsPath: !!gcsPath,
            fileUrl: fileUrl ? `${fileUrl.substring(0, 50)}...` : undefined,
            s3Path,
            gcsPath
        });

        // Validate input parameters
        if (!fileUrl && !s3Path && !gcsPath) {
            return {
                buffer: null,
                type: 'unknown',
                error: 'Either fileUrl, s3Path, or gcsPath must be provided'
            };
        }

        // Priority 1: AWS S3 path (s3://) - Native Lambda environment
        if (s3Path) {
            return await downloadFromS3(s3Path);
        }

        // Priority 2: Google Cloud Storage path (gs://)
        if (gcsPath) {
            return await downloadFromGCS(gcsPath);
        }

        // Priority 3: HTTP(S) URL (includes GCS signed URLs and Base64 data URLs)
        if (fileUrl) {
            // Check if it's a Base64 data URL (fallback from storage upload)
            if (fileUrl.startsWith('data:')) {
                return await processBase64DataUrl(fileUrl);
            }
            return await downloadFromURL(fileUrl);
        }

        return {
            buffer: null,
            type: 'unknown',
            error: 'No valid file source provided'
        };

    } catch (error) {
        logger.error('[FILE DOWNLOAD] Unexpected error in getFileBufferFromPath:', error);
        return {
            buffer: null,
            type: 'unknown',
            error: `Multi-cloud file download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Download file from AWS S3 (native Lambda environment)
 */
async function downloadFromS3(s3Path: string): Promise<FileDownloadResult> {
    try {
        logger.info('[FILE DOWNLOAD S3] Processing S3 path:', s3Path);

        // Parse S3 path: s3://bucket-name/key/path/file.ext
        const s3Details = extractS3Details(s3Path);
        if (!s3Details.bucket || !s3Details.key) {
            return {
                buffer: null,
                type: 'unknown',
                error: 'Invalid S3 path format. Expected: s3://bucket-name/key/path/file.ext'
            };
        }

        logger.info('[FILE DOWNLOAD S3] Parsed S3 path:', { 
            bucket: s3Details.bucket, 
            key: s3Details.key 
        });

        // Get object from S3
        const getObjectCommand = new GetObjectCommand({
            Bucket: s3Details.bucket,
            Key: s3Details.key
        });

        const s3Response = await s3Client.send(getObjectCommand);

        if (!s3Response.Body) {
            return {
                buffer: null,
                type: 'unknown',
                error: 'S3 object has no body content'
            };
        }

        // Convert S3 Body stream to Buffer
        const buffer = await streamToBuffer(s3Response.Body as Readable);

        logger.info('[FILE DOWNLOAD S3] Successfully downloaded from S3:', {
            bucket: s3Details.bucket,
            key: s3Details.key,
            bufferSize: buffer.length,
            contentType: s3Response.ContentType,
            contentLength: s3Response.ContentLength
        });

        return {
            buffer,
            type: s3Response.ContentType || 'application/octet-stream',
            error: null,
            metadata: {
                size: buffer.length,
                contentType: s3Response.ContentType || undefined,
                source: 's3'
            }
        };

    } catch (error) {
        logger.error('[FILE DOWNLOAD S3] Error downloading from S3:', error);
        return {
            buffer: null,
            type: 'unknown',
            error: `S3 download failed: ${error instanceof Error ? error.message : 'Unknown S3 error'}`
        };
    }
}

/**
 * Download file from Google Cloud Storage
 */
async function downloadFromGCS(gcsPath: string): Promise<FileDownloadResult> {
    try {
        logger.info('[FILE DOWNLOAD GCS] Processing GCS path:', gcsPath);

        // Parse GCS path: gs://bucket-name/path/to/file
        const gcsMatch = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
        if (!gcsMatch) {
            return {
                buffer: null,
                type: 'unknown',
                error: 'Invalid GCS path format. Expected: gs://bucket-name/path/to/file'
            };
        }

        const [, bucketName, filePath] = gcsMatch;
        logger.info('[FILE DOWNLOAD GCS] Parsed GCS path:', { bucketName, filePath });

        // Get file from GCS
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);

        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            return {
                buffer: null,
                type: 'unknown',
                error: `File does not exist in GCS: ${gcsPath}`
            };
        }

        // Get file metadata
        const [metadata] = await file.getMetadata();
        logger.info('[FILE DOWNLOAD GCS] File metadata:', {
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated
        });

        // Download file content
        const [buffer] = await file.download();
        
        logger.info('[FILE DOWNLOAD GCS] Successfully downloaded from GCS:', {
            bucketName,
            filePath,
            bufferSize: buffer.length,
            contentType: metadata.contentType
        });

        return {
            buffer,
            type: metadata.contentType || 'application/octet-stream',
            error: null,
            metadata: {
                size: typeof metadata.size === 'string' ? parseInt(metadata.size) : (metadata.size || 0),
                contentType: metadata.contentType,
                source: 'gcs'
            }
        };

    } catch (error) {
        logger.error('[FILE DOWNLOAD GCS] Error downloading from GCS:', error);
        return {
            buffer: null,
            type: 'unknown',
            error: `GCS download failed: ${error instanceof Error ? error.message : 'Unknown GCS error'}`
        };
    }
}

/**
 * Download file from HTTP(S) URL
 */
async function downloadFromURL(fileUrl: string): Promise<FileDownloadResult> {
    try {
        logger.info('[FILE DOWNLOAD URL] Processing URL:', {
            url: `${fileUrl.substring(0, 50)}...`,
            protocol: fileUrl.startsWith('https') ? 'HTTPS' : fileUrl.startsWith('http') ? 'HTTP' : 'UNKNOWN'
        });

        // Validate URL format
        try {
            new URL(fileUrl);
        } catch {
            return {
                buffer: null,
                type: 'unknown',
                error: 'Invalid URL format provided'
            };
        }

        // Security check: Only allow HTTP(S) URLs
        if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
            return {
                buffer: null,
                type: 'unknown',
                error: 'Only HTTP and HTTPS URLs are supported'
            };
        }

        // Download with axios
        const response = await axios.get(fileUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30s timeout
            maxContentLength: 50 * 1024 * 1024, // 50MB max file size
            headers: {
                'User-Agent': 'Taskilo-OCR-Service/1.0'
            }
        });

        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'application/octet-stream';

        logger.info('[FILE DOWNLOAD URL] Successfully downloaded from URL:', {
            statusCode: response.status,
            bufferSize: buffer.length,
            contentType,
            contentLength: response.headers['content-length']
        });

        return {
            buffer,
            type: contentType,
            error: null,
            metadata: {
                size: buffer.length,
                contentType,
                source: 'url'
            }
        };

    } catch (error) {
        logger.error('[FILE DOWNLOAD URL] Error downloading from URL:', error);
        
        // Handle specific axios errors
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                return {
                    buffer: null,
                    type: 'unknown',
                    error: 'Download timeout (30s exceeded)'
                };
            }
            
            if (error.response) {
                return {
                    buffer: null,
                    type: 'unknown',
                    error: `HTTP ${error.response.status}: ${error.response.statusText}`
                };
            }
        }

        return {
            buffer: null,
            type: 'unknown',
            error: `URL download failed: ${error instanceof Error ? error.message : 'Unknown URL error'}`
        };
    }
}

/**
 * Validate file size for OCR processing
 */
export function validateFileSize(buffer: Buffer, maxSizeMB: number = 50): { valid: boolean; error?: string } {
    const sizeInMB = buffer.length / (1024 * 1024);
    
    if (sizeInMB > maxSizeMB) {
        return {
            valid: false,
            error: `File too large: ${sizeInMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`
        };
    }
    
    return { valid: true };
}

/**
 * Detect file type from buffer content (magic numbers)
 */
export function detectFileType(buffer: Buffer): string {
    if (buffer.length < 4) return 'unknown';
    
    // PDF
    if (buffer.subarray(0, 4).toString() === '%PDF') {
        return 'application/pdf';
    }
    
    // PNG
    if (buffer.subarray(0, 8).toString('hex').toUpperCase() === '89504E470D0A1A0A') {
        return 'image/png';
    }
    
    // JPEG
    if (buffer.subarray(0, 2).toString('hex').toUpperCase() === 'FFD8') {
        return 'image/jpeg';
    }
    
    // WebP
    if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
        return 'image/webp';
    }
    
    return 'application/octet-stream';
}

/**
 * Extract bucket and key from S3 path
 */
function extractS3Details(s3Path: string): { bucket: string | null; key: string | null } {
    try {
        // Parse s3://bucket-name/key/path/file.ext
        const s3Match = s3Path.match(/^s3:\/\/([^\/]+)\/(.+)$/);
        if (!s3Match) {
            return { bucket: null, key: null };
        }

        const [, bucket, key] = s3Match;
        return { bucket, key };
    } catch (error) {
        logger.error('[FILE DOWNLOAD S3] Error parsing S3 path:', error);
        return { bucket: null, key: null };
    }
}

/**
 * Process Base64 Data URL (fallback when cloud storage is not available)
 */
async function processBase64DataUrl(dataUrl: string): Promise<FileDownloadResult> {
    try {
        logger.info('[FILE DOWNLOAD] Processing Base64 data URL');

        // Parse data URL format: data:mime/type;base64,actualdata
        const [header, base64Data] = dataUrl.split(',');
        if (!header || !base64Data) {
            return {
                buffer: null,
                type: 'unknown',
                error: 'Invalid data URL format'
            };
        }

        // Extract MIME type from header
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

        // Convert Base64 to Buffer
        const buffer = Buffer.from(base64Data, 'base64');

        logger.info('[FILE DOWNLOAD] Base64 data URL processed successfully', {
            mimeType,
            bufferSize: buffer.length
        });

        return {
            buffer,
            type: mimeType,
            error: null,
            metadata: {
                size: buffer.length,
                contentType: mimeType,
                source: 'url' as const
            }
        };

    } catch (error) {
        logger.error('[FILE DOWNLOAD] Base64 data URL processing failed:', error);
        return {
            buffer: null,
            type: 'unknown',
            error: `Base64 processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Convert AWS S3 Body stream to Buffer
 * S3 GetObjectCommand returns a Readable stream that needs to be converted to Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });
        
        stream.on('error', (error: Error) => {
            reject(error);
        });
        
        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer);
        });
    });
}