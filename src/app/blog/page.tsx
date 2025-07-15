'use client';

import React from 'react';
import { FiBookOpen, FiTrendingUp, FiUsers, FiZap } from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />
        
        {/* Header */}
        <div className="text-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4 drop-shadow-lg">Taskilo Blog</h1>
            <p className="text-xl text-white/90 drop-shadow-md">
              Insights, Tipps und News aus der Welt der Dienstleistungen
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="space-y-12">
            {/* Coming Soon */}
            <section className="text-center">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-12">
                <div className="w-20 h-20 bg-gradient-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiBookOpen className="text-white text-3xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Blog kommt bald!</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Wir arbeiten an spannenden Inhalten für dich. Bald findest du hier:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiTrendingUp className="text-white text-xl" />
                    </div>
                    <h3 className="font-semibold mb-2 text-gray-900">Branche Insights</h3>
                    <p className="text-sm text-gray-600">
                      Trends und Entwicklungen in der Dienstleistungsbranche
                    </p>
                  </div>
                  <div className="text-center bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiUsers className="text-white text-xl" />
                    </div>
                    <h3 className="font-semibold mb-2 text-gray-900">Success Stories</h3>
                    <p className="text-sm text-gray-600">
                      Erfolgsgeschichten unserer Dienstleister und Kunden
                    </p>
                  </div>
                  <div className="text-center bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiZap className="text-white text-xl" />
                    </div>
                    <h3 className="font-semibold mb-2 text-gray-900">Tipps & Tricks</h3>
                    <p className="text-sm text-gray-600">
                      Praktische Ratschläge für bessere Dienstleistungen
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <p className="text-gray-500">
                    Möchtest du informiert werden, wenn der Blog online geht?
                  </p>
                  <a
                    href="mailto:blog@taskilo.de"
                    className="inline-block mt-4 bg-[#14ad9f] hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
                  >
                    Über Updates informieren
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
