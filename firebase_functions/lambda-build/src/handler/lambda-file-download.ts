import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import { z } from 'zod';

export interface FileDownloadResult {
    buffer: Buffer;
    contentType: string;
    fileName: string;
    fileSize: number;
}

// Validation Schemas
const s3PathSchema = z.string().regex(/^s3:\/\/[^\/]+\/.+/);
const gcsPathSchema = z.string().regex(/^gs:\/\/[^\/]+\/.+/);
const httpUrlSchema = z.string().url();

export const cloudStoragePathSchema = z.object({
    s3Path: s3PathSchema.optional(),
    gcsPath: gcsPathSchema.optional(), 
    fileUrl: httpUrlSchema.optional()
}).refine(
    (data) => data.s3Path || data.gcsPath || data.fileUrl,
    { message: "At least one of s3Path, gcsPath, or fileUrl must be provided" }
);

export async function getFileBufferFromPath(params: {
    s3Path?: string;
    gcsPath?: string; 
    fileUrl?: string;
}): Promise<FileDownloadResult> {
    // Priority: S3 > GCS > HTTP URL
    if (params.s3Path) {
        return await downloadFromS3(params.s3Path);
    } else if (params.gcsPath) {
        return await downloadFromGCS(params.gcsPath);
    } else if (params.fileUrl) {
        return await downloadFromHTTP(params.fileUrl);
    }
    
    throw new Error('No valid file path provided');
}

async function downloadFromS3(s3Path: string): Promise<FileDownloadResult> {
    const { bucket, key } = extractS3Details(s3Path);
    
    const s3Client = new S3Client({ 
        region: process.env.AWS_REGION || 'eu-central-1'
    });
    
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
        throw new Error(`File not found in S3: ${s3Path}`);
    }
    
    const buffer = await streamToBuffer(response.Body as NodeJS.ReadableStream);
    
    return {
        buffer,
        contentType: response.ContentType || 'application/octet-stream',
        fileName: key.split('/').pop() || 'unknown',
        fileSize: response.ContentLength || buffer.length
    };
}

async function downloadFromGCS(gcsPath: string): Promise<FileDownloadResult> {
    const { bucket, key } = extractGCSDetails(gcsPath);
    
    const storage = new Storage();
    const file = storage.bucket(bucket).file(key);
    
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    
    return {
        buffer,
        contentType: metadata.contentType || 'application/octet-stream',
        fileName: key.split('/').pop() || 'unknown',
        fileSize: typeof metadata.size === 'number' ? metadata.size : buffer.length
    };
}

async function downloadFromHTTP(fileUrl: string): Promise<FileDownloadResult> {
    const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
    });
    
    const buffer = Buffer.from(response.data);
    const fileName = fileUrl.split('/').pop()?.split('?')[0] || 'download';
    
    return {
        buffer,
        contentType: response.headers['content-type'] || 'application/octet-stream',
        fileName,
        fileSize: buffer.length
    };
}

function extractS3Details(s3Path: string): { bucket: string; key: string } {
    const match = s3Path.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid S3 path format: ${s3Path}`);
    }
    return { bucket: match[1], key: match[2] };
}

function extractGCSDetails(gcsPath: string): { bucket: string; key: string } {
    const match = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid GCS path format: ${gcsPath}`);
    }
    return { bucket: match[1], key: match[2] };
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export function validateFileSize(buffer: Buffer, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return buffer.length <= maxSizeBytes;
}

export function detectFileType(buffer: Buffer, fileName: string): string {
    // PDF detection
    if (buffer.subarray(0, 4).toString() === '%PDF') {
        return 'application/pdf';
    }
    
    // JPEG detection
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        return 'image/jpeg';
    }
    
    // PNG detection
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
        return 'image/png';
    }
    
    // Fallback to filename extension
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'tiff':
        case 'tif': return 'image/tiff';
        default: return 'application/octet-stream';
    }
}