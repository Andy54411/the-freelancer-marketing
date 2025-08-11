'use client';

import React, { useState, useRef } from 'react';
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

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  uploadDate: string;
  size: number;
  url: string;
}

interface DocumentsTabProps {
  employeeId: string;
  companyId: string;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ employeeId, companyId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedCategory) {
      toast.error('Bitte wählen Sie eine Kategorie aus');
      return;
    }

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Dateivalidierung
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          toast.error(`Datei ${file.name} ist zu groß (max. 10MB)`);
          continue;
        }

        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(`Dateityp von ${file.name} wird nicht unterstützt`);
          continue;
        }

        // TODO: Hier würde die tatsächliche Upload-Logik implementiert
        // Für jetzt simulieren wir den Upload
        const mockDocument: Document = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type,
          category: selectedCategory,
          uploadDate: new Date().toISOString(),
          size: file.size,
          url: URL.createObjectURL(file), // Mock URL
        };

        setDocuments(prev => [...prev, mockDocument]);
        toast.success(`${file.name} erfolgreich hochgeladen`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen der Dateien');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // TODO: Implement actual delete logic
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      toast.success('Dokument erfolgreich gelöscht');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Fehler beim Löschen des Dokuments');
    }
  };

  const handleViewDocument = (document: Document) => {
    // TODO: Implement document viewer
    window.open(document.url, '_blank');
  };

  const handleDownloadDocument = (doc: Document) => {
    // TODO: Implement download logic
    const link = window.document.createElement('a');
    link.href = doc.url;
    link.download = doc.name;
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (category: string) => {
    return documentCategories.find(cat => cat.value === category)?.label || category;
  };

  const groupedDocuments = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>
  );

  return (
    <div className="space-y-6">
      {/* Upload-Bereich */}
      <Card>
        <CardHeader>
          <CardTitle>Dokument hochladen</CardTitle>
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
              <Label htmlFor="fileUpload">Datei auswählen</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileUpload}
                  disabled={uploading || !selectedCategory}
                  className="flex-1"
                />
                <Button
                  type="button"
                  disabled={uploading || !selectedCategory}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Unterstützte Formate: PDF, DOC, DOCX, JPG, PNG, GIF (max. 10MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dokumentenliste */}
      <div className="space-y-4">
        {Object.keys(groupedDocuments).length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Noch keine Dokumente hochgeladen</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedDocuments).map(([category, docs]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="h-5 w-5" />
                  {getCategoryLabel(category)}
                  <Badge variant="secondary">{docs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {docs.map(document => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(document.size)} •{' '}
                            {new Date(document.uploadDate).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDocument(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(document.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentsTab;
