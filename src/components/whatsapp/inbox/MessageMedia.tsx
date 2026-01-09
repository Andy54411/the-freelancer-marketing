/**
 * MessageMedia Component
 * 
 * Zeigt Medieninhalte in Nachrichten an (Bilder, Videos, Audio, Dokumente)
 */
'use client';

import React from 'react';
import { Play, Pause, Download, FileText, File, Image as ImageIcon, Volume2, VolumeX } from 'lucide-react';

interface MessageMediaProps {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  url?: string;
  mimeType?: string;
  filename?: string;
  caption?: string;
  onDownload?: () => void;
}

export function MessageMedia({ type, url, mimeType, filename, caption, onDownload }: MessageMediaProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const currentProgress = (mediaRef.current.currentTime / mediaRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mediaRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      mediaRef.current.currentTime = percent * mediaRef.current.duration;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (!url) return;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      onDownload?.();
    } catch {
      // Fehler beim Download
    }
  };

  const getFileIcon = () => {
    if (!mimeType) return <File className="w-8 h-8 text-gray-400" />;
    
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('doc')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return <FileText className="w-8 h-8 text-green-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    
    return <File className="w-8 h-8 text-gray-400" />;
  };

  const _getFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (hasError || !url) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
          {getFileIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">Medien nicht verfügbar</p>
        </div>
      </div>
    );
  }

  switch (type) {
    case 'image':
    case 'sticker':
      return (
        <div className="space-y-2">
          <div 
            className="relative cursor-pointer"
            onClick={() => setIsFullscreen(true)}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption || 'Bild'}
              className={`max-w-full rounded-lg ${type === 'sticker' ? 'w-32' : 'max-h-[300px]'}`}
              onLoad={() => setIsLoading(false)}
              onError={() => setHasError(true)}
            />
          </div>
          {caption && <p className="text-sm">{caption}</p>}

          {/* Fullscreen Modal */}
          {isFullscreen && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setIsFullscreen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={caption || 'Bild'}
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={handleDownload}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      );

    case 'video':
      return (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden bg-black max-w-[300px]">
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={url}
              className="w-full max-h-[300px]"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onError={() => setHasError(true)}
              muted={isMuted}
              playsInline
            />
            
            {/* Play Button Overlay */}
            {!isPlaying && (
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30"
              >
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-7 h-7 text-gray-800 ml-1" />
                </div>
              </button>
            )}

            {/* Controls */}
            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-linear-to-t from-black/60 to-transparent">
                <div className="flex items-center gap-2">
                  <button onClick={handlePlayPause} className="text-white">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  
                  <div 
                    className="flex-1 h-1 bg-white/30 rounded-full cursor-pointer"
                    onClick={handleSeek}
                  >
                    <div 
                      className="h-full bg-white rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <span className="text-white text-xs">{formatDuration(duration)}</span>
                  
                  <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
          {caption && <p className="text-sm">{caption}</p>}
        </div>
      );

    case 'audio':
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl min-w-[250px]">
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full bg-[#14ad9f] flex items-center justify-center shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
          
          <div className="flex-1">
            <div 
              className="h-2 bg-gray-300 rounded-full cursor-pointer"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-[#14ad9f] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {formatDuration((progress / 100) * duration)}
              </span>
              <span className="text-xs text-gray-500">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onError={() => setHasError(true)}
          />
        </div>
      );

    case 'document':
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg min-w-[200px]">
          <div className="shrink-0">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{filename || 'Dokument'}</p>
            <p className="text-xs text-gray-500">{mimeType?.split('/')[1]?.toUpperCase()}</p>
          </div>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-gray-200 rounded-full shrink-0"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      );

    default:
      return null;
  }
}
