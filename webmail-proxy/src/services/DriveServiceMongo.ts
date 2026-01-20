/**
 * DriveService - MongoDB-basierte Cloud-Speicher-Verwaltung
 * ==========================================================
 * 
 * Ersetzt die SQLite-basierte Version.
 * Speichert Drive-Metadaten in MongoDB, Dateien auf dem Filesystem.
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import mongoDBService, { 
  DriveUser, 
  DriveFolder, 
  DriveFile,
  DriveShare,
  ObjectId 
} from './MongoDBService';

// Pfade
const DATA_DIR = process.env.DRIVE_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
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

// Response Types für API-Kompatibilität
export interface DriveUserResponse {
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

export interface DriveFolderResponse {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  isDeleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface DriveFileResponse {
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
  folder: DriveFolderResponse | null;
  breadcrumbs: BreadcrumbItem[];
  folders: DriveFolderResponse[];
  files: DriveFileResponse[];
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

// Share-Interfaces
export interface CreateShareParams {
  targetEmail: string;
  fileId: string | null;
  folderId: string | null;
  permission: 'view' | 'edit';
  message?: string;
}

export interface DriveShareResponse {
  id: string;
  ownerId: string;
  ownerName?: string;
  targetEmail: string;
  fileId: string | null;
  folderId: string | null;
  fileName?: string;
  folderName?: string;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  acceptedAt: number | null;
  rejectedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface SharedFileResponse extends DriveFileResponse {
  sharedBy: string;
  sharedByName?: string;
  sharePermission: 'view' | 'edit';
  shareId: string;
  isFolder?: boolean;
}

class DriveServiceMongo {
  constructor() {
    // Verzeichnisse erstellen
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILES_DIR)) {
      fs.mkdirSync(FILES_DIR, { recursive: true });
    }
    console.log('[DriveService] MongoDB-basiert initialisiert');
  }

  // ==================== USER MANAGEMENT ====================

  async getOrCreateUser(userId: string): Promise<DriveUserResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const existingUser = await mongoDBService.driveUsers.findOne({ email: normalizedId });

    if (!existingUser) {
      const newUser: DriveUser = {
        email: normalizedId,
        plan: 'free',
        storageUsed: 0,
        storageLimit: STORAGE_LIMITS.free,
        fileCount: 0,
        folderCount: 0,
        subscriptionStart: null,
        subscriptionEnd: null,
        createdAt: now,
        updatedAt: now,
      };

      await mongoDBService.driveUsers.insertOne(newUser);
      return this.mapUserToResponse(newUser);
    }

    return this.mapUserToResponse(existingUser);
  }

  async updateUserPlan(
    userId: string, 
    plan: 'free' | 'plus' | 'pro'
  ): Promise<DriveUserResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();
    const limit = STORAGE_LIMITS[plan];

    await mongoDBService.connect();

    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { $set: { plan, storageLimit: limit, updatedAt: now } }
    );

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

  async createFolder(
    userId: string, 
    name: string, 
    parentId: string | null
  ): Promise<DriveFolderResponse> {
    const normalizedId = userId.toLowerCase().trim();
    await this.getOrCreateUser(userId);

    const id = uuidv4();
    const now = new Date();

    await mongoDBService.connect();

    // Parent-Folder prüfen
    if (parentId) {
      const parent = await mongoDBService.driveFolders.findOne({
        _id: new ObjectId(parentId),
        userId: normalizedId,
        isDeleted: false,
      });
      if (!parent) {
        throw new Error('Parent folder not found');
      }
    }

    const newFolder: DriveFolder = {
      userId: normalizedId,
      name,
      parentId,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await mongoDBService.driveFolders.insertOne(newFolder);

    // User folder_count erhöhen
    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { $inc: { folderCount: 1 }, $set: { updatedAt: now } }
    );

    return this.mapFolderToResponse({
      ...newFolder,
      _id: result.insertedId,
    });
  }

  async getFolder(userId: string, folderId: string): Promise<DriveFolderResponse | null> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const folder = await mongoDBService.driveFolders.findOne({
      _id: new ObjectId(folderId),
      userId: normalizedId,
      isDeleted: false,
    });

    return folder ? this.mapFolderToResponse(folder) : null;
  }

  async getFolderContents(
    userId: string, 
    folderId: string | null
  ): Promise<FolderContents> {
    const normalizedId = userId.toLowerCase().trim();
    await this.getOrCreateUser(userId);

    await mongoDBService.connect();

    let folder: DriveFolderResponse | null = null;
    let breadcrumbs: BreadcrumbItem[] = [{ id: null, name: 'Meine Ablage' }];

    if (folderId) {
      folder = await this.getFolder(userId, folderId);
      if (!folder) {
        throw new Error('Folder not found');
      }
      breadcrumbs = await this.getBreadcrumbs(userId, folderId);
    }

    // Unterordner laden
    const folderQuery: Record<string, unknown> = {
      userId: normalizedId,
      isDeleted: false,
    };
    if (folderId) {
      folderQuery.parentId = folderId;
    } else {
      folderQuery.parentId = null;
    }

    const folders = await mongoDBService.driveFolders
      .find(folderQuery)
      .sort({ name: 1 })
      .toArray();

    // Dateien laden
    const fileQuery: Record<string, unknown> = {
      userId: normalizedId,
      isDeleted: false,
    };
    if (folderId) {
      fileQuery.folderId = folderId;
    } else {
      fileQuery.folderId = null;
    }

    const files = await mongoDBService.driveFiles
      .find(fileQuery)
      .sort({ name: 1 })
      .toArray();

    return {
      folder,
      breadcrumbs,
      folders: folders.map((f: DriveFolder) => this.mapFolderToResponse(f)),
      files: files.map((f: DriveFile) => this.mapFileToResponse(f)),
    };
  }

  async renameFolder(
    userId: string, 
    folderId: string, 
    newName: string
  ): Promise<DriveFolderResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const result = await mongoDBService.driveFolders.updateOne(
      { _id: new ObjectId(folderId), userId: normalizedId, isDeleted: false },
      { $set: { name: newName, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Folder not found');
    }

    return (await this.getFolder(userId, folderId))!;
  }

  async moveFolder(
    userId: string, 
    folderId: string, 
    newParentId: string | null
  ): Promise<DriveFolderResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    // Nicht in sich selbst verschieben
    if (newParentId === folderId) {
      throw new Error('Cannot move folder into itself');
    }

    // Neuen Parent prüfen
    if (newParentId) {
      const parent = await this.getFolder(userId, newParentId);
      if (!parent) {
        throw new Error('Target folder not found');
      }
    }

    const result = await mongoDBService.driveFolders.updateOne(
      { _id: new ObjectId(folderId), userId: normalizedId, isDeleted: false },
      { $set: { parentId: newParentId, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Folder not found');
    }

    return (await this.getFolder(userId, folderId))!;
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const folder = await this.getFolder(userId, folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    // Soft delete
    await mongoDBService.driveFolders.updateOne(
      { _id: new ObjectId(folderId) },
      { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
    );

    // Rekursiv Inhalte löschen
    await this.deleteFolderContentsRecursive(userId, folderId, now);

    // User folder_count verringern
    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { $inc: { folderCount: -1 }, $set: { updatedAt: now } }
    );
  }

  private async deleteFolderContentsRecursive(
    userId: string, 
    folderId: string, 
    now: Date
  ): Promise<void> {
    const normalizedId = userId.toLowerCase().trim();

    // Unterordner soft-delete
    const subfolders = await mongoDBService.driveFolders
      .find({ parentId: folderId, userId: normalizedId, isDeleted: false })
      .toArray();

    for (const subfolder of subfolders) {
      await mongoDBService.driveFolders.updateOne(
        { _id: subfolder._id },
        { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
      );
      await this.deleteFolderContentsRecursive(
        userId, 
        subfolder._id!.toString(), 
        now
      );
    }

    // Dateien soft-delete
    await mongoDBService.driveFiles.updateMany(
      { folderId, userId: normalizedId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
    );
  }

  // ==================== FILE MANAGEMENT ====================

  async uploadFile(
    userId: string,
    folderId: string | null,
    fileName: string,
    mimeType: string | null,
    fileBuffer: Buffer
  ): Promise<DriveFileResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const user = await this.getOrCreateUser(userId);
    const fileSize = fileBuffer.length;
    const maxSize = MAX_UPLOAD_SIZE[user.plan as keyof typeof MAX_UPLOAD_SIZE];

    // Größe prüfen
    if (fileSize > maxSize) {
      throw new Error(`File too large. Max: ${this.formatBytes(maxSize)}`);
    }

    // Speicherplatz prüfen
    if (user.storageUsed + fileSize > user.storageLimit) {
      throw new Error('Storage limit exceeded');
    }

    // Ordner prüfen
    if (folderId) {
      const folder = await this.getFolder(userId, folderId);
      if (!folder) {
        throw new Error('Folder not found');
      }
    }

    const id = uuidv4();
    const now = new Date();

    // User-Verzeichnis erstellen
    const userDir = path.join(
      FILES_DIR, 
      normalizedId.replace(/[^a-zA-Z0-9@._-]/g, '_')
    );
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Datei speichern
    const storagePath = path.join(userDir, id);
    fs.writeFileSync(storagePath, fileBuffer);

    await mongoDBService.connect();

    // Metadaten speichern
    const newFile: DriveFile = {
      userId: normalizedId,
      folderId,
      name: fileName,
      mimeType,
      size: fileSize,
      storagePath,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await mongoDBService.driveFiles.insertOne(newFile);

    // User Stats aktualisieren
    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { 
        $inc: { storageUsed: fileSize, fileCount: 1 }, 
        $set: { updatedAt: now } 
      }
    );

    return this.mapFileToResponse({
      ...newFile,
      _id: result.insertedId,
    });
  }

  async getFile(userId: string, fileId: string): Promise<DriveFileResponse | null> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const file = await mongoDBService.driveFiles.findOne({
      _id: new ObjectId(fileId),
      userId: normalizedId,
      isDeleted: false,
    });

    return file ? this.mapFileToResponse(file) : null;
  }

  async getFileBuffer(
    userId: string, 
    fileId: string
  ): Promise<{ file: DriveFileResponse; buffer: Buffer } | null> {
    const file = await this.getFile(userId, fileId);
    if (!file) return null;

    const buffer = fs.readFileSync(file.storagePath);
    return { file, buffer };
  }

  async renameFile(
    userId: string, 
    fileId: string, 
    newName: string
  ): Promise<DriveFileResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const result = await mongoDBService.driveFiles.updateOne(
      { _id: new ObjectId(fileId), userId: normalizedId, isDeleted: false },
      { $set: { name: newName, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      throw new Error('File not found');
    }

    return (await this.getFile(userId, fileId))!;
  }

  async moveFile(
    userId: string, 
    fileId: string, 
    newFolderId: string | null
  ): Promise<DriveFileResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    // Zielordner prüfen
    if (newFolderId) {
      const folder = await this.getFolder(userId, newFolderId);
      if (!folder) {
        throw new Error('Target folder not found');
      }
    }

    const result = await mongoDBService.driveFiles.updateOne(
      { _id: new ObjectId(fileId), userId: normalizedId, isDeleted: false },
      { $set: { folderId: newFolderId, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      throw new Error('File not found');
    }

    return (await this.getFile(userId, fileId))!;
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const file = await this.getFile(userId, fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Soft delete
    await mongoDBService.driveFiles.updateOne(
      { _id: new ObjectId(fileId) },
      { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
    );

    // User file_count verringern
    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { $inc: { fileCount: -1 }, $set: { updatedAt: now } }
    );
  }

  // ==================== TRASH MANAGEMENT ====================

  async getTrash(userId: string): Promise<{ 
    folders: DriveFolderResponse[]; 
    files: DriveFileResponse[] 
  }> {
    const normalizedId = userId.toLowerCase().trim();
    await this.getOrCreateUser(userId);

    await mongoDBService.connect();

    const folders = await mongoDBService.driveFolders
      .find({ userId: normalizedId, isDeleted: true })
      .sort({ deletedAt: -1 })
      .toArray();

    const files = await mongoDBService.driveFiles
      .find({ userId: normalizedId, isDeleted: true })
      .sort({ deletedAt: -1 })
      .toArray();

    return {
      folders: folders.map((f: DriveFolder) => this.mapFolderToResponse(f)),
      files: files.map((f: DriveFile) => this.mapFileToResponse(f)),
    };
  }

  async restoreFile(userId: string, fileId: string): Promise<DriveFileResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const result = await mongoDBService.driveFiles.updateOne(
      { _id: new ObjectId(fileId), userId: normalizedId, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      throw new Error('File not found in trash');
    }

    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { $inc: { fileCount: 1 }, $set: { updatedAt: now } }
    );

    return (await this.getFile(userId, fileId))!;
  }

  async restoreFolder(userId: string, folderId: string): Promise<DriveFolderResponse> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const result = await mongoDBService.driveFolders.updateOne(
      { _id: new ObjectId(folderId), userId: normalizedId, isDeleted: true },
      { $set: { isDeleted: false, deletedAt: null, updatedAt: now } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Folder not found in trash');
    }

    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { $inc: { folderCount: 1 }, $set: { updatedAt: now } }
    );

    return (await this.getFolder(userId, folderId))!;
  }

  async permanentDeleteFile(userId: string, fileId: string): Promise<void> {
    const normalizedId = userId.toLowerCase().trim();
    const now = new Date();

    await mongoDBService.connect();

    const file = await mongoDBService.driveFiles.findOne({
      _id: new ObjectId(fileId),
      userId: normalizedId,
      isDeleted: true,
    });

    if (!file) {
      throw new Error('File not found in trash');
    }

    // Datei vom Filesystem löschen
    if (fs.existsSync(file.storagePath)) {
      fs.unlinkSync(file.storagePath);
    }

    // Aus Datenbank löschen
    await mongoDBService.driveFiles.deleteOne({ _id: new ObjectId(fileId) });

    // Speicher freigeben
    await mongoDBService.driveUsers.updateOne(
      { email: normalizedId },
      { $inc: { storageUsed: -file.size }, $set: { updatedAt: now } }
    );
  }

  async permanentDeleteFolder(userId: string, folderId: string): Promise<void> {
    const normalizedId = userId.toLowerCase().trim();

    await mongoDBService.connect();

    const folder = await mongoDBService.driveFolders.findOne({
      _id: new ObjectId(folderId),
      userId: normalizedId,
      isDeleted: true,
    });

    if (!folder) {
      throw new Error('Folder not found in trash');
    }

    // Alle Dateien im Ordner permanent löschen
    const files = await mongoDBService.driveFiles
      .find({ folderId, userId: normalizedId })
      .toArray();

    for (const file of files) {
      await this.permanentDeleteFile(userId, file._id!.toString());
    }

    // Ordner löschen
    await mongoDBService.driveFolders.deleteOne({ _id: new ObjectId(folderId) });
  }

  // ==================== ADMIN FUNCTIONS ====================

  async getAllUsers(
    limit: number = 50, 
    offset: number = 0
  ): Promise<{ users: DriveUserResponse[]; total: number }> {
    await mongoDBService.connect();

    const [users, total] = await Promise.all([
      mongoDBService.driveUsers
        .find({})
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      mongoDBService.driveUsers.countDocuments({})
    ]);

    return {
      users: users.map((u: DriveUser) => this.mapUserToResponse(u)),
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
    await mongoDBService.connect();

    const [
      totalUsers,
      totalFiles,
      totalFolders,
      storageAgg,
      freeCount,
      plusCount,
      proCount,
    ] = await Promise.all([
      mongoDBService.driveUsers.countDocuments({}),
      mongoDBService.driveFiles.countDocuments({ isDeleted: false }),
      mongoDBService.driveFolders.countDocuments({ isDeleted: false }),
      mongoDBService.driveUsers.aggregate([
        { $group: { _id: null, total: { $sum: '$storageUsed' } } }
      ]).toArray(),
      mongoDBService.driveUsers.countDocuments({ plan: 'free' }),
      mongoDBService.driveUsers.countDocuments({ plan: 'plus' }),
      mongoDBService.driveUsers.countDocuments({ plan: 'pro' }),
    ]);

    return {
      totalUsers,
      totalFiles,
      totalFolders,
      totalStorageUsed: storageAgg[0]?.total || 0,
      planDistribution: { free: freeCount, plus: plusCount, pro: proCount },
    };
  }

  async cleanupOldTrash(daysOld: number = 30): Promise<{ 
    deletedFiles: number; 
    deletedFolders: number; 
    freedSpace: number 
  }> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    await mongoDBService.connect();

    // Alte Dateien finden
    const oldFiles = await mongoDBService.driveFiles
      .find({ isDeleted: true, deletedAt: { $lt: cutoff } })
      .toArray();

    let freedSpace = 0;

    for (const file of oldFiles) {
      // Datei vom Filesystem löschen
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
      }
      freedSpace += file.size;

      // User storage aktualisieren
      await mongoDBService.driveUsers.updateOne(
        { email: file.userId },
        { $inc: { storageUsed: -file.size } }
      );
    }

    // Alte Dateien aus DB löschen
    const filesResult = await mongoDBService.driveFiles.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    // Alte Ordner löschen
    const foldersResult = await mongoDBService.driveFolders.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoff },
    });

    return {
      deletedFiles: filesResult.deletedCount,
      deletedFolders: foldersResult.deletedCount,
      freedSpace,
    };
  }

  // ==================== HELPER FUNCTIONS ====================

  private async getBreadcrumbs(
    userId: string, 
    folderId: string
  ): Promise<BreadcrumbItem[]> {
    const breadcrumbs: BreadcrumbItem[] = [{ id: null, name: 'Meine Ablage' }];
    const pathItems: BreadcrumbItem[] = [];

    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await this.getFolder(userId, currentId);
      if (!folder) break;
      pathItems.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }

    return [...breadcrumbs, ...pathItems];
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

  private mapUserToResponse(user: DriveUser): DriveUserResponse {
    return {
      id: user.email,
      plan: user.plan,
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      fileCount: user.fileCount,
      folderCount: user.folderCount,
      subscriptionStart: user.subscriptionStart?.getTime() || null,
      subscriptionEnd: user.subscriptionEnd?.getTime() || null,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    };
  }

  private mapFolderToResponse(folder: DriveFolder): DriveFolderResponse {
    return {
      id: folder._id!.toString(),
      userId: folder.userId,
      name: folder.name,
      parentId: folder.parentId,
      isDeleted: folder.isDeleted,
      deletedAt: folder.deletedAt?.getTime() || null,
      createdAt: folder.createdAt.getTime(),
      updatedAt: folder.updatedAt.getTime(),
    };
  }

  private mapFileToResponse(file: DriveFile): DriveFileResponse {
    return {
      id: file._id!.toString(),
      userId: file.userId,
      folderId: file.folderId,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      storagePath: file.storagePath,
      isDeleted: file.isDeleted,
      deletedAt: file.deletedAt?.getTime() || null,
      createdAt: file.createdAt.getTime(),
      updatedAt: file.updatedAt.getTime(),
    };
  }

  private mapShareToResponse(share: DriveShare): DriveShareResponse {
    return {
      id: share._id!.toString(),
      ownerId: share.ownerId,
      targetEmail: share.targetEmail,
      fileId: share.fileId,
      folderId: share.folderId,
      permission: share.permission,
      status: share.status,
      message: share.message,
      acceptedAt: share.acceptedAt?.getTime() || null,
      rejectedAt: share.rejectedAt?.getTime() || null,
      createdAt: share.createdAt.getTime(),
      updatedAt: share.updatedAt.getTime(),
    };
  }

  // ============================================
  // SHARE METHODS - Dateifreigaben
  // ============================================

  /**
   * Erstellt eine neue Freigabe
   */
  async createShare(ownerId: string, params: CreateShareParams): Promise<DriveShareResponse> {
    await mongoDBService.connect();
    const now = new Date();

    // Generiere eindeutigen Token für E-Mail-Bestätigung
    const token = `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Hole Name des freigegebenen Elements
    let itemName = 'Element';
    let itemType = 'Element';
    
    // Prüfe ob Datei/Ordner existiert und dem User gehört
    if (params.fileId) {
      const file = await mongoDBService.driveFiles.findOne({
        _id: new ObjectId(params.fileId),
        userId: ownerId,
        isDeleted: false,
      });
      if (!file) {
        throw new Error('Datei nicht gefunden oder keine Berechtigung');
      }
      itemName = file.name;
      itemType = 'Datei';
    } else if (params.folderId) {
      const folder = await mongoDBService.driveFolders.findOne({
        _id: new ObjectId(params.folderId),
        userId: ownerId,
        isDeleted: false,
      });
      if (!folder) {
        throw new Error('Ordner nicht gefunden oder keine Berechtigung');
      }
      itemName = folder.name;
      itemType = 'Ordner';
    } else {
      throw new Error('Entweder fileId oder folderId muss angegeben werden');
    }

    // Prüfe ob bereits eine Freigabe existiert
    const existingShare = await mongoDBService.driveShares.findOne({
      ownerId,
      targetEmail: params.targetEmail.toLowerCase(),
      fileId: params.fileId || null,
      folderId: params.folderId || null,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingShare) {
      throw new Error('Diese Freigabe existiert bereits');
    }

    const share: DriveShare = {
      ownerId,
      targetEmail: params.targetEmail.toLowerCase(),
      fileId: params.fileId || null,
      folderId: params.folderId || null,
      permission: params.permission,
      status: 'pending',
      token,
      message: params.message,
      acceptedAt: null,
      rejectedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await mongoDBService.driveShares.insertOne(share);
    share._id = result.insertedId;

    // Sende E-Mail-Benachrichtigung
    try {
      await this.sendShareNotificationEmail({
        targetEmail: params.targetEmail.toLowerCase(),
        ownerEmail: ownerId,
        itemName,
        itemType,
        permission: params.permission,
        message: params.message,
        token,
      });
    } catch (emailError) {
      // E-Mail-Fehler nicht als kritisch behandeln
      // Die Freigabe wurde erstellt, User kann sie im Dashboard sehen
    }

    return this.mapShareToResponse(share);
  }

  /**
   * Sendet E-Mail-Benachrichtigung über neue Freigabe
   */
  private async sendShareNotificationEmail(params: {
    targetEmail: string;
    ownerEmail: string;
    itemName: string;
    itemType: string;
    permission: 'view' | 'edit';
    message?: string;
    token: string;
  }): Promise<void> {
    const confirmUrl = `https://taskilo.de/webmail/drive/share-confirm?token=${params.token}`;
    const permissionText = params.permission === 'edit' ? 'Bearbeiten' : 'Anzeigen';
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freigabe-Anfrage - Taskilo Drive</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="https://taskilo.de/images/taskilo-logo-transparent.png" alt="Taskilo" style="height: 40px;" />
    </div>
    
    <h1 style="color: #14ad9f; font-size: 24px; margin-bottom: 16px; text-align: center;">
      Neue Freigabe-Anfrage
    </h1>
    
    <p style="font-size: 16px; margin-bottom: 24px;">
      <strong>${params.ownerEmail}</strong> möchte ${params.itemType === 'Ordner' ? 'einen Ordner' : 'eine Datei'} mit Ihnen teilen:
    </p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">
        ${params.itemType}: ${params.itemName}
      </p>
      <p style="margin: 8px 0 0; color: #15803d;">
        Berechtigung: ${permissionText}
      </p>
    </div>
    
    ${params.message ? `
    <div style="background-color: #f9fafb; border-left: 4px solid #14ad9f; padding: 12px 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-style: italic; color: #6b7280;">
        "${params.message}"
      </p>
    </div>
    ` : ''}
    
    <p style="font-size: 15px; color: #6b7280; margin-bottom: 24px;">
      Um auf ${params.itemType === 'Ordner' ? 'den Ordner' : 'die Datei'} zugreifen zu können, bestätigen Sie bitte die Freigabe:
    </p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${confirmUrl}" style="display: inline-block; background-color: #14ad9f; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Freigabe bestätigen
      </a>
    </div>
    
    <p style="font-size: 13px; color: #9ca3af; text-align: center;">
      Falls Sie diese Anfrage nicht erwartet haben oder die Freigabe ablehnen möchten,<br>
      können Sie dies auf der Bestätigungsseite tun.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      Diese E-Mail wurde automatisch von Taskilo Drive versendet.<br>
      <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
    </p>
  </div>
</body>
</html>`;

    const textContent = `
Neue Freigabe-Anfrage - Taskilo Drive

${params.ownerEmail} möchte ${params.itemType === 'Ordner' ? 'einen Ordner' : 'eine Datei'} mit Ihnen teilen:

${params.itemType}: ${params.itemName}
Berechtigung: ${permissionText}

${params.message ? `Nachricht: "${params.message}"` : ''}

Um auf ${params.itemType === 'Ordner' ? 'den Ordner' : 'die Datei'} zugreifen zu können, bestätigen Sie bitte die Freigabe:

${confirmUrl}

Falls Sie diese Anfrage nicht erwartet haben, können Sie sie auf der Bestätigungsseite ablehnen.

---
Diese E-Mail wurde automatisch von Taskilo Drive versendet.
taskilo.de
`;

    // Sende E-Mail über lokalen Postfix (vertrauenswürdiges Netzwerk, keine Auth nötig)
    // Die E-Mail wird vom Account des Eigentümers gesendet
    try {
      const transport = nodemailer.createTransport({
        host: '172.22.1.253', // Mailcow Postfix Container im Docker-Netzwerk
        port: 25,
        secure: false,
        tls: {
          rejectUnauthorized: false,
        },
      });

      await transport.sendMail({
        from: `"${params.ownerEmail.split('@')[0]}" <${params.ownerEmail}>`,
        to: params.targetEmail,
        subject: `Freigabe-Anfrage: ${params.itemName}`,
        text: textContent,
        html: htmlContent,
      });
    } catch (emailError) {
      // Log error but don't fail the share creation
      console.error('Failed to send share notification email:', emailError);
    }
  }

  /**
   * Holt ausstehende Freigabe-Anfragen für einen User
   */
  async getPendingShares(userEmail: string): Promise<DriveShareResponse[]> {
    await mongoDBService.connect();

    const shares = await mongoDBService.driveShares
      .find({
        targetEmail: userEmail.toLowerCase(),
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .toArray();

    return shares.map((s: DriveShare) => this.mapShareToResponse(s));
  }

  /**
   * Holt alle für den User freigegebenen Dateien/Ordner (akzeptierte Freigaben)
   */
  async getSharedWithMe(userEmail: string): Promise<SharedFileResponse[]> {
    await mongoDBService.connect();

    // Hole alle akzeptierten Freigaben
    const shares = await mongoDBService.driveShares
      .find({
        targetEmail: userEmail.toLowerCase(),
        status: 'accepted',
      })
      .sort({ acceptedAt: -1 })
      .toArray();

    const results: SharedFileResponse[] = [];

    for (const share of shares) {
      if (share.fileId) {
        // Es ist eine Datei-Freigabe
        const file = await mongoDBService.driveFiles.findOne({
          _id: new ObjectId(share.fileId),
          isDeleted: false,
        });

        if (file) {
          const baseResponse = this.mapFileToResponse(file);
          results.push({
            ...baseResponse,
            sharedBy: share.ownerId,
            sharePermission: share.permission,
            shareId: share._id!.toString(),
            isFolder: false,
          });
        }
      } else if (share.folderId) {
        // Es ist eine Ordner-Freigabe
        const folder = await mongoDBService.driveFolders.findOne({
          _id: new ObjectId(share.folderId),
          isDeleted: false,
        });

        if (folder) {
          const folderResponse = this.mapFolderToResponse(folder);
          results.push({
            id: folderResponse.id,
            userId: folderResponse.userId,
            folderId: null,
            name: folderResponse.name,
            mimeType: 'folder',
            size: 0,
            storagePath: '',
            isDeleted: folderResponse.isDeleted,
            deletedAt: folderResponse.deletedAt,
            createdAt: folderResponse.createdAt,
            updatedAt: folderResponse.updatedAt,
            sharedBy: share.ownerId,
            sharePermission: share.permission,
            shareId: share._id!.toString(),
            isFolder: true,
          });
        }
      }
    }

    return results;
  }

  /**
   * Holt alle Freigaben die der User erstellt hat
   */
  async getMyShares(ownerId: string): Promise<DriveShareResponse[]> {
    await mongoDBService.connect();

    const shares = await mongoDBService.driveShares
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .toArray();

    return shares.map((s: DriveShare) => this.mapShareToResponse(s));
  }

  /**
   * Akzeptiert eine Freigabe-Anfrage
   */
  async acceptShare(userEmail: string, shareId: string): Promise<DriveShareResponse> {
    await mongoDBService.connect();

    const share = await mongoDBService.driveShares.findOne({
      _id: new ObjectId(shareId),
      targetEmail: userEmail.toLowerCase(),
      status: 'pending',
    });

    if (!share) {
      throw new Error('Freigabe nicht gefunden oder bereits verarbeitet');
    }

    const now = new Date();
    await mongoDBService.driveShares.updateOne(
      { _id: new ObjectId(shareId) },
      {
        $set: {
          status: 'accepted',
          acceptedAt: now,
          updatedAt: now,
        },
      }
    );

    share.status = 'accepted';
    share.acceptedAt = now;
    share.updatedAt = now;

    return this.mapShareToResponse(share);
  }

  /**
   * Lehnt eine Freigabe-Anfrage ab
   */
  async rejectShare(userEmail: string, shareId: string): Promise<DriveShareResponse> {
    await mongoDBService.connect();

    const share = await mongoDBService.driveShares.findOne({
      _id: new ObjectId(shareId),
      targetEmail: userEmail.toLowerCase(),
      status: 'pending',
    });

    if (!share) {
      throw new Error('Freigabe nicht gefunden oder bereits verarbeitet');
    }

    const now = new Date();
    await mongoDBService.driveShares.updateOne(
      { _id: new ObjectId(shareId) },
      {
        $set: {
          status: 'rejected',
          rejectedAt: now,
          updatedAt: now,
        },
      }
    );

    share.status = 'rejected';
    share.rejectedAt = now;
    share.updatedAt = now;

    return this.mapShareToResponse(share);
  }

  /**
   * Akzeptiert eine Freigabe über Token (aus E-Mail-Link)
   */
  async acceptShareByToken(token: string): Promise<DriveShareResponse> {
    await mongoDBService.connect();

    const share = await mongoDBService.driveShares.findOne({
      token,
      status: 'pending',
    });

    if (!share) {
      throw new Error('Freigabe nicht gefunden oder bereits verarbeitet');
    }

    const now = new Date();
    await mongoDBService.driveShares.updateOne(
      { _id: share._id },
      {
        $set: {
          status: 'accepted',
          acceptedAt: now,
          updatedAt: now,
        },
      }
    );

    share.status = 'accepted';
    share.acceptedAt = now;
    share.updatedAt = now;

    return this.mapShareToResponse(share);
  }

  /**
   * Lehnt eine Freigabe über Token ab (aus E-Mail-Link)
   */
  async rejectShareByToken(token: string): Promise<DriveShareResponse> {
    await mongoDBService.connect();

    const share = await mongoDBService.driveShares.findOne({
      token,
      status: 'pending',
    });

    if (!share) {
      throw new Error('Freigabe nicht gefunden oder bereits verarbeitet');
    }

    const now = new Date();
    await mongoDBService.driveShares.updateOne(
      { _id: share._id },
      {
        $set: {
          status: 'rejected',
          rejectedAt: now,
          updatedAt: now,
        },
      }
    );

    share.status = 'rejected';
    share.rejectedAt = now;
    share.updatedAt = now;

    return this.mapShareToResponse(share);
  }

  /**
   * Löscht eine Freigabe (nur Owner kann löschen)
   */
  async deleteShare(ownerId: string, shareId: string): Promise<void> {
    await mongoDBService.connect();

    const result = await mongoDBService.driveShares.deleteOne({
      _id: new ObjectId(shareId),
      ownerId,
    });

    if (result.deletedCount === 0) {
      throw new Error('Freigabe nicht gefunden oder keine Berechtigung');
    }
  }

  /**
   * Holt Freigabe-Informationen über Token (für Bestätigungsseite)
   */
  async getShareByToken(token: string): Promise<{ share: DriveShareResponse; itemName: string; ownerEmail: string } | null> {
    await mongoDBService.connect();

    const share = await mongoDBService.driveShares.findOne({ token });

    if (!share) {
      return null;
    }

    // Hole den Namen des freigegebenen Elements
    let itemName = 'Unbekannt';
    if (share.fileId) {
      const file = await mongoDBService.driveFiles.findOne({ _id: new ObjectId(share.fileId) });
      if (file) itemName = file.name;
    } else if (share.folderId) {
      const folder = await mongoDBService.driveFolders.findOne({ _id: new ObjectId(share.folderId) });
      if (folder) itemName = folder.name;
    }

    // Hole Owner-E-Mail aus der Drive-User-Collection
    const owner = await mongoDBService.driveUsers.findOne({ email: share.ownerId });
    const ownerEmail = owner?.email || share.ownerId;

    return {
      share: this.mapShareToResponse(share),
      itemName,
      ownerEmail,
    };
  }
}

// Singleton Export
export const driveServiceMongo = new DriveServiceMongo();
export default driveServiceMongo;
