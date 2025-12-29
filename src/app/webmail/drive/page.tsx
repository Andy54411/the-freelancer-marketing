'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter } from 'next/navigation';
import { 
  FolderOpen, 
  File, 
  FileText, 
  FileImage, 
  FileVideo, 
  FileAudio,
  Upload,
  Download,
  Trash2,
  MoreVertical,
  ChevronRight,
  Home,
  Pencil,
  LayoutGrid,
  LayoutList,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { MailHeader } from '@/components/webmail/MailHeader';
import { DriveSidebar, type DriveSection } from '@/components/webmail/drive/DriveSidebar';
import { PdfThumbnail } from '@/components/webmail/drive/PdfThumbnail';
import { TextThumbnail } from '@/components/webmail/drive/TextThumbnail';
import { VideoThumbnail } from '@/components/webmail/drive/VideoThumbnail';
import { HeicThumbnail } from '@/components/webmail/drive/HeicThumbnail';
import { cn } from '@/lib/utils';
import { getAppUrl } from '@/lib/webmail-urls';
import { DriveApiService, type DriveFile } from '@/services/drive/DriveApiService';

interface BreadcrumbItem {
  id: string;
  name: string;
}

// Datei-Icon und Farbe basierend auf MIME-Type
const getFileIconAndColor = (mimeType?: string, isFolder?: boolean): { icon: typeof File; color: string; bgColor: string } => {
  if (isFolder) return { icon: FolderOpen, color: 'text-amber-600', bgColor: 'bg-amber-50' };
  if (!mimeType) return { icon: File, color: 'text-gray-500', bgColor: 'bg-gray-50' };
  
  // Bilder
  if (mimeType.startsWith('image/')) return { icon: FileImage, color: 'text-rose-600', bgColor: 'bg-rose-50' };
  // Videos
  if (mimeType.startsWith('video/')) return { icon: FileVideo, color: 'text-purple-600', bgColor: 'bg-purple-50' };
  // Audio
  if (mimeType.startsWith('audio/')) return { icon: FileAudio, color: 'text-orange-600', bgColor: 'bg-orange-50' };
  // PDF
  if (mimeType.includes('pdf')) return { icon: FileText, color: 'text-red-600', bgColor: 'bg-red-50' };
  // Excel/Spreadsheet
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('xlsx') || mimeType.includes('xls')) 
    return { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' };
  // Word/Document
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('doc')) 
    return { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' };
  // Text
  if (mimeType.includes('text')) return { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' };
  // PowerPoint
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('pptx')) 
    return { icon: FileText, color: 'text-orange-500', bgColor: 'bg-orange-50' };
  // Archive
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive') || mimeType.includes('compressed')) 
    return { icon: File, color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
  
  return { icon: File, color: 'text-gray-500', bgColor: 'bg-gray-50' };
};

// Legacy function for compatibility
const getFileIcon = (mimeType?: string, isFolder?: boolean) => {
  return getFileIconAndColor(mimeType, isFolder).icon;
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

interface WebmailDrivePageProps {
  initialFolderId?: string;
}

export default function WebmailDrivePage({ initialFolderId }: WebmailDrivePageProps) {
  const { session } = useWebmailSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder ID kommt aus der URL (via props von der dynamischen Route)
  const currentFolderId = initialFolderId || null;
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: '', name: 'Meine Ablage' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [currentSection, setCurrentSection] = useState<DriveSection>('my-drive');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(15 * 1024 * 1024 * 1024); // 15 GB default
  
  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // API initialisieren
  useEffect(() => {
    if (session?.email) {
      DriveApiService.setUserId(session.email);
    }
  }, [session?.email]);

  // Speicherinfo laden
  const loadStorage = useCallback(async () => {
    if (!session?.email) return;
    try {
      const storage = await DriveApiService.getStorageInfo();
      setStorageUsed(storage.used);
      setStorageTotal(storage.limit);
    } catch {
      // Silently fail - Storage info ist nicht kritisch
    }
  }, [session?.email]);

  // Ordner-Inhalte laden
  const loadContents = useCallback(async () => {
    if (!session?.email) return;
    
    setIsLoading(true);
    try {
      const result = await DriveApiService.getFolderContents(currentFolderId);
      setFiles(result.files);
      setBreadcrumbs(result.breadcrumbs);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [session?.email, currentFolderId]);

  // Session wird bereits vom Layout geprueft - hier nur Dateien laden
  useEffect(() => {
    if (session?.isAuthenticated) {
      loadContents();
      loadStorage();
    }
  }, [session?.isAuthenticated, loadContents, loadStorage]);

  // Datei-Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || !session?.email) return;

    const totalFiles = uploadedFiles.length;
    let uploaded = 0;

    try {
      for (const file of Array.from(uploadedFiles)) {
        setUploadProgress(0);
        
        await DriveApiService.uploadFile(file, currentFolderId, (percent) => {
          setUploadProgress(percent);
        });
        
        uploaded++;
        setUploadProgress((uploaded / totalFiles) * 100);
      }

      toast.success(`${totalFiles} Datei(en) hochgeladen`);
      loadContents();
      loadStorage();
    } catch (error) {
      toast.error(`Fehler beim Hochladen: ${(error as Error).message}`);
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag & Drop Handler
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0 || !session?.email) return;

    const totalFiles = droppedFiles.length;
    let uploaded = 0;

    try {
      for (const file of Array.from(droppedFiles)) {
        setUploadProgress(0);
        
        await DriveApiService.uploadFile(file, currentFolderId, (percent) => {
          setUploadProgress(percent);
        });
        
        uploaded++;
        setUploadProgress((uploaded / totalFiles) * 100);
      }

      toast.success(`${totalFiles} Datei(en) hochgeladen`);
      loadContents();
      loadStorage();
    } catch (error) {
      toast.error(`Fehler beim Hochladen: ${(error as Error).message}`);
    } finally {
      setUploadProgress(null);
    }
  };

  // Ordner erstellen
  const handleCreateFolder = async () => {
    const folderName = newFolderName.trim() || 'Unbenannter Ordner';

    try {
      await DriveApiService.createFolder(folderName, currentFolderId);
      toast.success('Ordner erstellt');
      setShowNewFolderModal(false);
      setNewFolderName('');
      loadContents();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Datei/Ordner loeschen
  const handleDelete = async (file: DriveFile) => {
    try {
      await DriveApiService.delete(file.id, file.type);
      toast.success(`${file.type === 'folder' ? 'Ordner' : 'Datei'} gelöscht`);
      loadContents();
      loadStorage();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Umbenennen
  const handleRename = async () => {
    if (!selectedFile || !renameValue.trim()) return;

    try {
      await DriveApiService.rename(selectedFile.id, selectedFile.type, renameValue.trim());
      toast.success('Umbenannt');
      setShowRenameModal(false);
      setRenameValue('');
      setSelectedFile(null);
      loadContents();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Download
  const handleDownload = async (file: DriveFile) => {
    try {
      await DriveApiService.downloadFile(file.id, file.name);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // Preview oeffnen
  const openPreview = async (file: DriveFile) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
    
    if (file.mimeType?.startsWith('image/')) {
      try {
        const blob = await DriveApiService.getFileBlob(file.id);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch {
        // Preview nicht verfuegbar
      }
    }
  };

  // Preview schliessen
  const closePreview = () => {
    setShowPreviewModal(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewFile(null);
  };

  // Navigation zu Ordner - URL-basiert!
  const handleNavigateToFolder = (folder: DriveFile) => {
    router.push(`/webmail/drive/folders/${folder.id}`);
  };

  // Navigation via Breadcrumb - URL-basiert!
  const handleNavigateToBreadcrumb = (crumb: BreadcrumbItem) => {
    if (!crumb.id) {
      router.push('/webmail/drive');
    } else {
      router.push(`/webmail/drive/folders/${crumb.id}`);
    }
  };

  // Gefilterte und sortierte Dateien
  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  const { isDark } = useWebmailTheme();

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-[#202124]' : 'bg-gray-50'}`}>
      {/* Header - Einheitlicher MailHeader fuer alle Apps */}
      <MailHeader
        userEmail={session?.email || ''}
        onLogout={() => window.location.href = getAppUrl('/webmail')}
        onSearch={setSearchQuery}
        onMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        searchPlaceholder="In Drive suchen"
        showAdvancedSearchButton={false}
        appName="Drive"
        appHomeUrl="/webmail/drive"
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block">
          <DriveSidebar
            currentSection={currentSection}
            onSectionChange={(section) => {
              setCurrentSection(section);
              router.push('/webmail/drive');
            }}
            onNewFolder={() => setShowNewFolderModal(true)}
            onUploadFile={() => fileInputRef.current?.click()}
            storageUsed={storageUsed}
            storageTotal={storageTotal}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <div 
              className={cn(
                "absolute left-0 top-16 h-[calc(100%-4rem)] w-64 shadow-lg",
                isDark ? "bg-[#202124]" : "bg-white"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <DriveSidebar
                currentSection={currentSection}
                onSectionChange={(section) => {
                  setCurrentSection(section);
                  router.push('/webmail/drive');
                  setIsMobileSidebarOpen(false);
                }}
                onNewFolder={() => {
                  setShowNewFolderModal(true);
                  setIsMobileSidebarOpen(false);
                }}
                onUploadFile={() => {
                  fileInputRef.current?.click();
                  setIsMobileSidebarOpen(false);
                }}
                storageUsed={storageUsed}
                storageTotal={storageTotal}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 overflow-y-auto p-4 lg:p-6 transition-colors",
            isDragging && "bg-teal-50/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { 
            if (e.currentTarget === e.target) setIsDragging(false); 
          }}
          onDrop={handleDrop}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="fixed inset-0 z-50 bg-teal-500/10 border-4 border-dashed border-teal-500 pointer-events-none flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <Upload className="h-16 w-16 text-teal-600 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-800">Dateien hier ablegen</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className={cn(
              "mb-4 p-4 rounded-lg border shadow-sm",
              isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-teal-600 animate-bounce" />
                <div className="flex-1">
                  <div className={cn("text-sm font-medium mb-1", isDark ? "text-white" : "text-gray-700")}>Hochladen...</div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
                <span className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>{Math.round(uploadProgress)}%</span>
              </div>
            </div>
          )}

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 mb-4 text-sm overflow-x-auto pb-2">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center shrink-0">
                {index > 0 && <ChevronRight className={cn("h-4 w-4 mx-1", isDark ? "text-gray-500" : "text-white")} />}
                <button
                  onClick={() => handleNavigateToBreadcrumb(crumb)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100',
                    index === breadcrumbs.length - 1 
                      ? (isDark ? 'font-medium text-white' : 'font-medium text-gray-900') 
                      : (isDark ? 'text-white' : 'text-gray-600')
                  )}
                >
                  {index === 0 && <Home className="h-4 w-4" />}
                  <span>{crumb.name}</span>
                </button>
              </div>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn("text-lg font-medium", isDark ? "text-white" : "text-gray-900")}>
              {breadcrumbs[breadcrumbs.length - 1]?.name || 'Meine Ablage'}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-8 w-8',
                  viewMode === 'grid' && (isDark ? 'bg-white/10' : 'bg-gray-100'),
                  isDark && 'text-white hover:text-white hover:bg-white/10'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-8 w-8',
                  viewMode === 'list' && (isDark ? 'bg-white/10' : 'bg-gray-100'),
                  isDark && 'text-white hover:text-white hover:bg-white/10'
                )}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div 
              className={cn(
                "flex flex-col items-center justify-center min-h-[400px] text-gray-500 rounded-2xl border-2 border-dashed transition-all",
                isDragging ? "border-teal-500 bg-teal-50" : "border-transparent"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {/* Google Drive Style Illustration */}
              <svg viewBox="0 0 240 180" className="w-64 h-48 mb-6">
                {/* Himmel Hintergrund */}
                <ellipse cx="120" cy="160" rx="100" ry="15" fill="#e8f5f3" />
                
                {/* Person auf Stuhl */}
                <g transform="translate(60, 40)">
                  {/* Stuhl */}
                  <rect x="40" y="80" width="60" height="8" rx="4" fill="#0d9488" />
                  <rect x="45" y="88" width="6" height="30" fill="#0d9488" />
                  <rect x="89" y="88" width="6" height="30" fill="#0d9488" />
                  <rect x="35" y="115" width="70" height="6" rx="3" fill="#0d9488" />
                  
                  {/* Rueckenlehne */}
                  <rect x="90" y="40" width="8" height="45" rx="4" fill="#14b8a6" />
                  
                  {/* Koerper */}
                  <ellipse cx="65" cy="65" rx="18" ry="22" fill="#fef3c7" />
                  
                  {/* Kopf */}
                  <circle cx="65" cy="30" r="18" fill="#fde68a" />
                  
                  {/* Haare */}
                  <path d="M50 25 Q65 10 80 25 Q82 35 75 40 L55 40 Q48 35 50 25" fill="#f59e0b" />
                  
                  {/* Gesicht */}
                  <circle cx="60" cy="30" r="2" fill="#1f2937" />
                  <circle cx="70" cy="30" r="2" fill="#1f2937" />
                  <path d="M62 36 Q65 39 68 36" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
                  
                  {/* Arm mit Laptop */}
                  <rect x="30" y="55" width="35" height="25" rx="3" fill="#374151" />
                  <rect x="32" y="57" width="31" height="18" rx="2" fill="#60a5fa" />
                  <rect x="25" y="78" width="45" height="4" rx="2" fill="#4b5563" />
                </g>
                
                {/* Fliegende Dokumente */}
                <g transform="translate(160, 20)">
                  {/* Dokument 1 */}
                  <rect x="0" y="0" width="28" height="35" rx="3" fill="#14b8a6" transform="rotate(15)" />
                  <rect x="4" y="8" width="16" height="2" rx="1" fill="white" transform="rotate(15)" />
                  <rect x="4" y="14" width="12" height="2" rx="1" fill="white" transform="rotate(15)" />
                </g>
                
                <g transform="translate(175, 50)">
                  {/* Dokument 2 */}
                  <rect x="0" y="0" width="24" height="30" rx="3" fill="#fbbf24" transform="rotate(-10)" />
                </g>
                
                <g transform="translate(155, 70)">
                  {/* Ordner */}
                  <path d="M0 8 L0 28 Q0 32 4 32 L28 32 Q32 32 32 28 L32 12 Q32 8 28 8 L18 8 L14 4 L4 4 Q0 4 0 8" fill="#0d9488" />
                </g>
              </svg>
              
              <p className={cn(
                "text-xl font-medium mb-2",
                isDark ? "text-white" : "text-gray-700"
              )}>
                {isDragging ? 'Dateien hier ablegen' : 'Legen Sie Dateien hier ab'}
              </p>
              <p className={cn("text-sm", isDark ? "text-white" : "text-gray-500")}>
                oder verwenden Sie den Button &quot;Neu&quot;.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View - Google Drive Style - 4 Spalten */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                const { icon: FileIcon, color } = getFileIconAndColor(file.mimeType, file.type === 'folder');
                const isHeic = file.mimeType === 'image/heic' || 
                               file.mimeType === 'image/heif' ||
                               file.name?.toLowerCase().endsWith('.heic') ||
                               file.name?.toLowerCase().endsWith('.heif');
                const isImage = !isHeic && file.mimeType?.startsWith('image/');
                const isPdf = file.mimeType === 'application/pdf';
                const isVideo = file.mimeType?.startsWith('video/');
                const isText = file.mimeType === 'text/plain' || 
                               file.mimeType === 'text/csv' || 
                               file.mimeType === 'text/xml' || 
                               file.mimeType === 'application/xml' ||
                               file.name?.endsWith('.txt') ||
                               file.name?.endsWith('.csv') ||
                               file.name?.endsWith('.xml');
                const isWord = file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimeType === 'application/msword';
                
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "group relative rounded-lg border overflow-hidden hover:shadow-md transition-all cursor-pointer",
                      isDark 
                        ? "bg-[#2d2e30] border-[#5f6368] hover:border-[#8ab4f8]" 
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => file.type === 'folder' ? handleNavigateToFolder(file) : openPreview(file)}
                  >
                    {/* Preview Area - Google Drive Style mit weissem Hintergrund */}
                    <div className={cn(
                      "h-48 flex items-center justify-center relative overflow-hidden",
                      isDark ? "bg-[#3c4043]" : "bg-gray-50"
                    )}>
                      {isPdf ? (
                        /* PDF Vorschau */
                        <PdfThumbnail 
                          fileId={file.id} 
                          fileName={file.name}
                          className="w-full h-full bg-white"
                        />
                      ) : isHeic ? (
                        /* HEIC/HEIF Vorschau (iPhone-Bilder) */
                        <HeicThumbnail 
                          fileId={file.id} 
                          fileName={file.name}
                          className="w-full h-full"
                        />
                      ) : isVideo ? (
                        /* Video Vorschau mit Thumbnail */
                        <VideoThumbnail 
                          fileId={file.id} 
                          fileName={file.name}
                          className="w-full h-full"
                        />
                      ) : isText ? (
                        /* Text/CSV/XML Vorschau */
                        <TextThumbnail 
                          fileId={file.id} 
                          fileName={file.name}
                          mimeType={file.mimeType}
                          className="w-full h-full"
                        />
                      ) : isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={`/api/webmail/drive/files/${file.id}/thumbnail`}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      {/* Fallback Icon fuer Ordner und andere Dateitypen */}
                      {!isPdf && !isImage && !isVideo && !isText && !isHeic && (
                        <div className="flex items-center justify-center w-full h-full">
                          {file.type === 'folder' ? (
                            <FileIcon className="h-24 w-24 text-white" />
                          ) : isWord ? (
                            <div className="flex flex-col items-center justify-center">
                              <FileIcon className="h-20 w-20 text-blue-600" />
                            </div>
                          ) : (
                            <FileIcon className={cn('h-20 w-20', color)} />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* File Info Bar - Google Drive Style */}
                    <div className={cn(
                      "px-3 py-2 border-t",
                      isDark ? "border-[#5f6368] bg-[#2d2e30]" : "border-gray-100 bg-white"
                    )}>
                      <div className="flex items-center gap-2">
                        <FileIcon className={cn('h-5 w-5 shrink-0', color)} />
                        <p className={cn("text-sm truncate flex-1", isDark ? "text-white" : "text-gray-900")} title={file.name}>
                          {file.name}
                        </p>
                      </div>
                    </div>
                    
                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm",
                            isDark ? "bg-[#2d2e30]/80 hover:bg-[#3c4043] text-white" : "bg-white/80 hover:bg-white"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
                        {file.type === 'file' && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
                              <Download className="h-4 w-4 mr-2" />
                              Herunterladen
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className={cn(isDark && "bg-[#5f6368]")} />
                          </>
                        )}
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(file);
                          setRenameValue(file.name);
                          setShowRenameModal(true);
                        }} className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Umbenennen
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className={cn(isDark && "bg-[#5f6368]")} />
                        <DropdownMenuItem 
                          className={cn("text-red-600", isDark && "focus:bg-[#3c4043] focus:text-red-400")}
                          onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
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
            <div className={cn(
              "rounded-xl border overflow-hidden",
              isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
            )}>
              <table className="w-full">
                <thead>
                  <tr className={cn(
                    "border-b",
                    isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
                  )}>
                    <th className={cn("text-left py-3 px-4 text-sm font-medium", isDark ? "text-white" : "text-gray-600")}>Name</th>
                    <th className={cn("text-left py-3 px-4 text-sm font-medium hidden sm:table-cell", isDark ? "text-white" : "text-gray-600")}>Größe</th>
                    <th className={cn("text-left py-3 px-4 text-sm font-medium hidden md:table-cell", isDark ? "text-white" : "text-gray-600")}>Geändert</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const FileIcon = getFileIcon(file.mimeType, file.type === 'folder');
                    return (
                      <tr 
                        key={file.id}
                        className={cn(
                          "border-b cursor-pointer",
                          isDark 
                            ? "border-[#5f6368] hover:bg-white/5" 
                            : "border-gray-100 hover:bg-gray-50"
                        )}
                        onClick={() => file.type === 'folder' ? handleNavigateToFolder(file) : openPreview(file)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <FileIcon className={cn('h-5 w-5', file.type === 'folder' ? 'text-yellow-500' : (isDark ? 'text-white' : 'text-white'))} />
                            <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-gray-900")}>{file.name}</span>
                          </div>
                        </td>
                        <td className={cn("py-3 px-4 text-sm hidden sm:table-cell", isDark ? "text-white" : "text-gray-500")}>
                          {file.type === 'folder' ? '-' : formatFileSize(file.size)}
                        </td>
                        <td className={cn("py-3 px-4 text-sm hidden md:table-cell", isDark ? "text-white" : "text-gray-500")}>
                          {new Date(file.modifiedAt).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn("h-8 w-8", isDark && "text-white hover:text-white hover:bg-white/10")}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
                              {file.type === 'file' && (
                                <>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Herunterladen
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className={cn(isDark && "bg-[#5f6368]")} />
                                </>
                              )}
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                                setRenameValue(file.name);
                                setShowRenameModal(true);
                              }} className={cn(isDark && "text-white focus:bg-[#3c4043] focus:text-white")}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Umbenennen
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className={cn(isDark && "bg-[#5f6368]")} />
                              <DropdownMenuItem 
                                className={cn("text-red-600", isDark && "focus:bg-[#3c4043] focus:text-red-400")}
                                onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
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
        </main>
      </div>

      {/* New Folder Modal */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent className={cn(
          "sm:max-w-[400px] p-6 gap-0 rounded-3xl [&>button]:hidden shadow-2xl border-0",
          isDark ? "bg-[#2d2e30]" : "bg-white"
        )}>
          <DialogHeader className="pb-5">
            <DialogTitle className={cn("text-[22px] font-normal", isDark ? "text-gray-100" : "text-gray-800")}>Neuer Ordner</DialogTitle>
          </DialogHeader>
          <div className="pb-6">
            <Input
              value={newFolderName || 'Unbenannter Ordner'}
              onChange={(e) => setNewFolderName(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className={cn(
                "h-11 text-[15px] rounded border-2 border-teal-600 focus:border-teal-600 focus:ring-0 px-3",
                isDark && "bg-[#3c4043] text-white border-teal-500"
              )}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }} className={cn(isDark && "text-white hover:bg-white/10")}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateFolder} className="bg-teal-600 hover:bg-teal-700">
              Erstellen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
          <DialogHeader>
            <DialogTitle className={cn(isDark && "text-gray-100")}>Umbenennen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newName" className={cn(isDark && "text-white")}>Neuer Name</Label>
            <Input
              id="newName"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className={cn(isDark && "bg-[#3c4043] border-[#5f6368] text-white")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameModal(false)} className={cn(isDark && "border-[#5f6368] text-white hover:bg-white/10")}>
              Abbrechen
            </Button>
            <Button onClick={handleRename}>Umbenennen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className={cn("max-w-4xl", isDark && "bg-[#2d2e30] border-[#5f6368]")}>
          <DialogHeader>
            <DialogTitle className={cn(isDark && "text-gray-100")}>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex items-center justify-center min-h-[300px]">
            {previewFile?.mimeType?.startsWith('image/') && previewUrl ? (
              <div className="relative w-full h-[60vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={previewUrl} 
                  alt={previewFile.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className={cn("text-center", isDark ? "text-white" : "text-gray-500")}>
                <File className={cn("h-24 w-24 mx-auto mb-4", isDark ? "text-gray-500" : "text-white")} />
                <p>Vorschau nicht verfuegbar</p>
              </div>
            )}
          </div>
          <DialogFooter>
            {previewFile && (
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
