'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FolderOpen, 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  MoreVertical,
  Grid,
  List,
  Search,
  ChevronRight,
  Home,
  ArrowUpFromLine,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '@/firebase/clients';
import { SubPageHeader } from '@/components/webmail/SubPageHeader';

interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  createdAt: number;
  modifiedAt: number;
  path: string;
  downloadUrl?: string;
  starred?: boolean;
}

interface BreadcrumbItem {
  name: string;
  path: string;
}

const getFileIcon = (mimeType?: string, isFolder?: boolean) => {
  if (isFolder) return FolderOpen;
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function WebmailDrivePage() {
  const { session } = useWebmailSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage(app);

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, _setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

  const getStoragePath = useCallback((path: string = currentPath) => {
    if (!session?.email) return '';
    const userFolder = session.email.replace(/[.@]/g, '_');
    return `webmail-drive/${userFolder}${path}`;
  }, [session?.email, currentPath]);

  const loadFiles = useCallback(() => {
    if (!session?.email) return;
    
    setIsLoading(true);
    try {
      const storageKey = `webmail_drive_${session.email}`;
      const existingData = localStorage.getItem(storageKey);
      const allFiles: DriveFile[] = existingData ? JSON.parse(existingData) : [];
      const filteredFiles = allFiles.filter(f => f.path === currentPath);
      setFiles(filteredFiles);
    } catch {
      // Silently handle error
    } finally {
      setIsLoading(false);
    }
  }, [session?.email, currentPath]);

  // Session wird bereits vom Layout geprüft - hier nur Dateien laden
  useEffect(() => {
    if (session?.isAuthenticated) {
      loadFiles();
    }
  }, [session?.isAuthenticated, currentPath, loadFiles]);

  const saveFiles = (newFiles: DriveFile[]) => {
    if (!session?.email) return;
    const storageKey = `webmail_drive_${session.email}`;
    
    // Get all existing files
    const existingData = localStorage.getItem(storageKey);
    const allFiles: DriveFile[] = existingData ? JSON.parse(existingData) : [];
    
    // Update/add new files
    newFiles.forEach(newFile => {
      const index = allFiles.findIndex(f => f.id === newFile.id);
      if (index >= 0) {
        allFiles[index] = newFile;
      } else {
        allFiles.push(newFile);
      }
    });
    
    localStorage.setItem(storageKey, JSON.stringify(allFiles));
    loadFiles();
  };

  const deleteFileFromStorage = (fileId: string) => {
    if (!session?.email) return;
    const storageKey = `webmail_drive_${session.email}`;
    const existingData = localStorage.getItem(storageKey);
    if (existingData) {
      const allFiles: DriveFile[] = JSON.parse(existingData);
      const newFiles = allFiles.filter(f => f.id !== fileId && !f.path.startsWith(allFiles.find(x => x.id === fileId)?.path + '/'));
      localStorage.setItem(storageKey, JSON.stringify(newFiles));
    }
    loadFiles();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || !session?.email) return;

    setUploadProgress(0);
    const totalFiles = uploadedFiles.length;
    let uploaded = 0;

    try {
      for (const file of Array.from(uploadedFiles)) {
        const storagePath = getStoragePath() + '/' + file.name;
        const storageRef = ref(storage, storagePath);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        const newFile: DriveFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: 'file',
          mimeType: file.type,
          size: file.size,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
          path: currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`,
          downloadUrl,
        };

        saveFiles([newFile]);
        uploaded++;
        setUploadProgress((uploaded / totalFiles) * 100);
      }

      toast.success(`${totalFiles} Datei(en) hochgeladen`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Bitte gib einen Ordnernamen ein');
      return;
    }

    const newFolder: DriveFile = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newFolderName,
      type: 'folder',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      path: currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`,
    };

    saveFiles([newFolder]);
    setShowNewFolderModal(false);
    setNewFolderName('');
    toast.success('Ordner erstellt');
  };

  const handleDeleteFile = (file: DriveFile) => {
    deleteFileFromStorage(file.id);
    toast.success(`${file.type === 'folder' ? 'Ordner' : 'Datei'} gelöscht`);
  };

  const handleRenameFile = () => {
    if (!selectedFile || !renameValue.trim()) return;

    const updatedFile: DriveFile = {
      ...selectedFile,
      name: renameValue,
      path: selectedFile.path.replace(selectedFile.name, renameValue),
      modifiedAt: Date.now(),
    };

    saveFiles([updatedFile]);
    setShowRenameModal(false);
    setRenameValue('');
    setSelectedFile(null);
    toast.success('Umbenannt');
  };

  const handleDownload = async (file: DriveFile) => {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    }
  };

  const handleNavigateToFolder = (folder: DriveFile) => {
    setCurrentPath(folder.path);
  };

  const handleNavigateToBreadcrumb = (path: string) => {
    setCurrentPath(path);
  };

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ name: 'Meine Ablage', path: '/' }];
    
    let path = '';
    parts.forEach(part => {
      path += '/' + part;
      breadcrumbs.push({ name: part, path });
    });
    
    return breadcrumbs;
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Folders first
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <SubPageHeader
        userEmail={session?.email || ''}
        onLogout={() => router.push('/webmail')}
        title="Drive"
        icon={<FolderOpen className="h-6 w-6" />}
      />

      {/* Search & View Toggle */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Dateien suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
              <button
                onClick={() => handleNavigateToBreadcrumb(crumb.path)}
                className={`px-2 py-1 rounded hover:bg-gray-100 ${
                  index === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'text-gray-600'
                }`}
              >
                {index === 0 ? <Home className="h-4 w-4" /> : crumb.name}
              </button>
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => setShowNewFolderModal(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Neuer Ordner
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Hochladen
          </Button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress !== null && (
        <div className="bg-teal-50 border-b border-teal-200 px-6 py-2">
          <div className="flex items-center gap-3">
            <ArrowUpFromLine className="h-4 w-4 text-teal-600 animate-bounce" />
            <span className="text-sm text-teal-700">Hochladen...</span>
            <Progress value={uploadProgress} className="flex-1 h-2" />
            <span className="text-sm text-teal-700">{Math.round(uploadProgress)}%</span>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FolderOpen className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Dieser Ordner ist leer</p>
            <p className="text-sm mt-1">Lade Dateien hoch oder erstelle einen Ordner</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFiles.map((file) => {
              const FileIcon = getFileIcon(file.mimeType, file.type === 'folder');
              return (
                <div key={file.id} className="relative group">
                  <div
                    className={`bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-teal-300 hover:shadow-md transition-all ${
                      selectedFiles.has(file.id) ? 'border-teal-500 bg-teal-50' : ''
                    }`}
                    onClick={() => {
                      if (file.type === 'folder') {
                        handleNavigateToFolder(file);
                      } else {
                        setPreviewFile(file);
                        setShowPreviewModal(true);
                      }
                    }}
                  >
                    <div className="aspect-square flex items-center justify-center mb-3 relative">
                      {file.type === 'folder' ? (
                        <FolderOpen className="h-16 w-16 text-yellow-500" />
                      ) : file.mimeType?.startsWith('image/') && file.downloadUrl ? (
                        <Image 
                          src={file.downloadUrl} 
                          alt={file.name}
                          fill
                          className="object-contain rounded"
                          unoptimized
                        />
                      ) : (
                        <FileIcon className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {file.type === 'folder' ? 'Ordner' : formatFileSize(file.size)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {file.type === 'file' && (
                        <>
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="h-4 w-4 mr-2" />
                            Herunterladen
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => {
                        setSelectedFile(file);
                        setRenameValue(file.name);
                        setShowRenameModal(true);
                      }}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Umbenennen
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteFile(file)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Größe</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Geändert</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.mimeType, file.type === 'folder');
                  return (
                    <tr 
                      key={file.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        if (file.type === 'folder') {
                          handleNavigateToFolder(file);
                        }
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FileIcon className={`h-5 w-5 ${file.type === 'folder' ? 'text-yellow-500' : 'text-gray-400'}`} />
                          <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {file.type === 'folder' ? '-' : formatFileSize(file.size)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(file.modifiedAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.type === 'file' && (
                              <>
                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Herunterladen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedFile(file);
                              setRenameValue(file.name);
                              setShowRenameModal(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Umbenennen
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteFile(file)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Ordner</DialogTitle>
            <DialogDescription>Gib einen Namen für den neuen Ordner ein</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folderName">Ordnername</Label>
            <Input
              id="folderName"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Neuer Ordner"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateFolder}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Umbenennen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newName">Neuer Name</Label>
            <Input
              id="newName"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleRenameFile}>Umbenennen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex items-center justify-center min-h-[300px] relative">
            {previewFile?.mimeType?.startsWith('image/') && previewFile.downloadUrl ? (
              <div className="relative w-full h-[60vh]">
                <Image 
                  src={previewFile.downloadUrl} 
                  alt={previewFile.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <File className="h-24 w-24 mx-auto mb-4 text-gray-300" />
                <p>Vorschau nicht verfügbar</p>
              </div>
            )}
          </div>
          <DialogFooter>
            {previewFile?.downloadUrl && (
              <Button onClick={() => handleDownload(previewFile)}>
                <Download className="h-4 w-4 mr-2" />
                Herunterladen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
