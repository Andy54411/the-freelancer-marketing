/**
 * Taskilo Photos Service
 * 
 * Separater Speicherbereich nur für Fotos.
 * Wird später mit der Taskilo App synchronisiert.
 * 
 * Unterschiede zu Drive:
 * - Nur Bilder erlaubt (JPEG, PNG, HEIC, WebP, GIF)
 * - Automatische Thumbnail-Generierung
 * - Album-basierte Organisation (statt Ordner)
 * - Metadaten-Extraktion (EXIF: Datum, Ort, Kamera)
 * - Optimiert für mobile Synchronisation
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Pfade - SEPARAT von Drive
const DATA_DIR = process.env.PHOTOS_DATA_DIR || '/opt/taskilo/webmail-proxy/data';
const DB_PATH = path.join(DATA_DIR, 'photos.db');
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
export interface PhotosUser {
  id: string;
  plan: 'free' | 'plus' | 'pro';
  storageUsed: number;
  storageLimit: number;
  photoCount: number;
  albumCount: number;
  lastSyncAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PhotoAlbum {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  photoCount: number;
  isDefault: boolean; // "Alle Fotos" Album
  isDeleted: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  userId: string;
  albumId: string | null;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  storagePath: string;
  thumbnailPath: string | null;
  // EXIF Metadaten
  takenAt: number | null;  // Aufnahmedatum
  latitude: number | null;
  longitude: number | null;
  locationName: string | null; // Reverse Geocoded Ortsname
  camera: string | null;
  // KI-Klassifizierung
  primaryCategory: string | null;
  primaryCategoryDisplay: string | null;
  primaryConfidence: number | null;
  detectedCategories: string | null; // JSON-Array
  detectedObjects: string | null;    // JSON-Array
  metadataCategories: string | null; // JSON-Array
  classifiedAt: number | null;
  // Status
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  // App-Sync
  syncedFromApp: boolean;
  appDeviceId: string | null;
  createdAt: number;
  updatedAt: number;
}

// KI-Kategorien Interface
export interface PhotoAiCategories {
  primaryCategory: string;
  primaryCategoryDisplay: string;
  primaryConfidence: number;
  detectedCategories: Array<{ category: string; display_name: string; confidence: number }>;
  detectedObjects: Array<{ object: string; confidence: number }>;
  metadataCategories: string[];
  classifiedAt: number;
  imageHash?: string; // Hash für KI-Feedback Tracking
}

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

class PhotosService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

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

    // Datenbank öffnen/erstellen
    this.db = new Database(DB_PATH);
    this.initDatabase();
  }

  private initDatabase(): void {
    // WAL Modus für bessere Performance
    this.db.pragma('journal_mode = WAL');

    // Users Tabelle (Photo-spezifisch)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS photo_users (
        id TEXT PRIMARY KEY,
        plan TEXT DEFAULT 'free',
        storage_used INTEGER DEFAULT 0,
        storage_limit INTEGER DEFAULT ${PHOTO_STORAGE_LIMITS.free},
        photo_count INTEGER DEFAULT 0,
        album_count INTEGER DEFAULT 0,
        last_sync_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Albums Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        cover_photo_id TEXT,
        photo_count INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        deleted_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES photo_users(id)
      )
    `);

    // Photos Tabelle
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        album_id TEXT,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        storage_path TEXT NOT NULL,
        thumbnail_path TEXT,
        taken_at INTEGER,
        latitude REAL,
        longitude REAL,
        camera TEXT,
        is_favorite INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        deleted_at INTEGER,
        synced_from_app INTEGER DEFAULT 0,
        app_device_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES photo_users(id),
        FOREIGN KEY (album_id) REFERENCES albums(id)
      )
    `);

    // Album-Photo Zuordnung (für Fotos in mehreren Alben)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS album_photos (
        album_id TEXT NOT NULL,
        photo_id TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (album_id, photo_id),
        FOREIGN KEY (album_id) REFERENCES albums(id),
        FOREIGN KEY (photo_id) REFERENCES photos(id)
      )
    `);

    // Indizes für Performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
      CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
      CREATE INDEX IF NOT EXISTS idx_photos_taken ON photos(taken_at);
      CREATE INDEX IF NOT EXISTS idx_photos_favorite ON photos(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_albums_user ON albums(user_id);
      CREATE INDEX IF NOT EXISTS idx_album_photos ON album_photos(album_id);
    `);
    
    // Migration: KI-Kategorien Spalten hinzufügen
    this.migrateAiCategories();
  }
  
  private migrateAiCategories(): void {
    try {
      // Prüfe ob Spalten bereits existieren
      const tableInfo = this.db.pragma('table_info(photos)');
      const existingColumns = tableInfo.map((col: { name: string }) => col.name);
      
      const newColumns = [
        { name: 'primary_category', type: 'TEXT' },
        { name: 'primary_category_display', type: 'TEXT' },
        { name: 'primary_confidence', type: 'REAL' },
        { name: 'detected_categories', type: 'TEXT' },
        { name: 'detected_objects', type: 'TEXT' },
        { name: 'metadata_categories', type: 'TEXT' },
        { name: 'classified_at', type: 'INTEGER' },
      ];
      
      for (const col of newColumns) {
        if (!existingColumns.includes(col.name)) {
          this.db.exec(`ALTER TABLE photos ADD COLUMN ${col.name} ${col.type}`);
        }
      }
      
      // Index für KI-Kategorien
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_photos_primary_category ON photos(primary_category);
        CREATE INDEX IF NOT EXISTS idx_photos_classified ON photos(classified_at);
      `);
    } catch {
      // Migration bereits durchgeführt oder Fehler - ignorieren
    }
    
    // Migration: location_name Spalte hinzufügen
    this.migrateLocationName();
    
    // Migration: image_hash Spalte für KI-Feedback
    this.migrateImageHash();
  }
  
  private migrateLocationName(): void {
    try {
      const tableInfo = this.db.pragma('table_info(photos)');
      const existingColumns = tableInfo.map((col: { name: string }) => col.name);
      
      if (!existingColumns.includes('location_name')) {
        this.db.exec(`ALTER TABLE photos ADD COLUMN location_name TEXT`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(location_name)`);
      }
    } catch {
      // Migration bereits durchgeführt
    }
  }
  
  private migrateImageHash(): void {
    try {
      const tableInfo = this.db.pragma('table_info(photos)');
      const existingColumns = tableInfo.map((col: { name: string }) => col.name);
      
      if (!existingColumns.includes('image_hash')) {
        this.db.exec(`ALTER TABLE photos ADD COLUMN image_hash TEXT`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_image_hash ON photos(image_hash)`);
      }
    } catch {
      // Migration bereits durchgeführt
    }
    
    // Migration: Custom Categories Tabelle erstellen
    this.migrateCustomCategories();
  }
  
  private migrateCustomCategories(): void {
    try {
      // Tabelle für benutzerdefinierte Kategorien
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS photo_custom_categories (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          display TEXT NOT NULL,
          group_name TEXT DEFAULT 'spezial',
          created_at INTEGER NOT NULL,
          UNIQUE(user_id, key),
          FOREIGN KEY (user_id) REFERENCES photo_users(id)
        )
      `);
      
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON photo_custom_categories(user_id);
      `);
    } catch {
      // Tabelle bereits vorhanden
    }
  }

  // ==================== USER MANAGEMENT ====================

  async getOrCreateUser(userId: string): Promise<PhotosUser> {
    const now = Date.now();
    
    let user = this.db.prepare('SELECT * FROM photo_users WHERE id = ?').get(userId);
    
    if (!user) {
      this.db.prepare(`
        INSERT INTO photo_users (id, plan, storage_used, storage_limit, photo_count, album_count, created_at, updated_at)
        VALUES (?, 'free', 0, ?, 0, 0, ?, ?)
      `).run(userId, PHOTO_STORAGE_LIMITS.free, now, now);
      
      user = this.db.prepare('SELECT * FROM photo_users WHERE id = ?').get(userId);
      
      // Standard "Alle Fotos" Album erstellen
      await this.createAlbum(userId, 'Alle Fotos', null, true);
    }
    
    return this.mapUser(user);
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
    
    this.db.prepare(`
      INSERT INTO albums (id, user_id, name, description, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, description, isDefault ? 1 : 0, now, now);
    
    // User album_count aktualisieren
    this.db.prepare('UPDATE photo_users SET album_count = album_count + 1, updated_at = ? WHERE id = ?').run(now, userId);
    
    return this.getAlbum(userId, id) as Promise<PhotoAlbum>;
  }

  async getAlbum(userId: string, albumId: string): Promise<PhotoAlbum | null> {
    const album = this.db.prepare(`
      SELECT * FROM albums WHERE id = ? AND user_id = ? AND is_deleted = 0
    `).get(albumId, userId);
    
    return album ? this.mapAlbum(album) : null;
  }

  async getAlbums(userId: string, includeDeleted: boolean = false): Promise<PhotoAlbum[]> {
    await this.getOrCreateUser(userId);
    
    const query = includeDeleted 
      ? 'SELECT * FROM albums WHERE user_id = ? ORDER BY is_default DESC, name ASC'
      : 'SELECT * FROM albums WHERE user_id = ? AND is_deleted = 0 ORDER BY is_default DESC, name ASC';
    
    const albums = this.db.prepare(query).all(userId);
    return albums.map((a: unknown) => this.mapAlbum(a));
  }

  async renameAlbum(userId: string, albumId: string, newName: string): Promise<PhotoAlbum | null> {
    const album = await this.getAlbum(userId, albumId);
    if (!album || album.isDefault) return null; // Standard-Album kann nicht umbenannt werden
    
    const now = Date.now();
    this.db.prepare('UPDATE albums SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(newName, now, albumId, userId);
    
    return this.getAlbum(userId, albumId);
  }

  async deleteAlbum(userId: string, albumId: string): Promise<boolean> {
    const album = await this.getAlbum(userId, albumId);
    if (!album || album.isDefault) return false; // Standard-Album kann nicht gelöscht werden
    
    const now = Date.now();
    this.db.prepare('UPDATE albums SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now, now, albumId, userId);
    
    this.db.prepare('UPDATE photo_users SET album_count = album_count - 1, updated_at = ? WHERE id = ?').run(now, userId);
    
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
    
    // In Datenbank einfügen
    this.db.prepare(`
      INSERT INTO photos (
        id, user_id, album_id, filename, original_filename, mime_type, size,
        width, height, storage_path, taken_at, latitude, longitude, camera,
        synced_from_app, app_device_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, userId, albumId, filename, originalFilename, mimeType, buffer.length,
      metadata?.width || null, metadata?.height || null, storagePath,
      metadata?.takenAt || null, metadata?.latitude || null, metadata?.longitude || null,
      metadata?.camera || null, metadata?.appDeviceId ? 1 : 0, metadata?.appDeviceId || null,
      now, now
    );
    
    // User Storage aktualisieren
    this.db.prepare(`
      UPDATE photo_users SET storage_used = storage_used + ?, photo_count = photo_count + 1, updated_at = ? WHERE id = ?
    `).run(buffer.length, now, userId);
    
    // Album photo_count aktualisieren falls vorhanden
    if (albumId) {
      this.db.prepare('UPDATE albums SET photo_count = photo_count + 1, updated_at = ? WHERE id = ?').run(now, albumId);
    }
    
    return this.getPhoto(userId, id) as Promise<Photo>;
  }

  async getPhoto(userId: string, photoId: string): Promise<Photo | null> {
    const photo = this.db.prepare(`
      SELECT * FROM photos WHERE id = ? AND user_id = ? AND is_deleted = 0
    `).get(photoId, userId);
    
    return photo ? this.mapPhoto(photo) : null;
  }

  async getPhotos(
    userId: string, 
    albumId: string | null = null, 
    options: { 
      limit?: number; 
      offset?: number; 
      favoritesOnly?: boolean;
      includeDeleted?: boolean;
      category?: string; // KI-Kategorie Filter
    } = {}
  ): Promise<{ photos: Photo[]; total: number }> {
    await this.getOrCreateUser(userId);
    
    const { limit = 50, offset = 0, favoritesOnly = false, includeDeleted = false, category } = options;
    
    let whereClause = 'user_id = ?';
    const params: (string | number)[] = [userId];
    
    if (albumId) {
      whereClause += ' AND album_id = ?';
      params.push(albumId);
    }
    
    if (!includeDeleted) {
      whereClause += ' AND is_deleted = 0';
    }
    
    if (favoritesOnly) {
      whereClause += ' AND is_favorite = 1';
    }
    
    // KI-Kategorie Filter
    if (category) {
      // Zeit-Kategorien: year_YYYY oder month_YYYY_MM
      if (category.startsWith('year_')) {
        const year = category.replace('year_', '');
        whereClause += " AND strftime('%Y', datetime(COALESCE(taken_at, created_at) / 1000, 'unixepoch')) = ?";
        params.push(year);
      } else if (category.startsWith('month_')) {
        // Format: month_2026_01 -> Jahr 2026, Monat 01
        const parts = category.replace('month_', '').split('_');
        if (parts.length === 2) {
          const [year, month] = parts;
          whereClause += " AND strftime('%Y', datetime(COALESCE(taken_at, created_at) / 1000, 'unixepoch')) = ?";
          whereClause += " AND strftime('%m', datetime(COALESCE(taken_at, created_at) / 1000, 'unixepoch')) = ?";
          params.push(year);
          params.push(month);
        }
      } else {
        // Normale KI-Kategorie (primary_category)
        whereClause += ' AND primary_category = ?';
        params.push(category);
      }
    }
    
    // Total Count
    const countResult = this.db.prepare(`SELECT COUNT(*) as count FROM photos WHERE ${whereClause}`).get(...params);
    const total = countResult?.count || 0;
    
    // Photos mit Pagination
    const photos = this.db.prepare(`
      SELECT * FROM photos WHERE ${whereClause}
      ORDER BY COALESCE(taken_at, created_at) DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    return {
      photos: photos.map((p: unknown) => this.mapPhoto(p)),
      total,
    };
  }

  async getAlbumContents(userId: string, albumId: string | null, limit: number = 50, offset: number = 0): Promise<AlbumContents> {
    const album = albumId ? await this.getAlbum(userId, albumId) : null;
    const { photos, total } = await this.getPhotos(userId, albumId, { limit, offset });
    
    return {
      album,
      photos,
      totalCount: total,
    };
  }

  async toggleFavorite(userId: string, photoId: string): Promise<Photo | null> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return null;
    
    const now = Date.now();
    const newValue = photo.isFavorite ? 0 : 1;
    
    this.db.prepare('UPDATE photos SET is_favorite = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(newValue, now, photoId, userId);
    
    return this.getPhoto(userId, photoId);
  }

  async updateAiCategories(userId: string, photoId: string, categories: PhotoAiCategories): Promise<Photo | null> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) return null;
    
    const now = Date.now();
    
    this.db.prepare(`
      UPDATE photos SET 
        primary_category = ?,
        primary_category_display = ?,
        primary_confidence = ?,
        detected_categories = ?,
        detected_objects = ?,
        metadata_categories = ?,
        classified_at = ?,
        image_hash = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      categories.primaryCategory,
      categories.primaryCategoryDisplay,
      categories.primaryConfidence,
      JSON.stringify(categories.detectedCategories),
      JSON.stringify(categories.detectedObjects),
      JSON.stringify(categories.metadataCategories),
      categories.classifiedAt,
      categories.imageHash || null,
      now,
      photoId,
      userId
    );
    
    return this.getPhoto(userId, photoId);
  }
  
  /**
   * Holt den image_hash eines Fotos für KI-Feedback
   */
  async getImageHash(userId: string, photoId: string): Promise<string | null> {
    const result = this.db.prepare(
      'SELECT image_hash FROM photos WHERE id = ? AND user_id = ? AND is_deleted = 0'
    ).get(photoId, userId);
    return result?.image_hash || null;
  }

  /**
   * Manuelle Korrektur der Kategorie/Metadaten durch User
   * Speichert auch Feedback für KI-Training
   */
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
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    
    if (corrections.category !== undefined) {
      updates.push('primary_category = ?');
      params.push(corrections.category);
      updates.push('primary_category_display = ?');
      params.push(corrections.categoryDisplay || corrections.category);
      updates.push('primary_confidence = ?');
      params.push(1.0); // Manuelle Korrektur = 100% Confidence
    }
    
    if (corrections.locationName !== undefined) {
      updates.push('location_name = ?');
      params.push(corrections.locationName);
    }
    
    if (corrections.latitude !== undefined) {
      updates.push('latitude = ?');
      params.push(corrections.latitude);
    }
    
    if (corrections.longitude !== undefined) {
      updates.push('longitude = ?');
      params.push(corrections.longitude);
    }
    
    if (updates.length === 0) return photo;
    
    updates.push('updated_at = ?');
    params.push(now);
    params.push(photoId);
    params.push(userId);
    
    this.db.prepare(`
      UPDATE photos SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(...params);
    
    return this.getPhoto(userId, photoId);
  }

  /**
   * Batch-Korrektur für mehrere Fotos
   */
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
    this.db.prepare('UPDATE photos SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now, now, photoId, userId);
    
    // User Storage aktualisieren
    this.db.prepare(`
      UPDATE photo_users SET storage_used = storage_used - ?, photo_count = photo_count - 1, updated_at = ? WHERE id = ?
    `).run(photo.size, now, userId);
    
    // Album photo_count aktualisieren
    if (photo.albumId) {
      this.db.prepare('UPDATE albums SET photo_count = photo_count - 1, updated_at = ? WHERE id = ?').run(now, photo.albumId);
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
    
    this.db.prepare('UPDATE photos SET album_id = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(albumId, now, photoId, userId);
    
    // Album photo_counts aktualisieren
    if (oldAlbumId) {
      this.db.prepare('UPDATE albums SET photo_count = photo_count - 1, updated_at = ? WHERE id = ?').run(now, oldAlbumId);
    }
    if (albumId) {
      this.db.prepare('UPDATE albums SET photo_count = photo_count + 1, updated_at = ? WHERE id = ?').run(now, albumId);
    }
    
    return this.getPhoto(userId, photoId);
  }

  // ==================== APP SYNC ====================

  async getPhotosForSync(userId: string, since: number = 0): Promise<Photo[]> {
    const photos = this.db.prepare(`
      SELECT * FROM photos 
      WHERE user_id = ? AND updated_at > ? AND is_deleted = 0
      ORDER BY updated_at ASC
    `).all(userId, since);
    
    return photos.map((p: unknown) => this.mapPhoto(p));
  }

  async updateSyncTimestamp(userId: string): Promise<void> {
    const now = Date.now();
    this.db.prepare('UPDATE photo_users SET last_sync_at = ?, updated_at = ? WHERE id = ?').run(now, now, userId);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapUser(row: any): PhotosUser {
    return {
      id: row.id,
      plan: row.plan,
      storageUsed: row.storage_used,
      storageLimit: row.storage_limit,
      photoCount: row.photo_count,
      albumCount: row.album_count,
      lastSyncAt: row.last_sync_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAlbum(row: any): PhotoAlbum {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      coverPhotoId: row.cover_photo_id,
      photoCount: row.photo_count,
      isDefault: row.is_default === 1,
      isDeleted: row.is_deleted === 1,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPhoto(row: any): Photo {
    return {
      id: row.id,
      userId: row.user_id,
      albumId: row.album_id,
      filename: row.filename,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      size: row.size,
      width: row.width,
      height: row.height,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      takenAt: row.taken_at,
      latitude: row.latitude,
      longitude: row.longitude,
      locationName: row.location_name,
      camera: row.camera,
      // KI-Klassifizierung
      primaryCategory: row.primary_category,
      primaryCategoryDisplay: row.primary_category_display,
      primaryConfidence: row.primary_confidence,
      detectedCategories: row.detected_categories,
      detectedObjects: row.detected_objects,
      metadataCategories: row.metadata_categories,
      classifiedAt: row.classified_at,
      // Status
      isFavorite: row.is_favorite === 1,
      isDeleted: row.is_deleted === 1,
      deletedAt: row.deleted_at,
      syncedFromApp: row.synced_from_app === 1,
      appDeviceId: row.app_device_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==================== ERINNERUNGEN ====================
  
  /**
   * Findet Fotos von vor X Jahren (gleicher Tag/Monat)
   * Gibt Erinnerungen zurück wenn Fotos aus vergangenen Jahren existieren
   */
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
    const currentMonth = now.getMonth() + 1; // 1-12
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
    
    // Suche Fotos von vor 1-10 Jahren am gleichen Tag (+/- 3 Tage für mehr Treffer)
    for (let yearsAgo = 1; yearsAgo <= 10; yearsAgo++) {
      const targetYear = now.getFullYear() - yearsAgo;
      
      // Berechne Zeitfenster: 3 Tage vor und nach dem aktuellen Datum
      const startDate = new Date(targetYear, currentMonth - 1, currentDay - 3);
      const endDate = new Date(targetYear, currentMonth - 1, currentDay + 3, 23, 59, 59);
      
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();
      
      // Suche Fotos in diesem Zeitraum (nach taken_at oder created_at)
      const stmt = this.db.prepare(`
        SELECT * FROM photos 
        WHERE user_id = ? 
        AND is_deleted = 0
        AND (
          (taken_at IS NOT NULL AND taken_at >= ? AND taken_at <= ?)
          OR (taken_at IS NULL AND created_at >= ? AND created_at <= ?)
        )
        ORDER BY COALESCE(taken_at, created_at) DESC
        LIMIT 20
      `);
      
      const rows = stmt.all(userId, startTimestamp, endTimestamp, startTimestamp, endTimestamp);
      
      if (rows.length > 0) {
        const photos = rows.map((row: Record<string, unknown>) => this.mapPhoto(row));
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

  /**
   * Holt alle Fotos mit GPS-Koordinaten ODER location_name, gruppiert nach Ort
   */
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

    // Hole alle Fotos mit GPS-Daten ODER location_name
    // Wichtig: Auch Fotos mit nur location_name (ohne GPS) sollen angezeigt werden!
    const stmt = this.db.prepare(`
      SELECT * FROM photos 
      WHERE user_id = ? 
      AND is_deleted = 0 
      AND (
        (latitude IS NOT NULL AND longitude IS NOT NULL)
        OR (location_name IS NOT NULL AND location_name != '')
      )
      ORDER BY COALESCE(taken_at, created_at) DESC
    `);
    
    const rows = stmt.all(userId);
    const photos = rows.map((row: Record<string, unknown>) => this.mapPhoto(row));

    // Zähle Fotos ohne Standort (weder GPS noch location_name)
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM photos 
      WHERE user_id = ? 
      AND is_deleted = 0 
      AND (latitude IS NULL OR longitude IS NULL)
      AND (location_name IS NULL OR location_name = '')
    `);
    const photosWithoutLocation = countStmt.get(userId)?.count || 0;

    // Gruppiere nach location_name oder Koordinaten-Raster
    const locationMap = new Map<string, {
      locationName: string;
      latitude: number;
      longitude: number;
      photos: Photo[];
    }>();

    for (const photo of photos) {
      // Verwende location_name wenn vorhanden, sonst Koordinaten-Hash
      const key = photo.locationName || 
        (photo.latitude && photo.longitude 
          ? `${photo.latitude.toFixed(2)},${photo.longitude.toFixed(2)}`
          : 'unknown');
      
      if (key === 'unknown') continue; // Sollte nicht passieren wegen SQL-Filter
      
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

    // Konvertiere zu Array und sortiere nach Anzahl
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

  /**
   * Aktualisiert den Ortsnamen für ein Foto
   */
  async updateLocationName(userId: string, photoId: string, locationName: string): Promise<boolean> {
    const photo = await this.getPhoto(userId, photoId);
    if (!photo) {
      return false;
    }

    const now = Date.now();
    this.db.prepare(`
      UPDATE photos 
      SET location_name = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(locationName, now, photoId, userId);

    return true;
  }

  /**
   * Holt Fotos die GPS haben aber keinen location_name
   * Für Batch-Geocoding
   */
  async getPhotosNeedingGeocoding(userId: string, limit: number = 50): Promise<Photo[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM photos 
      WHERE user_id = ? 
      AND is_deleted = 0 
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND location_name IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `);
    
    const rows = stmt.all(userId, limit);
    return rows.map((row: Record<string, unknown>) => this.mapPhoto(row));
  }

  /**
   * Holt alle einzigartigen Kategorien aus der Datenbank
   * Dies sind die ECHTEN Kategorien (inkl. manuell zugewiesener)
   */
  async getCategoriesFromDb(userId: string): Promise<Array<{
    key: string;
    display: string;
    count: number;
    type: 'scene' | 'object' | 'time' | 'custom';
  }>> {
    const stmt = this.db.prepare(`
      SELECT 
        primary_category as key,
        primary_category_display as display,
        COUNT(*) as count
      FROM photos 
      WHERE user_id = ? 
      AND is_deleted = 0 
      AND primary_category IS NOT NULL
      AND primary_category != ''
      GROUP BY primary_category
      ORDER BY count DESC
    `);
    
    const rows = stmt.all(userId) as Array<{ key: string; display: string; count: number }>;
    
    return rows.map(row => ({
      key: row.key,
      display: row.display || row.key,
      count: row.count,
      type: row.key.startsWith('custom_') ? 'custom' as const : 'scene' as const,
    }));
  }

  /**
   * Holt Zeit-basierte Kategorien (Jahre, Monate) aus der Datenbank
   */
  async getTimeCategories(userId: string): Promise<Array<{
    key: string;
    display: string;
    count: number;
    type: 'time';
  }>> {
    // Jahre
    const yearStmt = this.db.prepare(`
      SELECT 
        strftime('%Y', datetime(COALESCE(taken_at, created_at) / 1000, 'unixepoch')) as year,
        COUNT(*) as count
      FROM photos 
      WHERE user_id = ? 
      AND is_deleted = 0
      GROUP BY year
      ORDER BY year DESC
    `);
    
    const years = yearStmt.all(userId) as Array<{ year: string; count: number }>;
    
    // Monate des aktuellen Jahres
    const currentYear = new Date().getFullYear().toString();
    const monthStmt = this.db.prepare(`
      SELECT 
        strftime('%m', datetime(COALESCE(taken_at, created_at) / 1000, 'unixepoch')) as month,
        COUNT(*) as count
      FROM photos 
      WHERE user_id = ? 
      AND is_deleted = 0
      AND strftime('%Y', datetime(COALESCE(taken_at, created_at) / 1000, 'unixepoch')) = ?
      GROUP BY month
      ORDER BY month DESC
    `);
    
    const months = monthStmt.all(userId, currentYear) as Array<{ month: string; count: number }>;
    
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    
    const result: Array<{ key: string; display: string; count: number; type: 'time' }> = [];
    
    // Jahre hinzufügen
    years.forEach(y => {
      if (y.year) {
        result.push({
          key: `year_${y.year}`,
          display: y.year,
          count: y.count,
          type: 'time',
        });
      }
    });
    
    // Monate hinzufügen
    months.forEach(m => {
      if (m.month) {
        const monthIndex = parseInt(m.month, 10) - 1;
        result.push({
          key: `month_${currentYear}_${m.month}`,
          display: monthNames[monthIndex] || m.month,
          count: m.count,
          type: 'time',
        });
      }
    });
    
    return result;
  }

  // ==================== SPEICHERANALYSE ====================

  /**
   * Detaillierte Speicheranalyse für die Speicherverwaltung
   */
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
    await this.getOrCreateUser(userId);
    
    // Basis-Speicherinfo
    const userInfo = this.db.prepare('SELECT * FROM photo_users WHERE id = ?').get(userId) as {
      storage_used: number;
      storage_limit: number;
      photo_count: number;
      created_at: number;
    };
    
    const totalUsed = userInfo?.storage_used || 0;
    const totalLimit = userInfo?.storage_limit || PHOTO_STORAGE_LIMITS.free;
    const photoCount = userInfo?.photo_count || 0;
    
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
      people: 'users',
      document: 'file-text',
      animal: 'paw-print',
      vehicle: 'car',
      building: 'building',
      other: 'image',
    };
    
    const categories = categoryStats.map(cat => ({
      key: cat.category,
      name: cat.display,
      size: cat.total_size,
      count: cat.count,
      icon: categoryIcons[cat.category] || 'image',
    }));
    
    // Große Dateien (> 5MB)
    const largeFiles = this.db.prepare(`
      SELECT id, original_filename as filename, size, thumbnail_path as thumbnailPath, taken_at as takenAt
      FROM photos 
      WHERE user_id = ? AND is_deleted = 0 AND size > 5242880
      ORDER BY size DESC
      LIMIT 50
    `).all(userId) as Array<{
      id: string;
      filename: string;
      size: number;
      thumbnailPath: string | null;
      takenAt: number | null;
    }>;
    
    // Unscharfe Fotos (niedrige Confidence oder kleines Bild)
    // Hier als Platzhalter - echte Blur-Detection wäre aufwändiger
    const blurryPhotos = this.db.prepare(`
      SELECT id, original_filename as filename, size, thumbnail_path as thumbnailPath
      FROM photos 
      WHERE user_id = ? AND is_deleted = 0 
      AND (width < 500 OR height < 500 OR primary_confidence < 0.3)
      ORDER BY size DESC
      LIMIT 20
    `).all(userId) as Array<{
      id: string;
      filename: string;
      size: number;
      thumbnailPath: string | null;
    }>;
    
    // Upload-Rate berechnen (durchschnittlich pro Monat)
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
      categories,
      largeFiles,
      blurryPhotos,
      unsupportedVideos: [], // Videos werden aktuell nicht unterstützt
      estimatedYearsRemaining: Math.min(Math.max(yearsRemaining, 0), 99),
      uploadRatePerMonth,
    };
  }

  /**
   * Fotos nach Kategorie-Größe löschen (Speicherplatz freigeben)
   */
  async deletePhotosByCategory(userId: string, category: string): Promise<{ deletedCount: number; freedSpace: number }> {
    const photos = this.db.prepare(`
      SELECT id, size FROM photos 
      WHERE user_id = ? AND primary_category = ? AND is_deleted = 0
    `).all(userId, category) as Array<{ id: string; size: number }>;
    
    let freedSpace = 0;
    let deletedCount = 0;
    
    for (const photo of photos) {
      await this.deletePhoto(userId, photo.id);
      freedSpace += photo.size;
      deletedCount++;
    }
    
    return { deletedCount, freedSpace };
  }

  /**
   * Konvertiert Fotos in niedrigere Qualität (Speicherplatz sparen)
   * Gibt zurück wie viel Speicher freigegeben wurde
   */
  async convertToCompressedQuality(userId: string): Promise<{ convertedCount: number; freedSpace: number }> {
    // Diese Funktion würde die Originalbilder durch komprimierte Versionen ersetzen
    // Für jetzt nur ein Platzhalter
    return { convertedCount: 0, freedSpace: 0 };
  }

  // ==================== BENUTZERDEFINIERTE KATEGORIEN ====================

  /**
   * Holt alle benutzerdefinierten Kategorien für einen User
   */
  async getCustomCategories(userId: string): Promise<Array<{ id: string; key: string; display: string; group: string }>> {
    const rows = this.db.prepare(`
      SELECT id, key, display, group_name as 'group'
      FROM photo_custom_categories
      WHERE user_id = ?
      ORDER BY display
    `).all(userId) as Array<{ id: string; key: string; display: string; group: string }>;
    
    return rows;
  }

  /**
   * Erstellt eine neue benutzerdefinierte Kategorie
   */
  async createCustomCategory(userId: string, display: string, group: string = 'spezial'): Promise<{ id: string; key: string; display: string; group: string }> {
    // Sicherstellen, dass der User existiert (wegen FOREIGN KEY)
    await this.getOrCreateUser(userId);
    
    // Key aus Display-Name generieren
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
    
    try {
      this.db.prepare(`
        INSERT INTO photo_custom_categories (id, user_id, key, display, group_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userId, key, display, group, now);
      
      return { id, key, display, group };
    } catch {
      // Kategorie existiert bereits - zurückgeben
      const existing = this.db.prepare(`
        SELECT id, key, display, group_name as 'group'
        FROM photo_custom_categories
        WHERE user_id = ? AND key = ?
      `).get(userId, key) as { id: string; key: string; display: string; group: string } | undefined;
      
      if (existing) {
        return existing;
      }
      throw new Error('Kategorie konnte nicht erstellt werden');
    }
  }

  /**
   * Löscht eine benutzerdefinierte Kategorie
   */
  async deleteCustomCategory(userId: string, categoryId: string): Promise<boolean> {
    const result = this.db.prepare(`
      DELETE FROM photo_custom_categories
      WHERE id = ? AND user_id = ?
    `).run(categoryId, userId);
    
    return result.changes > 0;
  }
}

// Singleton exportieren
export const photosService = new PhotosService();
