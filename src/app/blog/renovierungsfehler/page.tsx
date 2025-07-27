import type { Metadata } from 'next';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Lightbulb, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Die 5 häufigsten Fehler bei der Renovierung - Taskilo Ratgeber',
  description: 'Vermeiden Sie diese 5 kostspieligen Renovierungsfehler. Professionelle Tipps für erfolgreiche Renovierungen und wann Sie Experten beauftragen sollten.',
  keywords: 'Renovierung, Renovierungsfehler, Sanierung, Handwerker, Taskilo, Renovierungstipps',
  openGraph: {
    title: 'Die 5 häufigsten Fehler bei der Renovierung',
    description: 'Professionelle Tipps um kostspielige Renovierungsfehler zu vermeiden. Expertenwissen für erfolgreiche Renovierungen.',
    type: 'article',
  },
};

export default function RenovierungsfehlerPage() {
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
      <section className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-6">
            <AlertTriangle className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">
              Die 5 häufigsten Renovierungsfehler
            </h1>
          </div>
          <p className="text-xl text-red-100 leading-relaxed">
            Vermeiden Sie diese kostspieligen Fehler bei Ihrer nächsten Renovierung. 
            Lernen Sie aus den Erfahrungen anderer und sparen Sie Zeit, Geld und Nerven.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Introduction */}
        <div className="prose prose-lg max-w-none mb-12">
          <p className="text-xl text-gray-700 leading-relaxed">
            Eine Renovierung kann Ihr Zuhause verwandeln - aber nur, wenn sie richtig gemacht wird. 
            Leider machen viele Hausbesitzer immer wieder dieselben Fehler, die zu Verzögerungen, 
            Mehrkosten und schlechten Ergebnissen führen. Hier sind die fünf häufigsten Fallstricke 
            und wie Sie sie vermeiden können.
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-12">
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">1</span>
            </div>
            <h3 className="font-semibold text-sm">Schlechte Planung</h3>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">2</span>
            </div>
            <h3 className="font-semibold text-sm">Unrealistische Budgets</h3>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">3</span>
            </div>
            <h3 className="font-semibold text-sm">Falsche Reihenfolge</h3>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">4</span>
            </div>
            <h3 className="font-semibold text-sm">Unprofessionelle Handwerker</h3>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">5</span>
            </div>
            <h3 className="font-semibold text-sm">Materialfehler</h3>
          </div>
        </div>

        {/* Fehler 1 */}
        <div className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">1</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Mangelnde oder schlechte Planung</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-red-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Typische Planungsfehler
                  </h3>
                  <ul className="space-y-2 text-red-700">
                    <li>• Keine detaillierte Bestandsaufnahme</li>
                    <li>• Unrealistische Zeitplanung</li>
                    <li>• Fehlende Baugenehmigungen</li>
                    <li>• Nicht bedachte Folgearbeiten</li>
                    <li>• Keine Rücksprache mit Vermietern</li>
                  </ul>
                </div>

                <div className="bg-red-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">💸 Kostenfalle:</h4>
                  <p className="text-red-700 text-sm">
                    Schlechte Planung führt zu 30-50% Mehrkosten durch Nacharbeiten, 
                    Materialverschwendung und Verzögerungen.
                  </p>
                </div>
              </div>

              <div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    So machen Sie es richtig
                  </h3>
                  <div className="space-y-3 text-green-700">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">1.</span>
                      <span>Detaillierte Bestandsaufnahme mit Fotos</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">2.</span>
                      <span>Professionelle Beratung einholen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">3.</span>
                      <span>Genehmigungen vor Beginn beantragen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">4.</span>
                      <span>Zeitpuffer von 20-30% einplanen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">5.</span>
                      <span>Alle Gewerke koordinieren</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-[#14ad9f] bg-opacity-10 p-4 rounded-lg">
              <h4 className="font-semibold text-[#14ad9f] mb-2">💡 Taskilo-Tipp:</h4>
              <p className="text-gray-700">
                Nutzen Sie unsere Planungsberatung! Unsere erfahrenen Projektmanager helfen Ihnen bei der 
                detaillierten Planung und Koordination aller Gewerke - von der ersten Idee bis zur Fertigstellung.
              </p>
            </div>
          </div>
        </div>

        {/* Fehler 2 */}
        <div className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Unrealistische Budgetplanung</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-orange-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Häufige Budget-Irrtümer
                  </h3>
                  <ul className="space-y-2 text-orange-700">
                    <li>• Nur Materialkosten einrechnen</li>
                    <li>• Handwerkerkosten unterschätzen</li>
                    <li>• Keine Reserve für Unvorhergesehenes</li>
                    <li>• Nebenkosten vergessen (Entsorgung, etc.)</li>
                    <li>• Qualitätsunterschiede ignorieren</li>
                  </ul>
                </div>

                <div className="bg-orange-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-3">📊 Kostenfaktoren Beispiel Badezimmer:</h4>
                  <div className="space-y-1 text-orange-700 text-sm">
                    <p>• Material: 3.000€ (30%)</p>
                    <p>• Handwerker: 5.000€ (50%)</p>
                    <p>• Planung: 500€ (5%)</p>
                    <p>• Entsorgung: 300€ (3%)</p>
                    <p>• Puffer: 1.200€ (12%)</p>
                    <p className="font-semibold pt-2 border-t">Gesamt: 10.000€</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Realistische Budgetplanung
                  </h3>
                  <div className="space-y-3 text-green-700">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Mehrere detaillierte Kostenvoranschläge einholen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>20% Puffer für Unvorhergesehenes einplanen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Alle Nebenkosten berücksichtigen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Qualitätsstufen vergleichen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Finanzierung vorab klären</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💰 Spartipp:</h4>
                  <p className="text-blue-700 text-sm">
                    Eigenleistung kann 20-40% der Kosten sparen, aber nur bei einfachen Arbeiten wie Streichen oder Fliesen legen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fehler 3 */}
        <div className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Falsche Reihenfolge der Arbeiten</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-yellow-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Typische Reihenfolge-Fehler
                  </h3>
                  <ul className="space-y-2 text-yellow-700">
                    <li>• Streichen vor Elektroinstallation</li>
                    <li>• Boden verlegen vor Malerarbeiten</li>
                    <li>• Sanitär nach Fliesenverlegung</li>
                    <li>• Heizung nach Trockenbau</li>
                    <li>• Küche vor Elektro-Anschlüssen</li>
                  </ul>
                </div>

                <div className="bg-red-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Folgen falscher Reihenfolge:</h4>
                  <p className="text-red-700 text-sm">
                    Nacharbeiten, beschädigte neue Oberflächen, doppelte Kosten 
                    und Verzögerungen von mehreren Wochen.
                  </p>
                </div>
              </div>

              <div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Richtige Reihenfolge
                  </h3>
                  <div className="space-y-2 text-green-700">
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                      <span>Rohbau / Abriss / Entrümpelung</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                      <span>Elektro / Sanitär / Heizung (Rohinstallation)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                      <span>Estrich / Trockenbau</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                      <span>Fliesen / Malerarbeiten</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
                      <span>Elektro / Sanitär (Fertiginstallation)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</span>
                      <span>Bodenbeläge / Türen</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">7</span>
                      <span>Küche / Möbel / Endmontage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fehler 4 */}
        <div className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">4</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Unseriöse oder unqualifizierte Handwerker</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Warnzeichen unseriöser Anbieter
                  </h3>
                  <ul className="space-y-2 text-blue-700">
                    <li>• Haustürgeschäfte und Kaltakquise</li>
                    <li>• Nur Barzahlung, keine Rechnung</li>
                    <li>• Unrealistisch niedrige Preise</li>
                    <li>• Keine Referenzen oder Qualifikationen</li>
                    <li>• Druck zur sofortigen Beauftragung</li>
                    <li>• Vorkasse ohne Leistung</li>
                  </ul>
                </div>

                <div className="bg-red-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">💸 Schäden durch Pfuscher:</h4>
                  <p className="text-red-700 text-sm">
                    Mangelhhafte Arbeiten kosten oft das 2-3fache der ursprünglichen 
                    Summe für Nachbesserungen durch echte Profis.
                  </p>
                </div>
              </div>

              <div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Qualifizierte Handwerker erkennen
                  </h3>
                  <div className="space-y-3 text-green-700">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Gewerbeanmeldung und Versicherungsnachweis</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Positive Bewertungen und Referenzen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Detaillierte schriftliche Angebote</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Fachliche Qualifikationen nachweisbar</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Transparente Preisgestaltung</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Gewährleistung und Garantie</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-[#14ad9f] bg-opacity-10 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#14ad9f] mb-2">🛡️ Taskilo-Garantie:</h4>
                  <p className="text-gray-700 text-sm">
                    Alle Handwerker auf Taskilo sind verifiziert, versichert und durch unser 
                    Bewertungssystem validiert. 100% Qualitätsgarantie oder Geld zurück.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fehler 5 */}
        <div className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">5</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Falsche Materialwahl</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <div className="bg-purple-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold text-purple-800 mb-4 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Häufige Material-Irrtümer
                  </h3>
                  <ul className="space-y-2 text-purple-700">
                    <li>• Billigste Option ohne Qualitätsprüfung</li>
                    <li>• Ungeeignete Materialien für den Einsatzbereich</li>
                    <li>• Zu wenig Material bestellt (Nachbestellung teurer)</li>
                    <li>• Verschiedene Chargen (Farbunterschiede)</li>
                    <li>• Fehlende Kompatibilität zwischen Produkten</li>
                  </ul>
                </div>

                <div className="bg-purple-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">⚠️ Beispiel Laminat:</h4>
                  <p className="text-purple-700 text-sm">
                    Billiges Laminat (8€/m²) hält nur 2-3 Jahre. Hochwertiges (25€/m²) 
                    hält 15+ Jahre. Langfristig ist teuer oft günstiger!
                  </p>
                </div>
              </div>

              <div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Richtige Materialwahl
                  </h3>
                  <div className="space-y-3 text-green-700">
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Verwendungszweck und Beanspruchung beachten</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Qualitäts-/Preis-Verhältnis langfristig bewerten</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Fachberatung bei Materialhändlern nutzen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>10-15% mehr Material als berechnet kaufen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Muster und Referenzobjekte besichtigen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-semibold">✓</span>
                      <span>Garantie- und Gewährleistungszeit prüfen</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">💡 Profi-Tipp:</h4>
                  <p className="text-yellow-700 text-sm">
                    Lassen Sie sich von Ihrem Handwerker eine Materialliste erstellen. 
                    Profis kennen die besten Lieferanten und Qualitätsstufen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zeitplanung */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Clock className="w-8 h-8 mr-2" />
              Realistische Zeitplanung für Renovierungen
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">🏠 Komplettrenovierung 3-Zimmer</h3>
                <div className="space-y-2 text-[#e6fffe]">
                  <p>• Planung: 2-4 Wochen</p>
                  <p>• Abriss/Rohbau: 1-2 Wochen</p>
                  <p>• Installationen: 2-3 Wochen</p>
                  <p>• Ausbau: 3-4 Wochen</p>
                  <p>• Fertigstellung: 1-2 Wochen</p>
                  <p className="font-semibold pt-2 border-t border-white border-opacity-30">
                    Gesamt: 3-4 Monate
                  </p>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">🛁 Badsanierung</h3>
                <div className="space-y-2 text-[#e6fffe]">
                  <p>• Planung: 1-2 Wochen</p>
                  <p>• Abriss: 2-3 Tage</p>
                  <p>• Installationen: 3-5 Tage</p>
                  <p>• Fliesen: 3-5 Tage</p>
                  <p>• Fertigstellung: 2-3 Tage</p>
                  <p className="font-semibold pt-2 border-t border-white border-opacity-30">
                    Gesamt: 3-4 Wochen
                  </p>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">🎨 Malerarbeiten</h3>
                <div className="space-y-2 text-[#e6fffe]">
                  <p>• Vorbereitung: 1-2 Tage</p>
                  <p>• Grundierung: 1 Tag</p>
                  <p>• Erste Schicht: 1-2 Tage</p>
                  <p>• Zweite Schicht: 1-2 Tage</p>
                  <p>• Nacharbeiten: 1 Tag</p>
                  <p className="font-semibold pt-2 border-t border-white border-opacity-30">
                    Gesamt: 1-2 Wochen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Checkliste */}
        <div className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <Lightbulb className="w-8 h-8 mr-2 text-[#14ad9f]" />
              Ihre Renovierungs-Checkliste
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">📋 Vor der Renovierung</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Detaillierte Planung mit Fachberatung</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Realistisches Budget mit 20% Puffer</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Qualifizierte Handwerker auswählen</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Genehmigungen beantragen</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Materialien sorgfältig auswählen</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">🔧 Während der Renovierung</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Regelmäßige Qualitätskontrollen</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Dokumentation mit Fotos</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Regelmäßige Abstimmung mit Handwerkern</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Flexible Reaktion auf Probleme</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-1 flex-shrink-0" />
                    <span>Sicherheitsbestimmungen beachten</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ihre Renovierung in professionellen Händen
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Vermeiden Sie kostspielige Fehler mit geprüften Experten von Taskilo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/services/renovierung" 
              className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#129488] transition-colors"
            >
              Renovierungsexperten finden
            </Link>
            <Link 
              href="/services/beratung" 
              className="border-2 border-[#14ad9f] text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-[#14ad9f] hover:text-white transition-colors"
            >
              Kostenlose Beratung
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900/90 backdrop-blur-sm text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-300">
            © 2025 Taskilo. Alle Rechte vorbehalten. | 
            <Link href="/datenschutz" className="hover:text-[#14ad9f] ml-2">Datenschutz</Link> | 
            <Link href="/agb" className="hover:text-[#14ad9f] ml-2">AGB</Link>
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
