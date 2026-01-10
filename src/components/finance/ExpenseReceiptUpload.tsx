'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Convert HEIC/HEIF to JPEG using heic2any library
 * Supports iPhone HEIC images that browsers can't natively decode
 */
async function convertHeicToJpeg(file: File): Promise<File | null> {
  try {
    console.log('🔄 [HEIC Conversion] Starting conversion:', file.name);

    // Dynamic import to avoid SSR issues
    const heic2any = (await import('heic2any')).default;

    // Convert HEIC to JPEG blob
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92,
    });

    // Handle array or single blob response
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // Create new File from converted blob
    const convertedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpeg'), {
      type: 'image/jpeg',
    });

    console.log('✅ [HEIC Conversion] Success:', {
      originalSize: `${(file.size / 1024).toFixed(2)} KB`,
      convertedSize: `${(convertedFile.size / 1024).toFixed(2)} KB`,
    });

    return convertedFile;
  } catch (error) {
    console.error('❌ [HEIC Conversion] Failed:', error);
    return null;
  }
}

// Line Items Interface
interface LineItem {
  position: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  unit?: string;
}

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
  isTaxExempt?: boolean;
  isReverseCharge?: boolean;
  lineItems?: LineItem[]; // NEW: Line items from invoice
  // Firmeninformationen aus OCR
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyZip?: string;
  companyCountry?: string;
  companyVatNumber?: string;
  companyTaxNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  iban?: string;
  bic?: string;
}

interface ExpenseReceiptUploadProps {
  companyId: string;
  onDataExtracted?: (data: ExtractedExpenseData) => void;
  onFileUploaded?: (storageUrl: string) => void;
  onFilesUploaded?: (storageUrls: string[]) => void; // NEW: Bundle of files
  showPreview?: boolean;
  enhancedMode?: boolean;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export function ExpenseReceiptUpload({
  companyId,
  onDataExtracted,
  onFileUploaded,
  onFilesUploaded,
  showPreview = true,
  enhancedMode: _enhancedMode = true,
  accept = '.pdf,.jpg,.jpeg,.png,.heic,.heif',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
}: ExpenseReceiptUploadProps) {
  const [uploadingFile, setUploadingFile] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [_storageUrls, setStorageUrls] = useState<string[]>([]); // Store all uploaded URLs
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = accept.split(',').map((t: string) => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isHeicFile = fileExtension === '.heic' || fileExtension === '.heif';

    if (
      !isHeicFile &&
      !allowedTypes.includes(fileExtension) &&
      !file.type.includes('pdf') &&
      !file.type.includes('image')
    ) {
      alert('Dateiformat nicht unterstützt. Erlaubt: ' + allowedTypes.join(', '));
      return;
    }

    // Convert HEIC to JPEG client-side before upload
    if (isHeicFile) {
      setUploadingFile(true);
      setProcessingOCR(true);
      setOcrProgress('📱 iPhone-Format wird konvertiert...');

      const convertedFile = await convertHeicToJpeg(file);

      if (convertedFile) {
        file = convertedFile;
        setOcrProgress('✅ Erfolgreich zu JPEG konvertiert');
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        alert(
          '📱 iPhone HEIC-Format konnte nicht konvertiert werden.\n\n' +
            'Bitte konvertieren Sie das Bild manuell:\n' +
            '1. Öffnen Sie das Foto → Teilen → "Als Datei sichern"\n' +
            '2. Oder: Einstellungen → Kamera → Formate → "Maximale Kompatibilität"'
        );
        setOcrProgress('');
        setUploadingFile(false);
        setProcessingOCR(false);
        return;
      }
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

  // Upload file and return storage URL (for bundling)
  const _handleFileBundleUpload = async (file: File): Promise<string | null> => {
    try {
      // Convert HEIC if needed
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isHeicFile = fileExtension === '.heic' || fileExtension === '.heif';

      if (isHeicFile) {
        const convertedFile = await convertHeicToJpeg(file);
        if (convertedFile) {
          file = convertedFile;
        } else {
          console.error('HEIC conversion failed for:', file.name);
          return null;
        }
      }

      // Upload to storage
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('companyId', companyId);

      const uploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        console.error('Upload failed:', uploadResult.error);
        return null;
      }

      const storageUrl = uploadResult.fileUrl || uploadResult.s3Path || uploadResult.gcsPath;

      // Process with OCR (but don't callback yet - we'll bundle all results)
      const formDataOCR = new FormData();
      formDataOCR.append('file', file);
      formDataOCR.append('companyId', companyId);

      await fetch('/api/expenses/ocr-extract', {
        method: 'POST',
        body: formDataOCR,
      });

      return storageUrl;
    } catch (error) {
      console.error('Bundle upload error:', error);
      return null;
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (multiple) {
      const fileArray = Array.from(files);

      // Start processing
      setUploadingFile(true);
      setProcessingOCR(true);
      setOcrProgress('Bereite Dateien vor...');

      // Convert HEIC files to JPEG for preview AND upload
      const processedFiles: File[] = [];
      const urls: string[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        let file = fileArray[i];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const isHeicFile = fileExtension === '.heic' || fileExtension === '.heif';

        if (isHeicFile) {
          setOcrProgress(`Konvertiere ${file.name}...`);
          const convertedFile = await convertHeicToJpeg(file);
          if (convertedFile) {
            file = convertedFile;
          }
        }

        processedFiles.push(file);
        urls.push(URL.createObjectURL(file));
      }

      // Set state with processed files
      setUploadedFiles(processedFiles);
      setPreviewUrls(urls);
      setCurrentFileIndex(0);
      setUploadedFile(processedFiles[0]);
      setPreviewUrl(urls[0]);

      // Upload ALL files to Storage first
      setOcrProgress('Lade Dateien hoch...');
      const uploadedStorageUrls: string[] = [];

      for (let i = 0; i < processedFiles.length; i++) {
        setOcrProgress(`Lade Datei ${i + 1} von ${processedFiles.length} hoch...`);

        const uploadFormData = new FormData();
        uploadFormData.append('file', processedFiles[i]);
        uploadFormData.append('companyId', companyId);

        const uploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          const storageUrl = uploadResult.fileUrl || uploadResult.s3Path || uploadResult.gcsPath;
          uploadedStorageUrls.push(storageUrl);
        }
      }

      // Store all URLs
      setStorageUrls(uploadedStorageUrls);

      // Now process ALL files as ONE multi-page document with OCR
      setOcrProgress('Analysiere mehrseitiges Dokument...');
      const formDataOCR = new FormData();

      // Add all files to the same request
      processedFiles.forEach((file, _index) => {
        formDataOCR.append('files', file); // Note: 'files' plural!
      });
      formDataOCR.append('companyId', companyId);
      formDataOCR.append('isMultiPage', 'true');

      const ocrResponse = await fetch('/api/expenses/ocr-extract', {
        method: 'POST',
        body: formDataOCR,
      });

      const ocrResult = await ocrResponse.json();

      if (ocrResult.success) {
        onDataExtracted?.(ocrResult.data);
      }

      // Notify parent with all URLs as a bundle
      if (uploadedStorageUrls.length > 0) {
        onFilesUploaded?.(uploadedStorageUrls);
      }

      setOcrProgress('✅ Alle Dateien verarbeitet');
      setTimeout(() => {
        setProcessingOCR(false);
        setOcrProgress('');
        setUploadingFile(false);
      }, 1500);
    } else {
      const file = files[0];
      if (file) {
        handleFileUpload(file);
      }
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
    setUploadedFiles([]);
    setStorageUrls([]);
    setCurrentFileIndex(0);

    // Revoke all preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const goToNext = () => {
    if (currentFileIndex < uploadedFiles.length - 1) {
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      setUploadedFile(uploadedFiles[nextIndex]);
      setPreviewUrl(previewUrls[nextIndex]);
    }
  };

  const goToPrevious = () => {
    if (currentFileIndex > 0) {
      const prevIndex = currentFileIndex - 1;
      setCurrentFileIndex(prevIndex);
      setUploadedFile(uploadedFiles[prevIndex]);
      setPreviewUrl(previewUrls[prevIndex]);
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
            multiple={multiple}
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
          <div className="bg-[#14ad9f]/5 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
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
          <div
            className="flex-1 p-3 overflow-auto bg-gray-50 min-h-0 relative"
            style={{ height: '650px' }}
          >
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

            {/* Navigation Arrows - only show when multiple files */}
            {multiple && uploadedFiles.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={currentFileIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-3 shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  onClick={goToNext}
                  disabled={currentFileIndex === uploadedFiles.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-100 text-gray-800 rounded-full p-3 shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Counter */}
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                  {currentFileIndex + 1} / {uploadedFiles.length}
                </div>
              </>
            )}
          </div>

          {/* New Upload Button */}
          <div className="p-3 border-t border-gray-100 shrink-0 bg-white">
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
