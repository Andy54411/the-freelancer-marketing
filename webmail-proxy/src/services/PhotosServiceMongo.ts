/**
 * Taskilo Photos Service - MongoDB Version
 * 
 * Separater Speicherbereich nur für Fotos.
 * Wird später mit der Taskilo App synchronisiert.
 * 
 * MIGRATION: Nutzt MongoDB statt SQLite
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { mongoDBService, PhotoUser, PhotoAlbum, Photo, PhotoAiCategories } from './MongoDBService';

// Pfade - SEPARAT von Drive
const DATA_DIR = process.env.PHOTOS_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
const PHOTOS_DIR = path.join(DATA_DIR, 'photos-files');
const THUMBNAILS_DIR = path.join(DATA_DIR, 'photos-thumbnails');

// Erlaubte Bildformate
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
];

// Storage Limits in Bytes (separat von Drive)
const PHOTO_STORAGE_LIMITS = {
  free: 5 * 1024 * 1024 * 1024,   // 5 GB für Fotos
  plus: 25 * 1024 * 1024 * 1024,  // 25 GB
  pro: 50 * 1024 * 1024 * 1024,   // 50 GB
};

const MAX_PHOTO_SIZE = 50 * 1024 * 1024; // 50 MB pro Foto

// Interfaces
export interface PhotoStorageInfo {
  plan: string;
  used: number;
  limit: number;
  usedPercent: number;
  photoCount: number;
  albumCount: number;
  formattedUsed: string;
  formattedLimit: string;
}

export interface AlbumContents {
  album: PhotoAlbum | null;
  photos: Photo[];
  totalCount: number;
}

// Re-export interfaces from MongoDBService
export type { PhotoUser, PhotoAlbum, Photo, PhotoAiCategories };

class PhotosServiceMongo {
  constructor() {
    // Verzeichnisse erstellen
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PHOTOS_DIR)) {
      fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    }
    if (!fs.existsSync(THUMBNAILS_DIR)) {
      fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    }
  }

  // ==================== USER MANAGEMENT ====================

  async getOrCreateUser(userId: string): Promise<PhotoUser> {
    const now = Date.now();
    const collection = mongoDBService.getPhotoUsersCollection();
    
    let user = await collection.findOne({ id: userId });
    
    if (!user) {
      const newUser: PhotoUser = {
        id: userId,
        plan: 'free',
        storageUsed: 0,
        storageLimit: PHOTO_STORAGE_LIMITS.free,
        photoCount: 0,
        albumCount: 0,
        lastSyncAt: null,
        createdAt: now,
        updatedAt: now,
      };
      
      await collection.insertOne(newUser);
      
      // Standard "Alle Fotos" Album erstellen
      await this.createAlbum(userId, 'Alle Fotos', null, true);
      
      return newUser;
    }
    
    return user;
  }

  async getStorageInfo(userId: string): Promise<PhotoStorageInfo> {
    const user = await this.getOrCreateUser(userId);
    
    return {
      plan: user.plan,
      used: user.storageUsed,
      limit: user.storageLimit,
      usedPercent: user.storageLimit > 0 ? (user.storageUsed / user.storageLimit) * 100 : 0,
      photoCount: user.photoCount,
      albumCount: user.albumCount,
      formattedUsed: this.formatBytes(user.storageUsed),
      formattedLimit: this.formatBytes(user.storageLimit),
    };
  }

  // ==================== ALBUM MANAGEMENT ====================

  async createAlbum(userId: string, name: string, description: string | null = null, isDefault: boolean = false): Promise<PhotoAlbum> {
    await this.getOrCreateUser(userId);
    
    const now = Date.now();
    const id = uuidv4();
    
    const album: PhotoAlbum = {
      id,
      userId,
      name,
      description,
      coverPhotoId: null,
      photoCount: 0,
      isDefault,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoDBService.getPhotoAlbumsCollection().insertOne(album);
    
    // User album_count aktualisieren
    await mongoDBService.getPhotoUsersCollection().updateOne(
      { id: userId },
      { $inc: { albumCount: 1 }, $set: { updatedAt: now } }
    );
    
    return album;
  }

  async getAlbum(userId: string, albumId: string): Promise<PhotoAlbum | null> {
    return await mongoDBService.getPhotoAlbumsCollection().findOne({
      id: albumId,
      userId,
      isDeleted: false,
    });
  }

  async getAlbums(userId: string, includeDeleted: boolean = false): Promise<PhotoAlbum[]> {
    await this.getOrCreateUser(userId);
    
    const filter: Record<string, unknown> = { userId };
    if (!includeDeleted) {
      filter.isDeleted = false;
    }
    
    const albums = await mongoDBService.getPhotoAlbumsCollection()
      .find(filter)
      .sort({ isDefault: -1, name: 1 })
      .toArray();
    
    return albums;
  }

  async renameAlbum(userId: string, albumId: string, newName: string): Promise<PhotoAlbum | null> {
    const album = await this.getAlbum(userId, albumId);
    if (!album || album.isDefault) return null;
    
    const now = Date.now();
    await mongoDBService.getPhotoAlbumsCollection().updateOne(
      { id: albumId, userId },
      { $set: { name: newName, updatedAt: now } }
    );
    
    return this.getAlbum(userId, albumId);
  }

  async deleteAlbum(userId: string, albumId: string): Promise<boolean> {
    const album = await this.getAlbum(userId, albumId);
    if (!album || album.isDefault) return false;
    
    const now = Date.now();
    await mongoDBService.getPhotoAlbumsCollection().updateOne(
      { id: albumId, userId },
      { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
    );
    
    await mongoDBService.getPhotoUsersCollection().updateOne(
      { id: userId },
      { $inc: { albumCount: -1 }, $set: { updatedAt: now } }
    );
    
    return true;
  }

  // ==================== PHOTO MANAGEMENT ====================

  async uploadPhoto(
    userId: string,
    albumId: string | null,
    originalFilename: string,
    mimeType: string,
    buffer: Buffer,
    metadata?: {
      width?: number;
      height?: number;
      takenAt?: number;
      latitude?: number;
      longitude?: number;
      camera?: string;
      appDeviceId?: string;
    }
  ): Promise<Photo> {
    // Prüfe Bildformat
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(`Ungültiges Bildformat. Erlaubt: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }
    
    // Prüfe Dateigröße
    if (buffer.length > MAX_PHOTO_SIZE) {
      throw new Error(`Foto zu groß. Maximum: ${this.formatBytes(MAX_PHOTO_SIZE)}`);
    }
    
    const user = await this.getOrCreateUser(userId);
    
    // Prüfe Speicherplatz
    if (user.storageUsed + buffer.length > user.storageLimit) {
      throw new Error('Nicht genügend Speicherplatz für Fotos');
    }
    
    const now = Date.now();
    const id = uuidv4();
    const extension = path.extname(originalFilename) || this.getExtensionFromMime(mimeType);
    const filename = `${id}${extension}`;
    
    // Benutzer-Verzeichnis erstellen
    const userDir = path.join(PHOTOS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Foto speichern
    const storagePath = path.join(userDir, filename);
    fs.writeFileSync(storagePath, buffer);
    
    const photo: Photo = {
      id,
      userId,
      albumId,
      filename,
      originalFilename,
      mimeType,
      size: buffer.length,
      width: metadata?.width || null,
      height: metadata?.height || null,
      storagePath,
      thumbnailPath: null,
      takenAt: metadata?.takenAt || null,
      latitude: metadata?.latitude || null,
      longitude: metadata?.longitude || null,
      locationName: null,
      camera: metadata?.camera || null,
      primaryCategory: null,
      primaryCategoryDisplay: null,
      primaryConfidence: null,
      detectedCategories: null,
      detectedObjects: null,
      metadataCategories: null,
      classifiedAt: null,
      imageHash: null,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
      syncedFromApp: !!metadata?.appDeviceId,
      appDeviceId: metadata?.appDeviceId || null,
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoDBService.getPhotosCollection().insertOne(photo);
    
    // User Storage aktualisieren
    await mongoDBService.getPhotoUsersCollection().updateOne(
      { id: userId },
      { 
        $inc: { storageUsed: buffer.length, photoCount: 1 }, 
        $set: { updatedAt: now } 
      }
    );
    
    // Album photo_count aktualisieren falls vorhanden
    if (albumId) {
      await mongoDBService.getPhotoAlbumsCollection().updateOne(
        { id: albumId },
        { $inc: { photoCount: 1 }, $set: { updatedAt: now } }
      );
    }
    
    return photo;
  }

  async getPhoto(userId: string, photoId: string): Promise<Photo | null> {
    return await mongoDBService.getPhotosCollection().findOne({
      id: photoId,
      userId,
      isDeleted: false,
    });
  }

  async getPhotos(
    userId: string, 
    albumId: string | null = null, 
    options: { 
      limit?: number; 
      offset?: number; 
      favoritesOnly?: boolean;
      includeDeleted?: boolean;
      category?: string;
    } = {}
  ): Promise<{ photos: Photo[]; total: number }> {
    await this.getOrCreateUser(userId);
    
    const { limit = 50, offset = 0, favoritesOnly = false, includeDeleted = false, category } = options;
    
    const filter: Record<string, unknown> = { userId };
    
    if (albumId) {
      filter.albumId = albumId;
    }
    
    if (!includeDeleted) {
      filter.isDeleted = false;
    }
    
    if (favoritesOnly) {
      filter.isFavorite = true;
    }
    
    // KI-Kategorie Filter
    if (category) {
      if (category.startsWith('year_')) {
        const year = parseInt(category.replace('year_', ''));
        const startOfYear = new Date(year, 0, 1).getTime();
        const endOfYear = new Date(year + 1, 0, 1).getTime();
        filter.$or = [
          { takenAt: { $gte: startOfYear, $lt: endOfYear } },
          { takenAt: null, createdAt: { $gte: startOfYear, $lt: endOfYear } },
        ];
      } else if (category.startsWith('month_')) {
        const parts = category.replace('month_', '').split('_');
        if (parts.length === 2) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const startOfMonth = new Date(year, month, 1).getTime();
          const endOfMonth = new Date(year, month + 1, 1).getTime();
          filter.$or = [
            { takenAt: { $gte: startOfMonth, $lt: endOfMonth } },
            { takenAt: null, createdAt: { $gte: startOfMonth, $lt: endOfMonth } },
          ];
        }
      } else {
        filter.primaryCategory = category;
      }
    }
    
    const collection = mongoDBService.getPhotosCollection();
    
    const total = await collection.countDocuments(filter);
    
    const photos = await collection
      .find(filter)
      .sort({ takenAt: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return { photos, total };
  }

  async getAlbumContents(userId: string, albumId: string | null, limit: number = 50, offset: number = 0): Promise<AlbumContents> {
    const album = albumId ? await this.getAlbum(userId, albumId) : null;
    const { photos, total } = await this.getPhotos(userId, albumId, { limit, offset });
    
    return { album, photos, totalCount: total };
  }

  async toggleFavorite(userId: string, photoId: string): Promise<Photo | null> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return null;
    
    const now = Date.now();
    const newValue = !photo.isFavorite;
    
    await mongoDBService.getPhotosCollection().updateOne(
      { id: photoId, userId },
      { $set: { isFavorite: newValue, updatedAt: now } }
    );
    
    return this.getPhoto(userId, photoId);
  }

  async updateAiCategories(userId: string, photoId: string, categories: PhotoAiCategories): Promise<Photo | null> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return null;
    
    const now = Date.now();
    
    await mongoDBService.getPhotosCollection().updateOne(
      { id: photoId, userId },
      {
        $set: {
          primaryCategory: categories.primaryCategory,
          primaryCategoryDisplay: categories.primaryCategoryDisplay,
          primaryConfidence: categories.primaryConfidence,
          detectedCategories: JSON.stringify(categories.detectedCategories),
          detectedObjects: JSON.stringify(categories.detectedObjects),
          metadataCategories: JSON.stringify(categories.metadataCategories),
          classifiedAt: categories.classifiedAt,
          imageHash: categories.imageHash || null,
          updatedAt: now,
        },
      }
    );
    
    return this.getPhoto(userId, photoId);
  }

  async getImageHash(userId: string, photoId: string): Promise<string | null> {
    const photo = await mongoDBService.getPhotosCollection().findOne(
      { id: photoId, userId, isDeleted: false },
      { projection: { imageHash: 1 } }
    );
    return photo?.imageHash || null;
  }

  async correctPhotoMetadata(
    userId: string, 
    photoId: string, 
    corrections: {
      category?: string;
      categoryDisplay?: string;
      locationName?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<Photo | null> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return null;
    
    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };
    
    if (corrections.category !== undefined) {
      updates.primaryCategory = corrections.category;
      updates.primaryCategoryDisplay = corrections.categoryDisplay || corrections.category;
      updates.primaryConfidence = 1.0;
    }
    
    if (corrections.locationName !== undefined) {
      updates.locationName = corrections.locationName;
    }
    
    if (corrections.latitude !== undefined) {
      updates.latitude = corrections.latitude;
    }
    
    if (corrections.longitude !== undefined) {
      updates.longitude = corrections.longitude;
    }
    
    await mongoDBService.getPhotosCollection().updateOne(
      { id: photoId, userId },
      { $set: updates }
    );
    
    return this.getPhoto(userId, photoId);
  }

  async batchCorrectMetadata(
    userId: string,
    photoIds: string[],
    corrections: {
      category?: string;
      categoryDisplay?: string;
      locationName?: string;
    }
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;
    
    for (const photoId of photoIds) {
      const result = await this.correctPhotoMetadata(userId, photoId, corrections);
      if (result) {
        updated++;
      } else {
        failed++;
      }
    }
    
    return { updated, failed };
  }

  async deletePhoto(userId: string, photoId: string): Promise<boolean> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return false;
    
    const now = Date.now();
    
    // Soft Delete
    await mongoDBService.getPhotosCollection().updateOne(
      { id: photoId, userId },
      { $set: { isDeleted: true, deletedAt: now, updatedAt: now } }
    );
    
    // User Storage aktualisieren
    await mongoDBService.getPhotoUsersCollection().updateOne(
      { id: userId },
      { $inc: { storageUsed: -photo.size, photoCount: -1 }, $set: { updatedAt: now } }
    );
    
    // Album photo_count aktualisieren
    if (photo.albumId) {
      await mongoDBService.getPhotoAlbumsCollection().updateOne(
        { id: photo.albumId },
        { $inc: { photoCount: -1 }, $set: { updatedAt: now } }
      );
    }
    
    return true;
  }

  async getPhotoFile(userId: string, photoId: string): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return null;
    
    if (!fs.existsSync(photo.storagePath)) {
      throw new Error('Fotodatei nicht gefunden');
    }
    
    return {
      buffer: fs.readFileSync(photo.storagePath),
      mimeType: photo.mimeType,
      filename: photo.originalFilename,
    };
  }

  async moveToAlbum(userId: string, photoId: string, albumId: string | null): Promise<Photo | null> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return null;
    
    if (albumId) {
      const album = await this.getAlbum(userId, albumId);
      if (!album) throw new Error('Album nicht gefunden');
    }
    
    const now = Date.now();
    const oldAlbumId = photo.albumId;
    
    await mongoDBService.getPhotosCollection().updateOne(
      { id: photoId, userId },
      { $set: { albumId, updatedAt: now } }
    );
    
    // Album photo_counts aktualisieren
    if (oldAlbumId) {
      await mongoDBService.getPhotoAlbumsCollection().updateOne(
        { id: oldAlbumId },
        { $inc: { photoCount: -1 }, $set: { updatedAt: now } }
      );
    }
    if (albumId) {
      await mongoDBService.getPhotoAlbumsCollection().updateOne(
        { id: albumId },
        { $inc: { photoCount: 1 }, $set: { updatedAt: now } }
      );
    }
    
    return this.getPhoto(userId, photoId);
  }

  // ==================== APP SYNC ====================

  async getPhotosForSync(userId: string, since: number = 0): Promise<Photo[]> {
    return await mongoDBService.getPhotosCollection()
      .find({
        userId,
        updatedAt: { $gt: since },
        isDeleted: false,
      })
      .sort({ updatedAt: 1 })
      .toArray();
  }

  async updateSyncTimestamp(userId: string): Promise<void> {
    const now = Date.now();
    await mongoDBService.getPhotoUsersCollection().updateOne(
      { id: userId },
      { $set: { lastSyncAt: now, updatedAt: now } }
    );
  }

  // ==================== ERINNERUNGEN ====================

  async getMemories(userId: string): Promise<{ 
    memories: Array<{
      id: string;
      yearsAgo: number;
      title: string;
      subtitle: string;
      coverPhotoId: string;
      coverPhotoUrl: string;
      photoCount: number;
      photos: Photo[];
    }> 
  }> {
    await this.getOrCreateUser(userId);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    const memories: Array<{
      id: string;
      yearsAgo: number;
      title: string;
      subtitle: string;
      coverPhotoId: string;
      coverPhotoUrl: string;
      photoCount: number;
      photos: Photo[];
    }> = [];
    
    for (let yearsAgo = 1; yearsAgo <= 10; yearsAgo++) {
      const targetYear = now.getFullYear() - yearsAgo;
      
      const startDate = new Date(targetYear, currentMonth, currentDay - 3);
      const endDate = new Date(targetYear, currentMonth, currentDay + 3, 23, 59, 59);
      
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();
      
      const photos = await mongoDBService.getPhotosCollection()
        .find({
          userId,
          isDeleted: false,
          $or: [
            { takenAt: { $gte: startTimestamp, $lte: endTimestamp } },
            { takenAt: null, createdAt: { $gte: startTimestamp, $lte: endTimestamp } },
          ],
        })
        .sort({ takenAt: -1, createdAt: -1 })
        .limit(20)
        .toArray();
      
      if (photos.length > 0) {
        const coverPhoto = photos[0];
        
        memories.push({
          id: `memory-${yearsAgo}`,
          yearsAgo,
          title: yearsAgo === 1 ? 'Vor 1 Jahr' : `Vor ${yearsAgo} Jahren`,
          subtitle: photos.length === 1 ? '1 Foto' : `${photos.length} Fotos`,
          coverPhotoId: coverPhoto.id,
          coverPhotoUrl: `/api/photos/${coverPhoto.id}/view?userId=${encodeURIComponent(userId)}`,
          photoCount: photos.length,
          photos,
        });
      }
    }
    
    return { memories };
  }

  // ==================== ORTE / LOCATIONS ====================

  async getPhotosByLocation(userId: string): Promise<{
    locations: Array<{
      locationName: string;
      latitude: number;
      longitude: number;
      photoCount: number;
      coverPhotoId: string;
      coverPhotoUrl: string;
      photos: Photo[];
    }>;
    photosWithoutLocation: number;
  }> {
    await this.getOrCreateUser(userId);

    const photos = await mongoDBService.getPhotosCollection()
      .find({
        userId,
        isDeleted: false,
        $or: [
          { latitude: { $ne: null }, longitude: { $ne: null } },
          { locationName: { $exists: true, $nin: [null, ''] } },
        ],
      })
      .sort({ takenAt: -1, createdAt: -1 })
      .toArray();

    const photosWithoutLocation = await mongoDBService.getPhotosCollection().countDocuments({
      userId,
      isDeleted: false,
      $and: [
        { $or: [{ latitude: null }, { longitude: null }] },
        { $or: [{ locationName: null }, { locationName: '' }] },
      ],
    });

    const locationMap = new Map<string, {
      locationName: string;
      latitude: number;
      longitude: number;
      photos: Photo[];
    }>();

    for (const photo of photos) {
      const key = photo.locationName || 
        (photo.latitude && photo.longitude 
          ? `${photo.latitude.toFixed(2)},${photo.longitude.toFixed(2)}`
          : 'unknown');
      
      if (key === 'unknown') continue;
      
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          locationName: photo.locationName || 'Unbekannter Ort',
          latitude: photo.latitude || 0,
          longitude: photo.longitude || 0,
          photos: [],
        });
      }
      locationMap.get(key)!.photos.push(photo);
    }

    const locations = Array.from(locationMap.values())
      .map(loc => ({
        locationName: loc.locationName,
        latitude: loc.latitude,
        longitude: loc.longitude,
        photoCount: loc.photos.length,
        coverPhotoId: loc.photos[0].id,
        coverPhotoUrl: `/api/photos/${loc.photos[0].id}/view?userId=${encodeURIComponent(userId)}`,
        photos: loc.photos,
      }))
      .sort((a, b) => b.photoCount - a.photoCount);

    return { locations, photosWithoutLocation };
  }

  async updateLocationName(userId: string, photoId: string, locationName: string): Promise<boolean> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return false;

    const now = Date.now();
    await mongoDBService.getPhotosCollection().updateOne(
      { id: photoId, userId },
      { $set: { locationName, updatedAt: now } }
    );

    return true;
  }

  async getPhotosNeedingGeocoding(userId: string, limit: number = 50): Promise<Photo[]> {
    return await mongoDBService.getPhotosCollection()
      .find({
        userId,
        isDeleted: false,
        latitude: { $ne: null },
        longitude: { $ne: null },
        locationName: null,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // ==================== KATEGORIEN ====================

  async getCategoriesFromDb(userId: string): Promise<Array<{
    key: string;
    display: string;
    count: number;
    type: 'scene' | 'object' | 'time' | 'custom';
  }>> {
    const result = await mongoDBService.getPhotosCollection().aggregate([
      {
        $match: {
          userId,
          isDeleted: false,
          primaryCategory: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$primaryCategory',
          display: { $first: '$primaryCategoryDisplay' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();
    
    return result.map((row) => ({
      key: row._id as string,
      display: (row.display as string) || (row._id as string),
      count: row.count as number,
      type: (row._id as string).startsWith('custom_') ? 'custom' as const : 'scene' as const,
    }));
  }

  async getTimeCategories(userId: string): Promise<Array<{
    key: string;
    display: string;
    count: number;
    type: 'time';
  }>> {
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    
    const currentYear = new Date().getFullYear();
    
    // Jahre aggregieren
    const yearResult = await mongoDBService.getPhotosCollection().aggregate([
      {
        $match: { userId, isDeleted: false },
      },
      {
        $addFields: {
          photoDate: { $cond: [{ $ne: ['$takenAt', null] }, '$takenAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: { $year: { $toDate: '$photoDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]).toArray();
    
    // Monate des aktuellen Jahres aggregieren
    const monthResult = await mongoDBService.getPhotosCollection().aggregate([
      {
        $match: { userId, isDeleted: false },
      },
      {
        $addFields: {
          photoDate: { $cond: [{ $ne: ['$takenAt', null] }, '$takenAt', '$createdAt'] },
        },
      },
      {
        $match: {
          $expr: { $eq: [{ $year: { $toDate: '$photoDate' } }, currentYear] },
        },
      },
      {
        $group: {
          _id: { $month: { $toDate: '$photoDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]).toArray();
    
    const result: Array<{ key: string; display: string; count: number; type: 'time' }> = [];
    
    for (const y of yearResult) {
      const yearId = y._id as number | null;
      if (yearId) {
        result.push({
          key: `year_${yearId}`,
          display: String(yearId),
          count: (y as { count: number }).count,
          type: 'time',
        });
      }
    }
    
    for (const m of monthResult) {
      const monthId = m._id as number | null;
      if (monthId) {
        const monthIndex = monthId - 1;
        const monthStr = String(monthId).padStart(2, '0');
        result.push({
          key: `month_${currentYear}_${monthStr}`,
          display: monthNames[monthIndex] || String(monthId),
          count: (m as { count: number }).count,
          type: 'time',
        });
      }
    }
    
    return result;
  }

  // ==================== SPEICHERANALYSE ====================

  async getStorageAnalysis(userId: string): Promise<{
    totalUsed: number;
    totalLimit: number;
    photoCount: number;
    categories: Array<{
      key: string;
      name: string;
      size: number;
      count: number;
      icon: string;
    }>;
    largeFiles: Array<{
      id: string;
      filename: string;
      size: number;
      thumbnailPath: string | null;
      takenAt: number | null;
    }>;
    blurryPhotos: Array<{
      id: string;
      filename: string;
      size: number;
      thumbnailPath: string | null;
    }>;
    unsupportedVideos: Array<{
      id: string;
      filename: string;
      size: number;
    }>;
    estimatedYearsRemaining: number;
    uploadRatePerMonth: number;
  }> {
    const user = await this.getOrCreateUser(userId);
    
    const totalUsed = user.storageUsed;
    const totalLimit = user.storageLimit;
    const photoCount = user.photoCount;
    
    // Kategorien aggregieren
    const categoryStats = await mongoDBService.getPhotosCollection().aggregate([
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
      people: 'users',
      document: 'file-text',
      animal: 'paw-print',
      vehicle: 'car',
      building: 'building',
      other: 'image',
    };
    
    const categories = categoryStats.map(cat => ({
      key: cat._id as string,
      name: cat.display as string,
      size: cat.total_size as number,
      count: cat.count as number,
      icon: categoryIcons[(cat._id as string).toLowerCase()] || 'image',
    }));
    
    // Große Dateien
    const largeFilesRaw = await mongoDBService.getPhotosCollection()
      .find({ userId, isDeleted: false, size: { $gt: 5242880 } })
      .sort({ size: -1 })
      .limit(50)
      .project({ id: 1, originalFilename: 1, size: 1, thumbnailPath: 1, takenAt: 1 })
      .toArray();
    
    // Unscharfe Fotos
    const blurryPhotosRaw = await mongoDBService.getPhotosCollection()
      .find({
        userId,
        isDeleted: false,
        $or: [
          { width: { $lt: 500 } },
          { height: { $lt: 500 } },
          { primaryConfidence: { $lt: 0.3 } },
        ],
      })
      .sort({ size: -1 })
      .limit(20)
      .project({ id: 1, originalFilename: 1, size: 1, thumbnailPath: 1 })
      .toArray();
    
    const largeFiles = largeFilesRaw as Array<{ id: string; originalFilename: string; size: number; thumbnailPath: string | null; takenAt: number | null }>;
    const blurryPhotos = blurryPhotosRaw as Array<{ id: string; originalFilename: string; size: number; thumbnailPath: string | null }>;
    
    // Upload-Rate berechnen
    const accountAgeMonths = Math.max(1, (Date.now() - user.createdAt) / (30 * 24 * 60 * 60 * 1000));
    const uploadRatePerMonth = totalUsed / accountAgeMonths;
    
    const remainingSpace = totalLimit - totalUsed;
    const yearsRemaining = uploadRatePerMonth > 0 
      ? (remainingSpace / uploadRatePerMonth) / 12 
      : 99;
    
    return {
      totalUsed,
      totalLimit,
      photoCount,
      categories,
      largeFiles: largeFiles.map(f => ({
        id: f.id,
        filename: f.originalFilename,
        size: f.size,
        thumbnailPath: f.thumbnailPath,
        takenAt: f.takenAt,
      })),
      blurryPhotos: blurryPhotos.map(f => ({
        id: f.id,
        filename: f.originalFilename,
        size: f.size,
        thumbnailPath: f.thumbnailPath,
      })),
      unsupportedVideos: [],
      estimatedYearsRemaining: Math.min(Math.max(yearsRemaining, 0), 99),
      uploadRatePerMonth,
    };
  }

  async deletePhotosByCategory(userId: string, category: string): Promise<{ deletedCount: number; freedSpace: number }> {
    const photos = await mongoDBService.getPhotosCollection()
      .find({ userId, primaryCategory: category, isDeleted: false })
      .project({ id: 1, size: 1 })
      .toArray();
    
    let freedSpace = 0;
    let deletedCount = 0;
    
    for (const photo of photos) {
      await this.deletePhoto(userId, photo.id);
      freedSpace += photo.size;
      deletedCount++;
    }
    
    return { deletedCount, freedSpace };
  }

  // ==================== BENUTZERDEFINIERTE KATEGORIEN ====================

  async getCustomCategories(userId: string): Promise<Array<{ id: string; key: string; display: string; group: string }>> {
    return await mongoDBService.getPhotoCustomCategoriesCollection()
      .find({ userId })
      .sort({ display: 1 })
      .toArray()
      .then(rows => rows.map(r => ({
        id: r.id,
        key: r.key,
        display: r.display,
        group: r.groupName,
      })));
  }

  async createCustomCategory(userId: string, display: string, group: string = 'spezial'): Promise<{ id: string; key: string; display: string; group: string }> {
    await this.getOrCreateUser(userId);
    
    const key = 'custom_' + display
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9_]/g, '');
    
    const id = uuidv4();
    const now = Date.now();
    
    const existing = await mongoDBService.getPhotoCustomCategoriesCollection().findOne({ userId, key });
    if (existing) {
      return { id: existing.id, key: existing.key, display: existing.display, group: existing.groupName };
    }
    
    await mongoDBService.getPhotoCustomCategoriesCollection().insertOne({
      id,
      userId,
      key,
      display,
      groupName: group,
      createdAt: now,
    });
    
    return { id, key, display, group };
  }

  async deleteCustomCategory(userId: string, categoryId: string): Promise<boolean> {
    const result = await mongoDBService.getPhotoCustomCategoriesCollection().deleteOne({
      id: categoryId,
      userId,
    });
    return result.deletedCount > 0;
  }

  // ==================== HELPER METHODS ====================

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private getExtensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/heic': '.heic',
      'image/heif': '.heif',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
    };
    return map[mimeType.toLowerCase()] || '.jpg';
  }
}

// Singleton exportieren
export const photosServiceMongo = new PhotosServiceMongo();
