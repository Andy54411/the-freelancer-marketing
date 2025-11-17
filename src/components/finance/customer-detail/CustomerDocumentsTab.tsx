'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { db, storage } from '@/firebase/clients';
import { UsageTrackingService } from '@/services/usageTrackingService';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  File,
  FileText,
  Image,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Plus,
  Calendar,
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  MoreVertical,
  X,
  User,
  Clock,
  Share2,
  HardDrive,
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomerDocumentsTabProps {
  customer: Customer;
  companyId: string;
  onDocumentsCountChange?: (count: number) => void;
}

interface FolderItem {
  id: string;
  name: string;
  createdAt: any;
  createdBy: string;
  createdByName: string;
  parentFolderId?: string | null;
  color?: string;
}

interface DocumentItem {
  id: string;
  originalName: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: any;
  category: 'contract' | 'invoice' | 'certificate' | 'correspondence' | 'other';
  uploadedBy: string;
  uploadedByName: string;
  description?: string;
  url: string;
  folderId?: string | null;
}

export function CustomerDocumentsTab({
  customer,
  companyId,
  onDocumentsCountChange,
}: CustomerDocumentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItem, setSelectedItem] = useState<DocumentItem | FolderItem | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'document' | 'folder' | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit, setStorageLimit] = useState(1024 * 1024 * 1024); // 1 GB default
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Load storage limit from company (company-wide storage)
  useEffect(() => {
    if (!companyId) return;

    const companyRef = doc(db, 'companies', companyId);

    const unsubscribe = onSnapshot(
      companyRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Use storageLimit from company Firestore doc, default to 1 GB
          const limit = data.storageLimit || 1024 * 1024 * 1024; // 1 GB default
          setStorageLimit(limit);
        }
      },
      error => {
        console.error('Error loading storage limit:', error);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  // Load folders from Firebase
  useEffect(() => {
    if (!customer?.id || !companyId) return;

    let unsubscribe: (() => void) | undefined;

    try {
      const foldersRef = collection(
        db,
        'companies',
        companyId,
        'customers',
        customer.id,
        'folders'
      );

      unsubscribe = onSnapshot(
        foldersRef,
        snapshot => {
          const loadedFolders: FolderItem[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            loadedFolders.push({
              id: doc.id,
              ...data,
            } as FolderItem);
          });
          // Sort in application instead of Firestore
          loadedFolders.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });
          setFolders(loadedFolders);
        },
        error => {
          // Silently handle permission errors for folders collection
          // This is expected if the collection doesn't exist yet
          if (error.code === 'permission-denied') {
            setFolders([]);
          } else {
            console.error('Error loading folders:', error);
            setFolders([]);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up folders listener:', error);
      setFolders([]);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [customer?.id, companyId]);

  // Load documents from Firebase
  useEffect(() => {
    if (!customer?.id || !companyId) return;

    const documentsRef = collection(
      db,
      'companies',
      companyId,
      'customers',
      customer.id,
      'documents'
    );

    const unsubscribe = onSnapshot(
      documentsRef,
      snapshot => {
        const loadedDocuments: DocumentItem[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          loadedDocuments.push({
            id: doc.id,
            ...data,
          } as DocumentItem);
        });
        // Sort in application instead of Firestore
        loadedDocuments.sort((a, b) => {
          const aTime = a.uploadedAt?.toMillis?.() || 0;
          const bTime = b.uploadedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setDocuments(loadedDocuments);

        // Calculate storage used
        const totalSize = loadedDocuments.reduce((sum, doc) => sum + (doc.size || 0), 0);
        setStorageUsed(totalSize);

        // Update total documents count
        onDocumentsCountChange?.(loadedDocuments.length);
      },
      error => {
        console.error('Error loading documents:', error);
        setDocuments([]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [customer?.id, companyId, onDocumentsCountChange]);

  // Update folder path when currentFolderId changes
  useEffect(() => {
    if (!currentFolderId) {
      setFolderPath([]);
      return;
    }

    const buildPath = (folderId: string): FolderItem[] => {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return [];

      if (folder.parentFolderId) {
        return [...buildPath(folder.parentFolderId), folder];
      }
      return [folder];
    };

    setFolderPath(buildPath(currentFolderId));
  }, [currentFolderId, folders]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !customer?.id || !companyId || !user) return;

    // Calculate total size of files to upload
    const filesToUploadSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);

    // Check storage limit
    if (storageUsed + filesToUploadSize > storageLimit) {
      const remainingSpace = storageLimit - storageUsed;
      toast.error(
        `Nicht genügend Speicherplatz! Benötigt: ${formatFileSize(filesToUploadSize)}, Verfügbar: ${formatFileSize(remainingSpace)}`
      );
      setShowUpgradeDialog(true);
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file size (max 10MB per file)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Datei "${file.name}" ist zu groß (max. 10MB pro Datei)`);
          continue;
        }

        // Check storage limit BEFORE upload
        const { StorageLimitService } = await import('@/services/storageLimitService');
        const limitCheck = await StorageLimitService.canUpload(companyId, file.size);

        if (!limitCheck.allowed) {
          toast.error(limitCheck.reason || 'Speicherlimit erreicht', {
            description: 'Bitte upgraden Sie Ihren Plan oder löschen Sie Dateien.',
            duration: 6000,
          });

          // Send email if over limit
          if (limitCheck.percentUsed >= 100) {
            try {
              await fetch('/api/storage/send-limit-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  companyId,
                  type: 'over_limit',
                  currentUsage: limitCheck.currentUsage,
                  limit: limitCheck.limit,
                }),
              });
            } catch (emailError) {
              console.error('Error sending limit email:', emailError);
            }
          }

          setIsUploading(false);
          return; // Stop all uploads
        }

        // Send warning email if approaching limit (90%)
        if (limitCheck.percentUsed >= 90 && limitCheck.percentUsed < 100) {
          try {
            await fetch('/api/storage/send-limit-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId,
                type: 'warning',
                currentUsage: limitCheck.currentUsage,
                limit: limitCheck.limit,
                percentUsed: limitCheck.percentUsed,
              }),
            });
          } catch (emailError) {
            console.error('Error sending warning email:', emailError);
          }
        }

        // Generate unique filename
        const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileName = `${fileId}_${file.name}`;

        // Upload file to Firebase Storage
        const fileRef = storageRef(
          storage,
          `companies/${companyId}/customers/${customer.id}/documents/${fileName}`
        );
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // Track storage usage
        await UsageTrackingService.trackStorageUpload(companyId, file.size);

        // Get file type category
        const getFileType = (mimeType: string): string => {
          if (mimeType.includes('pdf')) return 'application/pdf';
          if (mimeType.includes('image')) return mimeType;
          if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
            return 'application/excel';
          if (mimeType.includes('word') || mimeType.includes('document')) return 'application/word';
          return 'other';
        };

        // Automatische Kategorisierung
        const category = categorizeDocument(file.name);
        const description = generateDescription(file.name, category);

        // Save document metadata to Firestore
        const documentsRef = collection(
          db,
          'companies',
          companyId,
          'customers',
          customer.id,
          'documents'
        );
        await addDoc(documentsRef, {
          originalName: file.name,
          name: fileName,
          type: getFileType(file.type),
          size: file.size,
          category: category,
          description: generateDescription(file.name, category),
          url: downloadURL,
          uploadedAt: serverTimestamp(),
          uploadedBy: user.uid,
          uploadedByName:
            `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt',
          folderId: currentFolderId, // Save to current folder
        });

        // Create activity entry for document upload
        const activitiesRef = collection(
          db,
          'companies',
          companyId,
          'customers',
          customer.id,
          'activities'
        );
        await addDoc(activitiesRef, {
          type: 'document',
          title: 'Dokument hochgeladen',
          description: `Dokument "${file.name}" wurde hochgeladen`,
          timestamp: serverTimestamp(),
          userId: user.uid,
          user: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System',
          metadata: {
            documentName: file.name,
            documentCategory: category,
            documentSize: file.size,
          },
        });
      }

      toast.success('Dokumente wurden erfolgreich hochgeladen');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Fehler beim Hochladen der Dokumente');
    } finally {
      setUploading(false);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !customer?.id || !companyId || !user) return;

    try {
      const foldersRef = collection(
        db,
        'companies',
        companyId,
        'customers',
        customer.id,
        'folders'
      );
      await addDoc(foldersRef, {
        name: newFolderName.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt',
        parentFolderId: currentFolderId,
        color: '#14ad9f',
      });

      // Create activity entry
      const activitiesRef = collection(
        db,
        'companies',
        companyId,
        'customers',
        customer.id,
        'activities'
      );
      await addDoc(activitiesRef, {
        type: 'document',
        title: 'Ordner erstellt',
        description: `Ordner "${newFolderName}" wurde erstellt`,
        timestamp: serverTimestamp(),
        userId: user.uid,
        user: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System',
      });

      toast.success('Ordner wurde erfolgreich erstellt');
      setNewFolderName('');
      setShowCreateFolderDialog(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Fehler beim Erstellen des Ordners');
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!customer?.id || !companyId) return;

    // Check if folder has documents
    const docsInFolder = documents.filter(d => d.folderId === folder.id);
    if (docsInFolder.length > 0) {
      toast.error('Ordner enthält noch Dokumente und kann nicht gelöscht werden');
      return;
    }

    // Check if folder has subfolders
    const subfolders = folders.filter(f => f.parentFolderId === folder.id);
    if (subfolders.length > 0) {
      toast.error('Ordner enthält noch Unterordner und kann nicht gelöscht werden');
      return;
    }

    try {
      await deleteDoc(
        doc(db, 'companies', companyId, 'customers', customer.id, 'folders', folder.id)
      );
      toast.success('Ordner wurde gelöscht');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Fehler beim Löschen des Ordners');
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Intelligente Kategorisierung basierend auf Dateiname
  const categorizeDocument = (fileName: string): DocumentItem['category'] => {
    const lowerName = fileName.toLowerCase();

    // Rechnungen
    if (
      lowerName.includes('rechnung') ||
      lowerName.includes('invoice') ||
      lowerName.includes('re-') ||
      lowerName.includes('inv-') ||
      lowerName.includes('billing') ||
      lowerName.includes('faktura')
    ) {
      return 'invoice';
    }

    // Verträge
    if (
      lowerName.includes('vertrag') ||
      lowerName.includes('contract') ||
      lowerName.includes('vereinbarung') ||
      lowerName.includes('agreement') ||
      lowerName.includes('rahmen') ||
      lowerName.includes('service') ||
      lowerName.includes('dienstleistung')
    ) {
      return 'contract';
    }

    // Zertifikate und Bescheinigungen
    if (
      lowerName.includes('zertifikat') ||
      lowerName.includes('certificate') ||
      lowerName.includes('bescheinigung') ||
      lowerName.includes('nachweis') ||
      lowerName.includes('gewerbe') ||
      lowerName.includes('lizenz') ||
      lowerName.includes('license') ||
      lowerName.includes('permit')
    ) {
      return 'certificate';
    }

    // Korrespondenz
    if (
      lowerName.includes('email') ||
      lowerName.includes('mail') ||
      lowerName.includes('brief') ||
      lowerName.includes('korrespondenz') ||
      lowerName.includes('anschreiben') ||
      lowerName.includes('mitteilung') ||
      lowerName.includes('communication')
    ) {
      return 'correspondence';
    }

    // Standard: Sonstiges
    return 'other';
  };

  // Generiere eine bessere Beschreibung basierend auf der Kategorie
  const generateDescription = (fileName: string, category: DocumentItem['category']): string => {
    const baseName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension

    switch (category) {
      case 'invoice':
        return `Rechnung: ${baseName}`;
      case 'contract':
        return `Vertragsdokument: ${baseName}`;
      case 'certificate':
        return `Zertifikat/Nachweis: ${baseName}`;
      case 'correspondence':
        return `Korrespondenz: ${baseName}`;
      default:
        return `Dokument: ${baseName}`;
    }
  };

  // Rekategorisierung bestehender Dokumente
  const recategorizeDocument = async (document: DocumentItem) => {
    const newCategory = categorizeDocument(document.originalName);
    const newDescription = generateDescription(document.originalName, newCategory);

    try {
      const docRef = doc(
        db,
        'companies',
        companyId,
        'customers',
        customer.id,
        'documents',
        document.id
      );
      await updateDoc(docRef, {
        category: newCategory,
        description: newDescription,
      });
      toast.success('Dokument wurde neu kategorisiert');
    } catch (error) {
      console.error('Error recategorizing document:', error);
      toast.error('Fehler beim Neu-Kategorisieren');
    }
  };

  // Handle file deletion
  const handleDeleteDocument = async (document: DocumentItem) => {
    if (!customer?.id || !companyId || !user) return;

    try {
      // Delete from Storage
      const fileRef = storageRef(
        storage,
        `companies/${companyId}/customers/${customer.id}/documents/${document.name}`
      );
      await deleteObject(fileRef);

      // Track storage deletion
      await UsageTrackingService.trackStorageDeletion(companyId, document.size);

      // Delete from Firestore
      await deleteDoc(
        doc(db, 'companies', companyId, 'customers', customer.id, 'documents', document.id)
      );

      // Create activity entry for document deletion
      const activitiesRef = collection(
        db,
        'companies',
        companyId,
        'customers',
        customer.id,
        'activities'
      );
      await addDoc(activitiesRef, {
        type: 'document',
        title: 'Dokument gelöscht',
        description: `Dokument "${document.originalName}" wurde gelöscht`,
        timestamp: serverTimestamp(),
        userId: user.uid,
        user: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System',
        metadata: {
          documentName: document.originalName,
          documentCategory: document.category,
          documentSize: document.size,
        },
      });

      toast.success('Dokument wurde gelöscht');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Fehler beim Löschen des Dokuments');
    }
  };

  const categories = [
    { value: 'all', label: 'Alle Kategorien', count: documents.length },
    {
      value: 'contract',
      label: 'Verträge',
      count: documents.filter(d => d.category === 'contract').length,
    },
    {
      value: 'invoice',
      label: 'Rechnungen',
      count: documents.filter(d => d.category === 'invoice').length,
    },
    {
      value: 'certificate',
      label: 'Zertifikate',
      count: documents.filter(d => d.category === 'certificate').length,
    },
    {
      value: 'correspondence',
      label: 'Korrespondenz',
      count: documents.filter(d => d.category === 'correspondence').length,
    },
    {
      value: 'other',
      label: 'Sonstiges',
      count: documents.filter(d => d.category === 'other').length,
    },
  ];

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('image')) return <Image className="h-8 w-8 text-green-500" />;
    if (type.includes('excel') || type.includes('spreadsheet'))
      return <File className="h-8 w-8 text-green-600" />;
    if (type.includes('word') || type.includes('document'))
      return <File className="h-8 w-8 text-blue-600" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getCategoryColor = (category: DocumentItem['category']) => {
    switch (category) {
      case 'contract':
        return 'bg-blue-100 text-blue-800';
      case 'invoice':
        return 'bg-green-100 text-green-800';
      case 'certificate':
        return 'bg-purple-100 text-purple-800';
      case 'correspondence':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: DocumentItem['category']) => {
    switch (category) {
      case 'contract':
        return 'Vertrag';
      case 'invoice':
        return 'Rechnung';
      case 'certificate':
        return 'Zertifikat';
      case 'correspondence':
        return 'Korrespondenz';
      default:
        return 'Sonstiges';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unbekannt';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Filter folders by current location
  const currentFolders = folders.filter(f => f.parentFolderId === currentFolderId);

  // Filter documents by current location
  const currentDocuments = documents.filter(doc => doc.folderId === currentFolderId);

  const filteredDocuments = currentDocuments.filter(doc => {
    const matchesSearch =
      doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex gap-4">
      {/* Main Content Area */}
      <div className={`flex-1 space-y-4 transition-all ${selectedItem ? 'mr-0' : ''}`}>
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
          <button
            onClick={() => navigateToFolder(null)}
            className="flex items-center gap-1 hover:text-[#14ad9f] transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Alle Dokumente</span>
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="h-4 w-4" />
              <button
                onClick={() => navigateToFolder(folder.id)}
                className="hover:text-[#14ad9f] transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowCreateFolderDialog(true)}
            size="sm"
            variant="outline"
            className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Neuer Ordner
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="bg-[#14ad9f] hover:bg-taskilo-hover"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Lädt hoch...' : 'Dokument hochladen'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.xml,.doc,.docx,.xls,.xlsx"
            onChange={e => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Filter and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {currentFolderId ? folderPath[folderPath.length - 1]?.name : 'Alle Dokumente'}
              </CardTitle>
              <div className="text-sm text-gray-500">
                {currentFolders.length} Ordner • {currentDocuments.length} Dokumente
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Dokumente durchsuchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label} ({category.count})
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Folders Grid */}
            {currentFolders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Ordner
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {currentFolders.map(folder => (
                    <div
                      key={folder.id}
                      className={`group relative border-2 rounded-lg p-4 hover:border-[#14ad9f] hover:bg-[#14ad9f]/5 transition-all cursor-pointer ${
                        selectedItem &&
                        selectedItemType === 'folder' &&
                        (selectedItem as FolderItem).id === folder.id
                          ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                          : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedItem(folder);
                        setSelectedItemType('folder');
                      }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigateToFolder(folder.id);
                          }}
                          onDoubleClick={() => navigateToFolder(folder.id)}
                          className="flex flex-col items-center gap-2 w-full"
                        >
                          <Folder
                            className="h-10 w-10"
                            style={{ color: folder.color || '#14ad9f' }}
                          />
                          <span className="text-sm font-medium text-gray-900 text-center break-words w-full">
                            {folder.name}
                          </span>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteFolder(folder);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents List */}
            <div className="space-y-3">
              {currentFolders.length === 0 && filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Folder className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-medium mb-1">Dieser Ordner ist leer</p>
                  <p className="text-sm">Erstelle einen Ordner oder lade Dokumente hoch</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                searchTerm && (
                  <div className="text-center py-8 text-gray-500">
                    <File className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>Keine Dokumente gefunden</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setSearchTerm('')}
                    >
                      Filter zurücksetzen
                    </Button>
                  </div>
                )
              ) : (
                <>
                  {filteredDocuments.length > 0 && (
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Dokumente
                    </h3>
                  )}
                  {filteredDocuments.map(document => (
                    <div
                      key={document.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedItem &&
                        selectedItemType === 'document' &&
                        (selectedItem as DocumentItem).id === document.id
                          ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                          : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedItem(document);
                        setSelectedItemType('document');
                      }}
                    >
                      {/* File Icon */}
                      <div className="shrink-0">{getFileIcon(document.type)}</div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium text-gray-900 break-all leading-5">
                            {document.originalName}
                          </h4>
                          <Badge className={getCategoryColor(document.category)}>
                            {getCategoryLabel(document.category)}
                          </Badge>
                        </div>
                        {document.description && (
                          <p className="text-sm text-gray-600 mb-1">{document.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(document.uploadedAt)}
                          </span>
                          <span>{formatFileSize(document.size)}</span>
                          <span>von {document.uploadedByName || 'System'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Vorschau"
                          onClick={() => window.open(document.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Herunterladen"
                          onClick={async () => {
                            const { StorageLimitService } = await import(
                              '@/services/storageLimitService'
                            );
                            const limitCheck = await StorageLimitService.canDownload(companyId);

                            if (!limitCheck.allowed) {
                              toast.error(limitCheck.reason || 'Download gesperrt', {
                                description: 'Sie haben Ihr Speicherlimit überschritten.',
                                duration: 6000,
                              });
                              return;
                            }

                            window.open(document.url, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Löschen"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteDocument(document)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Folder Dialog */}
        <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">Neuen Ordner erstellen</DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <Input
                placeholder="Ordnername eingeben..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateFolderDialog(false);
                  setNewFolderName('');
                }}
              >
                Abbrechen
              </Button>
              <Button
                size="sm"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-[#14ad9f] hover:bg-taskilo-hover"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Details Sidebar - Google Drive Style */}
      {selectedItem && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto max-h-[calc(100vh-200px)]">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Details</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedItem(null);
                setSelectedItemType(null);
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-6">
            {/* Preview/Icon */}
            <div className="flex justify-center py-6 bg-gray-50 rounded-lg">
              {selectedItemType === 'folder' ? (
                <Folder
                  className="h-24 w-24"
                  style={{ color: (selectedItem as FolderItem).color || '#14ad9f' }}
                />
              ) : (
                getFileIcon((selectedItem as DocumentItem).type)
              )}
            </div>

            {/* Name */}
            <div>
              <h4 className="font-semibold text-lg text-gray-900 break-words">
                {selectedItemType === 'folder'
                  ? (selectedItem as FolderItem).name
                  : (selectedItem as DocumentItem).originalName}
              </h4>
              {selectedItemType === 'document' && (selectedItem as DocumentItem).description && (
                <p className="text-sm text-gray-600 mt-1">
                  {(selectedItem as DocumentItem).description}
                </p>
              )}
            </div>

            {/* Type & Category */}
            {selectedItemType === 'document' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getCategoryColor((selectedItem as DocumentItem).category)}>
                    {getCategoryLabel((selectedItem as DocumentItem).category)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Details List */}
            <div className="space-y-4 text-sm">
              {/* Type */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-5">
                  <File className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs">Typ</div>
                  <div className="text-gray-900 font-medium">
                    {selectedItemType === 'folder' ? 'Ordner' : (selectedItem as DocumentItem).type}
                  </div>
                </div>
              </div>

              {/* Size - nur für Dokumente */}
              {selectedItemType === 'document' && (
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-5">
                    <HardDrive className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-500 text-xs">Größe</div>
                    <div className="text-gray-900 font-medium">
                      {formatFileSize((selectedItem as DocumentItem).size)}
                    </div>
                  </div>
                </div>
              )}

              {/* Owner */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-5">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs">
                    {selectedItemType === 'folder' ? 'Erstellt von' : 'Hochgeladen von'}
                  </div>
                  <div className="text-gray-900 font-medium">
                    {selectedItemType === 'folder'
                      ? (selectedItem as FolderItem).createdByName
                      : (selectedItem as DocumentItem).uploadedByName}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-5">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs">
                    {selectedItemType === 'folder' ? 'Erstellt am' : 'Hochgeladen am'}
                  </div>
                  <div className="text-gray-900 font-medium">
                    {selectedItemType === 'folder'
                      ? formatDate((selectedItem as FolderItem).createdAt)
                      : formatDate((selectedItem as DocumentItem).uploadedAt)}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-5">
                  <Folder className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-500 text-xs">Speicherort</div>
                  <div className="text-gray-900 font-medium">
                    {currentFolderId ? folderPath.map(f => f.name).join(' / ') : 'Hauptordner'}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200 space-y-2">
              {selectedItemType === 'document' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open((selectedItem as DocumentItem).url, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Vorschau öffnen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open((selectedItem as DocumentItem).url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Herunterladen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleDeleteDocument(selectedItem as DocumentItem);
                      setSelectedItem(null);
                      setSelectedItemType(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </Button>
                </>
              )}
              {selectedItemType === 'folder' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      navigateToFolder((selectedItem as FolderItem).id);
                      setSelectedItem(null);
                      setSelectedItemType(null);
                    }}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    Ordner öffnen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleDeleteFolder(selectedItem as FolderItem);
                      setSelectedItem(null);
                      setSelectedItemType(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
