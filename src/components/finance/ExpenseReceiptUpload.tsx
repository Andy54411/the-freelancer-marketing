'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Expense-spezifische Datenstruktur
interface ExtractedExpenseData {
  vendor?: string;
  amount?: number;
  invoiceNumber?: string;
  date?: string;
  dueDate?: string;
  category?: string;
  description?: string;
  title?: string;
  vatAmount?: number;
  netAmount?: number;
  vatRate?: number;
  paymentTerms?: string;
  // Firmeninformationen aus OCR
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyZip?: string;
  companyCountry?: string;
  companyVatNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface ExpenseReceiptUploadProps {
  companyId: string;
  onDataExtracted?: (data: ExtractedExpenseData) => void;
  onFileUploaded?: (storageUrl: string) => void;
  showPreview?: boolean;
  enhancedMode?: boolean;
  accept?: string;
  maxSize?: number;
}

export function ExpenseReceiptUpload({
  companyId,
  onDataExtracted,
  onFileUploaded,
  showPreview = true,
  enhancedMode = true,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB default
}: ExpenseReceiptUploadProps) {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = accept.split(',').map((t: string) => t.trim());
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

    // Create preview URL
    if (showPreview && (file.type.includes('image') || file.type.includes('pdf'))) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    try {
      setOcrProgress('Datei wird zu Cloud Storage hochgeladen...');

      // Step 1: Upload to storage
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

      const finalStorageUrl = uploadResult.fileUrl || uploadResult.s3Path || uploadResult.gcsPath;

      setOcrProgress('OCR-Analyse wird gestartet...');

      // Step 2: Process with Expense-specific OCR
      const formDataOCR = new FormData();
      formDataOCR.append('file', file);
      formDataOCR.append('companyId', companyId);

      setOcrProgress('Text wird erkannt und analysiert...');

      const response = await fetch('/api/expenses/ocr-extract', {
        method: 'POST',
        body: formDataOCR,
      });

      const result = await response.json();

      if (result.success) {
        setOcrProgress('Daten werden verarbeitet...');
        const data = result.data;

        // Callback to parent component
        setOcrProgress('Kategorien werden analysiert...');
        onDataExtracted?.(data);
        onFileUploaded?.(finalStorageUrl);

        // Show completion
        setTimeout(() => {
          setOcrProgress('✅ Analyse abgeschlossen');
          setTimeout(() => {
            setProcessingOCR(false);
            setOcrProgress('');
          }, 1000);
        }, 500);
      } else {
        const errorMsg = `OCR fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`;
        alert(`❌ ${errorMsg}`);
        setProcessingOCR(false);
        setOcrProgress('');
      }
    } catch (error) {
      console.error('Expense OCR error:', error);
      alert('❌ Fehler bei der OCR-Verarbeitung');
      setProcessingOCR(false);
      setOcrProgress('');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

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

  const handleClear = () => {
    setUploadedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col" style={{ height: '750px' }}>
      {/* Upload Area */}
      {!uploadedFile && (
        <div
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#14ad9f] transition-colors cursor-pointer m-4 min-h-[200px] rounded-lg"
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

          <div className="space-y-4 text-center w-full p-6">
            {uploadingFile ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
                <div>
                  <p className="text-sm text-[#14ad9f] font-medium">Analysiere Ausgabenbeleg...</p>
                  <p className="text-xs text-gray-500 mt-1">OCR-Texterkennung läuft</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="space-y-2">
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    Ausgabenbeleg hochladen
                  </span>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>oder hier hineinziehen</p>
                    <p>
                      {accept} (max. {Math.round(maxSize / (1024 * 1024))}MB)
                    </p>
                    <p className="text-[#14ad9f] font-medium mt-2">
                      💡 Automatische Extraktion von Lieferant, Betrag & MwSt
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
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="text-center">
            <div className="text-4xl font-bold tracking-wider mb-4">
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
            {ocrProgress && <p className="text-sm text-gray-600 mt-2">{ocrProgress}</p>}
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

      {/* PDF/Image Preview */}
      {uploadedFile && showPreview && previewUrl && (
        <div className="flex flex-col bg-white overflow-hidden relative rounded-lg border border-gray-200">
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

          {/* Document Preview */}
          <div className="flex-1 p-3 overflow-auto bg-gray-50 min-h-0" style={{ height: '650px' }}>
            {uploadedFile?.type.includes('image') ? (
              <img src={previewUrl} alt="Beleg Vorschau" className="w-full h-full object-contain" />
            ) : uploadedFile?.type.includes('pdf') ? (
              <iframe
                src={previewUrl}
                className="w-full border border-gray-200 rounded bg-white"
                style={{ height: '100%', minHeight: '600px' }}
                title="PDF Vorschau"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center text-gray-500 text-sm">
                Vorschau nicht verfügbar für diesen Dateityp
              </div>
            )}
          </div>

          {/* New Upload Button */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0 bg-white">
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

export default ExpenseReceiptUpload;
