'use client';

import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface HeicThumbnailProps {
  fileId: string;
  fileName?: string;
  className?: string;
}

export function HeicThumbnail({ fileId, className }: HeicThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const convertHeic = async () => {
      try {
        // HEIC-Datei laden
        const response = await fetch(`/api/webmail/drive/files/${fileId}`);
        if (!response.ok) throw new Error('Failed to load file');

        const blob = await response.blob();
        
        // heic2any dynamisch importieren
        const heic2any = (await import('heic2any')).default;
        
        // HEIC zu JPEG konvertieren
        const convertedBlob = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.7,
        });

        if (!isMounted) return;

        // Blob zu URL konvertieren
        const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        objectUrl = URL.createObjectURL(resultBlob);
        setImageUrl(objectUrl);
        setIsLoading(false);
      } catch {
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    convertHeic();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`}>
        <ImageIcon className="h-16 w-16 text-rose-400" />
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={imageUrl}
          alt="HEIC preview"
          className="w-full h-full object-cover"
        />
      ) : null}
    </div>
  );
}
