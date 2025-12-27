'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

interface VideoThumbnailProps {
  fileId: string;
  fileName?: string;
  className?: string;
}

export function VideoThumbnail({ fileId, className }: VideoThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Server-seitiges Thumbnail verwenden (ffmpeg generiert)
  const thumbnailUrl = `/api/webmail/drive/files/${fileId}/thumbnail`;

  if (error) {
    return null;
  }

  return (
    <div className={`${className} relative bg-black`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={thumbnailUrl}
        alt="Video thumbnail"
        className="w-full h-full object-cover"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />
      {!isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}
