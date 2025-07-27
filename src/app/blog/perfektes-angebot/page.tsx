import type { Metadata } from 'next';
import { ArrowLeft, FileText, Star, DollarSign, Users, Lightbulb, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'So schreibst du das perfekte Angebot - Taskilo Leitfaden für Dienstleister',
  description: 'Professionelle Angebote schreiben, die überzeugen: Struktur, Inhalte, Preisgestaltung und Tipps für mehr Aufträge auf Taskilo.',
  keywords: 'Angebot schreiben, Kostenvoranschlag, Dienstleister, Taskilo, Handwerker, Freelancer',
  openGraph: {
    title: 'So schreibst du das perfekte Angebot für mehr Aufträge',
    description: 'Professioneller Leitfaden für überzeugende Angebote auf Taskilo. Mehr Kunden gewinnen durch bessere Angebote.',
    type: 'article',
  },
};

export default function PerfektesAngebotPage() {
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
      <section className="bg-gradient-to-r from-[#14ad9f] to-[#129488] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold">
              So schreibst du das perfekte Angebot
            </h1>
          </div>
          <p className="text-xl text-[#e6fffe] leading-relaxed">
            Gewinne mehr Aufträge mit professionellen Angeboten. Der komplette Leitfaden für 
            überzeugende Kostenvoranschläge, die Kunden zum "Ja" bringen.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Success Statistics */}
        <div className="bg-[#14ad9f] bg-opacity-10 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Erfolgsstatistiken auf Taskilo</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">73%</div>
              <p className="text-gray-700">mehr Aufträge mit strukturierten Angeboten</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">45%</div>
              <p className="text-gray-700">höhere Preise bei detaillierten Angeboten</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">2.3x</div>
              <p className="text-gray-700">schnellere Zusagen bei professionellen Angeboten</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">89%</div>
              <p className="text-gray-700">Kundenzufriedenheit bei transparenten Preisen</p>
            </div>
          </div>
        </div>

        {/* Die 7 Elemente eines perfekten Angebots */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Die 7 Elemente eines perfekten Angebots</h2>
          
          {/* Element 1 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-[#14ad9f] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Professioneller Header & Kontaktdaten</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">✅ Was rein muss:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• Ihr Firmenname oder Name</li>
                  <li>• Vollständige Adresse</li>
                  <li>• Telefonnummer und E-Mail</li>
                  <li>• Website/Taskilo-Profil Link</li>
                  <li>• Gewerbliche Steuernummer (bei Gewerbe)</li>
                  <li>• Erstellungsdatum des Angebots</li>
                  <li>• Gültigkeitsdauer (z.B. 30 Tage)</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">📄 Beispiel Header:</h4>
                <div className="bg-white p-4 rounded border text-sm">
                  <div className="font-bold text-lg mb-2">Meisterbetrieb Müller GmbH</div>
                  <div className="text-gray-600 space-y-1">
                    <p>Musterstraße 123, 12345 Berlin</p>
                    <p>Tel: 030 / 123 456 78</p>
                    <p>E-Mail: info@mueller-handwerk.de</p>
                    <p>www.taskilo.de/profile/mueller-handwerk</p>
                    <div className="border-t pt-2 mt-2">
                      <p>Angebot vom: 15.01.2025</p>
                      <p>Gültig bis: 14.02.2025</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-[#14ad9f] bg-opacity-10 p-4 rounded-lg">
              <h4 className="font-semibold text-[#14ad9f] mb-2">💡 Profi-Tipp:</h4>
              <p className="text-gray-700">
                Ein professioneller Header vermittelt sofort Seriosität. Kunden entscheiden oft schon in den 
                ersten 3 Sekunden, ob ein Angebot vertrauenswürdig wirkt.
              </p>
            </div>
          </div>

          {/* Element 2 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Persönliche Ansprache & Projektverständnis</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">👤 Persönlicher Bezug:</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Kunden mit Namen ansprechen</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Bezug zur ursprünglichen Anfrage</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Verständnis für die Situation zeigen</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Eigene Kompetenz kurz einordnen</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">✍️ Beispiel Einleitung:</h4>
                <div className="bg-white p-4 rounded border text-sm italic">
                  "Sehr geehrte Frau Schmidt,
                  <br/><br/>
                  vielen Dank für Ihre Anfrage zur Badsanierung Ihrer 8m² Wohnung in Berlin-Mitte. 
                  Nach unserem Telefonat gestern verstehe ich, dass Sie eine hochwertige aber 
                  budgetbewusste Lösung für Ihr Bad suchen, die bis Ende März fertig sein soll.
                  <br/><br/>
                  Als Meisterbetrieb mit 15 Jahren Erfahrung in der Badsanierung haben wir bereits 
                  über 200 Bäder in Berliner Altbauwohnungen erfolgreich modernisiert..."
                </div>
              </div>
            </div>
          </div>

          {/* Element 3 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Detaillierte Leistungsbeschreibung</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Struktur der Leistungsbeschreibung:</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">1. Vorbereitung & Material</h5>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Abdeckung & Schutz</li>
                        <li>• Materiallieferung</li>
                        <li>• Werkzeug & Maschinen</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">2. Hauptarbeiten</h5>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Schritt-für-Schritt Beschreibung</li>
                        <li>• Verwendete Techniken</li>
                        <li>• Qualitätsstandards</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-orange-800 mb-2">3. Nacharbeiten</h5>
                      <ul className="text-orange-700 text-sm space-y-1">
                        <li>• Reinigung</li>
                        <li>• Qualitätskontrolle</li>
                        <li>• Endabnahme</li>
                      </ul>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-purple-800 mb-2">4. Service</h5>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Gewährleistung</li>
                        <li>• Nachbetreuung</li>
                        <li>• Notfallkontakt</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Wichtig:</h4>
                <p className="text-yellow-700">
                  Je detaillierter Ihre Leistungsbeschreibung, desto weniger Nachfragen und Missverständnisse. 
                  Das spart Zeit und sorgt für zufriedenere Kunden.
                </p>
              </div>
            </div>
          </div>

          {/* Element 4 - Preisgestaltung */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">4</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Transparente Preisgestaltung</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💰 Preismodelle auf Taskilo:</h4>
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-2">🎯 Festpreis (empfohlen)</h5>
                    <p className="text-green-700 text-sm mb-2">
                      Gesamtpreis für das komplette Projekt. Kunden lieben Planungssicherheit!
                    </p>
                    <p className="text-green-600 text-xs italic">Beispiel: "Badsanierung komplett: 8.500€"</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2">⏱️ Stundensatz</h5>
                    <p className="text-blue-700 text-sm mb-2">
                      Bei unplanbaren Reparaturen oder wenn Umfang unklar ist.
                    </p>
                    <p className="text-blue-600 text-xs italic">Beispiel: "Elektroreparatur: 75€/Std + Material"</p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h5 className="font-semibold text-orange-800 mb-2">📦 Paketpreise</h5>
                    <p className="text-orange-700 text-sm mb-2">
                      Verschiedene Optionen (S/M/L) für unterschiedliche Budgets.
                    </p>
                    <p className="text-orange-600 text-xs italic">Beispiel: "Basic 3.500€ | Premium 5.500€ | Luxus 8.500€"</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📊 Preisaufschlüsselung:</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span>Material</span>
                      <span className="font-semibold">2.500€</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Arbeitszeit (40h à 65€)</span>
                      <span className="font-semibold">2.600€</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Nebenkosten & Anfahrt</span>
                      <span className="font-semibold">300€</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Entsorgung Altmaterial</span>
                      <span className="font-semibold">200€</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t-2">
                      <span>Gesamtpreis</span>
                      <span>5.600€</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Inkl. 19% MwSt. | Zahlbar nach Fertigstellung
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Element 5 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">5</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Zeitplan & Verfügbarkeit</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📅 Zeitplanung strukturieren:</h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-blue-800">Projektstart:</h5>
                    <p className="text-blue-700 text-sm">Frühester Beginn: 15. Februar 2025</p>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-green-800">Projektdauer:</h5>
                    <p className="text-green-700 text-sm">Geschätzte Dauer: 8-10 Arbeitstage</p>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-orange-800">Arbeitszeiten:</h5>
                    <p className="text-orange-700 text-sm">Mo-Fr: 8:00-17:00 Uhr | Sa: nach Absprache</p>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h5 className="font-semibold text-purple-800">Fertigstellung:</h5>
                    <p className="text-purple-700 text-sm">Geplant bis: 28. Februar 2025</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">⚡ Verfügbarkeit kommunizieren:</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Konkrete Starttermine anbieten</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Realistische Projektdauer angeben</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Pufferzeiten für Unvorhergesehenes einplanen</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>Alternative Termine als Backup anbieten</span>
                  </div>
                </div>
                
                <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 text-sm">
                    <strong>Tipp:</strong> Kunden schätzen Flexibilität! Bieten Sie 2-3 Terminoptionen an.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Element 6 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">6</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Referenzen & Qualifikationen</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">🏆 Vertrauen schaffen:</h4>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-2">✨ Taskilo-Bewertungen</h5>
                    <p className="text-blue-700 text-sm">
                      "⭐⭐⭐⭐⭐ 4.9/5 Sterne bei 127 Bewertungen auf Taskilo"
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-green-800 mb-2">🎓 Qualifikationen</h5>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Meisterbrief Installateur-/Heizungsbau</li>
                      <li>• 15 Jahre Berufserfahrung</li>
                      <li>• Zertifiziert für KfW-Sanierungen</li>
                    </ul>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-orange-800 mb-2">🛡️ Sicherheit</h5>
                    <ul className="text-orange-700 text-sm space-y-1">
                      <li>• Vollversichert (Haftpflicht + Betriebs)</li>
                      <li>• 5 Jahre Gewährleistung</li>
                      <li>• Taskilo-Qualitätsgarantie</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">💬 Kundenstimmen:</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#14ad9f]">
                    <p className="text-gray-700 text-sm italic mb-2">
                      "Herr Müller hat unser Bad in 8 Tagen komplett saniert. 
                      Pünktlich, sauber und perfekte Qualität!"
                    </p>
                    <p className="text-gray-600 text-xs">- Familie Weber, Berlin (Januar 2025)</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#14ad9f]">
                    <p className="text-gray-700 text-sm italic mb-2">
                      "Faire Preise, transparente Kommunikation. 
                      Würden wir sofort wieder beauftragen."
                    </p>
                    <p className="text-gray-600 text-xs">- Herr Schmidt, Berlin (Dezember 2024)</p>
                  </div>
                </div>
                
                <div className="mt-4 bg-[#14ad9f] bg-opacity-10 p-3 rounded-lg">
                  <p className="text-gray-700 text-sm">
                    Alle Referenzen sind über Ihr Taskilo-Profil einsehbar und verifiziert.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Element 7 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">7</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Call-to-Action & nächste Schritte</h3>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📞 Klare Handlungsaufforderung:</h4>
                <div className="space-y-3">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-2">✅ Auftrag bestätigen</h5>
                    <p className="text-green-700 text-sm">
                      "Klicken Sie auf 'Beauftragen' in Taskilo oder rufen Sie mich an unter 030 / 123 456 78"
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2">📞 Rückfragen klären</h5>
                    <p className="text-blue-700 text-sm">
                      "Haben Sie Fragen? Ich bin täglich von 8-18 Uhr erreichbar."
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h5 className="font-semibold text-orange-800 mb-2">🏠 Vor-Ort-Termin</h5>
                    <p className="text-orange-700 text-sm">
                      "Gerne vereinbaren wir einen kostenlosen Vor-Ort-Termin zur finalen Abstimmung."
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Beispiel Abschluss:</h4>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="text-sm">
                    <p className="font-semibold mb-2">Ihr nächster Schritt:</p>
                    <p className="mb-3">
                      Bei Beauftragung bis zum 20. Januar erhalten Sie 5% Frühbucherrabatt!
                    </p>
                    
                    <div className="space-y-2 text-xs text-gray-600">
                      <p>📞 Telefon: 030 / 123 456 78 (täglich 8-18 Uhr)</p>
                      <p>📧 E-Mail: info@mueller-handwerk.de</p>
                      <p>💬 Taskilo-Chat: Antwort binnen 2 Stunden</p>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs italic">
                        Freue mich auf Ihre Rückmeldung und darauf, 
                        Ihr Badezimmer in ein Wellness-Paradies zu verwandeln!
                      </p>
                      <p className="text-xs font-semibold mt-2">
                        Mit freundlichen Grüßen,<br/>
                        Thomas Müller
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Häufige Fehler */}
        <div className="mb-12">
          <div className="bg-red-50 rounded-xl p-8 border border-red-200">
            <h2 className="text-3xl font-bold text-red-800 mb-6">❌ Die 5 häufigsten Angebots-Fehler</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <h3 className="font-semibold text-red-800 mb-2">1. Zu vage Beschreibungen</h3>
                  <p className="text-red-700 text-sm">
                    ❌ "Renovierung nach Absprache"<br/>
                    ✅ "Entfernung Altfliesen, Spachteln, Grundierung, Neuverfliesen 15m²"
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <h3 className="font-semibold text-red-800 mb-2">2. Keine Preistransparenz</h3>
                  <p className="text-red-700 text-sm">
                    ❌ "Preis nach Aufwand"<br/>
                    ✅ "Material: 2.000€ + Arbeitszeit: 40h à 65€ = 4.600€ gesamt"
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <h3 className="font-semibold text-red-800 mb-2">3. Fehlende Zeitangaben</h3>
                  <p className="text-red-700 text-sm">
                    ❌ "Dauert nicht lange"<br/>
                    ✅ "Projektdauer: 8-10 Arbeitstage, Start: ab 15. Februar"
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <h3 className="font-semibold text-red-800 mb-2">4. Keine Vertrauenssignale</h3>
                  <p className="text-red-700 text-sm">
                    ❌ Nur Preis ohne Referenzen<br/>
                    ✅ "4.9★ bei 127 Bewertungen + Meisterbrief + Vollversicherung"
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <h3 className="font-semibold text-red-800 mb-2">5. Schwacher Abschluss</h3>
                  <p className="text-red-700 text-sm">
                    ❌ "Melden Sie sich bei Interesse"<br/>
                    ✅ "Beauftragen Sie bis 20.01. und sparen 5%! Rufen Sie an: 030/12345"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vorlagen */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="w-8 h-8 mr-2 text-[#14ad9f]" />
              Angebots-Vorlagen für verschiedene Branchen
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3">🔧 Handwerk</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Detaillierte Materialauflistung</li>
                  <li>• Arbeitsschritte chronologisch</li>
                  <li>• Gewährleistungsangaben</li>
                  <li>• Entsorgungskosten separat</li>
                  <li>• Vor-Ort-Besichtigung anbieten</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3">💻 IT & Digital</h3>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• Technische Spezifikationen</li>
                  <li>• Projektphasen mit Meilensteinen</li>
                  <li>• Hosting & Wartungskosten</li>
                  <li>• Schulungen einkalkulieren</li>
                  <li>• Demo/Prototyp anbieten</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-3">🏠 Service</h3>
                <ul className="text-orange-700 text-sm space-y-1">
                  <li>• Serviceumfang klar definieren</li>
                  <li>• Regelmäßigkeit (einmalig/wiederkehrend)</li>
                  <li>• Anfahrtskosten transparent</li>
                  <li>• Ersatztermine bei Ausfall</li>
                  <li>• Notfallkontakt angeben</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Erfolg messen */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6">📊 Ihren Angebots-Erfolg messen</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">🎯 Wichtige Kennzahlen:</h3>
                <div className="space-y-3 text-[#e6fffe]">
                  <div className="flex justify-between">
                    <span>Antwortrate:</span>
                    <span className="font-semibold">60-80% (gut)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Abschlussquote:</span>
                    <span className="font-semibold">25-40% (gut)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Antwortzeit:</span>
                    <span className="font-semibold">&lt; 24h (optimal)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nachfragen:</span>
                    <span className="font-semibold">&lt; 3 pro Angebot</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">📈 Optimierungstipps:</h3>
                <div className="space-y-2 text-[#e6fffe]">
                  <p>• A/B-Test verschiedene Preisdarstellungen</p>
                  <p>• Kundenfeedback zu Angeboten einholen</p>
                  <p>• Erfolgreiche Angebote als Vorlage nutzen</p>
                  <p>• Regelmäßig Konkurrenz analysieren</p>
                  <p>• Taskilo-Analytics für Insights nutzen</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Starten Sie mit professionellen Angeboten durch!
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Nutzen Sie diese Anleitung für Ihre nächsten Angebote und gewinnen Sie mehr Aufträge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/anbieter/dashboard" 
              className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#129488] transition-colors"
            >
              Angebot erstellen
            </Link>
            <Link 
              href="/anbieter/tipps" 
              className="border-2 border-[#14ad9f] text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-[#14ad9f] hover:text-white transition-colors"
            >
              Weitere Tipps
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
