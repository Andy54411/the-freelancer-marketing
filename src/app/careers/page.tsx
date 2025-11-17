'use client';

import React from 'react';
import { FiUsers, FiTarget, FiTrendingUp, FiMail } from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />

        {/* Header */}
        <div className="text-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4 drop-shadow-lg">Karriere bei Taskilo</h1>
            <p className="text-xl text-white/90 drop-shadow-md">
              Werde Teil des Teams, das die Zukunft der Dienstleistungsbranche gestaltet
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="space-y-12">
            {/* Company Values */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-8 drop-shadow-md">Warum Taskilo?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-xl">
                  <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiUsers className="text-white text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Teamwork</h3>
                  <p className="text-gray-600">
                    Arbeite mit einem motivierten Team an innovativen Lösungen
                  </p>
                </div>
                <div className="text-center bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-xl">
                  <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiTarget className="text-white text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Mission</h3>
                  <p className="text-gray-600">
                    Hilf dabei, lokale Dienstleister und Kunden zu verbinden
                  </p>
                </div>
                <div className="text-center bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-xl">
                  <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiTrendingUp className="text-white text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Wachstum</h3>
                  <p className="text-gray-600">
                    Entwickle dich in einem schnell wachsenden Unternehmen weiter
                  </p>
                </div>
              </div>
            </section>

            {/* Current Openings */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-8 drop-shadow-md">
                Aktuelle Stellenangebote
              </h2>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <p className="text-gray-600 text-center">
                  Derzeit haben wir keine offenen Stellen. Folge uns auf unseren sozialen Medien
                  oder sende uns eine Initiativbewerbung!
                </p>
              </div>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-8 drop-shadow-md">
                Interesse geweckt?
              </h2>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 text-center shadow-xl">
                <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiMail className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">
                  Sende uns deine Bewerbung
                </h3>
                <p className="mb-6 text-gray-600">
                  Auch wenn aktuell keine passende Stelle ausgeschrieben ist, freuen wir uns über
                  Initiativbewerbungen von motivierten Talenten.
                </p>
                <a
                  href="mailto:careers@taskilo.de"
                  className="inline-block bg-[#14ad9f] hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
                >
                  careers@taskilo.de
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
