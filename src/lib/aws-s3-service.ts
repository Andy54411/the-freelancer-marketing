// AWS S3 Upload Service für Taskilo
// Ersetzt Firebase Storage für Admin Workspace File-Uploads

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'taskilo-file-storage';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface FileUpload {
  file: File;
  path: string;
  metadata?: {
    contentType?: string;
    [key: string]: any;
  };
}

export class AWSS3Service {
  /**
   * Upload file to S3
   */
  static async uploadFile(
    file: File,
    path: string,
    metadata?: { contentType?: string; [key: string]: any }
  ): Promise<UploadResult> {
    try {
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: path,
        Body: buffer,
        ContentType: metadata?.contentType || file.type,
        Metadata: {
          originalName: file.name,
          size: file.size.toString(),
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      };

      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      // Generate signed URL for access
      const url = await this.getSignedUrl(path);

      return {
        url,
        key: path,
        bucket: BUCKET_NAME,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload file from buffer
   */
  static async uploadBuffer(
    buffer: Buffer,
    path: string,
    contentType: string = 'application/octet-stream',
    metadata?: { [key: string]: any }
  ): Promise<UploadResult> {
    try {
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: path,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          size: buffer.length.toString(),
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      };

      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      const url = await this.getSignedUrl(path);

      return {
        url,
        key: path,
        bucket: BUCKET_NAME,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload buffer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      const deleteParams = {
        Bucket: BUCKET_NAME,
        Key: path,
      };

      const command = new DeleteObjectCommand(deleteParams);
      await s3Client.send(command);
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get signed URL for file access (expires in 1 hour)
   */
  static async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const getParams = {
        Bucket: BUCKET_NAME,
        Key: path,
      };

      const command = new GetObjectCommand(getParams);
      const url = await getSignedUrl(s3Client, command, { expiresIn });

      return url;
    } catch (error) {
      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate workspace file path
   */
  static generateWorkspacePath(
    workspaceId: string,
    taskId: string,
    fileId: string,
    fileName: string
  ): string {
    // Clean filename for S3 compatibility
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `workspaces/${workspaceId}/tasks/${taskId}/attachments/${fileId}-${cleanFileName}`;
  }

  /**
   * Generate admin upload path
   */
  static generateAdminPath(
    adminId: string,
    category: string,
    fileId: string,
    fileName: string
  ): string {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `admin/${adminId}/${category}/${fileId}-${cleanFileName}`;
  }

  /**
   * Check if file exists
   */
  static async fileExists(path: string): Promise<boolean> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: path,
      };

      const command = new GetObjectCommand(params);
      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(path: string): Promise<any> {
    try {
      const params = {
        Bucket: BUCKET_NAME,
        Key: path,
      };

      const command = new GetObjectCommand(params);
      const response = await s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(uploads: FileUpload[]): Promise<UploadResult[]> {
    try {
      const uploadPromises = uploads.map(({ file, path, metadata }) =>
        this.uploadFile(file, path, metadata)
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(
        `Failed to upload multiple files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Legacy compatibility for smooth migration
export const s3UploadService = AWSS3Service;
