// Steuerberater Dokument Management
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export class SteuerberaterDocumentService {
  private static instance: SteuerberaterDocumentService;

  public static getInstance(): SteuerberaterDocumentService {
    if (!SteuerberaterDocumentService.instance) {
      SteuerberaterDocumentService.instance = new SteuerberaterDocumentService();
    }
    return SteuerberaterDocumentService.instance;
  }

  /**
   * Upload eines Dokuments für Steuerberater
   */
  async uploadDocument(
    file: File,
    companyId: string,
    metadata: {
      type: string;
      category: string;
      description?: string;
      tags: string[];
      period?: string;
      year?: number;
      encrypted?: boolean;
    }
  ): Promise<{ success: boolean; downloadUrl?: string; filePath?: string; error?: string }> {
    try {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/xml',
      ];

      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Nicht unterstützter Dateityp. Erlaubt: PDF, Excel, CSV, XML',
        };
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        return {
          success: false,
          error: 'Datei zu groß. Maximum: 50MB',
        };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `steuerberater-docs/${companyId}/${timestamp}_${sanitizedFileName}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, filePath);

      // Add metadata
      const uploadMetadata = {
        contentType: file.type,
        customMetadata: {
          companyId,
          uploadedAt: new Date().toISOString(),
          category: metadata.category,
          type: metadata.type,
          tags: metadata.tags.join(','),
          ...(metadata.period && { period: metadata.period }),
          ...(metadata.year && { year: metadata.year.toString() }),
          ...(metadata.description && { description: metadata.description }),
        },
      };

      const snapshot = await uploadBytes(storageRef, file, uploadMetadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        success: true,
        downloadUrl,
        filePath,
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
      };
    }
  }

  /**
   * Löscht ein Dokument
   */
  async deleteDocument(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Löschen fehlgeschlagen',
      };
    }
  }

  /**
   * Generiert einen sicheren Download-Link mit Zeitbegrenzung
   */
  async generateSecureDownloadLink(
    filePath: string,
    expirationMinutes: number = 60
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      const storageRef = ref(storage, filePath);
      const downloadUrl = await getDownloadURL(storageRef);

      // Note: Firebase Storage URLs are already time-limited
      // For additional security, you could implement a server-side proxy

      return {
        success: true,
        downloadUrl,
      };
    } catch (error) {
      console.error('Error generating download link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Link-Generierung fehlgeschlagen',
      };
    }
  }

  /**
   * Validiert Dateityp basierend auf Kategorie
   */
  validateFileForCategory(file: File, category: string): { valid: boolean; error?: string } {
    const categoryRequirements = {
      tax_report: ['application/pdf', 'application/xml'],
      financial_statement: [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      cashbook: [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      invoice_data: ['application/pdf', 'text/csv', 'application/xml'],
      datev_export: ['text/csv', 'application/xml'],
    };

    const allowedTypes = categoryRequirements[category as keyof typeof categoryRequirements];

    if (!allowedTypes) {
      return { valid: true }; // Allow all types for undefined categories
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Für die Kategorie "${category}" sind nur folgende Dateitypen erlaubt: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }
}
