'use client';

import { useEffect, useRef, useState } from 'react';

interface PdfThumbnailProps {
  fileId: string;
  fileName?: string;
  className?: string;
}

// PDF.js Typen
interface PDFDocumentProxy {
  getPage: (num: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport: (params: { scale: number }) => PDFViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PDFViewport }) => { promise: Promise<void> };
}

interface PDFViewport {
  width: number;
  height: number;
}

interface PDFJSLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> };
}

declare global {
  interface Window {
    pdfjsLib?: PDFJSLib;
  }
}

// PDF.js von CDN laden
function loadPdfJs(): Promise<PDFJSLib> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
    script.type = 'module';
    script.onload = () => {
      // Warten bis pdfjsLib verfügbar ist
      const checkLib = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
          resolve(window.pdfjsLib);
        } else {
          setTimeout(checkLib, 50);
        }
      };
      checkLib();
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

export function PdfThumbnail({ fileId, className }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Nur im Browser ausfuehren
    if (typeof window === 'undefined') return;
    
    let cancelled = false;

    const renderPdf = async () => {
      if (!canvasRef.current) return;

      try {
        const pdfjsLib = await loadPdfJs();
        
        if (cancelled) return;

        // PDF von API laden
        const response = await fetch(`/api/webmail/drive/files/${fileId}`);
        if (!response.ok) throw new Error('Failed to load PDF');

        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (cancelled) return;

        // Erste Seite rendern
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context || !canvas) return;

        // Skalierung berechnen fuer Thumbnail
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(400 / viewport.width, 300 / viewport.height);
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Weisser Hintergrund
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // PDF rendern
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('PDF render error:', err);
        if (!cancelled) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (error) {
    return null;
  }

  return (
    <div className={className}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        style={{ display: 'block' }}
      />
    </div>
  );
}
