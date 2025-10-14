'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy Loading für react-pdf
const ReactPDFDocument = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Document })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#14ad9f]"></div>
        <span className="ml-3 text-sm text-gray-600">PDF wird geladen...</span>
      </div>
    ),
  }
);

const ReactPDFPage = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Page })),
  { ssr: false }
);

// Aliase für bessere Lesbarkeit
const Document = ReactPDFDocument;
const Page = ReactPDFPage;

// Worker-Konfiguration global
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;
  });
}

interface PdfPreviewProps {
  file?: File | null;
  fileUrl?: string;
  className?: string;
}

export function PdfPreview({ file, fileUrl, className = '' }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.8);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if ((file && file.type === 'application/pdf') || fileUrl) {
      setPageNumber(1);
      setLoadError(null);
    }
  }, [file, fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const changePage = (direction: 'next' | 'prev') => {
    if (direction === 'next' && pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    } else if (direction === 'prev' && pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 1.5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.4));
  };

  // Memoize options to prevent unnecessary reloads
  const documentOptions = useMemo(
    () => ({
      cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/standard_fonts/',
      // CORS-freundliche Einstellungen
      withCredentials: false,
    }),
    []
  );

  if ((!file || file.type !== 'application/pdf') && !fileUrl) {
    return (
      <div className={`bg-gray-50 rounded-lg border border-gray-200 p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-sm">Keine PDF-Datei ausgewählt</div>
          <div className="text-xs mt-1">PDF hochladen für Vorschau</div>
        </div>
      </div>
    );
  }

  // Bestimme die PDF-Quelle und den Dateinamen
  let pdfSource = file || fileUrl;
  const fileName = file?.name || (fileUrl ? 'Gespeicherter Beleg.pdf' : 'PDF-Datei');

  // Für Firebase Storage URLs: Verwende Proxy-Route für CORS-kompatiblen Zugriff
  if (
    fileUrl &&
    (fileUrl.includes('firebasestorage.googleapis.com') ||
      fileUrl.includes('firebase.googleapis.com'))
  ) {
    pdfSource = `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`;
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header mit Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="text-sm font-medium text-gray-700 truncate flex-1 mr-4">{fileName}</div>

        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <div className="flex items-center border rounded">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.4}
              className="h-7 w-7 p-0"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs px-2 border-x min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 1.5}
              className="h-7 w-7 p-0"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>

          {/* Page Navigation */}
          {numPages > 1 && (
            <div className="flex items-center border rounded">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => changePage('prev')}
                disabled={pageNumber <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs px-2 border-x min-w-[3rem] text-center">
                {pageNumber}/{numPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => changePage('next')}
                disabled={pageNumber >= numPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="p-4 max-h-[600px] overflow-auto">
        <div className="flex justify-center">
          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={error => {
              setLoadError(`Fehler beim Laden: ${error.message || 'Unbekannter Fehler'}`);
            }}
            options={documentOptions}
            loading={
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#14ad9f]"></div>
                <span className="ml-3 text-sm text-gray-600">PDF wird geladen...</span>
              </div>
            }
            error={
              loadError ? (
                <div className="text-center py-8 text-red-600">
                  <div className="text-sm">PDF-Ladefehler</div>
                  <div className="text-xs mt-1 text-gray-500">{loadError}</div>
                  <div className="text-xs mt-1 text-gray-400">
                    {typeof pdfSource === 'string'
                      ? `URL: ${pdfSource.substring(0, 80)}...`
                      : 'File object'}
                  </div>
                  {typeof pdfSource === 'string' && pdfSource.includes('firebasestorage') && (
                    <div className="text-xs mt-2 text-blue-600">
                      <a
                        href={pdfSource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        PDF direkt öffnen
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-red-600">
                  <div className="text-sm">Fehler beim Laden der PDF-Datei</div>
                  <div className="text-xs mt-1 text-gray-500">
                    CORS-Problem oder ungültige PDF-URL
                  </div>
                  <div className="text-xs mt-1 text-gray-400">
                    {typeof pdfSource === 'string'
                      ? `URL: ${pdfSource.substring(0, 50)}...`
                      : 'File object'}
                  </div>
                </div>
              )
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f]"></div>
                </div>
              }
              className="shadow-sm border"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
