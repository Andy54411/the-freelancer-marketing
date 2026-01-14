/**
 * Taskilo Photos Storage Service
 * 
 * Separater Service für Speicheranalyse und -verwaltung.
 * Ermöglicht detaillierte Einblicke in die Speichernutzung.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
import * as path from 'path';

const DATA_DIR = process.env.PHOTOS_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
const DB_PATH = path.join(DATA_DIR, 'photos.db');

// Storage Limits in Bytes
const PHOTO_STORAGE_LIMITS = {
  free: 5 * 1024 * 1024 * 1024,   // 5 GB
  plus: 25 * 1024 * 1024 * 1024,  // 25 GB
  pro: 50 * 1024 * 1024 * 1024,   // 50 GB
};

// Upgrade-Preise in Euro
export const STORAGE_PLANS = {
  free: { storage: 5 * 1024 * 1024 * 1024, price: 0, name: 'Kostenlos' },
  plus: { storage: 25 * 1024 * 1024 * 1024, price: 2.99, name: 'Plus' },
  pro: { storage: 50 * 1024 * 1024 * 1024, price: 4.99, name: 'Pro' },
  business: { storage: 200 * 1024 * 1024 * 1024, price: 9.99, name: 'Business' },
};

// Interfaces
export interface StorageCategory {
  key: string;
  name: string;
  size: number;
  count: number;
  icon: string;
}

export interface LargeFile {
  id: string;
  filename: string;
  size: number;
  thumbnailPath: string | null;
  takenAt: number | null;
}

export interface BlurryPhoto {
  id: string;
  filename: string;
  size: number;
  thumbnailPath: string | null;
}

export interface StorageAnalysis {
  totalUsed: number;
  totalLimit: number;
  photoCount: number;
  plan: string;
  categories: StorageCategory[];
  largeFiles: LargeFile[];
  blurryPhotos: BlurryPhoto[];
  screenshots: LargeFile[];
  unsupportedVideos: Array<{ id: string; filename: string; size: number }>;
  estimatedYearsRemaining: number;
  uploadRatePerMonth: number;
  formattedUsed: string;
  formattedLimit: string;
  usedPercent: number;
}

export interface StoragePlan {
  id: string;
  name: string;
  storage: number;
  formattedStorage: string;
  price: number;
  isCurrent: boolean;
}

class PhotosStorageService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  /**
   * Detaillierte Speicheranalyse für die Speicherverwaltung
   */
  async getStorageAnalysis(userId: string): Promise<StorageAnalysis> {
    // Basis-Speicherinfo
    const userInfo = this.db.prepare('SELECT * FROM photo_users WHERE id = ?').get(userId) as {
      storage_used: number;
      storage_limit: number;
      photo_count: number;
      created_at: number;
      plan: string;
    } | undefined;
    
    const totalUsed = userInfo?.storage_used || 0;
    const totalLimit = userInfo?.storage_limit || PHOTO_STORAGE_LIMITS.free;
    const photoCount = userInfo?.photo_count || 0;
    const plan = userInfo?.plan || 'free';
    
    // Speicher nach Kategorien
    const categoryStats = this.db.prepare(`
      SELECT 
        COALESCE(primary_category, 'other') as category,
        COALESCE(primary_category_display, 'Sonstige') as display,
        SUM(size) as total_size,
        COUNT(*) as count
      FROM photos 
      WHERE user_id = ? AND is_deleted = 0
      GROUP BY category
      ORDER BY total_size DESC
    `).all(userId) as Array<{
      category: string;
      display: string;
      total_size: number;
      count: number;
    }>;
    
    const categoryIcons: Record<string, string> = {
      screenshot: 'monitor',
      food: 'utensils',
      essen: 'utensils',
      landscape: 'mountain',
      landschaft: 'mountain',
      people: 'users',
      personen: 'users',
      document: 'file-text',
      dokument: 'file-text',
      animal: 'paw-print',
      tier: 'paw-print',
      vehicle: 'car',
      fahrzeug: 'car',
      building: 'building',
      gebäude: 'building',
      other: 'image',
      sonstige: 'image',
    };
    
    const categories = categoryStats.map(cat => ({
      key: cat.category,
      name: cat.display,
      size: cat.total_size,
      count: cat.count,
      icon: categoryIcons[cat.category.toLowerCase()] || 'image',
    }));
    
    // Große Dateien (> 5MB)
    const largeFiles = this.db.prepare(`
      SELECT id, original_filename as filename, size, thumbnail_path as thumbnailPath, taken_at as takenAt
      FROM photos 
      WHERE user_id = ? AND is_deleted = 0 AND size > 5242880
      ORDER BY size DESC
      LIMIT 50
    `).all(userId) as LargeFile[];
    
    // Screenshots separat
    const screenshots = this.db.prepare(`
      SELECT id, original_filename as filename, size, thumbnail_path as thumbnailPath, taken_at as takenAt
      FROM photos 
      WHERE user_id = ? AND is_deleted = 0 AND primary_category = 'screenshot'
      ORDER BY size DESC
      LIMIT 50
    `).all(userId) as LargeFile[];
    
    // Unscharfe/kleine Fotos
    const blurryPhotos = this.db.prepare(`
      SELECT id, original_filename as filename, size, thumbnail_path as thumbnailPath
      FROM photos 
      WHERE user_id = ? AND is_deleted = 0 
      AND (width < 500 OR height < 500 OR (primary_confidence IS NOT NULL AND primary_confidence < 0.3))
      ORDER BY size DESC
      LIMIT 20
    `).all(userId) as BlurryPhoto[];
    
    // Upload-Rate berechnen
    const createdAt = userInfo?.created_at || Date.now();
    const accountAgeMonths = Math.max(1, (Date.now() - createdAt) / (30 * 24 * 60 * 60 * 1000));
    const uploadRatePerMonth = totalUsed / accountAgeMonths;
    
    // Geschätzte verbleibende Jahre
    const remainingSpace = totalLimit - totalUsed;
    const yearsRemaining = uploadRatePerMonth > 0 
      ? (remainingSpace / uploadRatePerMonth) / 12 
      : 99;
    
    return {
      totalUsed,
      totalLimit,
      photoCount,
      plan,
      categories,
      largeFiles,
      blurryPhotos,
      screenshots,
      unsupportedVideos: [],
      estimatedYearsRemaining: Math.min(Math.max(Math.round(yearsRemaining * 10) / 10, 0), 99),
      uploadRatePerMonth,
      formattedUsed: this.formatBytes(totalUsed),
      formattedLimit: this.formatBytes(totalLimit),
      usedPercent: totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0,
    };
  }

  /**
   * Verfügbare Speicherpläne abrufen
   */
  async getAvailablePlans(userId: string): Promise<StoragePlan[]> {
    const userInfo = this.db.prepare('SELECT plan FROM photo_users WHERE id = ?').get(userId) as { plan: string } | undefined;
    const currentPlan = userInfo?.plan || 'free';
    
    return Object.entries(STORAGE_PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      storage: plan.storage,
      formattedStorage: this.formatBytes(plan.storage),
      price: plan.price,
      isCurrent: id === currentPlan,
    }));
  }

  /**
   * Speicher nach Kategorie berechnen
   */
  async getCategoryStorageDetails(userId: string, category: string): Promise<{
    totalSize: number;
    count: number;
    photos: LargeFile[];
  }> {
    const photos = this.db.prepare(`
      SELECT id, original_filename as filename, size, thumbnail_path as thumbnailPath, taken_at as takenAt
      FROM photos 
      WHERE user_id = ? AND is_deleted = 0 AND primary_category = ?
      ORDER BY size DESC
    `).all(userId, category) as LargeFile[];
    
    const totalSize = photos.reduce((sum, p) => sum + p.size, 0);
    
    return {
      totalSize,
      count: photos.length,
      photos,
    };
  }

  /**
   * Mehrere Fotos löschen und Speicherplatz freigeben
   */
  async deletePhotosAndFreeSpace(userId: string, photoIds: string[]): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    let freedSpace = 0;
    let deletedCount = 0;
    
    const now = Date.now();
    
    for (const photoId of photoIds) {
      const photo = this.db.prepare(`
        SELECT size FROM photos WHERE user_id = ? AND id = ? AND is_deleted = 0
      `).get(userId, photoId) as { size: number } | undefined;
      
      if (photo) {
        // Soft delete
        this.db.prepare(`
          UPDATE photos SET is_deleted = 1, deleted_at = ?, updated_at = ?
          WHERE user_id = ? AND id = ?
        `).run(now, now, userId, photoId);
        
        // Speicher aktualisieren
        this.db.prepare(`
          UPDATE photo_users 
          SET storage_used = storage_used - ?, photo_count = photo_count - 1, updated_at = ?
          WHERE id = ?
        `).run(photo.size, now, userId);
        
        freedSpace += photo.size;
        deletedCount++;
      }
    }
    
    return { deletedCount, freedSpace };
  }

  /**
   * Fotos einer Kategorie in den Papierkorb verschieben
   */
  async deleteCategoryPhotos(userId: string, category: string): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    const photos = this.db.prepare(`
      SELECT id, size FROM photos 
      WHERE user_id = ? AND primary_category = ? AND is_deleted = 0
    `).all(userId, category) as Array<{ id: string; size: number }>;
    
    const photoIds = photos.map(p => p.id);
    return this.deletePhotosAndFreeSpace(userId, photoIds);
  }

  /**
   * Papierkorb endgültig leeren (permanentes Löschen)
   */
  async emptyTrash(userId: string): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    const trashedPhotos = this.db.prepare(`
      SELECT id, size, storage_path, thumbnail_path 
      FROM photos 
      WHERE user_id = ? AND is_deleted = 1
    `).all(userId) as Array<{
      id: string;
      size: number;
      storage_path: string;
      thumbnail_path: string | null;
    }>;
    
    let freedSpace = 0;
    let deletedCount = 0;
    
    const fs = await import('fs');
    
    for (const photo of trashedPhotos) {
      try {
        // Dateien löschen
        if (photo.storage_path && fs.existsSync(photo.storage_path)) {
          fs.unlinkSync(photo.storage_path);
        }
        if (photo.thumbnail_path && fs.existsSync(photo.thumbnail_path)) {
          fs.unlinkSync(photo.thumbnail_path);
        }
        
        // DB-Eintrag löschen
        this.db.prepare('DELETE FROM photos WHERE id = ?').run(photo.id);
        
        freedSpace += photo.size;
        deletedCount++;
      } catch {
        // Fehler beim Löschen ignorieren
      }
    }
    
    return { deletedCount, freedSpace };
  }

  /**
   * Plan-Upgrade durchführen
   */
  async upgradePlan(userId: string, newPlan: keyof typeof STORAGE_PLANS): Promise<{
    success: boolean;
    newLimit: number;
    formattedLimit: string;
  }> {
    const plan = STORAGE_PLANS[newPlan];
    if (!plan) {
      return { success: false, newLimit: 0, formattedLimit: '0' };
    }
    
    const now = Date.now();
    
    this.db.prepare(`
      UPDATE photo_users 
      SET plan = ?, storage_limit = ?, updated_at = ?
      WHERE id = ?
    `).run(newPlan, plan.storage, now, userId);
    
    return {
      success: true,
      newLimit: plan.storage,
      formattedLimit: this.formatBytes(plan.storage),
    };
  }
}

// Singleton exportieren
export const photosStorageService = new PhotosStorageService();
