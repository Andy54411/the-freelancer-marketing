'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MailHeader } from '@/components/webmail/MailHeader';
import { PhotosSidebar, PhotoSection } from '@/components/webmail/photos/PhotosSidebar';
import { PhotosApiService, Photo, PhotoStorageInfo } from '@/services/photos/PhotosApiService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Upload,
  Search,
  Settings,
  HelpCircle,
  Grid3X3,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Star,
  Download,
  Trash2,
  Share2,
  Info,
  X,
  Check,
  Clock,
} from 'lucide-react';

interface PhotoGroup {
  date: string;
  displayDate: string;
  location?: string;
  photos: Photo[];
}

interface Memory {
  id: string;
  title: string;
  subtitle: string;
  coverPhoto: string;
  photoCount: number;
}

export default function PhotosPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<PhotoSection>('fotos');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [storageInfo, setStorageInfo] = useState<PhotoStorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadPhotos = useCallback(async () => {
    if (!user?.email) return;
    
    // UserId für die API setzen
    PhotosApiService.setUserId(user.email);
    
    setLoading(true);
    try {
      const [photosData, storage] = await Promise.all([
        activeSection === 'favoriten'
          ? PhotosApiService.getFavorites()
          : PhotosApiService.getPhotos(),
        PhotosApiService.getStorageInfo(),
      ]);
      setPhotos(photosData.photos);
      setStorageInfo(storage);
    } catch (error) {
      // Error handling without console.log
    } finally {
      setLoading(false);
    }
  }, [user?.email, activeSection]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Gruppiere Fotos nach Datum
  const groupPhotosByDate = (photos: Photo[]): PhotoGroup[] => {
    const groups: Record<string, PhotoGroup> = {};

    photos.forEach((photo) => {
      const date = new Date(photo.takenAt || photo.createdAt);
      const dateKey = date.toISOString().split('T')[0];

      if (!groups[dateKey]) {
        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
        const dayNum = date.getDate();
        const month = date.toLocaleDateString('de-DE', { month: 'long' });
        const year = date.getFullYear();

        groups[dateKey] = {
          date: dateKey,
          displayDate: `${dayName}., ${dayNum}. ${month} ${year}`,
          location: undefined,
          photos: [],
        };
      }
      groups[dateKey].photos.push(photo);
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  // Gruppiere nach Monat für Überschriften
  const groupByMonth = (photoGroups: PhotoGroup[]): Record<string, PhotoGroup[]> => {
    const monthGroups: Record<string, PhotoGroup[]> = {};

    photoGroups.forEach((group) => {
      const date = new Date(group.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

      if (!monthGroups[monthName]) {
        monthGroups[monthName] = [];
      }
      monthGroups[monthName].push(group);
    });

    return monthGroups;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user?.email) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileArray = Array.from(files);
      for (let i = 0; i < fileArray.length; i++) {
        await PhotosApiService.uploadPhoto(fileArray[i]);
        setUploadProgress(((i + 1) / fileArray.length) * 100);
      }
      await loadPhotos();
    } catch (error) {
      // Error handling
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePhotoSelect = (photoId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleToggleFavorite = async (photo: Photo, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user?.email) return;
    try {
      await PhotosApiService.toggleFavorite(photo.id);
      await loadPhotos();
    } catch (error) {
      // Error handling
    }
  };

  const handleDeleteSelected = async () => {
    if (!user?.email || selectedPhotos.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedPhotos).map((id) => PhotosApiService.deletePhoto(id))
      );
      setSelectedPhotos(new Set());
      await loadPhotos();
    } catch (error) {
      // Error handling
    }
  };

  const photoGroups = groupPhotosByDate(photos);
  const monthGroups = groupByMonth(photoGroups);

  // Beispiel-Erinnerungen (würden von der API kommen)
  const memories: Memory[] = [
    {
      id: '1',
      title: 'Vor 6 Jahren',
      subtitle: '10 Fotos',
      coverPhoto: '/placeholder-memory.jpg',
      photoCount: 10,
    },
    {
      id: '2',
      title: 'Vor 5 Jahren',
      subtitle: '8 Fotos',
      coverPhoto: '/placeholder-memory.jpg',
      photoCount: 8,
    },
  ];

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'fotos':
        return 'Fotos';
      case 'updates':
        return 'Updates';
      case 'alben':
        return 'Alben';
      case 'dokumente':
        return 'Dokumente';
      case 'screenshots':
        return 'Screenshots und Aufzeichnungen';
      case 'favoriten':
        return 'Favoriten';
      case 'orte':
        return 'Orte';
      case 'videos':
        return 'Videos';
      default:
        return 'Fotos';
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MailHeader 
        userEmail={user?.email || ''} 
        appName="Fotos"
        appHomeUrl="/webmail/photos"
        hideSearch
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <PhotosSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          storageUsed={storageInfo?.used || 0}
          storageLimit={storageInfo?.limit || 5 * 1024 * 1024 * 1024}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            {/* Suche */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="In Fotos suchen"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex items-center gap-2 ml-4">
              {/* Upload Button */}
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                <Upload className="w-4 h-4" />
                Hochladen
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* View Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('comfortable')}
                  className={`p-2 ${viewMode === 'comfortable' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="Komfortable Ansicht"
                >
                  <LayoutGrid className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-2 ${viewMode === 'compact' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  title="Kompakte Ansicht"
                >
                  <Grid3X3 className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <button className="p-2 hover:bg-gray-100 rounded-full" title="Hilfe">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full" title="Einstellungen">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="px-6 py-2 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-sm text-blue-700">{Math.round(uploadProgress)}%</span>
              </div>
            </div>
          )}

          {/* Selection Bar */}
          {selectedPhotos.size > 0 && (
            <div className="flex items-center justify-between px-6 py-3 bg-blue-50 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedPhotos(new Set())}
                  className="p-1 hover:bg-blue-100 rounded"
                >
                  <X className="w-5 h-5 text-blue-700" />
                </button>
                <span className="text-sm font-medium text-blue-700">
                  {selectedPhotos.size} ausgewählt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-blue-100 rounded-full" title="Teilen">
                  <Share2 className="w-5 h-5 text-blue-700" />
                </button>
                <button className="p-2 hover:bg-blue-100 rounded-full" title="Herunterladen">
                  <Download className="w-5 h-5 text-blue-700" />
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 hover:bg-blue-100 rounded-full"
                  title="Löschen"
                >
                  <Trash2 className="w-5 h-5 text-blue-700" />
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-medium text-gray-900 mb-2">
                  Keine Fotos vorhanden
                </h2>
                <p className="text-gray-500 mb-4 max-w-md">
                  Lade deine Fotos hoch, um sie hier zu sehen. Du kannst Fotos per Drag & Drop
                  oder über den Upload-Button hinzufügen.
                </p>
                <label className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                  <Upload className="w-5 h-5" />
                  Fotos hochladen
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <>
                {/* Erinnerungen */}
                {activeSection === 'fotos' && memories.length > 0 && (
                  <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Erinnerungen</h2>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-full">
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-full">
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {memories.map((memory) => (
                        <div
                          key={memory.id}
                          className="shrink-0 w-48 cursor-pointer group"
                        >
                          <div className="relative aspect-4/3 rounded-xl overflow-hidden mb-2">
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent z-10" />
                            <div className="absolute bottom-3 left-3 z-20 text-white">
                              <p className="font-medium">{memory.title}</p>
                              <p className="text-sm opacity-90">{memory.subtitle}</p>
                            </div>
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <Clock className="w-8 h-8 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Fotos nach Monat gruppiert */}
                {Object.entries(monthGroups).map(([monthName, groups]) => (
                  <section key={monthName} className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">{monthName}</h2>

                    {groups.map((group) => (
                      <div key={group.date} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-gray-700">{group.displayDate}</span>
                          {group.location && (
                            <span className="text-sm text-gray-500">{group.location}</span>
                          )}
                        </div>

                        <div
                          className={`grid gap-1 ${
                            viewMode === 'comfortable'
                              ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                              : 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
                          }`}
                        >
                          {group.photos.map((photo) => {
                            const isSelected = selectedPhotos.has(photo.id);
                            const photoUrl = PhotosApiService.getPhotoViewUrl(photo.id);
                            return (
                              <div
                                key={photo.id}
                                className="relative aspect-square group cursor-pointer"
                                onClick={() => setSelectedPhoto(photo)}
                              >
                                <img
                                  src={photoUrl}
                                  alt={photo.filename}
                                  className="w-full h-full object-cover"
                                />

                                {/* Hover Overlay */}
                                <div
                                  className={`absolute inset-0 transition-opacity ${
                                    isSelected
                                      ? 'bg-blue-500/30'
                                      : 'bg-black/0 group-hover:bg-black/10'
                                  }`}
                                />

                                {/* Selection Checkbox */}
                                <div
                                  className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-opacity ${
                                    isSelected
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'border-white bg-black/30 opacity-0 group-hover:opacity-100'
                                  }`}
                                  onClick={(e) => handlePhotoSelect(photo.id, e)}
                                >
                                  {isSelected && <Check className="w-4 h-4 text-white" />}
                                </div>

                                {/* Favorite Button */}
                                <button
                                  className={`absolute top-2 right-2 p-1 rounded-full transition-opacity ${
                                    photo.isFavorite
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100'
                                  }`}
                                  onClick={(e) => handleToggleFavorite(photo, e)}
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      photo.isFavorite
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-white'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </section>
                ))}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-full">
                <Share2 className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={(e) => handleToggleFavorite(selectedPhoto, e as unknown as React.MouseEvent)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <Star
                  className={`w-5 h-5 ${
                    selectedPhoto.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'
                  }`}
                />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full">
                <Download className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full">
                <Info className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full">
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={PhotosApiService.getPhotoViewUrl(selectedPhoto.id)}
              alt={selectedPhoto.filename}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation Arrows */}
          <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full">
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
