"use client";

import { HeroHeader } from '@/components/hero8-header';
import FooterSection from '@/components/footer';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Über uns
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Taskilo verbindet Menschen mit den besten Dienstleistern in ihrer Nähe.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Unsere Mission
              </h2>
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                Bei Taskilo glauben wir daran, dass jeder Zugang zu hochwertigen Dienstleistungen haben sollte. 
                Unsere Plattform macht es einfach, vertrauenswürdige Dienstleister zu finden und 
                gleichzeitig lokalen Unternehmen zu helfen, neue Kunden zu erreichen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Was uns auszeichnet
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔍 Qualitätsprüfung</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Alle Dienstleister werden sorgfältig geprüft und von echten Kunden bewertet.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">⚡ Schnell & Einfach</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    In wenigen Klicks den richtigen Dienstleister für Ihr Projekt finden.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🌍 Lokal & Nachhaltig</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Unterstützung lokaler Unternehmen und kurze Wege für mehr Nachhaltigkeit.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🛡️ Sicherheit</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Sichere Zahlungsabwicklung und Schutz vor unseriösen Anbietern.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Unsere Zahlen
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-[#14ad9f]">56.582+</div>
                  <div className="text-gray-600 dark:text-gray-400">Dienstleister</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#14ad9f]">994.012+</div>
                  <div className="text-gray-600 dark:text-gray-400">Bewertungen</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#14ad9f]">1.2M+</div>
                  <div className="text-gray-600 dark:text-gray-400">Projekte</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#14ad9f]">4.8/5</div>
                  <div className="text-gray-600 dark:text-gray-400">Kundenzufriedenheit</div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Unser Team
              </h2>
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                Taskilo wurde von einem engagierten Team aus Technologie- und Dienstleistungsexperten gegründet. 
                Wir arbeiten täglich daran, die Plattform zu verbessern und das beste Erlebnis für unsere Nutzer zu schaffen.
              </p>
              
              <div className="bg-[#14ad9f]/10 border border-[#14ad9f]/20 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Werde Teil des Teams
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Wir suchen immer nach talentierten Menschen, die mit uns die Zukunft der Dienstleistungsbranche gestalten möchten.
                </p>
                <a 
                  href="/careers" 
                  className="inline-flex items-center text-[#14ad9f] hover:text-teal-700 font-medium"
                >
                  Offene Stellen ansehen →
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
