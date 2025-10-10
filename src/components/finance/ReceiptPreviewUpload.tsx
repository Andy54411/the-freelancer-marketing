'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExtractedReceiptData {
  vendor?: string;
  amount?: number;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string; // 🎯 FÄLLIGKEITSDATUM hinzugefügt
  category?: string;
  description?: string;
  title?: string;
  vatAmount?: number;
  netAmount?: number;
  vatRate?: number;

  // Enhanced OCR fields
  costCenter?: string;
  paymentTerms?: string; // 🎯 Geändert von number zu string für Text-Zahlungsbedingungen
  currency?: string;
  companyVatNumber?: string;
  goBDCompliant?: boolean;
  validationIssues?: Array<{
    field: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;
  }>;
  processingMode?: string;
}

interface ReceiptPreviewUploadProps {
  companyId: string;
  onDataExtracted: (data: ExtractedReceiptData, storageUrl?: string) => void | Promise<void>;
  onFileUploaded?: (file: File, storageUrl?: string) => void;
  className?: string;
  accept?: string;
  maxSize?: number; // in bytes
  showPreview?: boolean;
  enhancedMode?: boolean; // Aktiviert erweiterte deutsche OCR
  ocrSettings?: any; // Company-spezifische OCR-Einstellungen
}

export default function ReceiptPreviewUpload({
  companyId,
  onDataExtracted,
  onFileUploaded,
  className = '',
  accept = '.pdf,.jpg,.jpeg,.png,.xml',
  maxSize = 15 * 1024 * 1024, // 15MB für Enhanced OCR
  showPreview = true,
  enhancedMode = false, // DEAKTIVIERT: Verwende standard OCR für echte Daten
  ocrSettings,
}: ReceiptPreviewUploadProps) {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storageUrl, setStorageUrl] = useState<string | null>(null); // 🎯 NEU: Storage-URL speichern
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload and PDF parsing
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = accept.split(',').map(t => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (
      !allowedTypes.includes(fileExtension) &&
      !file.type.includes('pdf') &&
      !file.type.includes('image')
    ) {
      alert('Dateiformat nicht unterstützt. Erlaubt: ' + allowedTypes.join(', '));
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      alert(`Datei ist zu groß (max. ${maxSizeMB}MB)`);
      return;
    }

    setUploadingFile(true);
    setProcessingOCR(true);
    setOcrProgress('Datei wird hochgeladen...');
    setUploadedFile(file);

    // Create preview URL for supported formats
    if (showPreview && (file.type.includes('image') || file.type.includes('pdf'))) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    try {
      setOcrProgress('Datei wird zu Cloud Storage hochgeladen...');

      // Step 1: Upload file to cloud storage first
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('companyId', companyId);

      const uploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(`Upload failed: ${uploadResult.error}`);
      }

      // 🎯 Speichere Storage-URL (Priorität: fileUrl > s3Path > gcsPath)
      const finalStorageUrl = uploadResult.fileUrl || uploadResult.s3Path || uploadResult.gcsPath;
      setStorageUrl(finalStorageUrl);

      setOcrProgress('OCR-Analyse wird gestartet...');

      // Step 2: Process OCR with cloud storage reference
      const ocrPayload = {
        // Cloud storage reference (priority: S3 > GCS > HTTP URL)
        s3Path: uploadResult.s3Path,
        gcsPath: uploadResult.gcsPath,
        fileUrl: uploadResult.fileUrl,

        // Metadata
        companyId,
        fileName: file.name,
        mimeType: file.type,
        maxFileSizeMB: Math.round(maxSize / (1024 * 1024)),

        // Enhanced Mode Konfiguration
        enhanced: enhancedMode,
        settings: enhancedMode ? ocrSettings : undefined,
      };

      // Verwende neue Multi-Cloud OCR API
      const apiEndpoint = '/api/finance/ocr-cloud-storage';

      setOcrProgress('Text wird erkannt und analysiert...');

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ocrPayload),
      });

      const result = await response.json();

      if (result.success) {
        setOcrProgress('Daten werden verarbeitet...');
        const data = result.data;
        setExtractedData(data);

        // Callback to parent component (mit Gemini AI support)
        setOcrProgress('Gemini AI analysiert Kategorien...');
        await onDataExtracted(data, finalStorageUrl); // 🎯 Storage-URL übergeben
        onFileUploaded?.(file, finalStorageUrl); // 🎯 Storage-URL übergeben

        // Brief delay to show completion
        setTimeout(() => {
          setOcrProgress('✅ Analyse abgeschlossen');
          setTimeout(() => {
            setProcessingOCR(false);
            setOcrProgress('');
          }, 1000);
        }, 500);

        // Enhanced Success feedback mit deutschen Compliance-Infos
        // OCR extraction completed successfully
        if (enhancedMode && result.validation) {
          // Enhanced mode processing completed
          const issues = result.validation.issues?.length || 0;
          if (issues > 0) {
            // Handle validation issues if needed
          }
        }
      } else {
        const errorMsg = `Cloud Storage OCR fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`;

        // Enhanced error details for cloud storage issues
        if (result.details?.includes('DOWNLOAD_FAILED')) {
          alert(`❌ ${errorMsg}\nDatei konnte nicht aus Cloud Storage geladen werden.`);
        } else if (result.details?.includes('FILE_TOO_LARGE')) {
          alert(`❌ ${errorMsg}\nDatei ist zu groß für OCR-Verarbeitung.`);
        } else {
          alert(`❌ ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('Cloud Storage OCR error:', error);

      // Enhanced error handling for different failure points
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

      if (errorMessage.includes('Upload failed')) {
        alert('❌ Fehler beim Upload zu Cloud Storage');
        setOcrProgress('❌ Cloud Storage Upload fehlgeschlagen');
      } else {
        alert('❌ Fehler bei Cloud Storage OCR-Verarbeitung');
        setOcrProgress('❌ Fehler bei der OCR-Analyse');
      }

      setTimeout(() => {
        setProcessingOCR(false);
        setOcrProgress('');
      }, 2000);
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Clear uploaded file
  const handleClear = () => {
    setUploadedFile(null);
    setExtractedData(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Upload Area - nur anzeigen wenn keine Datei hochgeladen */}
      {!uploadedFile && (
        <div
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#14ad9f] transition-colors cursor-pointer m-4 min-h-[200px]"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !uploadingFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="space-y-4 text-center w-full">
            {uploadingFile ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
                <div>
                  <p className="text-sm text-[#14ad9f] font-medium">Analysiere Beleg...</p>
                  <p className="text-xs text-gray-500 mt-1">OCR-Texterkennung läuft</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
                <div className="space-y-2">
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    Beleg hochladen
                  </span>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>oder hier hineinziehen</p>
                    <p>
                      {accept} (max. {Math.round(maxSize / (1024 * 1024))}MB)
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* OCR Processing Overlay */}
      {processingOCR && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-4xl font-bold tracking-wider">
            {'taskilo'.split('').map((letter, index) => (
              <span
                key={index}
                className="inline-block transition-all duration-300"
                style={{
                  color: '#14ad9f',
                  opacity: 0.3,
                  transform: 'scale(1)',
                  animation: `snakeLoad 2.1s infinite ${index * 0.3}s ease-in-out`,
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <style jsx>{`
            @keyframes snakeLoad {
              0%,
              100% {
                opacity: 0.3;
                transform: scale(1);
                color: #94a3b8;
              }
              50% {
                opacity: 1;
                transform: scale(1.1);
                color: #14ad9f;
              }
            }
          `}</style>
        </div>
      )}

      {/* Direct Preview - direkt sichtbar nach Upload */}
      {uploadedFile && showPreview && previewUrl && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          {/* File Info Header */}
          <div className="bg-[#14ad9f]/5 px-4 py-3 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#14ad9f]" />
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Document Preview - flexibel skalierend */}
          <div className="flex-1 p-3 overflow-auto">
            {uploadedFile?.type.includes('image') ? (
              <img src={previewUrl} alt="Beleg Vorschau" className="w-full h-full object-contain" />
            ) : uploadedFile?.type.includes('pdf') ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border border-gray-200 rounded"
                title="PDF Vorschau"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center text-gray-500 text-sm">
                Vorschau nicht verfügbar für diesen Dateityp
              </div>
            )}
          </div>

          {/* Neuen Beleg hochladen Button - am unteren Rand */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs"
            >
              <Upload className="h-3 w-3 mr-2" />
              Neuen Beleg hochladen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
