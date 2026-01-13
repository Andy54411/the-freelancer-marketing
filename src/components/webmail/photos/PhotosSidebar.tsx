'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image,
  Bell,
  Images,
  FileText,
  Monitor,
  Star,
  MapPin,
  Play,
  Cloud,
  ChevronRight,
  ArrowRight,
  Loader2,
  Calendar,
  Tag,
  Camera,
  Sparkles,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { PhotosApiService, DynamicCategory } from '@/services/photos/PhotosApiService';

export type PhotoSection =
  | 'fotos'
  | 'updates'
  | 'alben'
  | 'dokumente'
  | 'screenshots'
  | 'favoriten'
  | 'orte'
  | 'videos'
  | 'kategorie'; // Dynamische KI-Kategorie

// Dynamische Dokumentkategorie (von Taskilo KI erkannt)
export interface DocumentCategoryData {
  category: string;
  displayName: string;
  count: number;
  thumbnailUrl?: string;
  lastAdded?: string;
}

// Export des DocumentCategory Types für Kompatibilität
export type DocumentCategory = string;

interface PhotosSidebarProps {
  activeSection: PhotoSection;
  onSectionChange: (section: PhotoSection) => void;
  storageUsed: number;
  storageLimit: number;
  isCollapsed?: boolean;
  activeDocumentCategory?: string;
  onDocumentCategoryChange?: (category: string | undefined) => void;
  userEmail?: string;
  // Aktive dynamische Kategorie
  activeDynamicCategory?: string;
  onDynamicCategoryChange?: (categoryKey: string | undefined) => void;
}

const mainNavItems = [
  { id: 'fotos' as PhotoSection, label: 'Fotos', icon: Image },
  { id: 'updates' as PhotoSection, label: 'Updates', icon: Bell },
];

const collectionItems = [
  { id: 'alben' as PhotoSection, label: 'Alben', icon: Images },
  { id: 'dokumente' as PhotoSection, label: 'Dokumente', icon: FileText, hasExpander: true },
  {
    id: 'screenshots' as PhotoSection,
    label: 'Screenshots und Aufzeichnungen',
    icon: Monitor,
  },
  { id: 'favoriten' as PhotoSection, label: 'Favoriten', icon: Star },
  { id: 'orte' as PhotoSection, label: 'Orte', icon: MapPin },
  { id: 'videos' as PhotoSection, label: 'Videos', icon: Play },
];

// Icon-Mapping für dynamische Kategorien
const getCategoryIcon = (type: string, key: string) => {
  if (type === 'time') return Calendar;
  if (type === 'location') return MapPin;
  if (type === 'object') return Tag;
  if (key.includes('selfie')) return Camera;
  if (key.includes('screenshot')) return Monitor;
  return Sparkles;
};

// Farb-Mapping für Kategorie-Typen
const getCategoryColor = (type: string) => {
  switch (type) {
    case 'time':
      return 'bg-blue-100 text-blue-700';
    case 'location':
      return 'bg-green-100 text-green-700';
    case 'object':
      return 'bg-purple-100 text-purple-700';
    case 'scene':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export function PhotosSidebar({
  activeSection,
  onSectionChange,
  storageUsed,
  storageLimit,
  isCollapsed = false,
  activeDocumentCategory,
  onDocumentCategoryChange,
  userEmail,
  activeDynamicCategory,
  onDynamicCategoryChange,
}: PhotosSidebarProps) {
  const { isDark } = useWebmailTheme();
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(activeSection === 'dokumente');
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState<DynamicCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const storagePercentage = Math.min((storageUsed / storageLimit) * 100, 100);

  // Dynamische Kategorien von der KI laden
  useEffect(() => {
    const loadCategories = async () => {
      if (!userEmail) return;
      
      setIsLoadingCategories(true);
      try {
        PhotosApiService.setUserId(userEmail);
        const categories = await PhotosApiService.getDynamicCategories(1, 20);
        setDynamicCategories(categories);
      } catch (error) {
        // KI nicht verfügbar - zeige leere Kategorien
        setDynamicCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [userEmail]);

  const formatStorage = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Statische Dokumentkategorien (Fallback wenn KI nicht verfügbar)
  const staticDocumentCategories = [
    { id: 'beleg', label: 'Belege', icon: FileText, color: 'bg-amber-100' },
    { id: 'rechnung', label: 'Rechnungen', icon: FileText, color: 'bg-blue-100' },
    { id: 'vertrag', label: 'Verträge', icon: FileText, color: 'bg-green-100' },
    { id: 'identitaet', label: 'Ausweise', icon: FileText, color: 'bg-red-100' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} flex flex-col h-full transition-all duration-200 ${isDark ? 'bg-[#202124]' : 'bg-white'}`}>
      {/* Hauptnavigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Fotos & Updates */}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 ${isCollapsed ? 'px-2' : 'px-4'} py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? isDark 
                      ? 'bg-teal-900/50 text-teal-400'
                      : 'bg-teal-100 text-teal-700'
                    : isDark
                      ? 'text-gray-300 hover:bg-white/10'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? (isDark ? 'text-teal-400' : 'text-teal-700') : (isDark ? 'text-gray-400' : 'text-gray-600')}`} />
                {!isCollapsed && item.label}
              </button>
            );
          })}
        </div>

        {/* Dynamische KI-Kategorien */}
        {!isCollapsed && dynamicCategories.length > 0 && (
          <>
            <div className="mt-6 mb-2 px-4 flex items-center justify-between">
              <h3 className={`text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                <Sparkles className="w-3 h-3" />
                KI-Kategorien
              </h3>
              <button
                onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                className={`p-0.5 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${isCategoriesExpanded ? 'rotate-90' : ''} ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </button>
            </div>

            {isCategoriesExpanded && (
              <div className="space-y-0.5 mb-4">
                {isLoadingCategories ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                ) : (
                  dynamicCategories.slice(0, 8).map((category) => {
                    const Icon = getCategoryIcon(category.type, category.key);
                    const isActive = activeDynamicCategory === category.key;
                    const colorClass = getCategoryColor(category.type);
                    
                    return (
                      <button
                        key={category.key}
                        onClick={() => {
                          onSectionChange('kategorie');
                          onDynamicCategoryChange?.(category.key);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? isDark
                              ? 'bg-teal-900/50 text-teal-400'
                              : 'bg-teal-50 text-teal-700'
                            : isDark
                              ? 'text-gray-300 hover:bg-white/10'
                              : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md ${isDark ? 'bg-white/10' : colorClass} flex items-center justify-center`}>
                          <Icon className={`w-3.5 h-3.5 ${isDark ? 'text-gray-300' : ''}`} />
                        </div>
                        <span className="truncate flex-1 text-left">{category.display_name}</span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {category.count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* Sammlungen Überschrift */}
        {!isCollapsed && (
          <div className="mt-6 mb-2 px-4">
            <h3 className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Sammlungen
            </h3>
          </div>
        )}
        {isCollapsed && <div className="mt-4" />}

        {/* Sammlungen Items */}
        <div className="space-y-1">
          {collectionItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const hasExpander = 'hasExpander' in item && item.hasExpander;
            const isDocuments = item.id === 'dokumente';
            
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (isDocuments) {
                      setIsDocumentsExpanded(!isDocumentsExpanded);
                    }
                    onSectionChange(item.id);
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} gap-3 ${isCollapsed ? 'px-2' : 'px-4'} py-2.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? isDark 
                        ? 'bg-teal-900/50 text-teal-400'
                        : 'bg-teal-100 text-teal-700'
                      : isDark
                        ? 'text-gray-300 hover:bg-white/10'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {!isCollapsed && hasExpander && (
                    <span className={`transition-transform duration-200 ${isDocumentsExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </span>
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? (isDark ? 'text-teal-400' : 'text-teal-700') : (isDark ? 'text-gray-400' : 'text-gray-600')}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
                
                {/* Dokumente Submenu */}
                {isDocuments && isDocumentsExpanded && !isCollapsed && (
                  <div className={`ml-4 mt-1 space-y-0.5 overflow-hidden transition-all duration-200`}>
                    {staticDocumentCategories.map((category) => {
                      const CategoryIcon = category.icon;
                      const isCategoryActive = activeDocumentCategory === category.id;
                      return (
                        <button
                          key={category.id}
                          onClick={() => {
                            onSectionChange('dokumente');
                            onDocumentCategoryChange?.(category.id);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isCategoryActive
                              ? isDark
                                ? 'bg-white/10 text-white'
                                : 'bg-gray-100 text-gray-900'
                              : isDark
                                ? 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-md ${category.color} flex items-center justify-center`}>
                            <CategoryIcon className="w-3.5 h-3.5 text-gray-700" />
                          </div>
                          <span className="truncate">{category.label}</span>
                        </button>
                      );
                    })}
                    {/* Alle Dokumente ansehen */}
                    <div className={`border-t my-1 ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
                    <button
                      onClick={() => {
                        onSectionChange('dokumente');
                        onDocumentCategoryChange?.(undefined);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isDark
                          ? 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Alle Dokumente ansehen</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Speicherplatz */}
      {!isCollapsed && (
        <div className={`px-4 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Speicherplatz Header mit Cloud Icon */}
          <div className="flex items-center gap-3 mb-3">
            <Cloud className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Speicherplatz</span>
          </div>
          <div className="mb-3">
            <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-300"
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatStorage(storageUsed)} von {formatStorage(storageLimit)} belegt
            </p>
          </div>
          <Link
            href="/webmail/photos/storage"
            className={`block w-full text-center py-2 px-4 border rounded-full text-sm font-medium transition-colors ${
              isDark 
                ? 'border-gray-600 text-gray-300 hover:bg-white/10' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mehr Speicherplatz kaufen
          </Link>
        </div>
      )}

      {/* Footer Links */}
      {!isCollapsed && (
        <div className={`px-4 py-3 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            <Link href="/datenschutz" className={isDark ? 'hover:text-gray-300' : 'hover:text-gray-700'}>
              Datenschutz
            </Link>
            <Link href="/agb" className={isDark ? 'hover:text-gray-300' : 'hover:text-gray-700'}>
              Nutzungsbedingungen
            </Link>
            <Link href="/richtlinien" className={isDark ? 'hover:text-gray-300' : 'hover:text-gray-700'}>
              Richtlinien
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
