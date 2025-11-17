import type { Metadata } from 'next';
import { FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { HeroHeader } from '@/components/hero8-header';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

export const metadata: Metadata = {
  title: 'So schreibst du das perfekte Angebot - Taskilo Leitfaden für Dienstleister',
  description:
    'Professionelle Angebote schreiben, die überzeugen: Struktur, Inhalte, Preisgestaltung und Tipps für mehr Aufträge auf Taskilo.',
  keywords: 'Angebot schreiben, Kostenvoranschlag, Dienstleister, Taskilo, Handwerker, Freelancer',
  openGraph: {
    title: 'So schreibst du das perfekte Angebot für mehr Aufträge',
    description:
      'Professioneller Leitfaden für überzeugende Angebote auf Taskilo. Mehr Kunden gewinnen durch bessere Angebote.',
    type: 'article',
  },
};

const tableOfContents = [
  { id: 'erfolgsstatistiken', title: '1. Erfolgsstatistiken' },
  { id: 'elemente-angebot', title: '2. Die 7 Elemente eines perfekten Angebots' },
  { id: 'haeufige-fehler', title: '3. Häufige Fehler' },
  { id: 'branchen-vorlagen', title: '4. Vorlagen nach Branchen' },
  { id: 'erfolg-messen', title: '5. Erfolg messen' },
];

export default function PerfektesAngebotPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-linear-to-br from-black/10 to-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/"
                  className="text-white/90 hover:text-white transition-colors"
                >
                  Startseite
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/70" />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/blog"
                  className="text-white/90 hover:text-white transition-colors"
                >
                  Blog
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/70" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white font-semibold">
                  Perfektes Angebot
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 rounded-lg overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=2070&q=80"
                alt="Angebot erstellen und erfolgreich Aufträge gewinnen"
                className="w-full h-64 object-cover"
              />
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                  So schreibst du das perfekte Angebot
                </h1>
                <p className="text-xl text-white/95 leading-relaxed drop-shadow-md mt-2">
                  Gewinne mehr Aufträge mit professionellen, transparenten und überzeugenden
                  Angeboten.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-8 relative">
            <div className="flex-1 max-w-4xl">
              <section
                id="erfolgsstatistiken"
                className="scroll-mt-24 bg-white/95 backdrop-blur-sm rounded-xl p-8 mb-8 shadow-xl border border-white/20"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Erfolgsstatistiken auf Taskilo
                </h2>
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
                    <p className="text-gray-700">
                      schnellere Zusagen bei professionellen Angeboten
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#14ad9f] mb-2">89%</div>
                    <p className="text-gray-700">Kundenzufriedenheit bei transparenten Preisen</p>
                  </div>
                </div>
              </section>

              <section
                id="elemente-angebot"
                className="scroll-mt-24 bg-white/95 backdrop-blur-sm rounded-xl p-8 mb-8 shadow-xl border border-white/20"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Die 7 Elemente eines perfekten Angebots
                </h2>

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-[#14ad9f] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">1</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Professioneller Header & Kontaktdaten
                    </h3>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Was rein muss:</h4>
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
                      <h4 className="font-semibold text-gray-900 mb-3">Beispiel Header:</h4>
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
                    <h4 className="font-semibold text-[#14ad9f] mb-2">Profi-Tipp:</h4>
                    <p className="text-gray-700">
                      Ein professioneller Header vermittelt sofort Seriosität. Kunden entscheiden
                      oft schon in den ersten 3 Sekunden, ob ein Angebot vertrauenswürdig wirkt.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">2</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Persönliche Ansprache & Projektverständnis
                    </h3>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Persönlicher Bezug:
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Kunden mit Namen ansprechen</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Bezug zur ursprünglichen Anfrage</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Verständnis für die Situation zeigen</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Eigene Kompetenz kurz einordnen</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Beispiel Einleitung:</h4>
                      <div className="bg-white p-4 rounded border text-sm italic">
                        &quot;Sehr geehrte Frau Schmidt,
                        <br />
                        <br />
                        vielen Dank für Ihre Anfrage zur Badsanierung Ihrer 8m² Wohnung in
                        Berlin-Mitte. Nach unserem Telefonat gestern verstehe ich, dass Sie eine
                        hochwertige aber budgetbewusste Lösung für Ihr Bad suchen, die bis Ende März
                        fertig sein soll.
                        <br />
                        <br />
                        Als Meisterbetrieb mit 15 Jahren Erfahrung in der Badsanierung haben wir
                        bereits über 200 Bäder in Berliner Altbauwohnungen erfolgreich
                        modernisiert...&quot;
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">3</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Detaillierte Leistungsbeschreibung
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Struktur der Leistungsbeschreibung:
                      </h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-blue-800 mb-2">
                              1. Vorbereitung & Material
                            </h5>
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
                      <h4 className="font-semibold text-yellow-800 mb-2">Wichtig:</h4>
                      <p className="text-yellow-700">
                        Je detaillierter Ihre Leistungsbeschreibung, desto weniger Nachfragen und
                        Missverständnisse. Das spart Zeit und sorgt für zufriedenere Kunden.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">4</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Transparente Preisgestaltung
                    </h3>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Preismodelle auf Taskilo:
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-2">
                            Festpreis (empfohlen)
                          </h5>
                          <p className="text-green-700 text-sm mb-2">
                            Gesamtpreis für das komplette Projekt. Kunden lieben Planungssicherheit!
                          </p>
                          <p className="text-green-600 text-xs italic">
                            Beispiel: &quot;Badsanierung komplett: 8.500€&quot;
                          </p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h5 className="font-semibold text-blue-800 mb-2">Stundensatz</h5>
                          <p className="text-blue-700 text-sm mb-2">
                            Bei unplanbaren Reparaturen oder wenn Umfang unklar ist.
                          </p>
                          <p className="text-blue-600 text-xs italic">
                            Beispiel: &quot;Elektroreparatur: 75€/Std + Material&quot;
                          </p>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <h5 className="font-semibold text-orange-800 mb-2">Paketpreise</h5>
                          <p className="text-orange-700 text-sm mb-2">
                            Verschiedene Optionen (S/M/L) für unterschiedliche Budgets.
                          </p>
                          <p className="text-orange-600 text-xs italic">
                            Beispiel: &quot;Basic 3.500€ | Premium 5.500€ | Luxus 8.500€&quot;
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Preisaufschlüsselung:
                      </h4>
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

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">5</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Zeitplan & Verfügbarkeit</h3>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Zeitplanung strukturieren:
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h5 className="font-semibold text-blue-800">Projektstart:</h5>
                          <p className="text-blue-700 text-sm">
                            Frühester Beginn: 15. Februar 2025
                          </p>
                        </div>

                        <div className="bg-green-50 p-3 rounded-lg">
                          <h5 className="font-semibold text-green-800">Projektdauer:</h5>
                          <p className="text-green-700 text-sm">
                            Geschätzte Dauer: 8-10 Arbeitstage
                          </p>
                        </div>

                        <div className="bg-orange-50 p-3 rounded-lg">
                          <h5 className="font-semibold text-orange-800">Arbeitszeiten:</h5>
                          <p className="text-orange-700 text-sm">
                            Mo-Fr: 8:00-17:00 Uhr | Sa: nach Absprache
                          </p>
                        </div>

                        <div className="bg-purple-50 p-3 rounded-lg">
                          <h5 className="font-semibold text-purple-800">Fertigstellung:</h5>
                          <p className="text-purple-700 text-sm">Geplant bis: 28. Februar 2025</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Verfügbarkeit kommunizieren:
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Konkrete Starttermine anbieten</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Realistische Projektdauer angeben</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Pufferzeiten für Unvorhergesehenes einplanen</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                          <span>Alternative Termine als Backup anbieten</span>
                        </div>
                      </div>

                      <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-yellow-800 text-sm">
                          <strong>Tipp:</strong> Kunden schätzen Flexibilität! Bieten Sie 2-3
                          Terminoptionen an.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section
                id="haeufige-fehler"
                className="scroll-mt-24 bg-white/95 backdrop-blur-sm rounded-xl p-8 mb-8 shadow-xl border border-white/20"
              >
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h2 className="text-3xl font-bold text-red-800 mb-6">
                    Die 5 häufigsten Angebots-Fehler
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-red-100">
                        <h3 className="font-semibold text-red-800 mb-2">
                          1. Zu vage Beschreibungen
                        </h3>
                        <p className="text-red-700 text-sm">
                          ❌ &quot;Renovierung nach Absprache&quot;
                          <br />✅ &quot;Entfernung Altfliesen, Spachteln, Grundierung,
                          Neuverfliesen 15m²&quot;
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-red-100">
                        <h3 className="font-semibold text-red-800 mb-2">
                          2. Keine Preistransparenz
                        </h3>
                        <p className="text-red-700 text-sm">
                          ❌ &quot;Preis nach Aufwand&quot;
                          <br />✅ &quot;Material: 2.000€ + Arbeitszeit: 40h à 65€ = 4.600€
                          gesamt&quot;
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-red-100">
                        <h3 className="font-semibold text-red-800 mb-2">3. Fehlende Zeitangaben</h3>
                        <p className="text-red-700 text-sm">
                          ❌ &quot;Dauert nicht lange&quot;
                          <br />✅ &quot;Projektdauer: 8-10 Arbeitstage, Start: ab 15. Februar&quot;
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-red-100">
                        <h3 className="font-semibold text-red-800 mb-2">
                          4. Keine Vertrauenssignale
                        </h3>
                        <p className="text-red-700 text-sm">
                          ❌ Nur Preis ohne Referenzen
                          <br />✅ &quot;4.9★ bei 127 Bewertungen + Meisterbrief +
                          Vollversicherung&quot;
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-red-100">
                        <h3 className="font-semibold text-red-800 mb-2">5. Schwacher Abschluss</h3>
                        <p className="text-red-700 text-sm">
                          ❌ &quot;Melden Sie sich bei Interesse&quot;
                          <br />✅ &quot;Beauftragen Sie bis 20.01. und sparen 5%! Rufen Sie an:
                          030/12345&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section
                id="branchen-vorlagen"
                className="scroll-mt-24 bg-white/95 backdrop-blur-sm rounded-xl p-8 mb-8 shadow-xl border border-white/20"
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileText className="w-8 h-8 mr-2 text-[#14ad9f]" />
                  Angebots-Vorlagen für verschiedene Branchen
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3">Handwerk</h3>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Detaillierte Materialauflistung</li>
                      <li>• Arbeitsschritte chronologisch</li>
                      <li>• Gewährleistungsangaben</li>
                      <li>• Entsorgungskosten separat</li>
                      <li>• Vor-Ort-Besichtigung anbieten</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3">IT & Digital</h3>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Technische Spezifikationen</li>
                      <li>• Projektphasen mit Meilensteinen</li>
                      <li>• Hosting & Wartungskosten</li>
                      <li>• Schulungen einkalkulieren</li>
                      <li>• Demo/Prototyp anbieten</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                    <h3 className="font-semibold text-orange-800 mb-3">Service</h3>
                    <ul className="text-orange-700 text-sm space-y-1">
                      <li>• Serviceumfang klar definieren</li>
                      <li>• Regelmäßigkeit (einmalig/wiederkehrend)</li>
                      <li>• Anfahrtskosten transparent</li>
                      <li>• Ersatztermine bei Ausfall</li>
                      <li>• Notfallkontakt angeben</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section
                id="erfolg-messen"
                className="scroll-mt-24 bg-linear-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white mb-8"
              >
                <h2 className="text-3xl font-bold mb-6">Ihren Angebots-Erfolg messen</h2>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Wichtige Kennzahlen:</h3>
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
                    <h3 className="text-xl font-semibold mb-4">Optimierungstipps:</h3>
                    <div className="space-y-2 text-[#e6fffe]">
                      <p>• A/B-Test verschiedene Preisdarstellungen</p>
                      <p>• Kundenfeedback zu Angeboten einholen</p>
                      <p>• Erfolgreiche Angebote als Vorlage nutzen</p>
                      <p>• Regelmäßig Konkurrenz analysieren</p>
                      <p>• Taskilo-Analytics für Insights nutzen</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Starten Sie mit professionellen Angeboten durch!
                </h2>
                <p className="text-xl text-gray-600 mb-6">
                  Nutzen Sie diese Anleitung für Ihre nächsten Angebote und gewinnen Sie mehr
                  Aufträge.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/anbieter/dashboard"
                    className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-taskilo-hover transition-colors"
                  >
                    Angebot erstellen
                  </Link>
                  <Link
                    href="/blog/rechnungsstellung-tipps"
                    className="border-2 border-[#14ad9f] text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-[#14ad9f] hover:text-white transition-colors"
                  >
                    Rechnungsstellung-Tipps lesen
                  </Link>
                </div>
              </div>
            </div>

            <aside className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Inhalt</h3>
                  <nav className="space-y-2">
                    {tableOfContents.map(item => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block text-sm text-gray-700 hover:text-[#14ad9f] transition-colors"
                      >
                        {item.title}
                      </a>
                    ))}
                  </nav>
                </div>

                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-white/20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Verwandte Artikel</h3>
                  <ul className="space-y-3 text-sm">
                    <li>
                      <Link
                        href="/blog/e-rechnung-leitfaden"
                        className="text-[#14ad9f] hover:text-taskilo-hover"
                      >
                        E-Rechnung 2025: Der komplette Leitfaden
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/blog/rechnungsstellung-tipps"
                        className="text-[#14ad9f] hover:text-taskilo-hover"
                      >
                        Rechnungsstellung: 15 Profi-Tipps
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/blog/digitalisierung-kleinunternehmen"
                        className="text-[#14ad9f] hover:text-taskilo-hover"
                      >
                        Digitalisierung für Kleinunternehmen
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/blog/zahlungsablaeufe"
                        className="text-[#14ad9f] hover:text-taskilo-hover"
                      >
                        Zahlungsabläufe auf Taskilo
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
