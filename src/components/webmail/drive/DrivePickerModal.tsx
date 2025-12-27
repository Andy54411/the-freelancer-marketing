'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Folder, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive, 
  Check,
  Loader2,
  Search,
  X,
  Upload,
  List,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriveApiService, type DriveFile } from '@/services/drive/DriveApiService';

type TabType = 'recent' | 'my-drive' | 'shared' | 'upload';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (files: DriveFile[]) => void;
  userId: string | undefined;
  multiple?: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return { icon: File, color: 'text-gray-500', bgColor: 'bg-gray-100' };
  if (mimeType.startsWith('image/')) return { icon: ImageIcon, color: 'text-green-600', bgColor: 'bg-green-50' };
  if (mimeType.startsWith('video/')) return { icon: Video, color: 'text-red-600', bgColor: 'bg-red-50' };
  if (mimeType.startsWith('audio/')) return { icon: Music, color: 'text-purple-600', bgColor: 'bg-purple-50' };
  if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-red-600', bgColor: 'bg-red-50' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) 
    return { icon: Archive, color: 'text-amber-600', bgColor: 'bg-amber-50' };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' };
  if (mimeType.includes('document') || mimeType.includes('word'))
    return { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' };
  if (mimeType.includes('text'))
    return { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50' };
  return { icon: File, color: 'text-gray-500', bgColor: 'bg-gray-100' };
};

// Gruppiere Dateien nach Datum
const groupFilesByDate = (files: DriveFile[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thisWeek = today - 7 * 24 * 60 * 60 * 1000;
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const groups: { label: string; files: DriveFile[] }[] = [
    { label: 'Heute', files: [] },
    { label: 'Diese Woche', files: [] },
    { label: 'Diesen Monat', files: [] },
    { label: 'Älter', files: [] },
  ];

  for (const file of files) {
    const fileDate = file.modifiedAt || file.createdAt;
    if (fileDate >= today) {
      groups[0].files.push(file);
    } else if (fileDate >= thisWeek) {
      groups[1].files.push(file);
    } else if (fileDate >= thisMonth) {
      groups[2].files.push(file);
    } else {
      groups[3].files.push(file);
    }
  }

  return groups.filter(g => g.files.length > 0);
};

export function DrivePickerModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  userId,
  multiple = true 
}: DrivePickerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [allFiles, setAllFiles] = useState<DriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Refs für Cleanup und Race-Condition-Vermeidung
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup bei Unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Alle Dateien rekursiv laden für "Zuletzt"
  const loadAllFiles = useCallback(async () => {
    if (!userId) return;
    
    // Vorherigen Request abbrechen
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      DriveApiService.setUserId(userId);
      const result = await DriveApiService.getFolderContents(null);
      
      // Nur State updaten wenn noch gemounted
      if (!isMountedRef.current) return;
      
      // Sortiere nach Änderungsdatum (neueste zuerst)
      const sortedFiles = result.files
        .filter(f => f.type === 'file')
        .sort((a, b) => (b.modifiedAt || b.createdAt) - (a.modifiedAt || a.createdAt));
      
      setAllFiles(sortedFiles);
      setFiles(result.files);
    } catch (err) {
      // Abgebrochene Requests ignorieren
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!isMountedRef.current) return;
      
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  const loadContents = useCallback(async (folderId: string | null = null) => {
    if (!userId) return;
    
    // Vorherigen Request abbrechen
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      DriveApiService.setUserId(userId);
      const result = await DriveApiService.getFolderContents(folderId);
      
      // Nur State updaten wenn noch gemounted
      if (!isMountedRef.current) return;
      
      setFiles(result.files);
      setCurrentFolderId(folderId);
    } catch (err) {
      // Abgebrochene Requests ignorieren
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!isMountedRef.current) return;
      
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadAllFiles();
      setSelectedFiles([]);
      setFolderPath([]);
      setActiveTab('recent');
      setSearchQuery('');
    }
    
    // Cleanup beim Schließen des Modals
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, userId, loadAllFiles]);

  useEffect(() => {
    if (activeTab === 'my-drive') {
      loadContents(currentFolderId);
    }
  }, [activeTab, currentFolderId, loadContents]);

  const navigateToFolder = (file: DriveFile) => {
    if (file.type === 'folder') {
      setFolderPath(prev => [...prev, { id: file.id, name: file.name }]);
      setCurrentFolderId(file.id);
    }
  };

  const navigateBack = () => {
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    const parentId = newPath.length > 0 ? newPath[newPath.length - 1].id : null;
    setCurrentFolderId(parentId);
  };

  const toggleFileSelection = (file: DriveFile) => {
    if (file.type === 'folder') {
      navigateToFolder(file);
      return;
    }
    
    if (multiple) {
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.id === file.id);
        if (isSelected) {
          return prev.filter(f => f.id !== file.id);
        } else {
          return [...prev, file];
        }
      });
    } else {
      setSelectedFiles([file]);
    }
  };

  const handleInsert = () => {
    if (selectedFiles.length > 0) {
      onSelect(selectedFiles);
      onClose();
    }
  };

  // Filter files based on search
  const getDisplayFiles = () => {
    let displayFiles = activeTab === 'recent' ? allFiles : files;
    
    if (searchQuery) {
      displayFiles = displayFiles.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return displayFiles;
  };

  const displayFiles = getDisplayFiles();
  const folders = displayFiles.filter(f => f.type === 'folder');
  const regularFiles = displayFiles.filter(f => f.type === 'file');
  const groupedFiles = activeTab === 'recent' ? groupFilesByDate(regularFiles) : null;

  // Thumbnail URL generieren
  const getThumbnailUrl = (file: DriveFile) => {
    if (!file.mimeType?.startsWith('image/') && !file.mimeType?.includes('pdf')) {
      return null;
    }
    return `/api/webmail/drive/files/${file.id}/thumbnail`;
  };

  const renderFileCard = (file: DriveFile) => {
    const { icon: FileIcon, color, bgColor } = getFileIcon(file.mimeType);
    const isSelected = selectedFiles.some(f => f.id === file.id);
    const thumbnailUrl = getThumbnailUrl(file);

    return (
      <div
        key={file.id}
        onClick={() => toggleFileSelection(file)}
        className={cn(
          "group relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden",
          "hover:shadow-md",
          isSelected 
            ? "border-blue-500 bg-blue-50" 
            : "border-transparent hover:border-gray-200 bg-white"
        )}
      >
        {/* Thumbnail/Preview Area */}
        <div className={cn("h-32 flex items-center justify-center", bgColor)}>
          {thumbnailUrl && file.mimeType?.startsWith('image/') ? (
            <img 
              src={thumbnailUrl} 
              alt={file.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : thumbnailUrl && file.mimeType?.includes('pdf') ? (
            <div className="w-full h-full bg-white p-2 flex items-center justify-center">
              <FileIcon className={cn("h-12 w-12", color)} />
            </div>
          ) : (
            <FileIcon className={cn("h-12 w-12", color)} />
          )}
          
          {/* Selection Indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="p-3 bg-white border-t">
          <div className="flex items-center gap-2">
            <FileIcon className={cn("h-4 w-4 shrink-0", color)} />
            <span className="text-sm font-medium truncate flex-1" title={file.name}>
              {file.name}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderFolderCard = (folder: DriveFile) => (
    <div
      key={folder.id}
      onClick={() => navigateToFolder(folder)}
      className="group relative rounded-lg border-2 border-transparent hover:border-gray-200 bg-white cursor-pointer transition-all hover:shadow-md overflow-hidden"
    >
      <div className="h-32 flex items-center justify-center bg-amber-50">
        <Folder className="h-16 w-16 text-amber-500" />
      </div>
      <div className="p-3 bg-white border-t">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-sm font-medium truncate flex-1" title={folder.name}>
            {folder.name}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[700px] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Dateien aus Taskilo Drive einfügen</DialogTitle>
        {/* Header with Search */}
        <div className="flex items-center gap-4 px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-teal-500" />
            <h2 className="text-lg font-medium">Dateien aus Taskilo Drive einfügen</h2>
          </div>
          
          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="In Taskilo Drive suchen"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-gray-100 border-0 focus-visible:ring-1"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b">
          <button
            onClick={() => { setActiveTab('recent'); setCurrentFolderId(null); setFolderPath([]); }}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === 'recent' 
                ? "text-blue-600 border-blue-600" 
                : "text-gray-600 border-transparent hover:text-gray-900"
            )}
          >
            Zuletzt
          </button>
          <button
            onClick={() => { setActiveTab('my-drive'); setCurrentFolderId(null); setFolderPath([]); }}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === 'my-drive' 
                ? "text-blue-600 border-blue-600" 
                : "text-gray-600 border-transparent hover:text-gray-900"
            )}
          >
            Meine Ablage
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === 'shared' 
                ? "text-blue-600 border-blue-600" 
                : "text-gray-600 border-transparent hover:text-gray-900"
            )}
          >
            Für mich freigegeben
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === 'upload' 
                ? "text-blue-600 border-blue-600" 
                : "text-gray-600 border-transparent hover:text-gray-900"
            )}
          >
            Hochladen
          </button>

          <div className="flex-1" />

          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 rounded"
            title={viewMode === 'grid' ? 'Listenansicht' : 'Rasteransicht'}
          >
            <List className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Breadcrumbs for My Drive */}
        {activeTab === 'my-drive' && folderPath.length > 0 && (
          <div className="flex items-center gap-2 px-6 py-2 text-sm bg-gray-50 border-b">
            <button 
              onClick={() => { setCurrentFolderId(null); setFolderPath([]); }}
              className="text-blue-600 hover:underline"
            >
              Meine Ablage
            </button>
            {folderPath.map((folder, index) => (
              <span key={folder.id} className="flex items-center gap-2">
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => {
                    const newPath = folderPath.slice(0, index + 1);
                    setFolderPath(newPath);
                    setCurrentFolderId(folder.id);
                  }}
                  className={cn(
                    index === folderPath.length - 1 
                      ? "text-gray-900 font-medium" 
                      : "text-blue-600 hover:underline"
                  )}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => loadAllFiles()}>
                Erneut versuchen
              </Button>
            </div>
          ) : activeTab === 'upload' ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Upload className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Dateien hochladen</p>
              <p className="text-sm mt-1">Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen</p>
              <Button variant="outline" className="mt-4">
                Dateien auswählen
              </Button>
            </div>
          ) : activeTab === 'shared' ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Folder className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Keine freigegebenen Dateien</p>
              <p className="text-sm mt-1">Hier werden Dateien angezeigt, die andere mit Ihnen geteilt haben</p>
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Folder className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {searchQuery ? 'Keine Ergebnisse' : 'Keine Dateien'}
              </p>
              <p className="text-sm mt-1">
                {searchQuery 
                  ? 'Versuchen Sie einen anderen Suchbegriff' 
                  : 'Laden Sie Dateien in Taskilo Drive hoch'}
              </p>
            </div>
          ) : activeTab === 'recent' && groupedFiles ? (
            <div className="space-y-8">
              {groupedFiles.map((group) => (
                <div key={group.label}>
                  <h3 className="text-sm font-medium text-gray-500 mb-4">{group.label}</h3>
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" 
                      : "space-y-2"
                  )}>
                    {group.files.map(file => renderFileCard(file))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {/* Folders first */}
              {folders.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Ordner</h3>
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" 
                      : "space-y-2"
                  )}>
                    {folders.map(folder => renderFolderCard(folder))}
                  </div>
                </div>
              )}

              {/* Files */}
              {regularFiles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Dateien</h3>
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" 
                      : "space-y-2"
                  )}>
                    {regularFiles.map(file => renderFileCard(file))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedFiles.length > 0 ? (
              <span className="font-medium">{selectedFiles.length} Datei(en) ausgewählt</span>
            ) : (
              <span>Wählen Sie Dateien zum Anhängen aus</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleInsert} 
              disabled={selectedFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Einfügen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
