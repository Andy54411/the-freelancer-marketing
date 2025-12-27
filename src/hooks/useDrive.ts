'use client';

import { useState, useCallback } from 'react';

export interface DriveFile {
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

export interface DriveFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface DriveStorageInfo {
  used: number;
  limit: number;
  plan: 'free' | 'plus' | 'pro';
  usedPercent: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ApiResponse<_T> {
  success: boolean;
  error?: string;
  files?: DriveFile[];
  folders?: DriveFolder[];
  file?: DriveFile;
  folder?: DriveFolder;
  storage?: DriveStorageInfo;
}

export function useDrive(userId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<DriveStorageInfo | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null);

  const apiCall = async <T,>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    if (!userId) {
      throw new Error('Nicht angemeldet');
    }

    const response = await fetch(`/api/webmail/drive${endpoint}`, {
      ...options,
      headers: {
        'x-user-id': userId,
        ...options?.headers,
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'API-Fehler');
    }
    return data;
  };

  // Speicherinfo laden
  const loadStorage = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiCall<DriveStorageInfo>('/storage');
      if (data.storage) {
        setStorage(data.storage);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Ordner-Inhalte laden
  const loadFolderContents = useCallback(async (folderId: string | null = null) => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = folderId ? `/folders/${folderId}/contents` : '/folders';
      const data = await apiCall<{ files: DriveFile[]; folders: DriveFolder[] }>(endpoint);
      
      setFiles(data.files || []);
      setFolders(data.folders || []);
      
      if (folderId && data.folder) {
        setCurrentFolder(data.folder as unknown as DriveFolder);
      } else {
        setCurrentFolder(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Ordner erstellen
  const createFolder = useCallback(async (name: string, parentId: string | null = null) => {
    if (!userId) return null;
    
    try {
      const data = await apiCall<{ folder: DriveFolder }>('/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      });
      
      if (data.folder) {
        setFolders(prev => [...prev, data.folder!]);
        return data.folder;
      }
      return null;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Ordner umbenennen
  const renameFolder = useCallback(async (folderId: string, name: string) => {
    if (!userId) return null;
    
    try {
      const data = await apiCall<{ folder: DriveFolder }>(`/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (data.folder) {
        setFolders(prev => prev.map(f => f.id === folderId ? data.folder! : f));
        return data.folder;
      }
      return null;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Ordner loeschen (Soft Delete)
  const deleteFolder = useCallback(async (folderId: string) => {
    if (!userId) return;
    
    try {
      await apiCall<void>(`/folders/${folderId}`, {
        method: 'DELETE',
      });
      
      setFolders(prev => prev.filter(f => f.id !== folderId));
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Datei hochladen
  const uploadFile = useCallback(async (
    file: File, 
    folderId: string | null = null,
    onProgress?: (percent: number) => void
  ) => {
    if (!userId) return null;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folderId', folderId);
      }

      // XHR fuer Progress Tracking
      return new Promise<DriveFile | null>((resolve, reject) => {
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
              setFiles(prev => [...prev, data.file]);
              loadStorage(); // Speicher aktualisieren
              resolve(data.file);
            } else {
              reject(new Error(data.error || 'Upload fehlgeschlagen'));
            }
          } else {
            reject(new Error('Upload fehlgeschlagen'));
          }
        };

        xhr.onerror = () => reject(new Error('Netzwerkfehler'));

        xhr.open('POST', '/api/webmail/drive/files/upload');
        xhr.setRequestHeader('x-user-id', userId);
        xhr.send(formData);
      });
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loadStorage]);

  // Datei herunterladen
  const downloadFile = useCallback(async (fileId: string, fileName: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/webmail/drive/files/${fileId}`, {
        headers: { 'x-user-id': userId },
      });

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
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Datei umbenennen
  const renameFile = useCallback(async (fileId: string, name: string) => {
    if (!userId) return null;
    
    try {
      const data = await apiCall<{ file: DriveFile }>(`/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (data.file) {
        setFiles(prev => prev.map(f => f.id === fileId ? data.file! : f));
        return data.file;
      }
      return null;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Datei loeschen (Soft Delete)
  const deleteFile = useCallback(async (fileId: string) => {
    if (!userId) return;
    
    try {
      await apiCall<void>(`/files/${fileId}`, {
        method: 'DELETE',
      });
      
      setFiles(prev => prev.filter(f => f.id !== fileId));
      loadStorage(); // Speicher aktualisieren
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loadStorage]);

  // Datei verschieben
  const moveFile = useCallback(async (fileId: string, folderId: string | null) => {
    if (!userId) return null;
    
    try {
      const data = await apiCall<{ file: DriveFile }>(`/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      
      if (data.file) {
        // Datei aus aktueller Liste entfernen (wird in anderem Ordner sein)
        setFiles(prev => prev.filter(f => f.id !== fileId));
        return data.file;
      }
      return null;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    // State
    isLoading,
    error,
    storage,
    files,
    folders,
    currentFolder,
    
    // Actions
    loadStorage,
    loadFolderContents,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFile,
    downloadFile,
    renameFile,
    deleteFile,
    moveFile,
    
    // Setters
    setError,
    setCurrentFolder,
  };
}
