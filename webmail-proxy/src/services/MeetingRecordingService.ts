/**
 * Taskilo Webmail Proxy - Meeting Recording Service
 * Sichere Aufzeichnung von Video-Meetings
 */

import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

interface Recording {
  id: string;
  meetingId: string;
  userId: string;
  filename: string;
  path: string;
  size: number;
  duration: number; // Sekunden
  startedAt: Date;
  endedAt?: Date;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  mimeType: string;
  checksum?: string;
}

interface RecordingConfig {
  storagePath: string;
  maxFileSizeMB: number;
  maxDurationMinutes: number;
  allowedFormats: string[];
  retentionDays: number;
}

// Use local directory for development, /opt/taskilo/recordings for production
const getDefaultStoragePath = (): string => {
  if (process.env.RECORDING_PATH) {
    return process.env.RECORDING_PATH;
  }
  // In development, use local recordings directory
  if (process.env.NODE_ENV !== 'production') {
    return join(process.cwd(), 'recordings');
  }
  return '/opt/taskilo/recordings';
};

const DEFAULT_CONFIG: RecordingConfig = {
  storagePath: getDefaultStoragePath(),
  maxFileSizeMB: 2048, // 2 GB
  maxDurationMinutes: 180, // 3 Stunden
  allowedFormats: ['video/webm', 'video/mp4', 'audio/webm', 'audio/ogg'],
  retentionDays: 30,
};

class MeetingRecordingService {
  private config: RecordingConfig;
  private activeRecordings: Map<string, Recording> = new Map();
  private stats = {
    totalRecordings: 0,
    activeRecordings: 0,
    totalBytes: 0,
    failedRecordings: 0,
  };

  constructor(config: Partial<RecordingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory(): void {
    if (!existsSync(this.config.storagePath)) {
      mkdirSync(this.config.storagePath, { recursive: true });
      console.log(`[RECORDING] Created storage directory: ${this.config.storagePath}`);
    }
  }

  /**
   * Neue Aufnahme starten
   */
  startRecording(
    meetingId: string,
    userId: string,
    mimeType: string
  ): { success: boolean; recordingId?: string; error?: string } {
    // Validierung
    if (!this.config.allowedFormats.includes(mimeType)) {
      return { success: false, error: `Format not allowed: ${mimeType}` };
    }

    // Prüfe ob bereits eine aktive Aufnahme existiert
    const existingRecording = Array.from(this.activeRecordings.values())
      .find(r => r.meetingId === meetingId && r.userId === userId && r.status === 'recording');

    if (existingRecording) {
      return { success: false, error: 'Recording already in progress' };
    }

    const recordingId = this.generateRecordingId();
    const extension = this.getExtensionForMimeType(mimeType);
    const filename = `${meetingId}_${userId}_${Date.now()}${extension}`;
    const path = join(this.config.storagePath, filename);

    const recording: Recording = {
      id: recordingId,
      meetingId,
      userId,
      filename,
      path,
      size: 0,
      duration: 0,
      startedAt: new Date(),
      status: 'recording',
      mimeType,
    };

    this.activeRecordings.set(recordingId, recording);
    this.stats.totalRecordings++;
    this.stats.activeRecordings++;

    console.log(`[RECORDING] Started: ${recordingId} for meeting ${meetingId}`);

    return { success: true, recordingId };
  }

  /**
   * Chunk zur Aufnahme hinzufügen
   */
  async appendChunk(
    recordingId: string,
    chunk: Buffer
  ): Promise<{ success: boolean; error?: string }> {
    const recording = this.activeRecordings.get(recordingId);

    if (!recording) {
      return { success: false, error: 'Recording not found' };
    }

    if (recording.status !== 'recording') {
      return { success: false, error: `Invalid status: ${recording.status}` };
    }

    // Größenlimit prüfen
    const newSize = recording.size + chunk.length;
    if (newSize > this.config.maxFileSizeMB * 1024 * 1024) {
      await this.stopRecording(recordingId, 'failed');
      return { success: false, error: 'Max file size exceeded' };
    }

    try {
      const writeStream = createWriteStream(recording.path, { flags: 'a' });
      
      await new Promise<void>((resolve, reject) => {
        writeStream.write(chunk, (err) => {
          if (err) reject(err);
          else resolve();
        });
        writeStream.end();
      });

      recording.size = newSize;
      recording.duration = (Date.now() - recording.startedAt.getTime()) / 1000;

      // Dauer-Limit prüfen
      if (recording.duration > this.config.maxDurationMinutes * 60) {
        await this.stopRecording(recordingId, 'completed');
        return { success: true }; // Erfolgreich beendet wegen Limit
      }

      return { success: true };
    } catch (error) {
      console.error(`[RECORDING] Error writing chunk: ${error}`);
      await this.stopRecording(recordingId, 'failed');
      return { success: false, error: 'Write failed' };
    }
  }

  /**
   * Aufnahme beenden
   */
  async stopRecording(
    recordingId: string,
    status: 'completed' | 'failed' = 'completed'
  ): Promise<{ success: boolean; recording?: Recording; error?: string }> {
    const recording = this.activeRecordings.get(recordingId);

    if (!recording) {
      return { success: false, error: 'Recording not found' };
    }

    recording.status = status;
    recording.endedAt = new Date();
    recording.duration = (recording.endedAt.getTime() - recording.startedAt.getTime()) / 1000;

    this.stats.activeRecordings--;

    if (status === 'completed' && existsSync(recording.path)) {
      // Checksum berechnen
      recording.checksum = await this.calculateChecksum(recording.path);
      
      // Finale Größe
      const stats = statSync(recording.path);
      recording.size = stats.size;
      this.stats.totalBytes += recording.size;

      console.log(`[RECORDING] Completed: ${recordingId}, Size: ${(recording.size / 1024 / 1024).toFixed(2)} MB`);
    } else if (status === 'failed') {
      this.stats.failedRecordings++;
      
      // Fehlgeschlagene Datei löschen
      if (existsSync(recording.path)) {
        unlinkSync(recording.path);
      }

      console.log(`[RECORDING] Failed: ${recordingId}`);
    }

    this.activeRecordings.delete(recordingId);

    return { success: true, recording };
  }

  /**
   * Aufnahme-Datei abrufen
   */
  getRecordingPath(filename: string): string | null {
    const path = join(this.config.storagePath, filename);
    
    // Sicherheitscheck gegen Path Traversal
    if (!path.startsWith(this.config.storagePath)) {
      console.warn(`[RECORDING] Path traversal attempt: ${filename}`);
      return null;
    }

    if (!existsSync(path)) {
      return null;
    }

    return path;
  }

  /**
   * Alle Aufnahmen für ein Meeting auflisten
   */
  listRecordings(meetingId?: string): Recording[] {
    const files = readdirSync(this.config.storagePath);
    const recordings: Recording[] = [];

    for (const filename of files) {
      const path = join(this.config.storagePath, filename);
      const stats = statSync(path);

      // Meeting-ID aus Dateiname extrahieren (format: meetingId_userId_timestamp.ext)
      const parts = filename.split('_');
      const fileMeetingId = parts[0];

      if (meetingId && fileMeetingId !== meetingId) {
        continue;
      }

      recordings.push({
        id: filename,
        meetingId: fileMeetingId,
        userId: parts[1] || 'unknown',
        filename,
        path,
        size: stats.size,
        duration: 0, // Nicht bekannt ohne Parsing
        startedAt: stats.birthtime,
        endedAt: stats.mtime,
        status: 'completed',
        mimeType: this.getMimeTypeForExtension(filename),
      });
    }

    return recordings;
  }

  /**
   * Alte Aufnahmen löschen
   */
  cleanupOldRecordings(): number {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    const files = readdirSync(this.config.storagePath);
    let deleted = 0;

    for (const filename of files) {
      const path = join(this.config.storagePath, filename);
      const stats = statSync(path);

      if (stats.mtimeMs < cutoff) {
        unlinkSync(path);
        deleted++;
        console.log(`[RECORDING] Deleted old recording: ${filename}`);
      }
    }

    return deleted;
  }

  /**
   * Aufnahme löschen
   */
  deleteRecording(filename: string): boolean {
    const path = this.getRecordingPath(filename);
    
    if (!path) {
      return false;
    }

    try {
      unlinkSync(path);
      console.log(`[RECORDING] Deleted: ${filename}`);
      return true;
    } catch (error) {
      console.error(`[RECORDING] Delete failed: ${error}`);
      return false;
    }
  }

  private generateRecordingId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const { createReadStream } = await import('fs');
    const hash = crypto.createHash('sha256');

    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private getExtensionForMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'video/webm': '.webm',
      'video/mp4': '.mp4',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
    };
    return map[mimeType] || '.bin';
  }

  private getMimeTypeForExtension(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf('.'));
    const map: Record<string, string> = {
      '.webm': 'video/webm',
      '.mp4': 'video/mp4',
      '.ogg': 'audio/ogg',
    };
    return map[ext] || 'application/octet-stream';
  }

  getStats() {
    return {
      ...this.stats,
      totalMB: (this.stats.totalBytes / 1024 / 1024).toFixed(2),
    };
  }
}

// Singleton
export const recordingService = new MeetingRecordingService();

// Cleanup täglich
setInterval(() => {
  const deleted = recordingService.cleanupOldRecordings();
  if (deleted > 0) {
    console.log(`[RECORDING] Cleanup: ${deleted} old recordings deleted`);
  }
}, 24 * 60 * 60 * 1000);
