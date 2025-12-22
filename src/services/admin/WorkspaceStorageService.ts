/**
 * Workspace Storage Service
 * Firebase Storage basiert - ersetzt AWS S3
 */

import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface UploadResult {
  url: string;
  key: string;
  success: boolean;
}

export class WorkspaceStorageService {
  /**
   * Generate storage path for workspace files
   */
  static generateWorkspacePath(
    workspaceId: string,
    taskId: string,
    fileId: string,
    fileName: string
  ): string {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `admin-workspaces/${workspaceId}/tasks/${taskId}/attachments/${fileId}_${sanitizedFileName}`;
  }

  /**
   * Upload file to Firebase Storage
   */
  static async uploadFile(
    file: File,
    storagePath: string,
    options?: {
      contentType?: string;
      workspaceId?: string;
      taskId?: string;
    }
  ): Promise<UploadResult> {
    try {
      const storageRef = ref(storage, storagePath);

      const metadata = {
        contentType: options?.contentType || file.type,
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          workspaceId: options?.workspaceId || '',
          taskId: options?.taskId || '',
          originalName: file.name,
        },
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        url: downloadUrl,
        key: storagePath,
        success: true,
      };
    } catch (error) {
      console.error('[WorkspaceStorageService] Upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from Firebase Storage
   */
  static async deleteFile(storagePath: string): Promise<void> {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('[WorkspaceStorageService] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a file
   */
  static async getDownloadUrl(storagePath: string): Promise<string> {
    const storageRef = ref(storage, storagePath);
    return getDownloadURL(storageRef);
  }
}
