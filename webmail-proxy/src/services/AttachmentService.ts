/**
 * Taskilo Webmail Proxy - Attachment Service
 * Sichere und optimierte Verarbeitung von E-Mail-Anhängen
 */

import { imapPool } from './ConnectionPool';
import crypto from 'crypto';
import { Readable } from 'stream';

interface AttachmentInfo {
  partId: string;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  encoding?: string;
}

interface DownloadResult {
  success: boolean;
  filename: string;
  contentType: string;
  size: number;
  data?: Buffer;
  stream?: Readable;
  error?: string;
}

// Erlaubte MIME-Types für Sicherheit
const ALLOWED_MIME_TYPES = new Set([
  // Dokumente
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  
  // Bilder
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  
  // Archive
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  
  // Audio/Video (für Meet-Aufnahmen)
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/ogg',
  
  // Kalender
  'text/calendar',
  'application/ics',
]);

// Blockierte Dateiendungen (Sicherheitsrisiko)
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
  '.msc', '.msp', '.lnk', '.inf', '.reg', '.dll', '.sys',
]);

// Max Attachment-Größe: 25 MB
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

class AttachmentService {
  private stats = {
    totalDownloads: 0,
    totalUploads: 0,
    blockedDownloads: 0,
    totalBytes: 0,
  };

  // Sicherheitscheck für Attachment
  validateAttachment(filename: string, contentType: string, size: number): { valid: boolean; reason?: string } {
    // Größencheck
    if (size > MAX_ATTACHMENT_SIZE) {
      return { valid: false, reason: `File too large. Max: ${MAX_ATTACHMENT_SIZE / 1024 / 1024} MB` };
    }

    // Dateiendung prüfen
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return { valid: false, reason: `File type not allowed: ${ext}` };
    }

    // MIME-Type prüfen (optional, da manchmal falsch angegeben)
    // Bei unbekanntem MIME-Type warnen aber erlauben
    if (contentType && !ALLOWED_MIME_TYPES.has(contentType.toLowerCase().split(';')[0])) {
      console.warn(`[ATTACHMENT] Unusual MIME type: ${contentType} for ${filename}`);
    }

    return { valid: true };
  }

  // Attachment-Liste für eine E-Mail abrufen
  async getAttachments(
    email: string,
    password: string,
    mailbox: string,
    uid: number
  ): Promise<AttachmentInfo[]> {
    const client = await imapPool.acquire(email, password);
    
    try {
      await client.mailboxOpen(mailbox);
      
      const message = await client.fetchOne(
        uid.toString(),
        { bodyStructure: true },
        { uid: true }
      );

      if (!message || !('bodyStructure' in message)) {
        return [];
      }

      const attachments = this.extractAttachments((message as { bodyStructure: unknown }).bodyStructure);
      return attachments;
    } finally {
      imapPool.release(email);
    }
  }

  private extractAttachments(structure: unknown, parentPart = ''): AttachmentInfo[] {
    const attachments: AttachmentInfo[] = [];
    const struct = structure as {
      type?: string;
      subtype?: string;
      disposition?: string;
      dispositionParameters?: { filename?: string };
      parameters?: { name?: string };
      size?: number;
      id?: string;
      encoding?: string;
      childNodes?: unknown[];
    };

    if (!struct) return attachments;

    // Multipart-Struktur rekursiv durchsuchen
    if (struct.childNodes) {
      for (let i = 0; i < struct.childNodes.length; i++) {
        const partId = parentPart ? `${parentPart}.${i + 1}` : `${i + 1}`;
        attachments.push(...this.extractAttachments(struct.childNodes[i], partId));
      }
    }

    // Ist es ein Attachment?
    const disposition = struct.disposition?.toLowerCase();
    if (disposition === 'attachment' || (struct.type && struct.type !== 'text' && struct.type !== 'multipart')) {
      const filename = 
        struct.dispositionParameters?.filename ||
        struct.parameters?.name ||
        `attachment_${parentPart || '1'}`;

      const contentType = `${struct.type || 'application'}/${struct.subtype || 'octet-stream'}`;

      attachments.push({
        partId: parentPart || '1',
        filename,
        contentType,
        size: struct.size || 0,
        contentId: struct.id,
        encoding: struct.encoding,
      });
    }

    return attachments;
  }

  // Einzelnes Attachment herunterladen
  async downloadAttachment(
    email: string,
    password: string,
    mailbox: string,
    uid: number,
    partId: string
  ): Promise<DownloadResult> {
    const client = await imapPool.acquire(email, password);

    try {
      await client.mailboxOpen(mailbox);

      // Erst Metadaten holen
      const message = await client.fetchOne(
        uid.toString(),
        { bodyStructure: true },
        { uid: true }
      );

      if (!message || !('bodyStructure' in message)) {
        return { success: false, filename: '', contentType: '', size: 0, error: 'Message not found' };
      }

      const attachments = this.extractAttachments((message as { bodyStructure: unknown }).bodyStructure);
      const attachment = attachments.find(a => a.partId === partId);

      if (!attachment) {
        return { success: false, filename: '', contentType: '', size: 0, error: 'Attachment not found' };
      }

      // Sicherheitscheck
      const validation = this.validateAttachment(
        attachment.filename,
        attachment.contentType,
        attachment.size
      );

      if (!validation.valid) {
        this.stats.blockedDownloads++;
        return {
          success: false,
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          error: validation.reason,
        };
      }

      // Attachment herunterladen
      const { content } = await client.download(uid.toString(), partId, { uid: true });
      
      const chunks: Buffer[] = [];
      for await (const chunk of content) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks);

      this.stats.totalDownloads++;
      this.stats.totalBytes += data.length;

      return {
        success: true,
        filename: this.sanitizeFilename(attachment.filename),
        contentType: attachment.contentType,
        size: data.length,
        data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      return { success: false, filename: '', contentType: '', size: 0, error: errorMessage };
    } finally {
      imapPool.release(email);
    }
  }

  // Streaming-Download für große Dateien
  async downloadAttachmentStream(
    email: string,
    password: string,
    mailbox: string,
    uid: number,
    partId: string
  ): Promise<DownloadResult> {
    const client = await imapPool.acquire(email, password);

    try {
      await client.mailboxOpen(mailbox);

      const message = await client.fetchOne(
        uid.toString(),
        { bodyStructure: true },
        { uid: true }
      );

      if (!message || !('bodyStructure' in message)) {
        return { success: false, filename: '', contentType: '', size: 0, error: 'Message not found' };
      }

      const attachments = this.extractAttachments((message as { bodyStructure: unknown }).bodyStructure);
      const attachment = attachments.find(a => a.partId === partId);

      if (!attachment) {
        return { success: false, filename: '', contentType: '', size: 0, error: 'Attachment not found' };
      }

      const validation = this.validateAttachment(
        attachment.filename,
        attachment.contentType,
        attachment.size
      );

      if (!validation.valid) {
        this.stats.blockedDownloads++;
        return {
          success: false,
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          error: validation.reason,
        };
      }

      const { content } = await client.download(uid.toString(), partId, { uid: true });

      this.stats.totalDownloads++;
      this.stats.totalBytes += attachment.size;

      return {
        success: true,
        filename: this.sanitizeFilename(attachment.filename),
        contentType: attachment.contentType,
        size: attachment.size,
        stream: content,
      };
    } catch (error) {
      imapPool.release(email);
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      return { success: false, filename: '', contentType: '', size: 0, error: errorMessage };
    }
    // NOTE: Bei Stream wird connection erst nach Stream-Ende freigegeben
  }

  // Filename sanitizen gegen Path Traversal
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[/\\]/g, '_')  // Keine Pfade
      .replace(/\.\./g, '_')   // Keine Parent-Directory
      .replace(/[<>:"|?*]/g, '_') // Keine Windows-illegalen Zeichen
      .substring(0, 255);      // Max Länge
  }

  // Hash für Duplikat-Erkennung
  calculateHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  getStats() {
    return {
      ...this.stats,
      totalMB: (this.stats.totalBytes / 1024 / 1024).toFixed(2),
    };
  }
}

// Singleton
export const attachmentService = new AttachmentService();
