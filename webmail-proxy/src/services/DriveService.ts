// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Pfade
const DATA_DIR = process.env.DRIVE_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
const DB_PATH = path.join(DATA_DIR, 'drive.db');
const FILES_DIR = path.join(DATA_DIR, 'drive-files');

// Storage Limits in Bytes
const STORAGE_LIMITS = {
  free: 15 * 1024 * 1024 * 1024,  // 15 GB
  plus: 50 * 1024 * 1024 * 1024,  // 50 GB
  pro: 100 * 1024 * 1024 * 1024,  // 100 GB
};

const MAX_UPLOAD_SIZE = {
  free: 100 * 1024 * 1024,   // 100 MB
  plus: 500 * 1024 * 1024,   // 500 MB
  pro: 500 * 1024 * 1024,    // 500 MB
};

// Interfaces
export interface DriveUser {
  id: string;
  plan: 'free' | 'plus' | 'pro';
  storageUsed: number;
  storageLimit: number;
  fileCount: number;
  folderCount: number;
  subscriptionStart: number | null;
  subscriptionEnd: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DriveFolder {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  isDeleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DriveFile {
  id: string;
  userId: string;
  folderId: string | null;
  name: string;
  mimeType: string | null;
  size: number;
  storagePath: string;
  isDeleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface FolderContents {
  folder: DriveFolder | null;
  breadcrumbs: BreadcrumbItem[];
  folders: DriveFolder[];
  files: DriveFile[];
}

export interface StorageInfo {
  plan: string;
  used: number;
  limit: number;
  usedPercent: number;
  fileCount: number;
  folderCount: number;
  formattedUsed: string;
  formattedLimit: string;
  maxUploadSize: number;
}

// Datenbank initialisieren
class DriveService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor() {
    // Verzeichnisse erstellen
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILES_DIR)) {
      fs.mkdirSync(FILES_DIR, { recursive: true });
    }

    // Datenbank oeffnen/erstellen
    this.db = new Database(DB_PATH);
    this.initDatabase();
  }

  private initDatabase(): void {
    // WAL Modus fuer bessere Performance
    this.db.pragma('journal_mode = WAL');

    // Users Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        plan TEXT DEFAULT 'free',
        storage_used INTEGER DEFAULT 0,
        storage_limit INTEGER DEFAULT ${STORAGE_LIMITS.free},
        file_count INTEGER DEFAULT 0,
        folder_count INTEGER DEFAULT 0,
        subscription_start INTEGER,
        subscription_end INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Folders Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_id TEXT,
        is_deleted INTEGER DEFAULT 0,
        deleted_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Files Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id TEXT,
        name TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        deleted_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Indizes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
      CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
    `);
  }

  // ==================== USER MANAGEMENT ====================

  async getOrCreateUser(userId: string): Promise<DriveUser> {
    const now = Date.now();
    
    // User suchen
    let user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DriveUser | undefined;
    
    if (!user) {
      // Neuen User erstellen
      this.db.prepare(`
        INSERT INTO users (id, plan, storage_used, storage_limit, file_count, folder_count, created_at, updated_at)
        VALUES (?, 'free', 0, ?, 0, 0, ?, ?)
      `).run(userId, STORAGE_LIMITS.free, now, now);
      
      user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DriveUser;
    }

    return this.mapUserRow(user);
  }

  async updateUserPlan(userId: string, plan: 'free' | 'plus' | 'pro'): Promise<DriveUser> {
    const now = Date.now();
    const limit = STORAGE_LIMITS[plan];
    
    this.db.prepare(`
      UPDATE users SET plan = ?, storage_limit = ?, updated_at = ? WHERE id = ?
    `).run(plan, limit, now, userId);
    
    return this.getOrCreateUser(userId);
  }

  async getStorageInfo(userId: string): Promise<StorageInfo> {
    const user = await this.getOrCreateUser(userId);
    const usedPercent = (user.storageUsed / user.storageLimit) * 100;
    
    return {
      plan: user.plan,
      used: user.storageUsed,
      limit: user.storageLimit,
      usedPercent: Math.round(usedPercent * 10) / 10,
      fileCount: user.fileCount,
      folderCount: user.folderCount,
      formattedUsed: this.formatBytes(user.storageUsed),
      formattedLimit: this.formatBytes(user.storageLimit),
      maxUploadSize: MAX_UPLOAD_SIZE[user.plan as keyof typeof MAX_UPLOAD_SIZE],
    };
  }

  // ==================== FOLDER MANAGEMENT ====================

  async createFolder(userId: string, name: string, parentId: string | null): Promise<DriveFolder> {
    await this.getOrCreateUser(userId);
    
    const id = uuidv4();
    const now = Date.now();

    // Pruefen ob Parent-Folder existiert (wenn angegeben)
    if (parentId) {
      const parent = this.db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ? AND is_deleted = 0').get(parentId, userId);
      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    this.db.prepare(`
      INSERT INTO folders (id, user_id, name, parent_id, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, userId, name, parentId, now, now);

    // User folder_count erhoehen
    this.db.prepare('UPDATE users SET folder_count = folder_count + 1, updated_at = ? WHERE id = ?').run(now, userId);

    return this.getFolder(userId, id) as Promise<DriveFolder>;
  }

  async getFolder(userId: string, folderId: string): Promise<DriveFolder | null> {
    const row = this.db.prepare(`
      SELECT * FROM folders WHERE id = ? AND user_id = ? AND is_deleted = 0
    `).get(folderId, userId);
    
    return row ? this.mapFolderRow(row) : null;
  }

  async getFolderContents(userId: string, folderId: string | null): Promise<FolderContents> {
    await this.getOrCreateUser(userId);

    let folder: DriveFolder | null = null;
    let breadcrumbs: BreadcrumbItem[] = [{ id: null, name: 'Meine Ablage' }];

    if (folderId) {
      folder = await this.getFolder(userId, folderId);
      if (!folder) {
        throw new Error('Folder not found');
      }
      breadcrumbs = await this.getBreadcrumbs(userId, folderId);
    }

    // Unterordner laden
    const folderRows = this.db.prepare(`
      SELECT * FROM folders 
      WHERE user_id = ? AND parent_id ${folderId ? '= ?' : 'IS NULL'} AND is_deleted = 0
      ORDER BY name ASC
    `).all(folderId ? [userId, folderId] : [userId]);

    // Dateien laden
    const fileRows = this.db.prepare(`
      SELECT * FROM files 
      WHERE user_id = ? AND folder_id ${folderId ? '= ?' : 'IS NULL'} AND is_deleted = 0
      ORDER BY name ASC
    `).all(folderId ? [userId, folderId] : [userId]);

    return {
      folder,
      breadcrumbs,
      folders: folderRows.map((r: unknown) => this.mapFolderRow(r)),
      files: fileRows.map((r: unknown) => this.mapFileRow(r)),
    };
  }

  async renameFolder(userId: string, folderId: string, newName: string): Promise<DriveFolder> {
    const now = Date.now();
    
    const folder = await this.getFolder(userId, folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    this.db.prepare('UPDATE folders SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(newName, now, folderId, userId);

    return this.getFolder(userId, folderId) as Promise<DriveFolder>;
  }

  async moveFolder(userId: string, folderId: string, newParentId: string | null): Promise<DriveFolder> {
    const now = Date.now();
    
    const folder = await this.getFolder(userId, folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Pruefen ob nicht in sich selbst verschoben wird
    if (newParentId === folderId) {
      throw new Error('Cannot move folder into itself');
    }

    // Pruefen ob neuer Parent existiert
    if (newParentId) {
      const parent = await this.getFolder(userId, newParentId);
      if (!parent) {
        throw new Error('Target folder not found');
      }
    }

    this.db.prepare('UPDATE folders SET parent_id = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(newParentId, now, folderId, userId);

    return this.getFolder(userId, folderId) as Promise<DriveFolder>;
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const now = Date.now();
    
    const folder = await this.getFolder(userId, folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Soft delete - Ordner und alle Inhalte
    this.db.prepare('UPDATE folders SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now, now, folderId, userId);
    
    // Rekursiv alle Unterordner und Dateien loeschen
    await this.deleteFolderContentsRecursive(userId, folderId, now);

    // User folder_count verringern
    this.db.prepare('UPDATE users SET folder_count = folder_count - 1, updated_at = ? WHERE id = ?').run(now, userId);
  }

  private async deleteFolderContentsRecursive(userId: string, folderId: string, now: number): Promise<void> {
    // Unterordner soft-delete
    const subfolders = this.db.prepare('SELECT id FROM folders WHERE parent_id = ? AND user_id = ? AND is_deleted = 0').all(folderId, userId);
    for (const subfolder of subfolders as { id: string }[]) {
      this.db.prepare('UPDATE folders SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, subfolder.id);
      await this.deleteFolderContentsRecursive(userId, subfolder.id, now);
    }

    // Dateien soft-delete
    this.db.prepare('UPDATE files SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE folder_id = ? AND user_id = ?')
      .run(now, now, folderId, userId);
  }

  // ==================== FILE MANAGEMENT ====================

  async uploadFile(
    userId: string, 
    folderId: string | null, 
    fileName: string, 
    mimeType: string | null, 
    fileBuffer: Buffer
  ): Promise<DriveFile> {
    const user = await this.getOrCreateUser(userId);
    const fileSize = fileBuffer.length;
    const maxSize = MAX_UPLOAD_SIZE[user.plan as keyof typeof MAX_UPLOAD_SIZE];

    // Groesse pruefen
    if (fileSize > maxSize) {
      throw new Error(`File too large. Max: ${this.formatBytes(maxSize)}`);
    }

    // Speicherplatz pruefen
    if (user.storageUsed + fileSize > user.storageLimit) {
      throw new Error('Storage limit exceeded');
    }

    // Ordner pruefen
    if (folderId) {
      const folder = await this.getFolder(userId, folderId);
      if (!folder) {
        throw new Error('Folder not found');
      }
    }

    const id = uuidv4();
    const now = Date.now();

    // User-Verzeichnis erstellen
    const userDir = path.join(FILES_DIR, userId.replace(/[^a-zA-Z0-9@._-]/g, '_'));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Datei speichern
    const storagePath = path.join(userDir, id);
    fs.writeFileSync(storagePath, fileBuffer);

    // Metadaten speichern
    this.db.prepare(`
      INSERT INTO files (id, user_id, folder_id, name, mime_type, size, storage_path, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, userId, folderId, fileName, mimeType, fileSize, storagePath, now, now);

    // User Stats aktualisieren
    this.db.prepare(`
      UPDATE users SET storage_used = storage_used + ?, file_count = file_count + 1, updated_at = ? WHERE id = ?
    `).run(fileSize, now, userId);

    return this.getFile(userId, id) as Promise<DriveFile>;
  }

  async getFile(userId: string, fileId: string): Promise<DriveFile | null> {
    const row = this.db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_deleted = 0').get(fileId, userId);
    return row ? this.mapFileRow(row) : null;
  }

  async getFileBuffer(userId: string, fileId: string): Promise<{ file: DriveFile; buffer: Buffer } | null> {
    const file = await this.getFile(userId, fileId);
    if (!file) return null;

    const buffer = fs.readFileSync(file.storagePath);
    return { file, buffer };
  }

  async renameFile(userId: string, fileId: string, newName: string): Promise<DriveFile> {
    const now = Date.now();
    
    const file = await this.getFile(userId, fileId);
    if (!file) {
      throw new Error('File not found');
    }

    this.db.prepare('UPDATE files SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(newName, now, fileId, userId);

    return this.getFile(userId, fileId) as Promise<DriveFile>;
  }

  async moveFile(userId: string, fileId: string, newFolderId: string | null): Promise<DriveFile> {
    const now = Date.now();
    
    const file = await this.getFile(userId, fileId);
    if (!file) {
      throw new Error('File not found');
    }

    if (newFolderId) {
      const folder = await this.getFolder(userId, newFolderId);
      if (!folder) {
        throw new Error('Target folder not found');
      }
    }

    this.db.prepare('UPDATE files SET folder_id = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(newFolderId, now, fileId, userId);

    return this.getFile(userId, fileId) as Promise<DriveFile>;
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const now = Date.now();
    
    const file = await this.getFile(userId, fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Soft delete
    this.db.prepare('UPDATE files SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now, now, fileId, userId);

    // User Stats aktualisieren (Speicher wird bei Soft-Delete nicht freigegeben)
    this.db.prepare('UPDATE users SET file_count = file_count - 1, updated_at = ? WHERE id = ?').run(now, userId);
  }

  // ==================== TRASH MANAGEMENT ====================

  async getTrash(userId: string): Promise<{ folders: DriveFolder[]; files: DriveFile[] }> {
    await this.getOrCreateUser(userId);

    const folders = this.db.prepare('SELECT * FROM folders WHERE user_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC')
      .all(userId).map((r: unknown) => this.mapFolderRow(r));
    
    const files = this.db.prepare('SELECT * FROM files WHERE user_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC')
      .all(userId).map((r: unknown) => this.mapFileRow(r));

    return { folders, files };
  }

  async restoreFile(userId: string, fileId: string): Promise<DriveFile> {
    const now = Date.now();
    
    const row = this.db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_deleted = 1').get(fileId, userId);
    if (!row) {
      throw new Error('File not found in trash');
    }

    this.db.prepare('UPDATE files SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?')
      .run(now, fileId);
    
    this.db.prepare('UPDATE users SET file_count = file_count + 1, updated_at = ? WHERE id = ?').run(now, userId);

    return this.getFile(userId, fileId) as Promise<DriveFile>;
  }

  async restoreFolder(userId: string, folderId: string): Promise<DriveFolder> {
    const now = Date.now();
    
    const row = this.db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ? AND is_deleted = 1').get(folderId, userId);
    if (!row) {
      throw new Error('Folder not found in trash');
    }

    this.db.prepare('UPDATE folders SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?')
      .run(now, folderId);
    
    this.db.prepare('UPDATE users SET folder_count = folder_count + 1, updated_at = ? WHERE id = ?').run(now, userId);

    return this.getFolder(userId, folderId) as Promise<DriveFolder>;
  }

  async permanentDeleteFile(userId: string, fileId: string): Promise<void> {
    const now = Date.now();
    
    const row = this.db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND is_deleted = 1').get(fileId, userId) as DriveFile | undefined;
    if (!row) {
      throw new Error('File not found in trash');
    }

    const file = this.mapFileRow(row);

    // Datei vom Filesystem loeschen
    if (fs.existsSync(file.storagePath)) {
      fs.unlinkSync(file.storagePath);
    }

    // Aus Datenbank loeschen
    this.db.prepare('DELETE FROM files WHERE id = ?').run(fileId);

    // Speicher freigeben
    this.db.prepare('UPDATE users SET storage_used = storage_used - ?, updated_at = ? WHERE id = ?')
      .run(file.size, now, userId);
  }

  async permanentDeleteFolder(userId: string, folderId: string): Promise<void> {
    const row = this.db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ? AND is_deleted = 1').get(folderId, userId);
    if (!row) {
      throw new Error('Folder not found in trash');
    }

    // Alle Dateien im Ordner permanent loeschen
    const files = this.db.prepare('SELECT id FROM files WHERE folder_id = ? AND user_id = ?').all(folderId, userId) as { id: string }[];
    for (const file of files) {
      await this.permanentDeleteFile(userId, file.id);
    }

    // Ordner loeschen
    this.db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
  }

  // ==================== ADMIN FUNCTIONS ====================

  async getAllUsers(limit: number = 50, offset: number = 0): Promise<{ users: DriveUser[]; total: number }> {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    
    return {
      users: rows.map((r: unknown) => this.mapUserRow(r)),
      total,
    };
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalFiles: number;
    totalFolders: number;
    totalStorageUsed: number;
    planDistribution: { free: number; plus: number; pro: number };
  }> {
    const totalUsers = (this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const totalFiles = (this.db.prepare('SELECT COUNT(*) as count FROM files WHERE is_deleted = 0').get() as { count: number }).count;
    const totalFolders = (this.db.prepare('SELECT COUNT(*) as count FROM folders WHERE is_deleted = 0').get() as { count: number }).count;
    const totalStorageUsed = (this.db.prepare('SELECT SUM(storage_used) as total FROM users').get() as { total: number | null }).total || 0;
    
    const freeCount = (this.db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'free'").get() as { count: number }).count;
    const plusCount = (this.db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'plus'").get() as { count: number }).count;
    const proCount = (this.db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").get() as { count: number }).count;

    return {
      totalUsers,
      totalFiles,
      totalFolders,
      totalStorageUsed,
      planDistribution: { free: freeCount, plus: plusCount, pro: proCount },
    };
  }

  async cleanupOldTrash(daysOld: number = 30): Promise<{ deletedFiles: number; deletedFolders: number; freedSpace: number }> {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    // Alte Dateien finden und loeschen
    const oldFiles = this.db.prepare('SELECT * FROM files WHERE is_deleted = 1 AND deleted_at < ?').all(cutoff) as DriveFile[];
    let freedSpace = 0;
    
    for (const file of oldFiles) {
      const mapped = this.mapFileRow(file);
      if (fs.existsSync(mapped.storagePath)) {
        fs.unlinkSync(mapped.storagePath);
      }
      freedSpace += mapped.size;
      
      // User storage aktualisieren
      this.db.prepare('UPDATE users SET storage_used = storage_used - ? WHERE id = ?').run(mapped.size, mapped.userId);
    }
    
    const deletedFiles = this.db.prepare('DELETE FROM files WHERE is_deleted = 1 AND deleted_at < ?').run(cutoff).changes;
    const deletedFolders = this.db.prepare('DELETE FROM folders WHERE is_deleted = 1 AND deleted_at < ?').run(cutoff).changes;

    return { deletedFiles, deletedFolders, freedSpace };
  }

  // ==================== HELPER FUNCTIONS ====================

  private async getBreadcrumbs(userId: string, folderId: string): Promise<BreadcrumbItem[]> {
    const breadcrumbs: BreadcrumbItem[] = [{ id: null, name: 'Meine Ablage' }];
    
    let currentId: string | null = folderId;
    const path: BreadcrumbItem[] = [];
    
    while (currentId) {
      const folder = await this.getFolder(userId, currentId);
      if (!folder) break;
      path.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }
    
    return [...breadcrumbs, ...path];
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapUserRow(row: any): DriveUser {
    return {
      id: row.id,
      plan: row.plan,
      storageUsed: row.storage_used,
      storageLimit: row.storage_limit,
      fileCount: row.file_count,
      folderCount: row.folder_count,
      subscriptionStart: row.subscription_start,
      subscriptionEnd: row.subscription_end,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapFolderRow(row: any): DriveFolder {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      parentId: row.parent_id,
      isDeleted: row.is_deleted === 1,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapFileRow(row: any): DriveFile {
    return {
      id: row.id,
      userId: row.user_id,
      folderId: row.folder_id,
      name: row.name,
      mimeType: row.mime_type,
      size: row.size,
      storagePath: row.storage_path,
      isDeleted: row.is_deleted === 1,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton Export
export const driveService = new DriveService();
