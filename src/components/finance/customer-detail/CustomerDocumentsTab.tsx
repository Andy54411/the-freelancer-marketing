'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { db, storage } from '@/firebase/clients';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
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
  Calendar
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';

interface CustomerDocumentsTabProps {
  customer: Customer;
  companyId: string;
  onDocumentsCountChange?: (count: number) => void;
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
}

export function CustomerDocumentsTab({ customer, companyId, onDocumentsCountChange }: CustomerDocumentsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Load documents from Firebase
  useEffect(() => {
    if (!customer?.id || !companyId) return;

    const documentsRef = collection(db, 'companies', companyId, 'customers', customer.id, 'documents');
    const q = query(documentsRef, orderBy('uploadedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDocuments: DocumentItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedDocuments.push({
          id: doc.id,
          ...data,
        } as DocumentItem);
      });
      setDocuments(loadedDocuments);
      
      // Update documents count
      onDocumentsCountChange?.(loadedDocuments.length);
    });

    return unsubscribe;
  }, [customer?.id, companyId, onDocumentsCountChange]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !customer?.id || !companyId || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Datei "${file.name}" ist zu groß (max. 10MB)`);
          continue;
        }

        // Generate unique filename
        const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fileName = `${fileId}_${file.name}`;

        // Upload file to Firebase Storage
        const fileRef = storageRef(storage, `companies/${companyId}/customers/${customer.id}/documents/${fileName}`);
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // Get file type category
        const getFileType = (mimeType: string): string => {
          if (mimeType.includes('pdf')) return 'application/pdf';
          if (mimeType.includes('image')) return mimeType;
          if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'application/excel';
          if (mimeType.includes('word') || mimeType.includes('document')) return 'application/word';
          return 'other';
        };

        // Automatische Kategorisierung
        const category = categorizeDocument(file.name);
        const description = generateDescription(file.name, category);

        // Save document metadata to Firestore
        const documentsRef = collection(db, 'companies', companyId, 'customers', customer.id, 'documents');
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
          uploadedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt',
        });

        // Create activity entry for document upload
        const activitiesRef = collection(db, 'companies', companyId, 'customers', customer.id, 'activities');
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
            documentSize: file.size
          }
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

  // Intelligente Kategorisierung basierend auf Dateiname
  const categorizeDocument = (fileName: string): DocumentItem['category'] => {
    const lowerName = fileName.toLowerCase();
    
    // Rechnungen
    if (lowerName.includes('rechnung') || lowerName.includes('invoice') || 
        lowerName.includes('re-') || lowerName.includes('inv-') ||
        lowerName.includes('billing') || lowerName.includes('faktura')) {
      return 'invoice';
    }
    
    // Verträge
    if (lowerName.includes('vertrag') || lowerName.includes('contract') ||
        lowerName.includes('vereinbarung') || lowerName.includes('agreement') ||
        lowerName.includes('rahmen') || lowerName.includes('service') ||
        lowerName.includes('dienstleistung')) {
      return 'contract';
    }
    
    // Zertifikate und Bescheinigungen
    if (lowerName.includes('zertifikat') || lowerName.includes('certificate') ||
        lowerName.includes('bescheinigung') || lowerName.includes('nachweis') ||
        lowerName.includes('gewerbe') || lowerName.includes('lizenz') ||
        lowerName.includes('license') || lowerName.includes('permit')) {
      return 'certificate';
    }
    
    // Korrespondenz
    if (lowerName.includes('email') || lowerName.includes('mail') ||
        lowerName.includes('brief') || lowerName.includes('korrespondenz') ||
        lowerName.includes('anschreiben') || lowerName.includes('mitteilung') ||
        lowerName.includes('communication')) {
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
      const docRef = doc(db, 'companies', companyId, 'customers', customer.id, 'documents', document.id);
      await updateDoc(docRef, {
        category: newCategory,
        description: newDescription
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
      const fileRef = storageRef(storage, `companies/${companyId}/customers/${customer.id}/documents/${document.name}`);
      await deleteObject(fileRef);

      // Delete from Firestore
      await deleteDoc(doc(db, 'companies', companyId, 'customers', customer.id, 'documents', document.id));

      // Create activity entry for document deletion
      const activitiesRef = collection(db, 'companies', companyId, 'customers', customer.id, 'activities');
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
          documentSize: document.size
        }
      });

      toast.success('Dokument wurde gelöscht');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Fehler beim Löschen des Dokuments');
    }
  };

  const categories = [
    { value: 'all', label: 'Alle Kategorien', count: documents.length },
    { value: 'contract', label: 'Verträge', count: documents.filter(d => d.category === 'contract').length },
    { value: 'invoice', label: 'Rechnungen', count: documents.filter(d => d.category === 'invoice').length },
    { value: 'certificate', label: 'Zertifikate', count: documents.filter(d => d.category === 'certificate').length },
    { value: 'correspondence', label: 'Korrespondenz', count: documents.filter(d => d.category === 'correspondence').length },
    { value: 'other', label: 'Sonstiges', count: documents.filter(d => d.category === 'other').length },
  ];

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('image')) return <Image className="h-8 w-8 text-green-500" />;
    if (type.includes('excel') || type.includes('spreadsheet')) return <File className="h-8 w-8 text-green-600" />;
    if (type.includes('word') || type.includes('document')) return <File className="h-8 w-8 text-blue-600" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getCategoryColor = (category: DocumentItem['category']) => {
    switch (category) {
      case 'contract': return 'bg-blue-100 text-blue-800';
      case 'invoice': return 'bg-green-100 text-green-800';
      case 'certificate': return 'bg-purple-100 text-purple-800';
      case 'correspondence': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: DocumentItem['category']) => {
    switch (category) {
      case 'contract': return 'Vertrag';
      case 'invoice': return 'Rechnung';
      case 'certificate': return 'Zertifikat';
      case 'correspondence': return 'Korrespondenz';
      default: return 'Sonstiges';
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
      year: 'numeric'
    });
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#14ad9f] transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Dokumente hochladen</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ziehen Sie Dateien hierher oder klicken Sie, um Dateien auszuwählen
            </p>
            <Button 
              className="bg-[#14ad9f] hover:bg-[#129488]" 
              disabled={uploading}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {uploading ? 'Wird hochgeladen...' : 'Datei auswählen'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              Unterstützte Formate: PDF, DOC, XLS, Bilder (max. 10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dokumentenverwaltung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Dokumente durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
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

          {/* Document List */}
          <div className="space-y-3">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <File className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Keine Dokumente gefunden</p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setSearchTerm('')}
                  >
                    Filter zurücksetzen
                  </Button>
                )}
              </div>
            ) : (
              filteredDocuments.map((document) => (
                <div key={document.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(document.type)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 break-all leading-5">{document.originalName}</h4>
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
                      onClick={() => window.open(document.url, '_blank')}
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}