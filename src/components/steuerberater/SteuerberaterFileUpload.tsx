// Datei-Upload Komponente für Steuerberater Portal
'use client';

import React, { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SteuerberaterDocumentService } from '@/lib/steuerberater-document-service';

interface FileUploadProps {
  companyId: string;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: any;
}

export default function SteuerberaterFileUpload({
  companyId,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  acceptedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/xml',
  ],
  maxFileSize = 50,
}: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentService = SteuerberaterDocumentService.getInstance();

  const categories = [
    { value: 'tax_report', label: 'Steuererklärung' },
    { value: 'financial_statement', label: 'Bilanz/GuV' },
    { value: 'cashbook', label: 'Kassenbuch' },
    { value: 'invoice_data', label: 'Rechnungsdaten' },
    { value: 'datev_export', label: 'DATEV Export' },
    { value: 'other', label: 'Sonstiges' },
  ];

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadFile[] = [];

    for (let i = 0; i < files.length && newFiles.length + uploadFiles.length < maxFiles; i++) {
      const file = files[i];

      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        onUploadError?.(`Dateityp "${file.type}" nicht unterstützt`);
        continue;
      }

      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        onUploadError?.(`Datei "${file.name}" ist zu groß (max. ${maxFileSize}MB)`);
        continue;
      }

      newFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0,
      });
    }

    setUploadFiles(prev => [...prev, ...newFiles]);
  };

  const uploadFileHandler = async (
    uploadFile: UploadFile,
    metadata: {
      category: string;
      description?: string;
      tags: string[];
      period?: string;
      year?: number;
    }
  ) => {
    setUploadFiles(prev =>
      prev.map(f => (f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f))
    );

    try {
      const result = await documentService.uploadDocument(uploadFile.file, companyId, {
        type: uploadFile.file.type,
        category: metadata.category,
        description: metadata.description,
        tags: metadata.tags,
        period: metadata.period,
        year: metadata.year,
        encrypted: true,
      });

      if (result.success) {
        setUploadFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id ? { ...f, status: 'success', progress: 100, result } : f
          )
        );
        onUploadComplete?.(result);
      } else {
        throw new Error(result.error || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload fehlgeschlagen';
      setUploadFiles(prev =>
        prev.map(f => (f.id === uploadFile.id ? { ...f, status: 'error', error: errorMessage } : f))
      );
      onUploadError?.(errorMessage);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragOver ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-300 hover:border-[#14ad9f]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Dokumente hochladen</h3>
        <p className="text-sm text-gray-600 mb-4">
          Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
        </p>
        <p className="text-xs text-gray-500">
          Unterstützte Formate: PDF, Excel, CSV, XML (max. {maxFileSize}MB)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={e => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="font-medium text-gray-900">Ausgewählte Dateien</h4>

          {uploadFiles.map(uploadFile => (
            <FileUploadItem
              key={uploadFile.id}
              uploadFile={uploadFile}
              categories={categories}
              onUpload={metadata => uploadFileHandler(uploadFile, metadata)}
              onRemove={() => removeFile(uploadFile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileUploadItemProps {
  uploadFile: UploadFile;
  categories: { value: string; label: string }[];
  onUpload: (metadata: {
    category: string;
    description?: string;
    tags: string[];
    period?: string;
    year?: number;
  }) => void;
  onRemove: () => void;
}

function FileUploadItem({ uploadFile, categories, onUpload, onRemove }: FileUploadItemProps) {
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [period, setPeriod] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [showMetadata, setShowMetadata] = useState(false);

  const handleUpload = () => {
    onUpload({
      category,
      description: description || undefined,
      tags: tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
      period: period || undefined,
      year: year || undefined,
    });
  };

  const getStatusIcon = () => {
    switch (uploadFile.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-[#14ad9f]" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="text-sm font-medium text-gray-900">{uploadFile.file.name}</p>
            <p className="text-xs text-gray-500">
              {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {uploadFile.status === 'pending' && (
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="text-sm text-[#14ad9f] hover:text-[#129488]"
            >
              {showMetadata ? 'Weniger' : 'Konfigurieren'}
            </button>
          )}

          <button onClick={onRemove} className="text-gray-400 hover:text-red-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {uploadFile.status === 'uploading' && (
        <div className="mt-2">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadFile.progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadFile.status === 'error' && (
        <div className="mt-2 text-sm text-red-600">{uploadFile.error}</div>
      )}

      {uploadFile.status === 'success' && (
        <div className="mt-2 text-sm text-green-600">Erfolgreich hochgeladen</div>
      )}

      {showMetadata && uploadFile.status === 'pending' && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zeitraum</label>
              <input
                type="text"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="z.B. Q1, Januar..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (kommagetrennt)
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="z.B. wichtig, jahresabschluss, umsatzsteuer"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            />
          </div>

          <button
            onClick={handleUpload}
            className="w-full bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-[#129488] transition-colors"
          >
            Dokument hochladen
          </button>
        </div>
      )}
    </div>
  );
}
