'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface PdfThumbnailProps {
  file: File;
  width?: number;
}

export default function PdfThumbnail({ file, width = 96 }: PdfThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    const generateThumbnail = async () => {
      try {
        setIsLoading(true);
        setError(false);

        // PDF als Blob URL erstellen
        objectUrl = URL.createObjectURL(file);

        // pdfjs-dist dynamisch laden mit globalem Script
        if (typeof window !== 'undefined' && !(window as { pdfjsLib?: unknown }).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.head.appendChild(script);
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error('PDF.js not loaded');

        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = (width * 2) / baseViewport.width;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context not available');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        if (!isCancelled) {
          setThumbnailUrl(canvas.toDataURL('image/png'));
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    generateThumbnail();

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, width]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Loader2 className="w-6 h-6 text-[#14ad9f] animate-spin" />
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-[#14ad9f]">
        <FileText className="w-8 h-8" />
        <span className="text-xs mt-1">PDF</span>
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt="PDF Vorschau"
      className="w-full h-full object-contain"
    />
  );
}
