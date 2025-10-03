import type { Metadata } from 'next';
import { ArrowLeft, CheckCircle, Home, Clock, Euro } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Checkliste für den Umzug - Stressfrei umziehen mit Taskilo',
  description:
    'Komplette Umzugscheckliste: Von 8 Wochen vor dem Umzug bis zum ersten Tag im neuen Zuhause. Tipps, Termine und professionelle Umzugshilfe.',
  keywords: 'Umzug, Checkliste, Umzugsplanung, Umzugshelfer, Taskilo, Umzugstipps',
  openGraph: {
    title: 'Checkliste für den Umzug - Stressfrei umziehen',
    description:
      'Komplette Umzugscheckliste mit Timeline und professionellen Tipps für einen stressfreien Umzug.',
    type: 'article',
  },
};

export default function UmzugschecklistePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="bg-white/95 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-[#14ad9f] font-bold text-sm">T</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Taskilo</span>
              </Link>
              <Link
                href="/blog"
                className="flex items-center space-x-2 text-gray-600 hover:text-[#14ad9f] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zurück zum Blog</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3 mb-6">
              <Home className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">
                Checkliste für den Umzug
              </h1>
            </div>
            <p className="text-xl text-white/95 leading-relaxed drop-shadow-md">
              Von der ersten Planung bis zum ersten Tag im neuen Zuhause - Ihre komplette Anleitung
              für einen stressfreien Umzug.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-xl text-gray-700 leading-relaxed">
              Ein Umzug kann überwältigend sein, aber mit der richtigen Planung wird er zum
              stressfreien Neuanfang. Diese detaillierte Checkliste führt Sie chronologisch durch
              alle wichtigen Schritte - von der ersten Planung bis zur Eingewöhnung im neuen
              Zuhause.
            </p>
          </div>

          {/* Timeline Overview */}
          <div className="bg-[#14ad9f] bg-opacity-10 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Umzugs-Timeline im Überblick</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">8W</span>
                </div>
                <h3 className="font-semibold mb-2">8 Wochen vorher</h3>
                <p className="text-sm text-gray-600">Grundplanung & Anbieter suchen</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">4W</span>
                </div>
                <h3 className="font-semibold mb-2">4 Wochen vorher</h3>
                <p className="text-sm text-gray-600">Anmeldungen & Verträge</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">1W</span>
                </div>
                <h3 className="font-semibold mb-2">1 Woche vorher</h3>
                <p className="text-sm text-gray-600">Letzte Vorbereitungen</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold">✓</span>
                </div>
                <h3 className="font-semibold mb-2">Umzugstag</h3>
                <p className="text-sm text-gray-600">Durchführung & Nachbereitung</p>
              </div>
            </div>
          </div>

          {/* 8 Wochen vorher */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-[#14ad9f] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">8W</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">8 Wochen vor dem Umzug</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🏠 Wohnungssuche & Grundplanung
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>Neue Wohnung/Haus besichtigen und Mietvertrag prüfen</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>Kündigungsfristen der aktuellen Wohnung beachten (meist 3 Monate)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>Umzugstermin festlegen (am besten außerhalb der Hauptsaison)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>
                        Budget für den Umzug kalkulieren (inkl. Umzugsunternehmen, Renovierung,
                        Kautionen)
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    📦 Umzugsservice planen
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>Umzugsangebote einholen (mindestens 3 Vergleichsangebote)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>Entscheiden: Vollservice, Teilservice oder Eigenregie mit Helfern</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>Umzugswagen reservieren (falls Eigenregie)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                      <span>Umzugshelfer über Taskilo finden und Termine vereinbaren</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#14ad9f] bg-opacity-10 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#14ad9f] mb-2">💡 Taskilo-Tipp:</h4>
                  <p className="text-gray-700">
                    Über Taskilo finden Sie qualifizierte Umzugshelfer in Ihrer Nähe. Von der
                    kompletten Umzugsabwicklung bis hin zu einzelnen Helfern für den Transport -
                    flexibel buchbar und zu fairen Preisen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Wochen vorher */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">4W</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">4 Wochen vor dem Umzug</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    📋 Behördliche Anmeldungen
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Nachsendeantrag bei der Post stellen (3-12 Monate)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Anmeldeformular vom neuen Wohnort besorgen</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Arbeitgeber über Adressänderung informieren</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Krankenkasse, Versicherungen und Bank kontaktieren</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🔌 Versorgungsverträge
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Strom- und Gasanbieter wechseln/ummelden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Internetanbieter über Umzug informieren (Vorlaufzeit beachten!)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Wasser- und Müllabfuhr beim neuen Versorger anmelden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Telefon und TV-Anschluss für neuen Wohnort beantragen</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🏫 Weitere wichtige Stellen
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Kinder in neuer Schule/Kita anmelden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>Arzt, Zahnarzt, Tierarzt in der neuen Umgebung suchen</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>GEZ/Rundfunkbeitrag ummelden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <span>
                        Abos und Mitgliedschaften (Fitnessstudio, Zeitungen, etc.) ummelden
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1 Woche vorher */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">1W</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">1 Woche vor dem Umzug</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    📦 Packen & Vorbereitung
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Kartons besorgen und systematisch packen (Raum für Raum)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Kartons beschriften (Inhalt + Zielraum in neuer Wohnung)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Erste-Hilfe-Kiste packen (wichtige Dinge für die ersten Tage)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Wertsachen und wichtige Dokumente separat transportieren</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🧹 Alte Wohnung vorbereiten
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Entrümpelung: Ausmisten und entsorgen was nicht mitkommt</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Renovierungsarbeiten planen (Malerarbeiten, Reparaturen)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Übernahmeprotokoll mit Vermieter/Nachmieter vorbereiten</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                      <span>Schlüssel für Umzugshelfer organisieren</span>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-600 mb-2">⚠️ Wichtiger Hinweis:</h4>
                  <p className="text-gray-700">
                    Beauftragen Sie Renovierungsarbeiten rechtzeitig über Taskilo. Maler, Elektriker
                    und Handwerker sind oft wochenlang ausgebucht. Buchen Sie diese Services bereits
                    bei der 8-Wochen-Planung!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Umzugstag */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">✓</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Am Umzugstag</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🌅 Morgens</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Früh aufstehen und ausreichend frühstücken</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Letzte Gegenstände einpacken und Kühlschrank leeren</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Umzugswagen und Helfer pünktlich in Empfang nehmen</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Zählerstände (Strom, Gas, Wasser) ablesen und dokumentieren</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🚚 Während des Umzugs
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Transport koordinieren und auf Beschädigungen achten</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Helfer mit Getränken und Snacks versorgen</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Inventarliste führen (was wurde transportiert)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Nachbarn in der neuen Wohnung begrüßen</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🏡 Abends</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Wohnungsübergabe alte Wohnung (Protokoll + Schlüssel)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Neue Zählerstände ablesen und dem Versorger melden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Umzugshelfer bezahlen und bewerten (bei Taskilo-Buchung)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                      <span>Erste Einrichtung: Bett aufbauen, Kühlschrank anschließen</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nach dem Umzug */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                📅 Nach dem Umzug (erste 2 Wochen)
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🏛️ Behördengänge</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>
                        <strong>Binnen 14 Tagen:</strong> Anmeldung beim Einwohnermeldeamt
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>Führerschein und Fahrzeugpapiere ummelden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>Wahlberechtigung ummelden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>Finanzamt über Adressänderung informieren</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🏠 Eingewöhnung</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>Möbel aufbauen und Wohnung einrichten</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>Neue Umgebung erkunden (Supermärkte, Ärzte, etc.)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>Kontakt zu neuen Nachbarn aufbauen</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                      <span>Einweihungsfeier planen</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kosten & Budget */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <Euro className="w-8 h-8 mr-2" />
                Umzugskosten im Überblick
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">💰 Typische Kostenpunkte</h3>
                  <div className="space-y-2 text-[#e6fffe]">
                    <p>• Umzugsunternehmen: 300-1.500€</p>
                    <p>• Umzugswagen mieten: 50-150€/Tag</p>
                    <p>• Umzugshelfer: 15-25€/Stunde</p>
                    <p>• Renovierung: 200-2.000€</p>
                    <p>• Kaution neue Wohnung: 2-3 Monatsmieten</p>
                    <p>• Ummeldungen & Gebühren: 50-200€</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">💡 Spartipps</h3>
                  <div className="space-y-2 text-[#e6fffe]">
                    <p>• Umzug außerhalb der Hauptsaison (Sommer)</p>
                    <p>• Unter der Woche statt am Wochenende</p>
                    <p>• Eigenleistung + professionelle Helfer kombinieren</p>
                    <p>• Mehrere Angebote vergleichen</p>
                    <p>• Gebrauchte Kartons verwenden</p>
                    <p>• Steuerliche Absetzbarkeit prüfen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Professionelle Umzugshilfe gesucht?
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Finden Sie qualifizierte Umzugshelfer und Handwerker für Ihren stressfreien Umzug.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/services/umzug"
                className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#129488] transition-colors"
              >
                Umzugshelfer finden
              </Link>
              <Link
                href="/services/renovierung"
                className="border-2 border-[#14ad9f] text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-[#14ad9f] hover:text-white transition-colors"
              >
                Renovierung beauftragen
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900/90 backdrop-blur-sm text-white py-8 mt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-300">
              © 2025 Taskilo. Alle Rechte vorbehalten. |
              <Link href="/datenschutz" className="hover:text-[#14ad9f] ml-2">
                Datenschutz
              </Link>{' '}
              |
              <Link href="/agb" className="hover:text-[#14ad9f] ml-2">
                AGB
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
