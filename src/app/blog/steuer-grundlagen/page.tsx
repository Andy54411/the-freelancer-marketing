import type { Metadata } from 'next';
import { ArrowLeft, Calculator, Receipt, FileText, AlertTriangle, Euro, Percent } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Steuer-Grundlagen für Selbstständige - Taskilo Leitfaden',
  description: 'Steuerliche Basics für Selbstständige auf Taskilo: Gewerbeanmeldung, Umsatzsteuer, Ausgaben absetzen, Steuererklärung und Profi-Tipps.',
  keywords: 'Steuern, Selbstständig, Gewerbe, Umsatzsteuer, Taskilo, Steuerberatung, Kleinunternehmer',
  openGraph: {
    title: 'Steuer-Grundlagen für Selbstständige auf Taskilo',
    description: 'Kompletter Steuer-Leitfaden für Dienstleister: Von der Gewerbeanmeldung bis zur Steuererklärung.',
    type: 'article',
  },
};

export default function SteuerGrundlagenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
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
      <section className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-6">
            <Calculator className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Steuer-Grundlagen für Selbstständige
            </h1>
          </div>
          <p className="text-xl text-green-100 leading-relaxed">
            Der komplette Leitfaden für Dienstleister auf Taskilo: Von der Gewerbeanmeldung bis zur 
            Steuererklärung - alles was Sie über Steuern als Selbstständiger wissen müssen.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Wichtiger Hinweis */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-12">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ WICHTIGER HINWEIS</h2>
              <p className="text-yellow-700 text-lg">
                Dieser Artikel bietet eine Grundorientierung und ersetzt keine individuelle Steuerberatung. 
                Steuergesetze ändern sich häufig - konsultieren Sie immer einen Steuerberater für Ihre 
                spezifische Situation!
              </p>
            </div>
          </div>
        </div>

        {/* Übersicht */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Ihre Steuer-Roadmap als Taskilo-Dienstleister</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Gewerbeanmeldung</h3>
              <p className="text-gray-600 text-sm">Status klären & anmelden</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Umsatzsteuer</h3>
              <p className="text-gray-600 text-sm">Kleinunternehmer vs. Regelbesteuerung</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Buchhaltung</h3>
              <p className="text-gray-600 text-sm">Einnahmen & Ausgaben dokumentieren</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">4</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Steuererklärung</h3>
              <p className="text-gray-600 text-sm">Jährliche Abrechnung</p>
            </div>
          </div>
        </div>

        {/* 1. Gewerbeanmeldung */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">1</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Gewerbeanmeldung: Ihr erster Schritt</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🏢 Wann ist eine Gewerbeanmeldung nötig?</h3>
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">✅ Gewerbeanmeldung NÖTIG:</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Handwerk (Elektriker, Klempner, Maler)</li>
                      <li>• Dienstleistungen (Reinigung, Umzug, Reparaturen)</li>
                      <li>• Handel (Materialverkauf)</li>
                      <li>• Gastronomie & Catering</li>
                      <li>• IT-Services & Webdesign</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">ℹ️ KEINE Gewerbeanmeldung:</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Freie Berufe (Berater, Übersetzer, Künstler)</li>
                      <li>• Vermietung (nur Räume/Gegenstände)</li>
                      <li>• Gelegentliche Verkäufe</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">📋 Anmeldeprozess Schritt-für-Schritt</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#14ad9f] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Gewerbeamt kontaktieren</h4>
                      <p className="text-gray-600 text-sm">Termin vereinbaren oder online anmelden</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#14ad9f] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Unterlagen zusammenstellen</h4>
                      <p className="text-gray-600 text-sm">Personalausweis, ggf. Nachweise (Meisterbrief)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#14ad9f] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Formular ausfüllen</h4>
                      <p className="text-gray-600 text-sm">Tätigkeit genau beschreiben</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-[#14ad9f] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Gebühr bezahlen</h4>
                      <p className="text-gray-600 text-sm">Meist 15-65€, je nach Gemeinde</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-[#14ad9f] bg-opacity-10 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#14ad9f] mb-2">💡 Taskilo-Tipp:</h4>
                  <p className="text-gray-700 text-sm">
                    Melden Sie Ihr Gewerbe an, bevor Sie auf Taskilo aktiv werden. 
                    Das schützt Sie rechtlich und wirkt professionell auf Kunden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Umsatzsteuer */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Umsatzsteuer: Kleinunternehmer vs. Regelbesteuerung</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-green-600 mb-4">🟢 Kleinunternehmerregelung</h3>
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3">Voraussetzungen:</h4>
                  <ul className="text-green-700 text-sm space-y-1 mb-4">
                    <li>• Umsatz letztes Jahr ≤ 22.000€</li>
                    <li>• Umsatz aktuelles Jahr voraussichtlich ≤ 50.000€</li>
                  </ul>
                  
                  <h4 className="font-semibold text-green-800 mb-3">✅ Vorteile:</h4>
                  <ul className="text-green-700 text-sm space-y-1 mb-4">
                    <li>• Keine Umsatzsteuer auf Rechnungen</li>
                    <li>• Keine Umsatzsteuervoranmeldung</li>
                    <li>• Weniger Bürokratie</li>
                    <li>• Günstigere Preise für Privatkunden</li>
                  </ul>
                  
                  <h4 className="font-semibold text-green-800 mb-3">❌ Nachteile:</h4>
                  <ul className="text-green-700 text-sm space-y-1">
                    <li>• Kein Vorsteuerabzug</li>
                    <li>• Weniger professionell für B2B</li>
                    <li>• Wachstum begrenzt</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-blue-600 mb-4">🔵 Regelbesteuerung</h3>
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3">Wann nötig/sinnvoll:</h4>
                  <ul className="text-blue-700 text-sm space-y-1 mb-4">
                    <li>• Umsatz über Grenzen</li>
                    <li>• Hohe Ausgaben mit Umsatzsteuer</li>
                    <li>• Hauptsächlich B2B-Kunden</li>
                    <li>• Wachstumspläne über 50.000€</li>
                  </ul>
                  
                  <h4 className="font-semibold text-blue-800 mb-3">✅ Vorteile:</h4>
                  <ul className="text-blue-700 text-sm space-y-1 mb-4">
                    <li>• Vorsteuerabzug bei Ausgaben</li>
                    <li>• Unbegrenztes Wachstum</li>
                    <li>• Professioneller für B2B</li>
                  </ul>
                  
                  <h4 className="font-semibold text-blue-800 mb-3">❌ Nachteile:</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• 19% Umsatzsteuer auf Rechnungen</li>
                    <li>• Monatliche/Vierteljährliche Voranmeldung</li>
                    <li>• Mehr Bürokratie</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">🧮 Entscheidungshilfe: Rechenbeispiel</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded border border-yellow-100">
                  <h4 className="font-semibold text-gray-900 mb-2">Kleinunternehmer-Rechnung:</h4>
                  <div className="text-sm space-y-1">
                    <p>Arbeitszeit: 8h à 50€ = 400€</p>
                    <p>Material: 200€</p>
                    <p className="font-bold border-t pt-1">Rechnung: 600€ (ohne USt.)</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded border border-yellow-100">
                  <h4 className="font-semibold text-gray-900 mb-2">Regelbesteuerung-Rechnung:</h4>
                  <div className="text-sm space-y-1">
                    <p>Arbeitszeit: 8h à 50€ = 400€</p>
                    <p>Material: 200€</p>
                    <p>Umsatzsteuer 19%: 114€</p>
                    <p className="font-bold border-t pt-1">Rechnung: 714€ (inkl. USt.)</p>
                    <p className="text-xs text-gray-600">Material-Vorsteuer: -38€</p>
                    <p className="font-bold">An Finanzamt: 76€</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Buchhaltung */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Buchhaltung: Ordnung ist das halbe Leben</h2>
            </div>
            
            <div className="space-y-8">
              {/* Einnahmen dokumentieren */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Euro className="w-6 h-6 mr-2 text-green-500" />
                  Einnahmen richtig dokumentieren
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-3">📊 Taskilo-Einnahmen:</h4>
                    <ul className="text-green-700 text-sm space-y-2">
                      <li>• Alle Taskilo-Aufträge automatisch in Ihrem Dashboard</li>
                      <li>• Export-Funktion für Buchhaltungssoftware</li>
                      <li>• Monatliche Übersichten verfügbar</li>
                      <li>• Rechnungen automatisch generiert</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">📋 Weitere Einnahmen:</h4>
                    <ul className="text-blue-700 text-sm space-y-2">
                      <li>• Private Aufträge (außerhalb Taskilo)</li>
                      <li>• Beratungsleistungen</li>
                      <li>• Materialverkäufe</li>
                      <li>• Alle Beträge mit Datum & Kunde dokumentieren</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Ausgaben absetzen */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Receipt className="w-6 h-6 mr-2 text-orange-500" />
                  Ausgaben steuerlich absetzen
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">✅ Voll absetzbare Ausgaben:</h4>
                    <div className="space-y-3">
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="font-semibold text-green-800 text-sm">🚗 Fahrzeug (Dienstfahrten):</p>
                        <p className="text-green-700 text-xs">0,30€/km oder 1% vom Listenpreis/Monat</p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="font-semibold text-green-800 text-sm">🔧 Werkzeug & Material:</p>
                        <p className="text-green-700 text-xs">Alles was Sie für die Arbeit brauchen</p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="font-semibold text-green-800 text-sm">💻 Arbeitsmittel:</p>
                        <p className="text-green-700 text-xs">Handy, Laptop, Software, Büromaterial</p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="font-semibold text-green-800 text-sm">🎓 Fortbildung:</p>
                        <p className="text-green-700 text-xs">Kurse, Seminare, Fachliteratur</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">⚖️ Teilweise absetzbare Ausgaben:</h4>
                    <div className="space-y-3">
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="font-semibold text-yellow-800 text-sm">🏠 Homeoffice:</p>
                        <p className="text-yellow-700 text-xs">Anteilig: Miete, Strom, Internet (meist 10-20%)</p>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="font-semibold text-yellow-800 text-sm">📱 Handy & Internet:</p>
                        <p className="text-yellow-700 text-xs">Geschäftlicher Anteil schätzen (meist 50-80%)</p>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="font-semibold text-yellow-800 text-sm">🍽️ Geschäftsessen:</p>
                        <p className="text-yellow-700 text-xs">50% absetzbar bei Kunden-/Lieferantenterminen</p>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="font-semibold text-yellow-800 text-sm">👔 Arbeitskleidung:</p>
                        <p className="text-yellow-700 text-xs">Nur typische Berufskleidung (Handwerker-Kluft)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Belege & Organisation */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">📁 Belege richtig organisieren</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">📱 Digital sammeln:</h4>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Fotos mit Handy machen</li>
                      <li>• Apps nutzen (Lexoffice, sevdesk)</li>
                      <li>• E-Mails automatisch weiterleiten</li>
                      <li>• Cloud-Speicher für Backups</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">🗂️ Kategorien erstellen:</h4>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Fahrtkosten</li>
                      <li>• Material & Werkzeug</li>
                      <li>• Büro & Verwaltung</li>
                      <li>• Fortbildung</li>
                      <li>• Marketing (Taskilo-Gebühren)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">⏰ Aufbewahrungsfristen:</h4>
                    <ul className="text-gray-700 text-sm space-y-1">
                      <li>• Belege: 10 Jahre</li>
                      <li>• Rechnungen: 10 Jahre</li>
                      <li>• Kontoauszüge: 10 Jahre</li>
                      <li>• Steuererklärungen: 10 Jahre</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Steuererklärung */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">4</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Steuererklärung: Ihr jährlicher Kassensturz</h2>
            </div>
            
            <div className="space-y-8">
              {/* Fristen & Termine */}
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <h3 className="text-xl font-semibold text-red-800 mb-4">📅 Wichtige Fristen:</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">Steuererklärung:</h4>
                    <p className="text-red-700 text-sm">31. Juli (ohne Steuerberater)</p>
                    <p className="text-red-700 text-sm">28./29. Februar (mit Steuerberater)</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">Umsatzsteuer-Voranmeldung:</h4>
                    <p className="text-red-700 text-sm">Bis 10. des Folgemonats</p>
                    <p className="text-red-700 text-sm">(bei Quartalszahlung)</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">Gewerbesteuererklärung:</h4>
                    <p className="text-red-700 text-sm">31. Mai des Folgejahres</p>
                    <p className="text-red-700 text-sm">(ab 24.500€ Gewinn)</p>
                  </div>
                </div>
              </div>

              {/* Welche Formulare */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">📋 Welche Formulare brauchen Sie?</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3">🏢 Gewerbetreibende:</h4>
                    <ul className="text-blue-700 text-sm space-y-2">
                      <li>• <strong>Mantelbogen:</strong> Grunddaten</li>
                      <li>• <strong>Anlage G:</strong> Einkünfte aus Gewerbebetrieb</li>
                      <li>• <strong>EÜR (Anlage EÜR):</strong> Einnahme-Überschuss-Rechnung</li>
                      <li>• <strong>Anlage N:</strong> Falls zusätzlich angestellt</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-3">💼 Freiberufler:</h4>
                    <ul className="text-green-700 text-sm space-y-2">
                      <li>• <strong>Mantelbogen:</strong> Grunddaten</li>
                      <li>• <strong>Anlage S:</strong> Einkünfte aus selbstständiger Arbeit</li>
                      <li>• <strong>EÜR (Anlage EÜR):</strong> Einnahme-Überschuss-Rechnung</li>
                      <li>• <strong>Anlage N:</strong> Falls zusätzlich angestellt</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* EÜR Aufbau */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🧮 Einnahme-Überschuss-Rechnung (EÜR)</h3>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">📈 Einnahmen:</h4>
                      <ul className="text-gray-700 text-sm space-y-1">
                        <li>• Umsätze aus Taskilo (19% USt)</li>
                        <li>• Umsätze aus Taskilo (0% USt - Kleinunternehmer)</li>
                        <li>• Private Aufträge</li>
                        <li>• Sonstige betriebliche Einnahmen</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">📉 Ausgaben:</h4>
                      <ul className="text-gray-700 text-sm space-y-1">
                        <li>• Wareneinkauf und Rohstoffe</li>
                        <li>• Fahrzeugkosten</li>
                        <li>• Werkzeuge und Geräte</li>
                        <li>• Bürokosten</li>
                        <li>• Fortbildungskosten</li>
                        <li>• Werbung und Marketing</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-white p-4 rounded border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Beispiel-Rechnung:</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Betriebseinnahmen:</span>
                        <span className="font-semibold">45.000€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Betriebsausgaben:</span>
                        <span className="font-semibold">-18.000€</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-bold">
                        <span>Gewinn:</span>
                        <span>27.000€</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Darauf zahlen Sie Einkommensteuer (je nach Steuerklasse)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steuerarten im Überblick */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6">💰 Steuerarten für Selbstständige im Überblick</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Percent className="w-6 h-6 mr-2" />
                  Einkommensteuer
                </h3>
                <div className="space-y-2 text-[#e6fffe]">
                  <p className="text-sm"><strong>Wer zahlt:</strong> Alle Selbstständigen</p>
                  <p className="text-sm"><strong>Wie viel:</strong> 14-45% je nach Einkommen</p>
                  <p className="text-sm"><strong>Freibetrag:</strong> 11.604€ (2025)</p>
                  <p className="text-sm"><strong>Zahlung:</strong> Nachzahlung + Vorauszahlung</p>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Gewerbesteuer</h3>
                <div className="space-y-2 text-[#e6fffe]">
                  <p className="text-sm"><strong>Wer zahlt:</strong> Gewerbetreibende (nicht Freiberufler)</p>
                  <p className="text-sm"><strong>Wie viel:</strong> ~14-17% (je nach Gemeinde)</p>
                  <p className="text-sm"><strong>Freibetrag:</strong> 24.500€ Gewinn</p>
                  <p className="text-sm"><strong>Zahlung:</strong> Vierteljährlich</p>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Umsatzsteuer</h3>
                <div className="space-y-2 text-[#e6fffe]">
                  <p className="text-sm"><strong>Wer zahlt:</strong> Regelbesteuerte (nicht Kleinunternehmer)</p>
                  <p className="text-sm"><strong>Wie viel:</strong> 19% auf Netto-Umsatz</p>
                  <p className="text-sm"><strong>Abzüglich:</strong> Vorsteuer aus Einkäufen</p>
                  <p className="text-sm"><strong>Zahlung:</strong> Monatlich/Vierteljährlich</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Software & Tools */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="w-8 h-8 mr-2 text-blue-500" />
              Hilfreiche Software & Tools
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">💻 Buchhaltungssoftware:</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">🏆 Empfohlen für Anfänger:</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• <strong>Lexoffice:</strong> Einfach, alle Funktionen (15-25€/Monat)</li>
                      <li>• <strong>sevdesk:</strong> Sehr nutzerfreundlich (7-47€/Monat)</li>
                      <li>• <strong>WISO Buchhaltung:</strong> Einmalig kaufen (~100€)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">💡 Kostenlose Alternativen:</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Excel/Google Sheets (Vorlagen nutzen)</li>
                      <li>• OpenOffice Calc</li>
                      <li>• GnuCash (Open Source)</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🏛️ Steuererklärung online:</h3>
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2">🎯 Empfohlene Anbieter:</h4>
                    <ul className="text-purple-700 text-sm space-y-1">
                      <li>• <strong>WISO Steuer:</strong> Sehr umfangreich (30-40€)</li>
                      <li>• <strong>SteuerGo:</strong> Einfach für Selbstständige (25-35€)</li>
                      <li>• <strong>Elster:</strong> Kostenlos vom Finanzamt</li>
                    </ul>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-semibold text-orange-800 mb-2">📱 Mobile Apps:</h4>
                    <ul className="text-orange-700 text-sm space-y-1">
                      <li>• Belege fotografieren und kategorisieren</li>
                      <li>• Fahrtenbuch automatisch führen</li>
                      <li>• Ausgaben sofort erfassen</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 bg-[#14ad9f] bg-opacity-10 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-[#14ad9f] mb-4">🔗 Taskilo-Integration</h3>
              <p className="text-gray-700 mb-3">
                Ihr Taskilo-Dashboard bietet bereits wichtige Steuer-Features:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Automatische Rechnungserstellung</li>
                  <li>• Umsatzübersichten nach Monaten</li>
                  <li>• Export für Buchhaltungssoftware</li>
                </ul>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Fahrtkosten-Tracking</li>
                  <li>• Automatische Kategorisierung</li>
                  <li>• Steuerberater-Export-Funktion</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Steuerberater oder selbst machen */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">🤝 Steuerberater oder selbst machen?</h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-xl font-semibold text-green-800 mb-4">💚 Selbst machen, wenn:</h3>
                <ul className="text-green-700 space-y-2">
                  <li>• Einfache Tätigkeitsstruktur</li>
                  <li>• Umsatz unter 50.000€/Jahr</li>
                  <li>• Wenige komplizierte Ausgaben</li>
                  <li>• Zeit für Buchhaltung vorhanden</li>
                  <li>• Interesse an Steuer-Themen</li>
                  <li>• Wunsch nach Kostenersparnis</li>
                </ul>
                
                <div className="mt-4 bg-white p-3 rounded border border-green-100">
                  <p className="text-green-800 text-sm font-semibold">💰 Kosten sparen:</p>
                  <p className="text-green-700 text-sm">Ersparnis: 1.000-3.000€/Jahr</p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">💙 Steuerberater, wenn:</h3>
                <ul className="text-blue-700 space-y-2">
                  <li>• Komplexe Geschäftstätigkeit</li>
                  <li>• Umsatz über 100.000€/Jahr</li>
                  <li>• Angestellte beschäftigt</li>
                  <li>• Immobilien im Betriebsvermögen</li>
                  <li>• Internationale Tätigkeiten</li>
                  <li>• Keine Zeit für Buchhaltung</li>
                </ul>
                
                <div className="mt-4 bg-white p-3 rounded border border-blue-100">
                  <p className="text-blue-800 text-sm font-semibold">💼 Kosten Steuerberater:</p>
                  <p className="text-blue-700 text-sm">~1.500-4.000€/Jahr (je nach Aufwand)</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">⚖️ Kompromiss: Hybridlösung</h4>
              <p className="text-yellow-700 text-sm">
                Buchhaltung selbst machen, Steuererklärung vom Berater prüfen lassen. 
                Kostet ~500-1.000€ und gibt Sicherheit bei Optimierungen.
              </p>
            </div>
          </div>
        </div>

        {/* Häufige Fragen */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">❓ Häufige Steuer-Fragen auf Taskilo</h2>
            
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Kann ich die Taskilo-Gebühren absetzen?</h3>
                <p className="text-gray-700 text-sm">
                  Ja! Taskilo-Servicegebühren sind Betriebsausgaben und voll absetzbar. 
                  Sie finden alle Belege in Ihrem Dashboard unter "Abrechnungen".
                </p>
              </div>
              
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Wie versteuere ich Trinkgelder?</h3>
                <p className="text-gray-700 text-sm">
                  Trinkgelder sind steuerpflichtige Einnahmen und müssen in der EÜR erfasst werden. 
                  Dokumentieren Sie diese sorgfältig (Datum, Betrag, Auftraggeber).
                </p>
              </div>
              
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Kann ich mein Auto komplett absetzen?</h3>
                <p className="text-gray-700 text-sm">
                  Nur den betrieblich genutzten Anteil. Bei 100% betrieblicher Nutzung: Ja. 
                  Bei gemischter Nutzung: Fahrtenbuch führen oder 1%-Regelung anwenden.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Was passiert bei einer Betriebsprüfung?</h3>
                <p className="text-gray-700 text-sm">
                  Das Finanzamt prüft Ihre Unterlagen. Mit ordentlicher Buchhaltung kein Problem. 
                  Wichtig: Alle Belege 10 Jahre aufbewahren und sauber dokumentieren.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ihre Steuer-Compliance als Taskilo-Profi
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Starten Sie steuerlich korrekt durch und konzentrieren Sie sich auf Ihr Geschäft.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/anbieter/steuerberatung" 
              className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#129488] transition-colors"
            >
              Steuerberater finden
            </Link>
            <Link 
              href="/anbieter/buchhaltung" 
              className="border-2 border-[#14ad9f] text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-[#14ad9f] hover:text-white transition-colors"
            >
              Buchhaltung-Setup
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 Taskilo. Alle Rechte vorbehalten. | 
            <Link href="/datenschutz" className="hover:text-[#14ad9f] ml-2">Datenschutz</Link> | 
            <Link href="/agb" className="hover:text-[#14ad9f] ml-2">AGB</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
