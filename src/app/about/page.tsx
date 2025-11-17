'use client';

import { HeroHeader } from '@/components/hero8-header';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />
        <main className="py-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">Über uns</h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Taskilo verbindet Menschen mit den besten Dienstleistern in ihrer Nähe.
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8 space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Unsere Mission</h2>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Bei Taskilo glauben wir daran, dass jeder Zugang zu hochwertigen Dienstleistungen
                  haben sollte. Unsere Plattform macht es einfach, vertrauenswürdige Dienstleister
                  zu finden und gleichzeitig lokalen Unternehmen zu helfen, neue Kunden zu
                  erreichen.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Was uns auszeichnet</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/80 backdrop-blur-sm border border-white/20 p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-900 mb-2">🔍 Qualitätsprüfung</h3>
                    <p className="text-gray-700">
                      Alle Dienstleister werden sorgfältig geprüft und von echten Kunden bewertet.
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border border-white/20 p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-900 mb-2">⚡ Schnell & Einfach</h3>
                    <p className="text-gray-700">
                      In wenigen Klicks den richtigen Dienstleister für Ihr Projekt finden.
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border border-white/20 p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-900 mb-2">🌍 Lokal & Nachhaltig</h3>
                    <p className="text-gray-700">
                      Unterstützung lokaler Unternehmen und kurze Wege für mehr Nachhaltigkeit.
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border border-white/20 p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-gray-900 mb-2">🛡️ Sicherheit</h3>
                    <p className="text-gray-700">
                      Sichere Zahlungsabwicklung und Schutz vor unseriösen Anbietern.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Unsere Zahlen</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="bg-linear-to-br from-[#14ad9f]/10 to-teal-500/10 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-[#14ad9f]">56.582+</div>
                    <div className="text-gray-600">Dienstleister</div>
                  </div>
                  <div className="bg-linear-to-br from-[#14ad9f]/10 to-teal-500/10 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-[#14ad9f]">994.012+</div>
                    <div className="text-gray-600">Bewertungen</div>
                  </div>
                  <div className="bg-linear-to-br from-[#14ad9f]/10 to-teal-500/10 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-[#14ad9f]">1.2M+</div>
                    <div className="text-gray-600">Projekte</div>
                  </div>
                  <div className="bg-linear-to-br from-[#14ad9f]/10 to-teal-500/10 p-4 rounded-lg">
                    <div className="text-3xl font-bold text-[#14ad9f]">4.8/5</div>
                    <div className="text-gray-600">Kundenzufriedenheit</div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Unser Team</h2>
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  Taskilo wurde von einem engagierten Team aus Technologie- und
                  Dienstleistungsexperten gegründet. Wir arbeiten täglich daran, die Plattform zu
                  verbessern und das beste Erlebnis für unsere Nutzer zu schaffen.
                </p>

                <div className="bg-linear-to-r from-[#14ad9f]/10 to-teal-500/10 border border-[#14ad9f]/20 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Werde Teil des Teams</h3>
                  <p className="text-gray-700 mb-4">
                    Wir suchen immer nach talentierten Menschen, die mit uns die Zukunft der
                    Dienstleistungsbranche gestalten möchten.
                  </p>
                  <a
                    href="/careers"
                    className="inline-flex items-center text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
                  >
                    Offene Stellen ansehen →
                  </a>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
