"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudStoragePathSchema = void 0;
exports.getFileBufferFromPath = getFileBufferFromPath;
exports.validateFileSize = validateFileSize;
exports.detectFileType = detectFileType;
const client_s3_1 = require("@aws-sdk/client-s3");
const storage_1 = require("@google-cloud/storage");
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
// Validation Schemas
const s3PathSchema = zod_1.z.string().regex(/^s3:\/\/[^\/]+\/.+/);
const gcsPathSchema = zod_1.z.string().regex(/^gs:\/\/[^\/]+\/.+/);
const httpUrlSchema = zod_1.z.string().url();
exports.cloudStoragePathSchema = zod_1.z.object({
    s3Path: s3PathSchema.optional(),
    gcsPath: gcsPathSchema.optional(),
    fileUrl: httpUrlSchema.optional()
}).refine((data) => data.s3Path || data.gcsPath || data.fileUrl, { message: "At least one of s3Path, gcsPath, or fileUrl must be provided" });
async function getFileBufferFromPath(params) {
    // Priority: S3 > GCS > HTTP URL
    if (params.s3Path) {
        return await downloadFromS3(params.s3Path);
    }
    else if (params.gcsPath) {
        return await downloadFromGCS(params.gcsPath);
    }
    else if (params.fileUrl) {
        return await downloadFromHTTP(params.fileUrl);
    }
    throw new Error('No valid file path provided');
}
async function downloadFromS3(s3Path) {
    const { bucket, key } = extractS3Details(s3Path);
    const s3Client = new client_s3_1.S3Client({
        region: process.env.AWS_REGION || 'eu-central-1'
    });
    const command = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    const response = await s3Client.send(command);
    if (!response.Body) {
        throw new Error(`File not found in S3: ${s3Path}`);
    }
    const buffer = await streamToBuffer(response.Body);
    return {
        buffer,
        contentType: response.ContentType || 'application/octet-stream',
        fileName: key.split('/').pop() || 'unknown',
        fileSize: response.ContentLength || buffer.length
    };
}
async function downloadFromGCS(gcsPath) {
    const { bucket, key } = extractGCSDetails(gcsPath);
    const storage = new storage_1.Storage();
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
async function downloadFromHTTP(fileUrl) {
    const response = await axios_1.default.get(fileUrl, {
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
function extractS3Details(s3Path) {
    const match = s3Path.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid S3 path format: ${s3Path}`);
    }
    return { bucket: match[1], key: match[2] };
}
function extractGCSDetails(gcsPath) {
    const match = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid GCS path format: ${gcsPath}`);
    }
    return { bucket: match[1], key: match[2] };
}
async function streamToBuffer(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
function validateFileSize(buffer, maxSizeMB = 10) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return buffer.length <= maxSizeBytes;
}
function detectFileType(buffer, fileName) {
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
