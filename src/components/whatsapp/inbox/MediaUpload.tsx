/**
 * MediaUpload Component
 * 
 * Datei-Upload für WhatsApp-Nachrichten
 */
'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, FileText, ImageIcon, Film, Music, File, AlertCircle } from 'lucide-react';

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  isUploading?: boolean;
  error?: string;
  mediaId?: string;
}

interface MediaUploadProps {
  companyId: string;
  onUpload: (files: UploadedFile[]) => void;
  onRemove: (index: number) => void;
  files: UploadedFile[];
  maxFiles?: number;
  allowedTypes?: string[];
  maxSizeBytes?: number;
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/3gpp',
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/amr',
  'audio/ogg',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB (WhatsApp Limit)

export function MediaUpload({
  companyId,
  onUpload,
  onRemove,
  files,
  maxFiles = 10,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSizeBytes = MAX_FILE_SIZE,
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getFileType = (mimeType: string): UploadedFile['type'] => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case 'video': return <Film className="w-5 h-5 text-blue-500" />;
      case 'audio': return <Music className="w-5 h-5 text-green-500" />;
      case 'document': return <FileText className="w-5 h-5 text-orange-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Dateityp nicht unterstützt';
    }
    if (file.size > maxSizeBytes) {
      return `Datei zu groß (max. ${formatFileSize(maxSizeBytes)})`;
    }
    return null;
  };

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
    const filesToProcess = Array.from(fileList).slice(0, maxFiles - files.length);

    for (const file of filesToProcess) {
      const error = validateFile(file);
      const type = getFileType(file.type);
      
      let preview: string | undefined;
      if (type === 'image' && !error) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({
        file,
        preview,
        type,
        isUploading: !error,
        error: error || undefined,
      });
    }

    onUpload([...files, ...newFiles]);

    // Upload Dateien ohne Fehler
    for (let i = 0; i < newFiles.length; i++) {
      const uploadFile = newFiles[i];
      if (!uploadFile.error) {
        try {
          const formData = new FormData();
          formData.append('file', uploadFile.file);
          formData.append('companyId', companyId);

          const response = await fetch('/api/whatsapp/media', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (result.success) {
            // Update mit mediaId
            const updatedFiles = [...files, ...newFiles];
            const fileIndex = files.length + i;
            updatedFiles[fileIndex] = {
              ...updatedFiles[fileIndex],
              isUploading: false,
              mediaId: result.mediaId,
            };
            onUpload(updatedFiles);
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          // Update mit Fehler
          const updatedFiles = [...files, ...newFiles];
          const fileIndex = files.length + i;
          updatedFiles[fileIndex] = {
            ...updatedFiles[fileIndex],
            isUploading: false,
            error: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
          };
          onUpload(updatedFiles);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, maxFiles, companyId, onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      {files.length < maxFiles && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragging 
              ? 'border-[#14ad9f] bg-[#14ad9f]/5' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-[#14ad9f]' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-600">
            Dateien hierher ziehen oder <span className="text-[#14ad9f] font-medium">durchsuchen</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Bilder, Videos, Audio, Dokumente (max. {formatFileSize(maxSizeBytes)})
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Datei-Liste */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                uploadedFile.error 
                  ? 'border-red-200 bg-red-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* Preview / Icon */}
              {uploadedFile.preview ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0 relative">
                  <Image 
                    src={uploadedFile.preview} 
                    alt="" 
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  {getFileIcon(uploadedFile.type)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
                {uploadedFile.error && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {uploadedFile.error}
                  </p>
                )}
              </div>

              {/* Status / Actions */}
              {uploadedFile.isUploading ? (
                <div className="w-5 h-5 border-2 border-[#14ad9f] border-t-transparent rounded-full animate-spin" />
              ) : (
                <button
                  onClick={() => onRemove(index)}
                  className="p-1.5 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Limit-Hinweis */}
      {files.length >= maxFiles && (
        <p className="text-xs text-orange-500 text-center">
          Maximale Anzahl an Dateien erreicht ({maxFiles})
        </p>
      )}
    </div>
  );
}
