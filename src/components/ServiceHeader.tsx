'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';

type SortOption = 'rating' | 'reviews' | 'price' | 'newest';

interface ServiceHeaderProps {
  categoryTitle: string;
  subcategoryName: string;
  decodedCategory: string;
  providerCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  fromTag?: string;
  filteredByTag?: boolean;
}

export default function ServiceHeader({
  categoryTitle,
  subcategoryName,
  decodedCategory,
  providerCount,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  fromTag,
  filteredByTag,
}: ServiceHeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* Kompakter Header mit Backdrop */}
      <div className="bg-white/95 backdrop-blur-md border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-[#14ad9f] transition-colors">
              Startseite
            </Link>
            <span className="mx-1">/</span>
            <Link href="/services" className="hover:text-[#14ad9f] transition-colors">
              Services
            </Link>
            <span className="mx-1">/</span>
            <Link
              href={`/services/${decodedCategory}`}
              className="hover:text-[#14ad9f] transition-colors"
            >
              {categoryTitle}
            </Link>
            <span className="mx-1">/</span>
            <span className="text-gray-900 font-medium">{subcategoryName}</span>
            {fromTag && filteredByTag && (
              <>
                <span className="mx-1 text-[#14ad9f]">•</span>
                <span className="text-[#14ad9f] font-medium">
                  gefiltert nach &quot;{fromTag}&quot;
                </span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push(`/services/${decodedCategory}`)}
              className="text-gray-600 hover:text-[#14ad9f] p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{subcategoryName}</h1>
              <p className="text-gray-700 mb-3">
                {providerCount}{' '}
                {providerCount === 1 ? 'professioneller Anbieter' : 'professionelle Anbieter'} für{' '}
                {subcategoryName}
              </p>

              {/* Kompakte Stats Pills */}
              <div className="flex flex-wrap gap-2">
                <div className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium border border-green-200">
                  ✓ Sofort verfügbar
                </div>
                <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-200">
                  ✓ Ab €25/Stunde
                </div>
                <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs font-medium border border-purple-200">
                  ✓ Verifizierte Profile
                </div>
              </div>
            </div>
          </div>

          {/* Kompakte Filters Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Anbieter durchsuchen..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] text-gray-900 placeholder-gray-500 text-sm"
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={e => onSortChange(e.target.value as SortOption)}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] text-gray-900 text-sm"
              >
                <option value="rating">Beste Bewertung</option>
                <option value="reviews">Meiste Bewertungen</option>
                <option value="price">Preis</option>
                <option value="newest">Neueste</option>
              </select>

              {/* Filter Button */}
              <button className="bg-[#14ad9f] text-white px-4 py-2.5 rounded-lg hover:bg-[#129488] transition-colors font-medium text-sm">
                Filter anwenden
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
