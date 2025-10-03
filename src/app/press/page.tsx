'use client';

import React from 'react';
import { FiFileText, FiUsers, FiAward, FiMail } from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';

export default function PressPage() {
  return (
    <>
      <HeroHeader />
      {/* Gradient Container */}
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content */}
        <div className="relative z-10 py-16">
          <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-16">
              <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Presse & Medien</h1>
              <p className="text-xl text-white drop-shadow-lg opacity-90">
                Informationen und Ressourcen für Medienvertreter
              </p>
            </div>

            <div className="space-y-12">
              {/* About Section */}
              <section>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">Über Taskilo</h2>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-8">
                  <p className="text-white leading-relaxed mb-4 drop-shadow-lg">
                    Taskilo ist eine innovative Plattform, die lokale Dienstleister mit Kunden
                    verbindet. Unser Ziel ist es, die Vermittlung von hochwertigen Dienstleistungen
                    zu vereinfachen und dabei sowohl Anbietern als auch Kunden die bestmögliche
                    Erfahrung zu bieten.
                  </p>
                  <p className="text-white leading-relaxed drop-shadow-lg">
                    Seit unserer Gründung haben wir uns zu einer vertrauenswürdigen Plattform
                    entwickelt, die lokale Wirtschaft stärkt und den Alltag unserer Nutzer
                    erleichtert.
                  </p>
                </div>
              </section>

              {/* Key Facts */}
              <section>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">
                  Unternehmensdaten
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 text-center">
                    <FiUsers className="text-4xl text-white mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white drop-shadow-lg">
                      Gemeinschaft
                    </h3>
                    <p className="text-white/90 drop-shadow-lg">
                      Verbindung zwischen lokalen Dienstleistern und Kunden
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 text-center">
                    <FiAward className="text-4xl text-white mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white drop-shadow-lg">
                      Qualität
                    </h3>
                    <p className="text-white/90 drop-shadow-lg">
                      Fokus auf hochwertige Dienstleistungen und Kundenzufriedenheit
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 text-center">
                    <FiFileText className="text-4xl text-white mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white drop-shadow-lg">
                      Innovation
                    </h3>
                    <p className="text-white/90 drop-shadow-lg">
                      Moderne Technologie für einfache Vermittlung
                    </p>
                  </div>
                </div>
              </section>

              {/* Press Kit */}
              <section>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">Presse-Kit</h2>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-8">
                  <p className="text-white mb-6 drop-shadow-lg">
                    Für Medienanfragen und detaillierte Informationen stehen wir gerne zur
                    Verfügung.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <FiFileText className="text-white" />
                      <span className="text-white drop-shadow-lg">
                        Firmenlogos und Bildmaterial
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FiFileText className="text-white" />
                      <span className="text-white drop-shadow-lg">Unternehmensinformationen</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FiFileText className="text-white" />
                      <span className="text-white drop-shadow-lg">Statistiken und Zahlen</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">Pressekontakt</h2>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 text-white">
                  <div className="flex items-center justify-center mb-6">
                    <FiMail className="text-4xl" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4 drop-shadow-lg">Medienanfragen</h3>
                    <p className="mb-6 drop-shadow-lg">
                      Für Interviews, Pressemitteilungen oder weitere Informationen kontaktieren Sie
                      uns gerne:
                    </p>
                    <a
                      href="mailto:presse@taskilo.de"
                      className="inline-block bg-white text-[#14ad9f] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                    >
                      presse@taskilo.de
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
