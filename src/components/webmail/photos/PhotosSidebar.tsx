'use client';

import React from 'react';
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
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

export type PhotoSection =
  | 'fotos'
  | 'updates'
  | 'alben'
  | 'dokumente'
  | 'screenshots'
  | 'favoriten'
  | 'orte'
  | 'videos';

interface PhotosSidebarProps {
  activeSection: PhotoSection;
  onSectionChange: (section: PhotoSection) => void;
  storageUsed: number;
  storageLimit: number;
  isCollapsed?: boolean;
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

export function PhotosSidebar({
  activeSection,
  onSectionChange,
  storageUsed,
  storageLimit,
  isCollapsed = false,
}: PhotosSidebarProps) {
  const { isDark } = useWebmailTheme();
  const storagePercentage = Math.min((storageUsed / storageLimit) * 100, 100);

  const formatStorage = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} flex flex-col h-full transition-all duration-200 ${isDark ? 'bg-[#202124]' : 'bg-white'}`}>
      {/* Hauptnavigation */}
      <nav className="flex-1 px-3 py-2">
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
                {!isCollapsed && hasExpander && (
                  <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                )}
                <Icon className={`w-5 h-5 ${isActive ? (isDark ? 'text-teal-400' : 'text-teal-700') : (isDark ? 'text-gray-400' : 'text-gray-600')}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
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
