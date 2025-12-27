/**
 * Taskilo Drive API Service
 * 
 * Dieser Service kommuniziert mit der Hetzner Drive API.
 * Die API verwendet Folder-IDs (nicht Pfade) fuer die Navigation.
 */

interface DriveApiFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  storagePath: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

interface DriveApiFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

interface DriveStorageInfo {
  used: number;
  limit: number;
  plan: 'free' | 'plus' | 'pro';
  usedPercent: number;
}

interface DriveContentsResponse {
  success: boolean;
  files: DriveApiFile[];
  folders: DriveApiFolder[];
  folder?: DriveApiFolder;
  breadcrumbs?: Array<{ id: string | null; name: string }>;
  error?: string;
}

// Legacy DriveFile Interface (kompatibel mit bestehendem UI)
export interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  createdAt: number;
  modifiedAt: number;
  path: string;
  starred?: boolean;
  folderId?: string | null; // Neu: die echte Folder-ID
  parentId?: string | null; // Fuer Ordner: Parent Folder ID
}

export class DriveApiService {
  private static userId: string | null = null;

  static setUserId(userId: string) {
    this.userId = userId;
  }

  private static async fetchWithAuth(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.userId) {
      throw new Error('Nicht angemeldet');
    }

    return fetch(`/api/webmail/drive${endpoint}`, {
      ...options,
      headers: {
        'x-user-id': this.userId,
        ...options.headers,
      },
    });
  }

  // Speicherinfo abrufen
  static async getStorageInfo(): Promise<DriveStorageInfo> {
    const response = await this.fetchWithAuth('/storage');
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der Speicherinfo');
    }
    return data.storage;
  }

  // Ordner-Inhalte laden (Root oder spezifischer Ordner)
  static async getFolderContents(folderId: string | null = null): Promise<{
    files: DriveFile[];
    currentFolder: DriveApiFolder | null;
    breadcrumbs: Array<{ id: string; name: string }>;
  }> {
    // Next.js API Route: /folders für Root, /folders/{id} für spezifischen Ordner
    // Die API Route leitet intern an den Hetzner-Server weiter
    const endpoint = folderId ? `/folders/${folderId}` : '/folders';
    const response = await this.fetchWithAuth(endpoint);
    const data: DriveContentsResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Laden der Inhalte');
    }

    // Konvertiere API-Daten zu Legacy-Format
    const files: DriveFile[] = [];
    
    // Ordner hinzufuegen
    for (const folder of data.folders || []) {
      files.push({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        createdAt: folder.createdAt,
        modifiedAt: folder.updatedAt,
        path: '/', // Pfad wird nicht mehr benoetigt, aber fuer Kompatibilitaet
        parentId: folder.parentId,
      });
    }

    // Dateien hinzufuegen
    for (const file of data.files || []) {
      files.push({
        id: file.id,
        name: file.name,
        type: 'file',
        mimeType: file.mimeType,
        size: file.size,
        createdAt: file.createdAt,
        modifiedAt: file.updatedAt,
        path: '/',
        folderId: file.folderId,
      });
    }

    // Breadcrumbs direkt aus API-Antwort verwenden (null -> '' konvertieren)
    const breadcrumbs = (data.breadcrumbs || [{ id: null, name: 'Meine Ablage' }]).map(b => ({
      id: b.id || '',
      name: b.name,
    }));

    return {
      files,
      currentFolder: data.folder || null,
      breadcrumbs,
    };
  }

  // Neuen Ordner erstellen
  static async createFolder(name: string, parentId: string | null = null): Promise<DriveFile> {
    const response = await this.fetchWithAuth('/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Erstellen des Ordners');
    }

    return {
      id: data.folder.id,
      name: data.folder.name,
      type: 'folder',
      createdAt: data.folder.createdAt,
      modifiedAt: data.folder.updatedAt,
      path: '/',
      parentId: data.folder.parentId,
    };
  }

  // Datei hochladen
  static async uploadFile(
    file: File,
    folderId: string | null = null,
    onProgress?: (percent: number) => void
  ): Promise<DriveFile> {
    if (!this.userId) {
      throw new Error('Nicht angemeldet');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = (event.loaded / event.total) * 100;
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          if (data.success && data.file) {
            resolve({
              id: data.file.id,
              name: data.file.name,
              type: 'file',
              mimeType: data.file.mimeType,
              size: data.file.size,
              createdAt: data.file.createdAt,
              modifiedAt: data.file.updatedAt,
              path: '/',
              folderId: data.file.folderId,
            });
          } else {
            reject(new Error(data.error || 'Upload fehlgeschlagen'));
          }
        } else {
          reject(new Error('Upload fehlgeschlagen'));
        }
      };

      xhr.onerror = () => reject(new Error('Netzwerkfehler'));

      xhr.open('POST', '/api/webmail/drive/files/upload');
      xhr.setRequestHeader('x-user-id', this.userId!);
      xhr.send(formData);
    });
  }

  // Datei herunterladen
  static async downloadFile(fileId: string, fileName: string): Promise<void> {
    const response = await this.fetchWithAuth(`/files/${fileId}`);

    if (!response.ok) {
      throw new Error('Download fehlgeschlagen');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Datei/Ordner umbenennen
  static async rename(
    id: string,
    type: 'file' | 'folder',
    newName: string
  ): Promise<DriveFile> {
    const endpoint = type === 'folder' ? `/folders/${id}` : `/files/${id}`;
    const response = await this.fetchWithAuth(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Umbenennen');
    }

    const item = type === 'folder' ? data.folder : data.file;
    return {
      id: item.id,
      name: item.name,
      type,
      mimeType: item.mimeType,
      size: item.size,
      createdAt: item.createdAt,
      modifiedAt: item.updatedAt,
      path: '/',
      folderId: item.folderId,
      parentId: item.parentId,
    };
  }

  // Datei/Ordner loeschen (Soft Delete)
  static async delete(id: string, type: 'file' | 'folder'): Promise<void> {
    const endpoint = type === 'folder' ? `/folders/${id}` : `/files/${id}`;
    const response = await this.fetchWithAuth(endpoint, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Fehler beim Loeschen');
    }
  }

  // Datei-Blob fuer Preview abrufen
  static async getFileBlob(fileId: string): Promise<Blob> {
    const response = await this.fetchWithAuth(`/files/${fileId}`);

    if (!response.ok) {
      throw new Error('Datei konnte nicht geladen werden');
    }

    return response.blob();
  }
}
