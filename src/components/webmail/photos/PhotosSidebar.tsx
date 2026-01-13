'use client';

import React from 'react';
import Link from 'next/link';
import {
  Image,
  Sparkles,
  FolderOpen,
  FileText,
  Monitor,
  Star,
  MapPin,
  Video,
} from 'lucide-react';

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
}

const mainNavItems = [
  { id: 'fotos' as PhotoSection, label: 'Fotos', icon: Image },
  { id: 'updates' as PhotoSection, label: 'Updates', icon: Sparkles },
];

const collectionItems = [
  { id: 'alben' as PhotoSection, label: 'Alben', icon: FolderOpen },
  { id: 'dokumente' as PhotoSection, label: 'Dokumente', icon: FileText },
  {
    id: 'screenshots' as PhotoSection,
    label: 'Screenshots und Aufzeichnungen',
    icon: Monitor,
  },
  { id: 'favoriten' as PhotoSection, label: 'Favoriten', icon: Star },
  { id: 'orte' as PhotoSection, label: 'Orte', icon: MapPin },
  { id: 'videos' as PhotoSection, label: 'Videos', icon: Video },
];

export function PhotosSidebar({
  activeSection,
  onSectionChange,
  storageUsed,
  storageLimit,
}: PhotosSidebarProps) {
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
    <aside className="w-64 flex flex-col h-full bg-white">
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-600'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Sammlungen Überschrift */}
        <div className="mt-6 mb-2 px-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Sammlungen
          </h3>
        </div>

        {/* Sammlungen Items */}
        <div className="space-y-1">
          {collectionItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-600'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Speicherplatz */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="mb-3">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {formatStorage(storageUsed)} von {formatStorage(storageLimit)} verwendet
          </p>
        </div>
        <Link
          href="/webmail/photos/storage"
          className="block w-full text-center py-2 px-4 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Mehr Speicherplatz kaufen
        </Link>
      </div>

      {/* Footer Links */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          <Link href="/datenschutz" className="hover:text-gray-700">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-gray-700">
            Nutzungsbedingungen
          </Link>
          <Link href="/richtlinien" className="hover:text-gray-700">
            Richtlinien
          </Link>
        </div>
      </div>
    </aside>
  );
}
