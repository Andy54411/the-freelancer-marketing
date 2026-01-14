'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Photo, PhotosApiService } from '@/services/photos/PhotosApiService';
import { 
  X, 
  MapPin, 
  Tag, 
  Save, 
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  Search,
  Plus,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { 
  getCategoriesByGroup, 
  CATEGORY_GROUPS,
  type CategoryGroup,
  type PhotoCategoryConfig,
} from '@/config/photoCategories';

// Kategorien aus zentraler Konfiguration
const CATEGORIES_BY_GROUP = getCategoriesByGroup();

interface PhotoEditModalProps {
  photos: Photo[];
  onClose: () => void;
  onSave: (updatedPhotos: Photo[]) => void;
}

export function PhotoEditModal({ photos, onClose, onSave }: PhotoEditModalProps) {
  const { isDark } = useWebmailTheme();
  const isBatch = photos.length > 1;
  const firstPhoto = photos[0];
  
  const [selectedCategory, setSelectedCategory] = useState<string>(firstPhoto?.primaryCategory || '');
  const [selectedCategoryDisplay, setSelectedCategoryDisplay] = useState<string>(firstPhoto?.primaryCategoryDisplay || '');
  const [locationName, setLocationName] = useState<string>(firstPhoto?.locationName || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [customCategories, setCustomCategories] = useState<PhotoCategoryConfig[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Benutzerdefinierte Kategorien beim Öffnen laden
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        setLoadingCategories(true);
        const categories = await PhotosApiService.getCustomCategories();
        setCustomCategories(categories.map(cat => ({
          key: cat.key,
          display: cat.display,
          group: (cat.group || 'spezial') as CategoryGroup,
        })));
      } catch (err) {
        console.warn('Benutzerdefinierte Kategorien konnten nicht geladen werden:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadCustomCategories();
  }, []);
  // Gefilterte Kategorien basierend auf Suche
  const filteredCategories = useMemo(() => {
    const searchLower = categorySearch.toLowerCase().trim();
    if (!searchLower) return CATEGORIES_BY_GROUP;

    const result: Record<CategoryGroup, PhotoCategoryConfig[]> = {
      orte: [],
      ereignisse: [],
      objekte: [],
      personen: [],
      spezial: [],
    };

    // Durch alle Gruppen filtern
    (Object.keys(CATEGORIES_BY_GROUP) as CategoryGroup[]).forEach(group => {
      const filtered = CATEGORIES_BY_GROUP[group].filter(cat => 
        cat.display.toLowerCase().includes(searchLower) ||
        cat.key.toLowerCase().includes(searchLower) ||
        cat.aliases?.some(a => a.toLowerCase().includes(searchLower))
      );
      if (filtered.length > 0) {
        result[group] = filtered;
      }
    });

    return result;
  }, [categorySearch]);

  // Prüfen ob custom Kategorien zur Suche passen
  const filteredCustomCategories = useMemo(() => {
    const searchLower = categorySearch.toLowerCase().trim();
    if (!searchLower) return customCategories;
    return customCategories.filter(cat =>
      cat.display.toLowerCase().includes(searchLower) ||
      cat.key.toLowerCase().includes(searchLower)
    );
  }, [categorySearch, customCategories]);

  // Neue Kategorie erstellen und in Backend speichern
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      // In Backend speichern
      const savedCategory = await PhotosApiService.createCustomCategory(newCategoryName.trim(), 'spezial');
      
      const newCat: PhotoCategoryConfig = {
        key: savedCategory.key,
        display: savedCategory.display,
        group: 'spezial',
      };
      
      setCustomCategories(prev => [...prev, newCat]);
      handleCategorySelect(newCat.key, newCat.display);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (err) {
      console.error('Kategorie konnte nicht erstellt werden:', err);
      // Fallback: Lokal erstellen falls Backend fehlschlägt
      const key = 'custom_' + newCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[äöü]/g, c => 
        c === 'ä' ? 'ae' : c === 'ö' ? 'oe' : 'ue'
      );
      
      const newCat: PhotoCategoryConfig = {
        key,
        display: newCategoryName.trim(),
        group: 'spezial',
      };
      
      setCustomCategories(prev => [...prev, newCat]);
      handleCategorySelect(newCat.key, newCat.display);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    }
  };

  // Bei Kategorie-Auswahl auch Display-Name setzen
  const handleCategorySelect = (key: string, display: string) => {
    setSelectedCategory(key);
    setSelectedCategoryDisplay(display);
    setShowCategoryDropdown(false);
    setCategorySearch('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      if (isBatch) {
        // Batch-Korrektur
        const corrections: { category?: string; categoryDisplay?: string; locationName?: string } = {};
        
        if (selectedCategory) {
          corrections.category = selectedCategory;
          corrections.categoryDisplay = selectedCategoryDisplay;
        }
        if (locationName) {
          corrections.locationName = locationName;
        }
        
        const photoIds = photos.map(p => p.id);
        await PhotosApiService.batchCorrectPhotos(photoIds, corrections);
        
        // KI-Feedback für Training senden (async, nicht blockierend)
        if (selectedCategory) {
          PhotosApiService.sendKiFeedbackBatch(
            photos.map(p => ({
              photoId: p.id,
              originalCategory: p.primaryCategory ?? undefined,
              correctedCategory: selectedCategory,
              correctedLocation: locationName || undefined,
              gpsData: p.latitude && p.longitude ? { latitude: p.latitude, longitude: p.longitude } : undefined,
            }))
          ).catch(() => { /* Ignorieren - lokale Korrektur hat funktioniert */ });
        }
        
        // Aktualisierte Fotos zurückgeben
        const updatedPhotos = photos.map(p => ({
          ...p,
          primaryCategory: selectedCategory || p.primaryCategory,
          primaryCategoryDisplay: selectedCategoryDisplay || p.primaryCategoryDisplay,
          locationName: locationName || p.locationName,
        }));
        
        setSuccess(true);
        setTimeout(() => {
          onSave(updatedPhotos);
          onClose();
        }, 1000);
      } else {
        // Einzelnes Foto
        const corrections: { category?: string; categoryDisplay?: string; locationName?: string } = {};
        const categoryChanged = selectedCategory !== firstPhoto.primaryCategory;
        const locationChanged = locationName !== firstPhoto.locationName;
        
        if (categoryChanged) {
          corrections.category = selectedCategory;
          corrections.categoryDisplay = selectedCategoryDisplay;
        }
        if (locationChanged) {
          corrections.locationName = locationName;
        }
        
        const updatedPhoto = await PhotosApiService.correctPhoto(firstPhoto.id, corrections);
        
        // KI-Feedback für Training senden (async, nicht blockierend)
        if (categoryChanged || locationChanged) {
          PhotosApiService.sendKiFeedback({
            photoId: firstPhoto.id,
            originalCategory: firstPhoto.primaryCategory ?? undefined,
            correctedCategory: selectedCategory,
            correctedLocation: locationChanged ? locationName : undefined,
            gpsData: firstPhoto.latitude && firstPhoto.longitude 
              ? { latitude: firstPhoto.latitude, longitude: firstPhoto.longitude } 
              : undefined,
          }).catch(() => { /* Ignorieren - lokale Korrektur hat funktioniert */ });
        }
        
        setSuccess(true);
        setTimeout(() => {
          onSave([updatedPhoto]);
          onClose();
        }, 1000);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    if (!showCategoryDropdown) return;
    
    const handleClickOutside = () => setShowCategoryDropdown(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showCategoryDropdown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div 
        className={`relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isBatch ? `${photos.length} Fotos bearbeiten` : 'Foto bearbeiten'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Preview */}
        {!isBatch && (
          <div className="px-6 pt-4">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
              <img
                src={PhotosApiService.getPhotoViewUrl(firstPhoto.id)}
                alt={firstPhoto.filename}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Batch Preview */}
        {isBatch && (
          <div className="px-6 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.slice(0, 5).map((photo) => (
                <div key={photo.id} className="shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                  <img
                    src={PhotosApiService.getPhotoViewUrl(photo.id)}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {photos.length > 5 && (
                <div className={`shrink-0 w-16 h-16 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    +{photos.length - 5}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Kategorie */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <Tag className="w-4 h-4" />
              Kategorie
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategoryDropdown(!showCategoryDropdown);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <span>{selectedCategoryDisplay || 'Kategorie auswählen...'}</span>
                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
              
              {showCategoryDropdown && (
                <div 
                  className={`absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg border z-10 ${
                    isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Suchfeld */}
                  <div className={`sticky top-0 p-2 border-b ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Kategorie suchen..."
                        className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${
                          isDark 
                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                        } focus:outline-none focus:ring-2 focus:ring-teal-500`}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Kategorien-Liste */}
                  <div className="max-h-52 overflow-y-auto">
                    {/* Eigene Kategorien */}
                    {filteredCustomCategories.length > 0 && (
                      <div>
                        <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide sticky top-0 ${
                          isDark ? 'bg-gray-800 text-teal-400' : 'bg-teal-50 text-teal-600'
                        }`}>
                          Eigene Kategorien
                        </div>
                        {filteredCustomCategories.map((cat) => (
                          <button
                            key={cat.key}
                            onClick={() => handleCategorySelect(cat.key, cat.display)}
                            className={`w-full text-left px-4 py-2 flex items-center justify-between ${
                              selectedCategory === cat.key
                                ? (isDark ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700')
                                : (isDark ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-700')
                            }`}
                          >
                            <span>{cat.display}</span>
                            {selectedCategory === cat.key && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Standard-Kategorien */}
                    {(Object.keys(filteredCategories) as CategoryGroup[]).map((group) => {
                      const cats = filteredCategories[group];
                      if (!cats || cats.length === 0) return null;
                      return (
                        <div key={group}>
                          <div className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wide sticky top-0 ${
                            isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'
                          }`}>
                            {CATEGORY_GROUPS[group]}
                          </div>
                          {cats.map((cat) => (
                            <button
                              key={cat.key}
                              onClick={() => handleCategorySelect(cat.key, cat.display)}
                              className={`w-full text-left px-4 py-2 flex items-center justify-between ${
                                selectedCategory === cat.key
                                  ? (isDark ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700')
                                  : (isDark ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-700')
                              }`}
                            >
                              <span>{cat.display}</span>
                              {selectedCategory === cat.key && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      );
                    })}

                    {/* Keine Ergebnisse */}
                    {categorySearch && Object.values(filteredCategories).every(arr => arr.length === 0) && filteredCustomCategories.length === 0 && (
                      <div className={`px-4 py-3 text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Keine Kategorie gefunden
                      </div>
                    )}
                  </div>

                  {/* Neue Kategorie erstellen */}
                  <div className={`border-t p-2 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    {showNewCategoryInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Name der neuen Kategorie..."
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                            isDark 
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                          } focus:outline-none focus:ring-2 focus:ring-teal-500`}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateCategory();
                            if (e.key === 'Escape') {
                              setShowNewCategoryInput(false);
                              setNewCategoryName('');
                            }
                          }}
                        />
                        <button
                          onClick={handleCreateCategory}
                          disabled={!newCategoryName.trim()}
                          className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:bg-gray-400"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                          className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewCategoryInput(true)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                          isDark 
                            ? 'text-teal-400 hover:bg-gray-600' 
                            : 'text-teal-600 hover:bg-gray-50'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Neue Kategorie erstellen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Aktuelle KI-Erkennung anzeigen */}
            {!isBatch && firstPhoto.primaryCategoryDisplay && firstPhoto.primaryCategory !== selectedCategory && (
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                KI-Erkennung: {firstPhoto.primaryCategoryDisplay} 
                ({Math.round((firstPhoto.primaryConfidence || 0) * 100)}% Konfidenz)
              </p>
            )}
          </div>

          {/* Ort */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <MapPin className="w-4 h-4" />
              Ort
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="z.B. München, Berlin, Paris..."
              className={`w-full px-4 py-3 rounded-lg border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none`}
            />
            
            {/* GPS-Info */}
            {!isBatch && (firstPhoto.latitude || firstPhoto.longitude) && (
              <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                GPS: {firstPhoto.latitude?.toFixed(4)}, {firstPhoto.longitude?.toFixed(4)}
              </p>
            )}
          </div>

          {/* Info-Text */}
          <div className={`flex items-start gap-2 p-3 rounded-lg ${
            isDark ? 'bg-blue-900/30' : 'bg-blue-50'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              Deine Korrekturen helfen der KI, zukünftig genauer zu klassifizieren. 
              Die Änderungen werden für das Training verwendet.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium ${
              isDark 
                ? 'text-gray-300 hover:bg-white/10' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              success
                ? 'bg-green-600 text-white'
                : 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-400'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Speichern...
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4" />
                Gespeichert
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isBatch ? `${photos.length} Fotos speichern` : 'Speichern'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
