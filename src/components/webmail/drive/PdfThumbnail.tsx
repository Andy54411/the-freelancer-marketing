'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js Worker aus public-Ordner laden
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfThumbnailProps {
  fileId: string;
  fileName?: string;
  className?: string;
}

export function PdfThumbnail({ fileId, className }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const renderPdf = async () => {
      if (!canvasRef.current) return;

      try {
        // PDF von API laden
        const response = await fetch(`/api/webmail/drive/files/${fileId}`);
        if (!response.ok) throw new Error('Failed to load PDF');

        const arrayBuffer = await response.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (!isMounted) return;

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
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        // @ts-expect-error - pdfjs-dist types are incorrect
        await page.render(renderContext).promise;

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('PDF render error:', err);
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  if (error) {
    return null; // Fallback to icon
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
