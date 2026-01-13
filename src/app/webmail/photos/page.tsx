'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MailHeader } from '@/components/webmail/MailHeader';
import { PhotosSidebar, PhotoSection } from '@/components/webmail/photos/PhotosSidebar';
import { PhotosApiService, Photo, PhotoStorageInfo, SilentLearning } from '@/services/photos/PhotosApiService';
import { UpdatesSection } from '@/components/webmail/photos/UpdatesSection';
import { useWebmailSession } from '../layout';
import {
  Upload,
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
  Sparkles,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface PhotoGroup {
  date: string;
  displayDate: string;
  location?: string;
  photos: Photo[];
}

interface Memory {
  id: string;
  yearsAgo: number;
  title: string;
  subtitle: string;
  coverPhotoId: string;
  coverPhotoUrl: string;
  photoCount: number;
  photos: Photo[];
}

export default function PhotosPage() {
  const { session } = useWebmailSession();
  const { isDark } = useWebmailTheme();
  const userEmail = session?.email;
  const [activeSection, setActiveSection] = useState<PhotoSection>('fotos');
  const [activeDocumentCategory, setActiveDocumentCategory] = useState<string | undefined>(undefined);
  const [activeDynamicCategory, setActiveDynamicCategory] = useState<string | undefined>(undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [storageInfo, setStorageInfo] = useState<PhotoStorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [classifyingCount, setClassifyingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file input from header button
  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const loadPhotos = useCallback(async () => {
    if (!userEmail) return;
    
    // UserId für die API setzen
    PhotosApiService.setUserId(userEmail);
    
    setLoading(true);
    try {
      const [photosData, storage, memoriesData] = await Promise.all([
        activeSection === 'favoriten'
          ? PhotosApiService.getFavorites()
          : PhotosApiService.getPhotos(),
        PhotosApiService.getStorageInfo(),
        PhotosApiService.getMemories(),
      ]);
      setPhotos(photosData.photos);
      setStorageInfo(storage);
      setMemories(memoriesData.memories);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [userEmail, activeSection]);

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
    if (!files || !userEmail) return;
    await uploadFiles(Array.from(files));
  };

  const uploadFiles = async (files: File[]) => {
    if (!userEmail || files.length === 0) return;

    // Nur Bilddateien akzeptieren
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      ['image/heic', 'image/heif'].includes(file.type.toLowerCase())
    );

    if (imageFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        // 1. Foto hochladen
        const uploadedPhoto = await PhotosApiService.uploadPhoto(imageFiles[i]);
        setUploadProgress(((i + 0.5) / imageFiles.length) * 100);
        
        // 2. KI-Klassifikation im Hintergrund
        setClassifyingCount(prev => prev + 1);
        PhotosApiService.addToKiLibrary(imageFiles[i], uploadedPhoto.id)
          .then((result) => {
            // STILLES LERNEN: Accept-Timer starten und Image-Hash speichern
            if (result?.image_hash) {
              SilentLearning.storeImageHash(uploadedPhoto.id, result.image_hash);
            }
            SilentLearning.startAcceptTimer(uploadedPhoto.id);
          })
          .catch(() => {
            // KI nicht verfügbar - ignorieren
          })
          .finally(() => {
            setClassifyingCount(prev => prev - 1);
          });
        
        setUploadProgress(((i + 1) / imageFiles.length) * 100);
      }
      await loadPhotos();
    } catch {
      // Error handling
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Nur ausblenden wenn wir das Hauptelement verlassen
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
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
    if (!userEmail) return;
    try {
      await PhotosApiService.toggleFavorite(photo.id);
      
      // STILLES LERNEN: Favorit-Feedback senden
      if (!photo.isFavorite) {
        SilentLearning.recordFavorite(photo.id);
      }
      
      await loadPhotos();
    } catch (error) {
      // Error handling
    }
  };

  const handleDeleteSelected = async () => {
    if (!userEmail || selectedPhotos.size === 0) return;
    try {
      // STILLES LERNEN: Löschung für alle ausgewählten Fotos melden
      selectedPhotos.forEach(photoId => {
        SilentLearning.recordDelete(photoId);
      });
      
      await Promise.all(
        Array.from(selectedPhotos).map((id) => PhotosApiService.deletePhoto(id))
      );
      setSelectedPhotos(new Set());
      await loadPhotos();
    } catch {
      // Error handling
    }
  };

  /**
   * Handler für Foto-Klick - STILLES LERNEN bei Suchergebnissen
   */
  const handlePhotoClick = (photo: Photo) => {
    // Wenn Suchergebnis angeklickt wird, tracken wir das
    if (searchQuery && searchQuery.trim() !== '') {
      SilentLearning.recordSearchClick(photo.id, searchQuery.trim());
    }
    setSelectedPhoto(photo);
  };

  const photoGroups = groupPhotosByDate(photos);
  const monthGroups = groupByMonth(photoGroups);

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
    <div 
      className={`min-h-screen flex flex-col relative ${isDark ? 'bg-[#202124]' : 'bg-white'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-teal-500/20 border-4 border-dashed border-teal-500 flex items-center justify-center pointer-events-none">
          <div className={`text-center p-8 rounded-2xl ${isDark ? 'bg-[#202124]' : 'bg-white'} shadow-2xl`}>
            <Upload className="w-16 h-16 text-teal-500 mx-auto mb-4" />
            <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Fotos hier ablegen
            </p>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Lasse die Dateien los, um sie hochzuladen
            </p>
          </div>
        </div>
      )}

      <MailHeader 
        userEmail={userEmail || ''} 
        appName="Fotos"
        appHomeUrl="/webmail/photos"
        isPhotosStyle
        searchPlaceholder="In Fotos suchen"
        onPhotosSearch={setSearchQuery}
        onUploadClick={triggerUpload}
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <PhotosSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          storageUsed={storageInfo?.used || 0}
          storageLimit={storageInfo?.limit || 5 * 1024 * 1024 * 1024}
          isCollapsed={sidebarCollapsed}
          activeDocumentCategory={activeDocumentCategory}
          onDocumentCategoryChange={setActiveDocumentCategory}
          userEmail={userEmail}
          activeDynamicCategory={activeDynamicCategory}
          onDynamicCategoryChange={setActiveDynamicCategory}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Updates Section */}
          {activeSection === 'updates' ? (
            <UpdatesSection userEmail={userEmail || ''} userPassword={session?.password || ''} />
          ) : (
            <>
              {/* Toolbar */}
              <div className={`flex items-center justify-end px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                {/* Hidden file input für Header-Upload-Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

            {/* View Toggle */}
            <div className={`flex items-center border rounded-lg overflow-hidden ml-3 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
              <button
                onClick={() => setViewMode('comfortable')}
                className={`p-2 ${viewMode === 'comfortable' ? (isDark ? 'bg-white/10' : 'bg-gray-100') : (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-50')}`}
                title="Komfortable Ansicht"
              >
                <LayoutGrid className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-2 ${viewMode === 'compact' ? (isDark ? 'bg-white/10' : 'bg-gray-100') : (isDark ? 'hover:bg-white/10' : 'hover:bg-gray-50')}`}
                title="Kompakte Ansicht"
              >
                <Grid3X3 className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className={`px-6 py-2 border-b ${isDark ? 'bg-teal-900/30 border-teal-800' : 'bg-teal-50 border-teal-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-teal-900' : 'bg-teal-200'}`}>
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className={`text-sm ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>{Math.round(uploadProgress)}%</span>
              </div>
            </div>
          )}

          {/* KI Klassifikation Indikator */}
          {classifyingCount > 0 && !uploading && (
            <div className={`px-6 py-2 border-b flex items-center gap-2 ${isDark ? 'bg-purple-900/30 border-purple-800' : 'bg-purple-50 border-purple-100'}`}>
              <Sparkles className={`w-4 h-4 animate-pulse ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                KI analysiert {classifyingCount} Foto{classifyingCount > 1 ? 's' : ''}...
              </span>
            </div>
          )}

          {/* Selection Bar */}
          {selectedPhotos.size > 0 && (
            <div className={`flex items-center justify-between px-6 py-3 border-b ${isDark ? 'bg-teal-900/30 border-teal-800' : 'bg-teal-50 border-teal-100'}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedPhotos(new Set())}
                  className={`p-1 rounded ${isDark ? 'hover:bg-teal-800' : 'hover:bg-teal-100'}`}
                >
                  <X className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`} />
                </button>
                <span className={`text-sm font-medium ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  {selectedPhotos.size} ausgewählt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className={`p-2 rounded-full ${isDark ? 'hover:bg-teal-800' : 'hover:bg-teal-100'}`} title="Teilen">
                  <Share2 className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`} />
                </button>
                <button className={`p-2 rounded-full ${isDark ? 'hover:bg-teal-800' : 'hover:bg-teal-100'}`} title="Herunterladen">
                  <Download className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`} />
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className={`p-2 rounded-full ${isDark ? 'hover:bg-teal-800' : 'hover:bg-teal-100'}`}
                  title="Löschen"
                >
                  <Trash2 className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`} />
                </button>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <Upload className={`w-10 h-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <h2 className={`text-xl font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Keine Fotos vorhanden
                </h2>
                <p className={`mb-4 max-w-md ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Lade deine Fotos hoch, um sie hier zu sehen. Du kannst Fotos per Drag & Drop
                  oder über den Upload-Button hinzufügen.
                </p>
                <label className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-full font-medium cursor-pointer hover:bg-teal-700 transition-colors">
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
                      <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Erinnerungen</h2>
                      <div className="flex items-center gap-1">
                        <button className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                          <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                        <button className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                          <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
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
                            <img
                              src={PhotosApiService.getPhotoViewUrl(memory.coverPhotoId)}
                              alt={memory.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Fotos nach Monat gruppiert */}
                {Object.entries(monthGroups).map(([monthName, groups]) => (
                  <section key={monthName} className="mb-8">
                    <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthName}</h2>

                    {groups.map((group) => (
                      <div key={group.date} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{group.displayDate}</span>
                          {group.location && (
                            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{group.location}</span>
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
                                onClick={() => handlePhotoClick(photo)}
                              >
                                <img
                                  src={photoUrl}
                                  alt={photo.filename}
                                  className="w-full h-full object-cover"
                                />

                                {/* KI-Kategorie Badge */}
                                {photo.primaryCategoryDisplay && (
                                  <div className="absolute bottom-1 left-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="inline-block px-1.5 py-0.5 bg-black/60 text-white text-xs rounded truncate max-w-full">
                                      {photo.primaryCategoryDisplay}
                                    </span>
                                  </div>
                                )}

                                {/* Hover Overlay */}
                                <div
                                  className={`absolute inset-0 transition-opacity ${
                                    isSelected
                                      ? 'bg-teal-500/30'
                                      : 'bg-black/0 group-hover:bg-black/10'
                                  }`}
                                />

                                {/* Selection Checkbox */}
                                <div
                                  className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-opacity ${
                                    isSelected
                                      ? 'bg-teal-600 border-teal-600'
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
            </>
          )}
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
