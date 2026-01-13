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
}
