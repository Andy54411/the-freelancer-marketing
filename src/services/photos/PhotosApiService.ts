/**
 * Taskilo Photos API Service
 * 
 * Frontend-Service für die Kommunikation mit der Hetzner Photos API.
 * Separater Speicherbereich nur für Fotos (nicht Drive).
 */

const HETZNER_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
const API_KEY = process.env.NEXT_PUBLIC_WEBMAIL_API_KEY || '';

// Interfaces
export interface PhotoAlbum {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  photoCount: number;
  isDefault: boolean;
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
  takenAt: number | null;
  latitude: number | null;
  longitude: number | null;
  camera: string | null;
  // KI-Klassifizierung
  primaryCategory: string | null;
  primaryCategoryDisplay: string | null;
  primaryConfidence: number | null;
  detectedCategories: string | null;
  detectedObjects: string | null;
  metadataCategories: string | null;
  classifiedAt: number | null;
  // Status
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  syncedFromApp: boolean;
  appDeviceId: string | null;
  createdAt: number;
  updatedAt: number;
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

interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  [key: string]: T | boolean | string | undefined;
}

export class PhotosApiService {
  private static userId: string = '';

  static setUserId(userId: string): void {
    this.userId = userId;
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${HETZNER_API_URL}/api/photos${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-user-id': this.userId,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Unbekannter Fehler');
    }

    return data as unknown as T;
  }

  // ==================== STORAGE ====================

  static async getStorageInfo(): Promise<PhotoStorageInfo> {
    const result = await this.request<{ storage: PhotoStorageInfo }>('/storage');
    return result.storage;
  }

  // ==================== ERINNERUNGEN ====================

  static async getMemories(): Promise<{ 
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
    const result = await this.request<{ memories: Array<{
      id: string;
      yearsAgo: number;
      title: string;
      subtitle: string;
      coverPhotoId: string;
      coverPhotoUrl: string;
      photoCount: number;
      photos: Photo[];
    }> }>('/memories');
    return { memories: result.memories };
  }

  // ==================== ALBUMS ====================

  static async getAlbums(): Promise<PhotoAlbum[]> {
    const result = await this.request<{ albums: PhotoAlbum[] }>('/albums');
    return result.albums;
  }

  static async getAlbum(albumId: string): Promise<PhotoAlbum> {
    const result = await this.request<{ album: PhotoAlbum }>(`/albums/${albumId}`);
    return result.album;
  }

  static async getAlbumContents(
    albumId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AlbumContents> {
    const result = await this.request<AlbumContents>(
      `/albums/${albumId}/contents?limit=${limit}&offset=${offset}`
    );
    return {
      album: result.album,
      photos: result.photos,
      totalCount: result.totalCount,
    };
  }

  static async createAlbum(name: string, description?: string): Promise<PhotoAlbum> {
    const result = await this.request<{ album: PhotoAlbum }>('/albums', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    return result.album;
  }

  static async renameAlbum(albumId: string, name: string): Promise<PhotoAlbum> {
    const result = await this.request<{ album: PhotoAlbum }>(`/albums/${albumId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    return result.album;
  }

  static async deleteAlbum(albumId: string): Promise<void> {
    await this.request(`/albums/${albumId}`, {
      method: 'DELETE',
    });
  }

  // ==================== PHOTOS ====================

  static async getPhotos(options: {
    albumId?: string;
    limit?: number;
    offset?: number;
    favoritesOnly?: boolean;
  } = {}): Promise<{ photos: Photo[]; total: number }> {
    const params = new URLSearchParams();
    if (options.albumId) params.append('albumId', options.albumId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.favoritesOnly) params.append('favorites', 'true');

    const result = await this.request<{ photos: Photo[]; total: number }>(
      `/?${params.toString()}`
    );
    return { photos: result.photos, total: result.total };
  }

  static async getFavorites(limit: number = 50, offset: number = 0): Promise<{ photos: Photo[]; total: number }> {
    const result = await this.request<{ photos: Photo[]; total: number }>(
      `/favorites?limit=${limit}&offset=${offset}`
    );
    return { photos: result.photos, total: result.total };
  }

  static async getPhoto(photoId: string): Promise<Photo> {
    const result = await this.request<{ photo: Photo }>(`/${photoId}`);
    return result.photo;
  }

  static async uploadPhoto(
    file: File,
    albumId?: string,
    metadata?: {
      takenAt?: number;
      latitude?: number;
      longitude?: number;
      camera?: string;
    }
  ): Promise<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    if (albumId) formData.append('albumId', albumId);
    if (metadata?.takenAt) formData.append('takenAt', metadata.takenAt.toString());
    if (metadata?.latitude) formData.append('latitude', metadata.latitude.toString());
    if (metadata?.longitude) formData.append('longitude', metadata.longitude.toString());
    if (metadata?.camera) formData.append('camera', metadata.camera);

    const url = `${HETZNER_API_URL}/api/photos/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'x-user-id': this.userId,
      },
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Upload fehlgeschlagen');
    }

    return data.photo;
  }

  static async uploadMultiplePhotos(
    files: File[],
    albumId?: string
  ): Promise<{ uploaded: number; failed: number; photos: Photo[]; errors?: Array<{ filename: string; error: string }> }> {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    if (albumId) formData.append('albumId', albumId);

    const url = `${HETZNER_API_URL}/api/photos/upload-multiple`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'x-user-id': this.userId,
      },
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Upload fehlgeschlagen');
    }

    return {
      uploaded: data.uploaded,
      failed: data.failed,
      photos: data.photos,
      errors: data.errors,
    };
  }

  static async toggleFavorite(photoId: string): Promise<Photo> {
    const result = await this.request<{ photo: Photo }>(`/${photoId}/favorite`, {
      method: 'POST',
    });
    return result.photo;
  }

  static async moveToAlbum(photoId: string, albumId: string | null): Promise<Photo> {
    const result = await this.request<{ photo: Photo }>(`/${photoId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ albumId }),
    });
    return result.photo;
  }

  static async deletePhoto(photoId: string): Promise<void> {
    await this.request(`/${photoId}`, {
      method: 'DELETE',
    });
  }

  // ==================== URLS ====================

  static getPhotoViewUrl(photoId: string): string {
    return `${HETZNER_API_URL}/api/photos/${photoId}/view?userId=${encodeURIComponent(this.userId)}`;
  }

  static getPhotoDownloadUrl(photoId: string): string {
    return `${HETZNER_API_URL}/api/photos/${photoId}/download?userId=${encodeURIComponent(this.userId)}`;
  }

  // ==================== APP SYNC ====================

  static async getChangesForSync(since: number = 0): Promise<{ photos: Photo[]; syncedAt: number }> {
    const result = await this.request<{ photos: Photo[]; syncedAt: number }>(
      `/sync/changes?since=${since}`
    );
    return { photos: result.photos, syncedAt: result.syncedAt };
  }

  static async markSyncComplete(): Promise<{ syncedAt: number }> {
    const result = await this.request<{ syncedAt: number }>('/sync/complete', {
      method: 'POST',
    });
    return { syncedAt: result.syncedAt };
  }

  // ==================== KI KLASSIFIKATION ====================

  /**
   * Klassifiziert ein Foto mit der Taskilo KI
   * Erkennt automatisch: Szenen, Objekte, Personen, Metadaten
   */
  static async classifyPhoto(file: File): Promise<PhotoClassification> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extract_embedding', 'false');

    const TASKILO_KI_URL = process.env.NEXT_PUBLIC_TASKILO_KI_URL || 'https://mail.taskilo.de';
    
    const response = await fetch(`${TASKILO_KI_URL}/api/v1/photos/photo/classify/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.detail || 'Klassifikation fehlgeschlagen');
    }

    return data as PhotoClassification;
  }

  /**
   * Holt dynamische Kategorien für den Benutzer
   * Kategorien entstehen aus den tatsächlich vorhandenen Fotos (wie Google Photos)
   */
  static async getDynamicCategories(minCount: number = 1, limit: number = 50): Promise<DynamicCategory[]> {
    const TASKILO_KI_URL = process.env.NEXT_PUBLIC_TASKILO_KI_URL || 'https://mail.taskilo.de';
    
    const response = await fetch(
      `${TASKILO_KI_URL}/api/v1/photos/photo/dynamic-categories?user_id=${encodeURIComponent(this.userId)}&min_count=${minCount}&limit=${limit}`
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.detail || 'Kategorien laden fehlgeschlagen');
    }

    return data.categories || [];
  }

  /**
   * Fügt ein Foto zur KI-Bibliothek hinzu, klassifiziert es und speichert die Kategorien
   */
  static async addToKiLibrary(file: File, photoId: string): Promise<{ 
    categories: string[]; 
    image_hash?: string;
    classification?: PhotoClassification;
  }> {
    // 1. Foto klassifizieren
    let classification: PhotoClassification | undefined;
    try {
      classification = await this.classifyPhoto(file);
    } catch {
      // Klassifizierung fehlgeschlagen - trotzdem fortfahren
    }
    
    // 2. Zur KI-Bibliothek hinzufügen
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', this.userId);
    formData.append('photo_id', photoId);

    const TASKILO_KI_URL = process.env.NEXT_PUBLIC_TASKILO_KI_URL || 'https://mail.taskilo.de';
    
    const response = await fetch(`${TASKILO_KI_URL}/api/v1/photos/photo/add-to-library`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.detail || 'Hinzufügen zur Bibliothek fehlgeschlagen');
    }
    
    // 3. Kategorien in Hetzner Photos-API speichern
    if (classification) {
      try {
        await this.saveAiCategories(photoId, classification);
      } catch {
        // Speichern fehlgeschlagen - ignorieren
      }
    }

    return { 
      categories: data.all_categories || [],
      image_hash: data.image_hash,
      classification,
    };
  }
  
  /**
   * Speichert KI-Kategorien für ein Foto in der Hetzner Photos-API
   */
  static async saveAiCategories(photoId: string, classification: PhotoClassification): Promise<Photo> {
    return this.request<Photo>(`/${photoId}/ai-categories`, {
      method: 'PATCH',
      body: JSON.stringify({
        primaryCategory: classification.primary_category,
        primaryCategoryDisplay: classification.primary_category_display,
        primaryConfidence: classification.primary_confidence,
        detectedCategories: classification.detected_categories,
        detectedObjects: classification.detected_objects,
        metadataCategories: classification.metadata_categories,
      }),
    });
  }
}

// ==================== KI TYPES ====================

export interface PhotoClassification {
  success: boolean;
  primary_category: string;
  primary_category_display: string;
  primary_confidence: number;
  detected_categories: DetectedCategory[];
  detected_objects: DetectedObject[];
  metadata_categories: string[];
  metadata?: PhotoMetadata;
  processing_time_ms: number;
  model_version: string;
}

export interface DetectedCategory {
  category: string;
  display_name: string;
  confidence: number;
  source?: string;
}

export interface DetectedObject {
  object: string;
  object_de?: string;
  confidence: number;
}

export interface PhotoMetadata {
  date_taken?: string;
  year?: number;
  month?: number;
  day_of_week?: string;
  time_of_day?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  location?: {
    name?: string;
    city?: string;
    country?: string;
  };
  camera?: {
    make?: string;
    model?: string;
  };
  is_screenshot: boolean;
  is_selfie: boolean;
  dimensions?: {
    width: number;
    height: number;
    orientation: string;
  };
}

export interface DynamicCategory {
  key: string;
  display_name: string;
  count: number;
  thumbnail_url?: string;
  type: 'time' | 'location' | 'object' | 'scene';
}

// ==================== STILLES LERNEN ====================

/**
 * Sendet Feedback an die KI (still im Hintergrund).
 * User merkt nichts davon - DSGVO-konform.
 */
export class SilentLearning {
  private static imageHashes: Map<string, string> = new Map();
  private static TASKILO_KI_URL = process.env.NEXT_PUBLIC_TASKILO_KI_URL || 'https://mail.taskilo.de';
  
  /**
   * Speichert image_hash aus Klassifikation für späteres Feedback
   */
  static storeImageHash(photoId: string, imageHash: string): void {
    this.imageHashes.set(photoId, imageHash);
    
    // Nach 1 Stunde aufräumen
    setTimeout(() => {
      this.imageHashes.delete(photoId);
    }, 3600000);
  }
  
  /**
   * Ruft image_hash für ein Foto ab
   */
  static getImageHash(photoId: string): string | undefined {
    return this.imageHashes.get(photoId);
  }
  
  /**
   * Sendet Feedback an die KI (fire and forget)
   */
  private static async sendFeedback(
    imageHash: string,
    feedbackType: string,
    options?: {
      newCategory?: string;
      searchQuery?: string;
    }
  ): Promise<void> {
    try {
      await fetch(`${this.TASKILO_KI_URL}/api/v1/photos/photo/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_hash: imageHash,
          feedback_type: feedbackType,
          new_category: options?.newCategory,
          search_query: options?.searchQuery,
        }),
      });
    } catch {
      // Still ignorieren - User soll nichts merken
    }
  }
  
  /**
   * User hat Kategorie implizit akzeptiert (nicht korrigiert nach 30 Sek)
   */
  static recordAccept(photoId: string): void {
    const hash = this.getImageHash(photoId);
    if (hash) {
      this.sendFeedback(hash, 'accept');
    }
  }
  
  /**
   * User hat Kategorie manuell korrigiert (SEHR wertvoll!)
   */
  static recordCorrection(photoId: string, newCategory: string): void {
    const hash = this.getImageHash(photoId);
    if (hash) {
      this.sendFeedback(hash, 'correct', { newCategory });
    }
  }
  
  /**
   * User hat über Suche gefunden und geklickt
   */
  static recordSearchClick(photoId: string, searchQuery: string): void {
    const hash = this.getImageHash(photoId);
    if (hash) {
      this.sendFeedback(hash, 'search', { searchQuery });
    }
  }
  
  /**
   * User hat als Favorit markiert
   */
  static recordFavorite(photoId: string): void {
    const hash = this.getImageHash(photoId);
    if (hash) {
      this.sendFeedback(hash, 'favorite');
    }
  }
  
  /**
   * User hat Foto gelöscht
   */
  static recordDelete(photoId: string): void {
    const hash = this.getImageHash(photoId);
    if (hash) {
      this.sendFeedback(hash, 'delete');
    }
  }
  
  /**
   * Startet Timer für implizite Akzeptanz (30 Sek ohne Korrektur)
   */
  static startAcceptTimer(photoId: string): void {
    setTimeout(() => {
      this.recordAccept(photoId);
    }, 30000);
  }
}
