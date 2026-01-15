'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Image as ImageIcon, 
  Check,
  Loader2,
  Search,
  X,
  Heart,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PhotosApiService, type Photo } from '@/services/photos/PhotosApiService';

type TabType = 'recent' | 'favorites' | 'all';

interface PhotosPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (photos: Photo[]) => void;
  userId: string | undefined;
  multiple?: boolean;
}

const HETZNER_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';

export function PhotosPickerModal({
  isOpen,
  onClose,
  onSelect,
  userId,
  multiple = true,
}: PhotosPickerModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('recent');

  // Lade Fotos beim Öffnen
  const loadPhotos = useCallback(async () => {
    if (!userId) {
      setError('Benutzer nicht authentifiziert');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      PhotosApiService.setUserId(userId);
      
      let result: { photos: Photo[]; total: number };
      
      if (activeTab === 'favorites') {
        result = await PhotosApiService.getFavorites(100, 0);
      } else {
        result = await PhotosApiService.getPhotos({ limit: 100, offset: 0 });
      }
      
      setPhotos(result.photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Fotos');
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    if (isOpen && userId) {
      loadPhotos();
    }
  }, [isOpen, userId, loadPhotos]);

  // Reset bei Schließen
  useEffect(() => {
    if (!isOpen) {
      setSelectedPhotos(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const toggleSelect = (photoId: string) => {
    if (!multiple) {
      setSelectedPhotos(new Set([photoId]));
      return;
    }
    
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = photos.filter(p => selectedPhotos.has(p.id));
    onSelect(selected);
    onClose();
  };

  // Gefilterte Fotos basierend auf Suche
  const filteredPhotos = photos.filter(photo => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      photo.filename.toLowerCase().includes(query) ||
      photo.originalFilename.toLowerCase().includes(query) ||
      (photo.locationName?.toLowerCase().includes(query)) ||
      (photo.primaryCategoryDisplay?.toLowerCase().includes(query))
    );
  });

  const getPhotoThumbnailUrl = (photo: Photo) => {
    if (photo.thumbnailPath) {
      return `${HETZNER_API_URL}/api/photos/thumbnail/${photo.id}?size=200`;
    }
    return `${HETZNER_API_URL}/api/photos/file/${photo.id}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Fotos aus Taskilo Fotos einfügen</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#14ad9f]/10 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#14ad9f]" />
            </div>
            <h2 className="text-lg font-medium">Fotos aus Taskilo Fotos einfügen</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b bg-gray-50/50">
          <button
            onClick={() => setActiveTab('recent')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'recent'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            )}
          >
            Neueste
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
              activeTab === 'favorites'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            )}
          >
            <Star className="w-4 h-4" />
            Favoriten
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fotos durchsuchen..."
              className="pl-9 bg-gray-50 border-gray-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f] mb-3" />
              <p>Fotos werden geladen...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>{error}</p>
              <Button variant="outline" onClick={loadPhotos} className="mt-4">
                Erneut versuchen
              </Button>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ImageIcon className="w-12 h-12 mb-3 text-gray-300" />
              <p>Keine Fotos gefunden</p>
              {searchQuery && (
                <p className="text-sm mt-1">
                  Versuche es mit einem anderen Suchbegriff
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {filteredPhotos.map(photo => {
                const isSelected = selectedPhotos.has(photo.id);
                
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo.id)}
                    className={cn(
                      'group relative aspect-square rounded-lg overflow-hidden cursor-pointer',
                      'transition-all duration-200',
                      isSelected && 'ring-2 ring-[#14ad9f] ring-offset-2'
                    )}
                  >
                    <img
                      src={getPhotoThumbnailUrl(photo)}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* Hover Overlay */}
                    <div className={cn(
                      'absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors',
                      isSelected && 'bg-black/20'
                    )} />
                    
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#14ad9f] rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    {/* Favorite Indicator */}
                    {photo.isFavorite && (
                      <div className="absolute bottom-2 right-2">
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <span className="text-sm text-gray-600">
            {selectedPhotos.size} Foto{selectedPhotos.size !== 1 ? 's' : ''} ausgewählt
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedPhotos.size === 0}
              className="bg-[#14ad9f] hover:bg-teal-700"
            >
              Einfügen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
