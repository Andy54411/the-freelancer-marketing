/**
 * Taskilo Photos Storage Service - MongoDB Version
 * 
 * Separater Service für Speicheranalyse und -verwaltung.
 * Ermöglicht detaillierte Einblicke in die Speichernutzung.
 * 
 * MIGRATION: Nutzt MongoDB statt SQLite
 */

import * as fs from 'fs';
import { mongoDBService, Photo, PhotoUser } from './MongoDBService';

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

class PhotosStorageServiceMongo {
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
    const userCollection = mongoDBService.getPhotoUsersCollection();
    const photosCollection = mongoDBService.getPhotosCollection();
    
    const user = await userCollection.findOne({ id: userId });
    
    const totalUsed = user?.storageUsed || 0;
    const totalLimit = user?.storageLimit || PHOTO_STORAGE_LIMITS.free;
    const photoCount = user?.photoCount || 0;
    const plan = user?.plan || 'free';
    
    // Speicher nach Kategorien aggregieren
    const categoryStats = await photosCollection.aggregate([
      {
        $match: { userId, isDeleted: false },
      },
      {
        $group: {
          _id: { $ifNull: ['$primaryCategory', 'other'] },
          display: { $first: { $ifNull: ['$primaryCategoryDisplay', 'Sonstige'] } },
          total_size: { $sum: '$size' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total_size: -1 } },
    ]).toArray();
    
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
      key: cat._id as string,
      name: cat.display as string,
      size: cat.total_size as number,
      count: cat.count as number,
      icon: categoryIcons[(cat._id as string).toLowerCase()] || 'image',
    }));
    
    // Große Dateien (> 5MB)
    const largeFilesRaw = await photosCollection
      .find({ userId, isDeleted: false, size: { $gt: 5242880 } })
      .sort({ size: -1 })
      .limit(50)
      .toArray();
    
    const largeFiles: LargeFile[] = largeFilesRaw.map((f: Photo) => ({
      id: f.id,
      filename: f.originalFilename,
      size: f.size,
      thumbnailPath: f.thumbnailPath,
      takenAt: f.takenAt,
    }));
    
    // Screenshots separat
    const screenshotsRaw = await photosCollection
      .find({ userId, isDeleted: false, primaryCategory: 'screenshot' })
      .sort({ size: -1 })
      .limit(50)
      .toArray();
    
    const screenshots: LargeFile[] = screenshotsRaw.map((f: Photo) => ({
      id: f.id,
      filename: f.originalFilename,
      size: f.size,
      thumbnailPath: f.thumbnailPath,
      takenAt: f.takenAt,
    }));
    
    // Unscharfe/kleine Fotos
    const blurryPhotosRaw = await photosCollection
      .find({
        userId,
        isDeleted: false,
        $or: [
          { width: { $lt: 500 } },
          { height: { $lt: 500 } },
          { primaryConfidence: { $lt: 0.3, $ne: null } },
        ],
      })
      .sort({ size: -1 })
      .limit(20)
      .toArray();
    
    const blurryPhotos: BlurryPhoto[] = blurryPhotosRaw.map((f: Photo) => ({
      id: f.id,
      filename: f.originalFilename,
      size: f.size,
      thumbnailPath: f.thumbnailPath,
    }));
    
    // Upload-Rate berechnen
    const createdAt = user?.createdAt || Date.now();
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
    const user = await mongoDBService.getPhotoUsersCollection().findOne({ id: userId });
    const currentPlan = user?.plan || 'free';
    
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
    const photosRaw = await mongoDBService.getPhotosCollection()
      .find({ userId, isDeleted: false, primaryCategory: category })
      .sort({ size: -1 })
      .toArray();
    
    const photos: LargeFile[] = photosRaw.map((f: Photo) => ({
      id: f.id,
      filename: f.originalFilename,
      size: f.size,
      thumbnailPath: f.thumbnailPath,
      takenAt: f.takenAt,
    }));
    
    const totalSize = photos.reduce((sum: number, p: LargeFile) => sum + p.size, 0);
    
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
    const photosCollection = mongoDBService.getPhotosCollection();
    const usersCollection = mongoDBService.getPhotoUsersCollection();
    
    for (const photoId of photoIds) {
      const photo = await photosCollection.findOne({ userId, id: photoId, isDeleted: false });
      
      if (photo) {
        // Soft delete
        await photosCollection.updateOne(
          { id: photoId, userId },
          { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
        );
        
        // Speicher aktualisieren
        await usersCollection.updateOne(
          { id: userId },
          { $inc: { storageUsed: -photo.size, photoCount: -1 }, $set: { updatedAt: now } }
        );
        
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
    const photos = await mongoDBService.getPhotosCollection()
      .find({ userId, primaryCategory: category, isDeleted: false })
      .project({ id: 1, size: 1 })
      .toArray();
    
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
    const trashedPhotos = await mongoDBService.getPhotosCollection()
      .find({ userId, isDeleted: true })
      .toArray();
    
    let freedSpace = 0;
    let deletedCount = 0;
    
    for (const photo of trashedPhotos) {
      try {
        // Dateien löschen
        if (photo.storagePath && fs.existsSync(photo.storagePath)) {
          fs.unlinkSync(photo.storagePath);
        }
        if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
          fs.unlinkSync(photo.thumbnailPath);
        }
        
        // DB-Eintrag löschen
        await mongoDBService.getPhotosCollection().deleteOne({ id: photo.id });
        
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
  async upgradePlan(userId: string, newPlan: 'free' | 'plus' | 'pro' | 'business'): Promise<{
    success: boolean;
    newLimit: number;
    formattedLimit: string;
  }> {
    const plan = STORAGE_PLANS[newPlan];
    if (!plan) {
      return { success: false, newLimit: 0, formattedLimit: '0' };
    }
    
    const now = Date.now();
    
    await mongoDBService.getPhotoUsersCollection().updateOne(
      { id: userId },
      { $set: { plan: newPlan, storageLimit: plan.storage, updatedAt: now } }
    );
    
    return {
      success: true,
      newLimit: plan.storage,
      formattedLimit: this.formatBytes(plan.storage),
    };
  }
}

// Singleton exportieren
export const photosStorageServiceMongo = new PhotosStorageServiceMongo();
