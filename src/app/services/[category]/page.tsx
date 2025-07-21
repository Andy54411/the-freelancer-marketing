'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import { categories } from '@/lib/categoriesData';
import Header from '@/components/Header';
import Link from 'next/link';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;

  // URL-Parameter dekodieren
  const decodedCategory = decodeURIComponent(category);

  // Normalisierungsfunktion
  const normalizeToSlug = (str: string) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '%26');

  // Finde die Kategorie durch Vergleich der normalisierten Namen
  const categoryInfo = categories.find(cat => {
    const expectedSlug = normalizeToSlug(cat.title);
    return expectedSlug === decodedCategory;
  });

  if (!categoryInfo) {
    return (
      <>
        <Header />
        <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 min-h-screen">
          <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
          <div className="relative z-10 pt-8">
            <div className="max-w-2xl mx-auto text-center p-8">
              <h1 className="text-2xl font-bold text-white mb-4">Kategorie nicht gefunden</h1>
              <button
                onClick={() => router.back()}
                className="text-white/80 hover:text-white flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 min-h-screen">
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

        {/* Content with proper top spacing */}
        <div className="relative z-10 pt-8">
          {/* Breadcrumb Navigation */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-sm text-white/80">
              <Link href="/" className="hover:text-white transition-colors">
                Startseite
              </Link>
              <span> / </span>
              <span className="text-white font-medium">{categoryInfo.title}</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => router.back()}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{categoryInfo.title}</h1>
                  <p className="text-white/90 text-lg">
                    Entdecken Sie professionelle Services in {categoryInfo.title}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subcategories Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-2xl font-bold text-white mb-8">Verfügbare Services</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryInfo.subcategories.map((subcategory, index) => (
                <Link
                  key={index}
                  href={`/services/${decodedCategory}/${subcategory.toLowerCase().replace(/\s+/g, '-')}`}
                  className="group"
                >
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden hover:shadow-xl hover:bg-white/95 transition-all duration-300 p-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-white font-bold text-lg">
                          {subcategory.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#14ad9f] transition-colors">
                        {subcategory}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Professionelle {subcategory} Services finden
                      </p>
                      <div className="mt-4 text-[#14ad9f] text-sm font-medium group-hover:underline">
                        Services durchstöbern →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
