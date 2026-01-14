'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  HardDrive,
  Trash2,
  Image,
  Monitor,
  FileText,
  Mountain,
  Users,
  ChevronRight,
  AlertCircle,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { PhotosApiService } from '@/services/photos/PhotosApiService';
import { StorageUpgradeModal } from './StorageUpgradeModal';

interface StorageManagementViewProps {
  userEmail: string;
  onBack: () => void;
}

interface StorageCategory {
  key: string;
  name: string;
  size: number;
  count: number;
  icon: string;
}

interface LargeFile {
  id: string;
  filename: string;
  size: number;
  thumbnailPath: string | null;
  takenAt: number | null;
}

interface BlurryPhoto {
  id: string;
  filename: string;
  size: number;
  thumbnailPath: string | null;
}

interface StorageAnalysis {
  totalUsed: number;
  totalLimit: number;
  photoCount: number;
  plan: string;
  categories: StorageCategory[];
  largeFiles: LargeFile[];
  blurryPhotos: BlurryPhoto[];
  screenshots: LargeFile[];
  estimatedYearsRemaining: number;
  uploadRatePerMonth: number;
  formattedUsed: string;
  formattedLimit: string;
  usedPercent: number;
}

interface StoragePlan {
  id: string;
  name: string;
  storage: number;
  formattedStorage: string;
  price: number;
  isCurrent: boolean;
}

// Icon-Mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  monitor: Monitor,
  'file-text': FileText,
  mountain: Mountain,
  users: Users,
  image: Image,
};

export function StorageManagementView({ userEmail, onBack }: StorageManagementViewProps) {
  const { isDark } = useWebmailTheme();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<StorageAnalysis | null>(null);
  const [plans, setPlans] = useState<StoragePlan[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryPhotos, setCategoryPhotos] = useState<LargeFile[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  }, []);

  const loadData = useCallback(async () => {
    if (!userEmail) return;
    
    PhotosApiService.setUserId(userEmail);
    setLoading(true);
    setError(null);
    
    try {
      const [analysisRes, plansRes] = await Promise.all([
        PhotosApiService.getStorageAnalysis(),
        PhotosApiService.getStoragePlans(),
      ]);
      
      setAnalysis(analysisRes);
      setPlans(plansRes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadCategoryPhotos = async (category: string) => {
    try {
      const details = await PhotosApiService.getCategoryStorageDetails(category);
      setCategoryPhotos(details.photos);
      setSelectedCategory(category);
      setSelectedPhotos(new Set());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPhotos.size === 0) return;
    
    setDeleting(true);
    try {
      await PhotosApiService.deletePhotosForStorage(Array.from(selectedPhotos));
      setSelectedPhotos(new Set());
      
      // Reload data
      if (selectedCategory) {
        await loadCategoryPhotos(selectedCategory);
      }
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Möchtest du alle Fotos der Kategorie "${category}" wirklich löschen?`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await PhotosApiService.deleteCategoryPhotos(category);
      await loadData();
      setSelectedCategory(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
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

  const selectAllPhotos = () => {
    if (selectedPhotos.size === categoryPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(categoryPhotos.map(p => p.id)));
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Image;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
    );
  }

  // Kategorie-Detailansicht
  if (selectedCategory) {
    const category = analysis?.categories.find(c => c.key === selectedCategory);
    
    return (
      <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`p-2 rounded-full transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-xl font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {category?.name || selectedCategory}
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {categoryPhotos.length} Elemente · {formatBytes(category?.size || 0)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-between p-4 rounded-lg mb-6 ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <button
              onClick={selectAllPhotos}
              className={`text-sm font-medium ${isDark ? 'text-teal-400' : 'text-teal-600'}`}
            >
              {selectedPhotos.size === categoryPhotos.length ? 'Auswahl aufheben' : 'Alle auswählen'}
            </button>
            
            {selectedPhotos.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isDark 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                } disabled:opacity-50`}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {selectedPhotos.size} löschen
              </button>
            )}
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {categoryPhotos.map(photo => (
              <div
                key={photo.id}
                onClick={() => togglePhotoSelection(photo.id)}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group ${
                  selectedPhotos.has(photo.id)
                    ? 'ring-2 ring-teal-500'
                    : ''
                }`}
              >
                <img
                  src={PhotosApiService.getThumbnailUrl(photo.id)}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback bei Ladefehler
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                
                {/* Selection indicator */}
                <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedPhotos.has(photo.id)
                    ? 'bg-teal-500 border-teal-500 text-white'
                    : 'border-white bg-black/30 group-hover:border-teal-400'
                }`}>
                  {selectedPhotos.has(photo.id) && <Check className="w-3 h-3" />}
                </div>
                
                {/* Size badge */}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-xs bg-black/60 text-white">
                  {formatBytes(photo.size)}
                </div>
              </div>
            ))}
          </div>

          {categoryPhotos.length === 0 && (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Keine Fotos in dieser Kategorie
            </div>
          )}
        </div>
      </div>
    );
  }

  // Hauptansicht
  return (
    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-2xl font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Speicherplatz verwalten
          </h1>
        </div>

        {error && (
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
            isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {analysis && (
          <>
            {/* Prognose */}
            <section className="mb-8">
              <h2 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Noch Speicherplatz für über {analysis.estimatedYearsRemaining > 10 ? '10+' : Math.round(analysis.estimatedYearsRemaining)} Jahre
              </h2>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Persönliche Prognose, die darauf basiert, wie häufig du Inhalte in deinem Taskilo-Konto sicherst
              </p>

              {/* Storage Bar */}
              <div className="mb-4">
                <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className="h-full flex">
                    <div 
                      className="bg-teal-500 h-full"
                      style={{ width: `${Math.min(analysis.usedPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-teal-500" />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Taskilo Fotos ({analysis.formattedUsed})
                  </span>
                </div>
              </div>

              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {analysis.formattedUsed} von {analysis.formattedLimit} belegt
              </p>
            </section>

            {/* Upgrade Card */}
            <section className={`p-6 rounded-xl mb-8 ${
              isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border-2 border-teal-500'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-teal-900' : 'bg-teal-100'
                }`}>
                  <Sparkles className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Mehr Speicherplatz, um deine Erinnerungen sicher aufzubewahren
                  </h3>
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Mehr Speicherplatz für deine schönsten Erinnerungen erhalten
                  </p>
                  
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className={`px-6 py-3 rounded-full text-sm font-medium transition-colors ${
                      isDark 
                        ? 'bg-teal-600 text-white hover:bg-teal-700' 
                        : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    Speicherplatz upgraden
                  </button>
                </div>
              </div>
            </section>

            {/* Ansehen und löschen */}
            <section className="mb-8">
              <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Ansehen und löschen
              </h2>

              <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                {/* Große Fotos */}
                {analysis.largeFiles.length > 0 && (
                  <button
                    onClick={() => loadCategoryPhotos('large')}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Image className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                        Große Fotos und Videos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatBytes(analysis.largeFiles.reduce((sum, f) => sum + f.size, 0))}
                      </span>
                      <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  </button>
                )}

                {/* Kategorien */}
                {analysis.categories.map((category, index) => {
                  const IconComponent = getIcon(category.icon);
                  return (
                    <React.Fragment key={category.key}>
                      {index > 0 && (
                        <div className={`h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      )}
                      <button
                        onClick={() => loadCategoryPhotos(category.key)}
                        className={`w-full flex items-center justify-between p-4 transition-colors ${
                          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatBytes(category.size)}
                          </span>
                          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })}

                {/* Unscharfe Fotos */}
                {analysis.blurryPhotos.length > 0 && (
                  <>
                    <div className={`h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <button
                      onClick={() => loadCategoryPhotos('blurry')}
                      className={`w-full flex items-center justify-between p-4 transition-colors ${
                        isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                          Unscharfe Fotos
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatBytes(analysis.blurryPhotos.reduce((sum, f) => sum + f.size, 0))}
                        </span>
                        <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                      </div>
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Speicherplatz freimachen */}
            <section className="mb-8">
              <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Speicherplatz freimachen
              </h2>

              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Vorhandene Fotos und Videos in die Qualität „Speicherplatz sparen" konvertieren
                </p>
                <button className={`mt-3 text-sm font-medium ${
                  isDark ? 'text-teal-400' : 'text-teal-600'
                }`}>
                  Mehr erfahren
                </button>
              </div>
            </section>

            {/* Speicherinfo */}
            <section className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-3 mb-3">
                <HardDrive className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Speicherdetails
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Fotos gesamt</p>
                  <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {analysis.photoCount}
                  </p>
                </div>
                <div>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Aktueller Plan</p>
                  <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {plans.find(p => p.isCurrent)?.name || 'Kostenlos'}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Storage Upgrade Modal */}
      <StorageUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={userEmail}
        currentPlan={analysis?.plan || 'basic_15gb'}
        onUpgradeSuccess={(planId) => {
          loadData();
        }}
      />
    </div>
  );
}
