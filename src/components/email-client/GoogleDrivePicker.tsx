'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, HardDrive, FolderOpen, FileText, Image, File, X } from 'lucide-react';

// Google API Types
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: {
          apiKey?: string;
          discoveryDocs?: string[];
        }) => Promise<void>;
        drive: {
          files: {
            list: (params: {
              q?: string;
              pageSize?: number;
              fields?: string;
              orderBy?: string;
            }) => Promise<{
              result: {
                files: GoogleDriveFile[];
              };
            }>;
            get: (params: {
              fileId: string;
              alt?: string;
              fields?: string;
            }) => Promise<{
              result: GoogleDriveFile;
              body?: string;
            }>;
          };
        };
        setToken: (token: { access_token: string }) => void;
      };
    };
    google: {
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: {
          DOCS: string;
          DOCS_IMAGES: string;
          DOCS_IMAGES_AND_VIDEOS: string;
          DOCUMENTS: string;
          SPREADSHEETS: string;
          PRESENTATIONS: string;
          FOLDERS: string;
          PDFS: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
        Feature: {
          MULTISELECT_ENABLED: string;
          NAV_HIDDEN: string;
        };
      };
    };
  }
}

interface GooglePickerBuilder {
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  enableFeature: (feature: string) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  setLocale: (locale: string) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GooglePickerView {
  setMimeTypes?: (mimeTypes: string) => GooglePickerView;
}

interface GooglePickerResponse {
  action: string;
  docs?: GoogleDriveFile[];
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  iconUrl?: string;
  thumbnailUrl?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
}

interface GoogleDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (files: GoogleDriveFile[]) => void;
  companyId: string;
  accessToken?: string;
  multiSelect?: boolean;
  mimeTypes?: string[];
  title?: string;
}

// Fallback simple file browser wenn Google Picker nicht verfügbar
function SimpleDriveBrowser({
  isOpen,
  onClose,
  onSelect,
  companyId,
  accessToken,
  multiSelect = true,
}: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);

  const loadFiles = useCallback(async (folderId: string = 'root') => {
    if (!accessToken) {
      setError('Kein Zugriffstoken verfügbar');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q='${folderId}'+in+parents+and+trashed=false` +
        `&fields=files(id,name,mimeType,size,iconLink,thumbnailLink,webViewLink,webContentLink)` +
        `&orderBy=folder,name` +
        `&pageSize=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Dateien');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFiles(currentFolder);
    }
  }, [isOpen, accessToken, currentFolder, loadFiles]);

  const handleFileClick = (file: GoogleDriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setFolderStack(prev => [...prev, { id: currentFolder, name: currentFolder === 'root' ? 'Mein Laufwerk' : 'Ordner' }]);
      setCurrentFolder(file.id);
    } else {
      if (multiSelect) {
        setSelectedFiles(prev => {
          const newSet = new Set(prev);
          if (newSet.has(file.id)) {
            newSet.delete(file.id);
          } else {
            newSet.add(file.id);
          }
          return newSet;
        });
      } else {
        setSelectedFiles(new Set([file.id]));
      }
    }
  };

  const handleNavigateBack = () => {
    if (folderStack.length > 0) {
      const newStack = [...folderStack];
      const parent = newStack.pop();
      setFolderStack(newStack);
      setCurrentFolder(parent?.id || 'root');
    }
  };

  const handleConfirm = () => {
    const selected = files.filter(f => selectedFiles.has(f.id));
    onSelect(selected);
    onClose();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <FolderOpen className="h-5 w-5 text-yellow-500" />;
    }
    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-green-500" />;
    }
    if (mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-[#14ad9f]" />
            Google Drive
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 border-b pb-2">
          <button
            onClick={() => {
              setCurrentFolder('root');
              setFolderStack([]);
            }}
            className="hover:text-[#14ad9f] transition-colors"
          >
            Mein Laufwerk
          </button>
          {folderStack.length > 0 && (
            <>
              <span>/</span>
              <button onClick={handleNavigateBack} className="hover:text-[#14ad9f] transition-colors">
                ...
              </button>
            </>
          )}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>{error}</p>
              <Button variant="outline" onClick={() => loadFiles(currentFolder)} className="mt-4">
                Erneut versuchen
              </Button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Keine Dateien in diesem Ordner
            </div>
          ) : (
            <div className="space-y-1">
              {files.map(file => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${selectedFiles.has(file.id) ? 'bg-[#14ad9f]/10 border border-[#14ad9f]' : 'hover:bg-gray-100'}
                  `}
                >
                  {getFileIcon(file.mimeType)}
                  <span className="flex-1 truncate">{file.name}</span>
                  {file.size && (
                    <span className="text-xs text-gray-400">
                      {(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-gray-500">
            {selectedFiles.size} Datei(en) ausgewählt
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedFiles.size === 0}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              Einfügen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GoogleDrivePicker({
  isOpen,
  onClose,
  onSelect,
  companyId,
  accessToken,
  multiSelect = true,
  title = 'Dateien aus Google Drive auswählen',
}: GoogleDrivePickerProps) {
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(accessToken || null);

  // Lade Access Token von der Company wenn nicht übergeben
  useEffect(() => {
    const fetchToken = async () => {
      if (accessToken) {
        setToken(accessToken);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/company/${companyId}/gmail-auth-status`);
        const data = await response.json();
        
        if (data.hasTokens && data.accessToken) {
          setToken(data.accessToken);
        }
      } catch (err) {
        console.error('Fehler beim Laden des Access Tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchToken();
    }
  }, [isOpen, companyId, accessToken]);

  // Lade Google Picker API
  useEffect(() => {
    if (!isOpen || !token) return;

    const loadGooglePicker = () => {
      // Check if already loaded
      if (window.google?.picker) {
        setPickerLoaded(true);
        return;
      }

      // Load Google API Script
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load('picker', () => {
          setPickerLoaded(true);
        });
      };
      document.body.appendChild(script);
    };

    loadGooglePicker();
  }, [isOpen, token]);

  // Öffne Google Picker wenn geladen
  useEffect(() => {
    if (!pickerLoaded || !token || !isOpen) return;

    try {
      const view = new (window.google.picker.PickerBuilder as unknown as new () => GooglePickerBuilder)();
      
      const picker = view
        .setOAuthToken(token)
        .setCallback((data: GooglePickerResponse) => {
          if (data.action === 'picked' && data.docs) {
            onSelect(data.docs);
            onClose();
          } else if (data.action === 'cancel') {
            onClose();
          }
        })
        .setTitle(title)
        .setLocale('de');

      if (multiSelect) {
        picker.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
      }

      picker.build().setVisible(true);
    } catch {
      // Fallback zum einfachen Browser
      setPickerLoaded(false);
    }
  }, [pickerLoaded, token, isOpen, onSelect, onClose, multiSelect, title]);

  // Zeige Loading oder Fallback Browser
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f] mb-4" />
            <p className="text-gray-600">Google Drive wird geladen...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback wenn kein Token oder Picker nicht geladen
  if (!token || !pickerLoaded) {
    return (
      <SimpleDriveBrowser
        isOpen={isOpen}
        onClose={onClose}
        onSelect={onSelect}
        companyId={companyId}
        accessToken={token || undefined}
        multiSelect={multiSelect}
      />
    );
  }

  // Google Picker wird extern geöffnet, Dialog nur für Loading State
  return null;
}

// Google Photos Picker Komponente
interface GooglePhotosPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (photos: GoogleDriveFile[]) => void;
  companyId: string;
  accessToken?: string;
  multiSelect?: boolean;
}

export function GooglePhotosPicker({
  isOpen,
  onClose,
  onSelect,
  companyId,
  accessToken,
  multiSelect = true,
}: GooglePhotosPickerProps) {
  const [photos, setPhotos] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [token, setToken] = useState<string | null>(accessToken || null);

  // Lade Token
  useEffect(() => {
    const fetchToken = async () => {
      if (accessToken) {
        setToken(accessToken);
        return;
      }

      try {
        const response = await fetch(`/api/company/${companyId}/gmail-auth-status`);
        const data = await response.json();
        
        if (data.hasTokens && data.accessToken) {
          setToken(data.accessToken);
        }
      } catch (err) {
        console.error('Fehler beim Laden des Access Tokens:', err);
      }
    };

    if (isOpen) {
      fetchToken();
    }
  }, [isOpen, companyId, accessToken]);

  // Lade Fotos von Google Drive (Bilder)
  useEffect(() => {
    const loadPhotos = async () => {
      if (!token || !isOpen) return;

      setLoading(true);
      setError(null);

      try {
        // Lade Bilder aus Google Drive
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?` +
          `q=mimeType contains 'image/' and trashed=false` +
          `&fields=files(id,name,mimeType,size,thumbnailLink,webContentLink)` +
          `&orderBy=modifiedTime desc` +
          `&pageSize=50`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Fotos');
        }

        const data = await response.json();
        setPhotos(data.files || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [token, isOpen]);

  const handlePhotoClick = (photo: GoogleDriveFile) => {
    if (multiSelect) {
      setSelectedPhotos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(photo.id)) {
          newSet.delete(photo.id);
        } else {
          newSet.add(photo.id);
        }
        return newSet;
      });
    } else {
      setSelectedPhotos(new Set([photo.id]));
    }
  };

  const handleConfirm = () => {
    const selected = photos.filter(p => selectedPhotos.has(p.id));
    onSelect(selected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-[#14ad9f]" />
            Google Fotos
          </DialogTitle>
        </DialogHeader>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Stellen Sie sicher, dass Google Drive Zugriff gewährt wurde.
              </p>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Keine Bilder gefunden
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo)}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden cursor-pointer
                    transition-all duration-200
                    ${selectedPhotos.has(photo.id) 
                      ? 'ring-2 ring-[#14ad9f] ring-offset-2 scale-95' 
                      : 'hover:opacity-80'}
                  `}
                >
                  {photo.thumbnailLink ? (
                    <img
                      src={photo.thumbnailLink}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  {selectedPhotos.has(photo.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-[#14ad9f] rounded-full flex items-center justify-center">
                      <X className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-gray-500">
            {selectedPhotos.size} Foto(s) ausgewählt
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedPhotos.size === 0}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              Einfügen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
