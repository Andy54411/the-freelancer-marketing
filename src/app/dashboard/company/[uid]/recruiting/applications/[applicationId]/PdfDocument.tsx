'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText } from 'lucide-react';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfDocumentProps {
  url: string;
  name: string;
}

export default function PdfDocument({ url, name }: PdfDocumentProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isError, setIsError] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsError(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    setIsError(true);
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] p-10 text-center bg-gray-50 border border-gray-200 rounded">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-lg font-bold mb-2 text-black">PDF konnte nicht geladen werden: {name}</p>
        <p className="mb-4 text-black max-w-md">
          Das automatische Laden für den Druck ist fehlgeschlagen.
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          Datei manuell öffnen
        </a>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center bg-white">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        className="flex flex-col items-center w-full"
        loading={
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p>Lade PDF für Druck...</p>
          </div>
        }
      >
        {numPages &&
          Array.from(new Array(numPages), (el, index) => (
            <div
              key={`page_${index + 1}`}
              className="mb-8 shadow-sm print:shadow-none print:mb-0 print:break-after-page w-full flex justify-center"
            >
              <Page
                pageNumber={index + 1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={790} // A4 width in pixels at 96 DPI is approx 794. Using slightly less to be safe.
                className="max-w-full h-auto border border-gray-100 print:border-0"
              />
            </div>
          ))}
      </Document>
    </div>
  );
}
