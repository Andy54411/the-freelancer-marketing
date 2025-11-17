'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
  onDownload?: () => void;
}

export default function PDFViewer({ pdfUrl, title = 'PDF Vorschau', onDownload }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewMethod, setViewMethod] = useState<'iframe' | 'object' | 'link'>('iframe');

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    // Teste ob die PDF-URL erreichbar ist
    fetch(pdfUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/pdf')) {
            setViewMethod('iframe');
          } else {
            // Möglicherweise kein PDF oder Content-Type falsch
            setViewMethod('object');
          }
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pdfUrl]);

  const handleIframeError = () => {
    if (viewMethod === 'iframe') {
      setViewMethod('object');
    } else {
      setHasError(true);
    }
  };

  const renderPDFViewer = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-[#14ad9f]" />
            <p className="text-gray-600">PDF wird geladen...</p>
          </div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
            <p className="text-gray-600 mb-4">PDF kann nicht angezeigt werden</p>
            <div className="space-y-2">
              <Button
                onClick={() => window.open(pdfUrl, '_blank')}
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF in neuem Tab öffnen
              </Button>
              {onDownload && (
                <Button variant="outline" onClick={onDownload} className="ml-2">
                  <Download className="h-4 w-4 mr-2" />
                  Herunterladen
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Versuche verschiedene Anzeige-Methoden
    if (viewMethod === 'iframe') {
      return (
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=page-width`}
          className="w-full h-full border-0"
          title={title}
          onError={handleIframeError}
          onLoad={() => setIsLoading(false)}
        />
      );
    } else if (viewMethod === 'object') {
      return (
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-full"
          onError={handleIframeError}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-4">PDF-Plugin nicht verfügbar</p>
              <Button
                onClick={() => window.open(pdfUrl, '_blank')}
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF in neuem Tab öffnen
              </Button>
            </div>
          </div>
        </object>
      );
    }

    return null;
  };

  return (
    <div className="w-full h-full relative">
      {/* PDF Toolbar */}
      <div className="absolute top-0 left-0 right-0 bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center z-10">
        <span className="text-sm text-gray-600">{title}</span>
        <div className="flex gap-2">
          {onDownload && (
            <Button size="sm" variant="outline" onClick={onDownload} className="text-xs">
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(pdfUrl, '_blank')}
            className="text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            Vollbild
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="w-full h-full" style={{ paddingTop: '48px' }}>
        {renderPDFViewer()}
      </div>
    </div>
  );
}
