'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, File, Eye, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PersonalService, EmployeeDocument, Employee } from '@/services/personalService';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { app } from '@/firebase/clients';

interface DocumentsTabProps {
  employeeId: string;
  companyId: string;
  employee?: Employee;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ employeeId, companyId, employee }) => {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentCategories = [
    { value: 'personal', label: 'Persönliche Dokumente' },
    { value: 'contracts', label: 'Arbeitsverträge' },
    { value: 'certificates', label: 'Zeugnisse & Zertifikate' },
    { value: 'health', label: 'Gesundheitszeugnis' },
    { value: 'insurance', label: 'Versicherungsdokumente' },
    { value: 'training', label: 'Schulungen & Weiterbildung' },
    { value: 'performance', label: 'Leistungsbeurteilungen' },
    { value: 'disciplinary', label: 'Disziplinarmaßnahmen' },
    { value: 'termination', label: 'Beendigung' },
    { value: 'other', label: 'Sonstiges' },
  ];

  // Mapping für Firestore EmployeeDocument categories
  const categoryToFirestoreCategory = (category: string): EmployeeDocument['category'] => {
    switch (category) {
      case 'contracts':
        return 'CONTRACT';
      case 'certificates':
        return 'CERTIFICATE';
      case 'health':
        return 'MEDICAL';
      case 'training':
        return 'TRAINING';
      case 'performance':
        return 'PERFORMANCE';
      case 'disciplinary':
        return 'DISCIPLINARY';
      case 'personal':
        return 'IDENTITY';
      default:
        return 'OTHER';
    }
  };

  // Lade Dokumente beim Component Mount
  useEffect(() => {
    // Nur laden wenn employeeId vorhanden (Edit-Mode)
    if (employeeId && employeeId.trim() !== '') {
      loadDocuments();
    } else {
      // Add-Mode: Zeige leere Liste
      setDocuments([]);
      setLoading(false);
    }
  }, [employeeId, companyId]);

  // Lade Dokumente aus dem Employee-Objekt (aus Recruiting übernommen)
  useEffect(() => {
    if (employee?.documents?.length && !loading) {
      // Konvertiere die eingebetteten Dokumente in EmployeeDocument-Format
      const embeddedDocs: EmployeeDocument[] = employee.documents.map((doc, idx) => ({
        id: `embedded-${idx}`,
        companyId,
        employeeId,
        title: doc.name.replace(/\.[^/.]+$/, ''),
        category: mapDocTypeToCategory(doc.type),
        fileName: doc.name,
        fileSize: 0,
        mimeType: getMimeType(doc.name),
        downloadURL: doc.url,
        storagePath: '',
        uploadDate: doc.uploadedAt || new Date().toISOString(),
        uploadedBy: 'recruiting',
        version: 1,
        isConfidential: false,
        accessLevel: 'HR_ONLY',
        isEmbedded: true, // Markierung für eingebettete Dokumente
      }));

      // Füge eingebettete Dokumente hinzu (falls nicht schon vorhanden)
      setDocuments(prev => {
        const existingUrls = new Set(prev.map(d => d.downloadURL));
        const newDocs = embeddedDocs.filter(d => !existingUrls.has(d.downloadURL));
        return [...prev, ...newDocs];
      });
    }
  }, [employee?.documents, loading]);

  // Hilfsfunktionen für Dokumenttyp-Mapping
  const mapDocTypeToCategory = (type: string): EmployeeDocument['category'] => {
    switch (type?.toLowerCase()) {
      case 'lebenslauf':
      case 'cv':
        return 'OTHER';
      case 'anschreiben':
        return 'OTHER';
      case 'zeugnis':
      case 'arbeitszeugnis':
        return 'CERTIFICATE';
      case 'zertifikat':
        return 'CERTIFICATE';
      default:
        return 'OTHER';
    }
  };

  const getMimeType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);

      const docs = await PersonalService.getEmployeeDocuments(companyId, employeeId);
      setDocuments(docs);
    } catch (error) {
      toast.error('Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  };

  const uploadFileToFirebaseStorage = async (
    file: File,
    employeeId: string,
    category: string,
    fileName: string
  ): Promise<string> => {
    try {
      const storage = getStorage(app);
      const filePath = `employee_documents/${companyId}/${employeeId}/${category}/${fileName}`;
      const fileRef = storageRef(storage, filePath);

      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      return downloadURL;
    } catch (error) {
      throw error;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Add-Mode Prüfung
    if (!employeeId || employeeId.trim() === '') {
      toast.error('Dokumente können erst nach dem Anlegen des Mitarbeiters hochgeladen werden');

      return;
    }

    const file = files[0];
    const category = selectedCategory || 'other';

    try {
      setUploading(true);

      // 1. Datei zu Firebase Storage hochladen
      const downloadURL = await uploadFileToFirebaseStorage(file, employeeId, category, file.name);

      // 2. Dokument-Metadaten in Firestore speichern
      const documentData: Omit<EmployeeDocument, 'id'> = {
        companyId,
        employeeId,
        title: file.name.replace(/\.[^/.]+$/, ''), // Entferne Dateiendung
        category: categoryToFirestoreCategory(category),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        downloadURL,
        storagePath: `employee_documents/${companyId}/${employeeId}/${category}/${file.name}`,
        uploadDate: new Date().toISOString(),
        uploadedBy: 'current-user', // TODO: Aus Auth Context holen
        version: 1,
        isConfidential: false,
        accessLevel: 'HR_ONLY',
      };

      const savedDocumentId = await PersonalService.addEmployeeDocument(companyId, documentData);

      // 3. Erstelle ein vollständiges EmployeeDocument Objekt für den lokalen State
      const newDocument: EmployeeDocument = {
        id: savedDocumentId,
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 4. Local state aktualisieren
      setDocuments(prev => [...prev, newDocument]);
      toast.success(`Dokument "${file.name}" erfolgreich hochgeladen`);

      // 5. Reset form
      setSelectedCategory('');
      event.target.value = '';
    } catch (error) {
      toast.error('Fehler beim Hochladen des Dokuments');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (document: EmployeeDocument) => {
    if (!document.id) return;

    try {
      // Dokument aus Firestore löschen
      await PersonalService.deleteEmployeeDocument(companyId, document.id);

      // Datei aus Firebase Storage löschen (falls storagePath verfügbar)
      if (document.storagePath) {
        try {
          const storage = getStorage(app);
          const fileRef = storageRef(storage, document.storagePath);
          await deleteObject(fileRef);
        } catch (storageError) {
          // Wir machen weiter, auch wenn Storage-Löschung fehlschlägt
        }
      }

      // Local state aktualisieren
      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      toast.success('Dokument erfolgreich gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen des Dokuments');
    }
  };

  const handleViewDocument = (document: EmployeeDocument) => {
    if (document.downloadURL) {
      window.open(document.downloadURL, '_blank');
    } else {
      toast.error('Dokument-URL nicht verfügbar');
    }
  };

  const handleDownloadDocument = (doc: EmployeeDocument) => {
    if (doc.downloadURL) {
      const link = window.document.createElement('a');
      link.href = doc.downloadURL;
      link.download = doc.fileName || doc.title;
      link.click();
    } else {
      toast.error('Download-URL nicht verfügbar');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: string) => {
    const categoryMapping: { [key: string]: string } = {
      CONTRACT: 'Arbeitsvertrag',
      CERTIFICATE: 'Zeugnis/Zertifikat',
      IDENTITY: 'Persönliches Dokument',
      MEDICAL: 'Gesundheitszeugnis',
      TRAINING: 'Schulung/Weiterbildung',
      PERFORMANCE: 'Leistungsbeurteilung',
      DISCIPLINARY: 'Disziplinarmaßnahme',
      OTHER: 'Sonstiges',
    };
    return categoryMapping[category] || category;
  };

  // Gruppiere Dokumente nach Kategorie
  const groupedDocuments = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    },
    {} as { [key: string]: EmployeeDocument[] }
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dokumente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Dokumente werden geladen...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload-Bereich */}
      <Card>
        <CardHeader>
          <CardTitle>Neues Dokument hochladen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Kategorie</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  {documentCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="file">Datei auswählen</Label>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                disabled={uploading || !selectedCategory}
                className="cursor-pointer"
              />
            </div>
          </div>
          {uploading && (
            <div className="flex items-center space-x-2 text-[#14ad9f]">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f]"></div>
              <span className="text-sm">Dateien werden hochgeladen...</span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Unterstützte Formate: PDF, DOC, DOCX, JPG, PNG, GIF (max. 10MB pro Datei)
          </div>
        </CardContent>
      </Card>

      {/* Dokumente-Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Hochgeladene Dokumente ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Noch keine Dokumente hochgeladen</p>
              <p className="text-sm text-gray-400">
                Laden Sie Dokumente über das Formular oben hoch
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedDocuments).map(([category, categoryDocuments]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-medium text-gray-900 border-b pb-2">
                    {getCategoryLabel(category)} ({categoryDocuments.length})
                  </h3>
                  <div className="space-y-2">
                    {categoryDocuments.map(document => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <File className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{document.title}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(document.fileSize)} •{' '}
                              {new Date(document.uploadDate).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(document)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(document)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(document)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsTab;
