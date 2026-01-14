'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Download, 
  Share2, 
  Info, 
  Trash2, 
  Edit3,
  MapPin,
  Calendar
} from 'lucide-react';
import { Photo, PhotosApiService } from '@/services/photos/PhotosApiService';

interface PhotoViewerProps {
  photo: Photo;
  photos?: Photo[]; // Optional: Alle Fotos für Navigation
  onClose: () => void;
  onEdit?: (photo: Photo) => void;
  onToggleFavorite?: (photo: Photo) => Promise<Photo | void> | void;
  onDelete?: (photo: Photo) => void;
  onNavigate?: (photo: Photo) => void;
  onShare?: (photo: Photo) => void;
}

export function PhotoViewer({
  photo,
  photos = [],
  onClose,
  onEdit,
  onToggleFavorite,
  onDelete,
  onNavigate,
  onShare,
}: PhotoViewerProps) {
  const [currentPhoto, setCurrentPhoto] = useState(photo);
  const [showInfo, setShowInfo] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  // Aktualisiere wenn sich das Foto ändert
  useEffect(() => {
    setCurrentPhoto(photo);
  }, [photo]);

  // Finde Index für Navigation
  const currentIndex = photos.findIndex(p => p.id === currentPhoto.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      const prevPhoto = photos[currentIndex - 1];
      setCurrentPhoto(prevPhoto);
      onNavigate?.(prevPhoto);
    }
  }, [hasPrev, photos, currentIndex, onNavigate]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      const nextPhoto = photos[currentIndex + 1];
      setCurrentPhoto(nextPhoto);
      onNavigate?.(nextPhoto);
    }
  }, [hasNext, photos, currentIndex, onNavigate]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrev, goToNext]);

  const photoUrl = PhotosApiService.getPhotoViewUrl(currentPhoto.id);
  const downloadUrl = PhotosApiService.getPhotoDownloadUrl(currentPhoto.id);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = currentPhoto.originalFilename || currentPhoto.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleFavorite = async () => {
    if (!onToggleFavorite || isTogglingFavorite) return;
    
    setIsTogglingFavorite(true);
    try {
      const result = await onToggleFavorite(currentPhoto);
      // Update lokalen State
      if (result) {
        setCurrentPhoto(result);
      } else {
        // Fallback: Toggle lokal
        setCurrentPhoto(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
      }
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = photoUrl;
    
    // Native Share API wenn verfügbar (Mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentPhoto.originalFilename || 'Foto',
          text: `Foto von Taskilo${currentPhoto.locationName ? ` - ${currentPhoto.locationName}` : ''}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User hat abgebrochen oder Share nicht unterstützt
      }
    }
    
    // Fallback: In Zwischenablage kopieren
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage('Link kopiert!');
      setTimeout(() => setShareMessage(null), 2000);
    } catch {
      // Clipboard API nicht verfügbar
      setShareMessage('Teilen nicht möglich');
      setTimeout(() => setShareMessage(null), 2000);
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          title="Schließen (Esc)"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Edit */}
          {onEdit && (
            <button 
              onClick={() => onEdit(currentPhoto)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Bearbeiten"
            >
              <Edit3 className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Share */}
          <button 
            onClick={handleShare}
            className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            title="Teilen"
          >
            <Share2 className="w-5 h-5 text-white" />
            {shareMessage && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-xs px-2 py-1 rounded whitespace-nowrap">
                {shareMessage}
              </span>
            )}
          </button>

          {/* Favorite */}
          {onToggleFavorite && (
            <button
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              title={currentPhoto.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  currentPhoto.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'
                }`}
              />
            </button>
          )}

          {/* Download */}
          <button 
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Herunterladen"
          >
            <Download className="w-5 h-5 text-white" />
          </button>

          {/* Info */}
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 hover:bg-white/10 rounded-full transition-colors ${showInfo ? 'bg-white/20' : ''}`}
            title="Info"
          >
            <Info className="w-5 h-5 text-white" />
          </button>

          {/* Delete */}
          {onDelete && (
            <button 
              onClick={() => onDelete(currentPhoto)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-4">
          <img
            src={photoUrl}
            alt={currentPhoto.filename}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="w-80 bg-gray-900/95 border-l border-gray-700 p-4 overflow-y-auto">
            <h3 className="text-white font-medium mb-4">Details</h3>
            
            <div className="space-y-4 text-sm">
              {/* Dateiname */}
              <div>
                <p className="text-gray-400 mb-1">Dateiname</p>
                <p className="text-white break-all">{currentPhoto.originalFilename || currentPhoto.filename}</p>
              </div>

              {/* Aufnahmedatum */}
              {currentPhoto.takenAt && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 mb-1">Aufnahmedatum</p>
                    <p className="text-white">{formatDate(currentPhoto.takenAt)}</p>
                  </div>
                </div>
              )}

              {/* Ort */}
              {currentPhoto.locationName && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-400 mb-1">Ort</p>
                    <p className="text-white">{currentPhoto.locationName}</p>
                  </div>
                </div>
              )}

              {/* GPS */}
              {currentPhoto.latitude && currentPhoto.longitude && (
                <div>
                  <p className="text-gray-400 mb-1">GPS-Koordinaten</p>
                  <p className="text-white text-xs">
                    {currentPhoto.latitude.toFixed(6)}, {currentPhoto.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Kamera */}
              {currentPhoto.camera && (
                <div>
                  <p className="text-gray-400 mb-1">Kamera</p>
                  <p className="text-white">{currentPhoto.camera}</p>
                </div>
              )}

              {/* Größe */}
              <div>
                <p className="text-gray-400 mb-1">Dateigröße</p>
                <p className="text-white">{formatBytes(currentPhoto.size)}</p>
              </div>

              {/* Abmessungen */}
              {currentPhoto.width && currentPhoto.height && (
                <div>
                  <p className="text-gray-400 mb-1">Abmessungen</p>
                  <p className="text-white">{currentPhoto.width} × {currentPhoto.height}</p>
                </div>
              )}

              {/* Kategorie */}
              {currentPhoto.primaryCategoryDisplay && (
                <div>
                  <p className="text-gray-400 mb-1">Kategorie</p>
                  <p className="text-white">{currentPhoto.primaryCategoryDisplay}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Arrows - nur wenn Fotos vorhanden */}
      {photos.length > 1 && (
        <>
          {hasPrev && (
            <button 
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              title="Vorheriges Foto (←)"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          {hasNext && (
            <button 
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              title="Nächstes Foto (→)"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}
        </>
      )}

      {/* Footer mit Location Info */}
      {(currentPhoto.locationName || currentPhoto.takenAt) && !showInfo && (
        <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-black/50 px-4 py-2 rounded-lg">
          {currentPhoto.locationName && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-white/70" />
              <span className="text-white text-sm">{currentPhoto.locationName}</span>
            </div>
          )}
          {currentPhoto.takenAt && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/70" />
              <span className="text-white text-sm">
                {new Date(currentPhoto.takenAt).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Photo Counter */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-1 rounded-full">
          <span className="text-white text-sm">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
