import type { Metadata } from 'next';
import {
  FileText,
  Calendar,
  Euro,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  User,
} from 'lucide-react';
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
  title: 'Rechnungsstellung Tipps: Praxisleitfaden für Freelancer & KMU - Taskilo',
  description:
    'Praktische Tipps zur korrekten, rechtssicheren und SEO-freundlichen Rechnungsstellung: Pflichtangaben, Vorlagen, Fehler vermeiden und digitale Prozesse.',
  keywords:
    'Rechnung, Rechnungsstellung, Rechnung schreiben, Pflichtangaben, Rechnungstipps, Freelancer Rechnung, Rechnung Vorlage, elektronische Rechnungen, Taskilo',
  openGraph: {
    title: 'Rechnungsstellung Tipps: Praxisleitfaden für Freelancer & KMU',
    description:
      'Konkrete Checkliste und Best Practices für rechtssichere Rechnungen, Fehlervermeidung und Automatisierung.',
    type: 'article',
  },
};

const tableOfContents = [
  { id: 'einleitung', title: '1. Warum korrekte Rechnungsstellung wichtig ist' },
  { id: 'pflichtangaben', title: '2. Pflichtangaben auf jeder Rechnung' },
  { id: 'fehler-vermeiden', title: '3. Häufige Fehler & wie man sie vermeidet' },
  { id: 'prozesse-automatisieren', title: '4. Prozesse digitalisieren & automatisieren' },
  { id: 'vorlage-checklist', title: '5. Rechnung-Checkliste (zum Kopieren)' },
  { id: 'tools', title: '6. Nützliche Tools & Vorlagen' },
  { id: 'taskilo-features', title: '7. Rechnungen mit Taskilo' },
  { id: 'faq', title: '8. FAQ' },
];

export default function RechnungsstellungTippsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/20 pointer-events-none"></div>
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
                  Rechnungsstellung Tipps
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 rounded-lg overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=2070&q=80"
                alt="Rechnungsstellung: Freelancer erstellt Rechnung am Laptop"
                className="w-full h-64 object-cover"
              />
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                  Rechnungsstellung: Praktische Tipps & Checkliste
                </h1>
                <p className="text-xl text-white/95 leading-relaxed drop-shadow-md mt-2">
                  Rechtssichere Rechnungen schreiben, Fehler vermeiden und Prozesse digital
                  optimieren.
                </p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-[#14ad9f] mb-4">
                Quick Facts zur Rechnungsstellung
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Fälligkeit:</strong> Vereinbarte Zahlungsziele einhalten
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Euro className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Umsatzsteuer:</strong> Netto/Brutto korrekt ausweisen
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Branche:</strong> Spezielle Regeln für B2B & B2C
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Archiv:</strong> Aufbewahrungspflicht meist 10 Jahre
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Digital:</strong> Elektronische Rechnungen sind erlaubt
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Prüfung:</strong> Vorlagen & Pflichtangaben prüfen
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-8 relative">
            <div className="flex-1 max-w-4xl">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 shadow-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-lg font-bold text-amber-800 mb-2">Wichtiger Hinweis</h2>
                    <p className="text-amber-700">
                      Diese Tipps sind allgemeiner Natur und ersetzen keine steuerliche oder
                      rechtliche Beratung. Bei Unsicherheiten den Steuerberater kontaktieren.
                    </p>
                  </div>
                </div>
              </div>

              <section
                id="einleitung"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  Warum korrekte Rechnungsstellung wichtig ist
                </h2>

                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=2015&q=80"
                    alt="Person prüft Rechnungen und Belege am Schreibtisch"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <p className="text-gray-700 leading-relaxed mb-4">
                  Rechnungen sind juristische Dokumente: Sie begründen Zahlungsansprüche,
                  dokumentieren Umsätze für das Finanzamt und sind Nachweis bei Reklamationen.
                  Fehler führen zu Zahlungsverzögerungen, Problemen bei der Umsatzsteuer oder zu
                  unnötiger Nacharbeit.
                </p>

                <p className="text-gray-700 leading-relaxed mb-4">
                  Gute Rechnungsprozesse sparen Zeit, erhöhen die Zahlungsmoral Ihrer Kunden und
                  reduzieren Risiken bei Betriebsprüfungen. Die folgenden Abschnitte zeigen konkrete
                  Pflichtangaben, nützliche Workflows und eine praktische Checkliste.
                </p>

                <p className="text-gray-700 leading-relaxed">
                  Für{' '}
                  <Link
                    href="/blog/digitalisierung-kleinunternehmen"
                    className="text-[#14ad9f] hover:underline"
                  >
                    kleinere Unternehmen
                  </Link>{' '}
                  ist es besonders wichtig, von Anfang an strukturiert zu arbeiten. Lesen Sie auch
                  unseren Guide zum{' '}
                  <Link href="/blog/perfektes-angebot" className="text-[#14ad9f] hover:underline">
                    perfekten Angebot erstellen
                  </Link>
                  .
                </p>
              </section>

              <section
                id="pflichtangaben"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  Pflichtangaben auf jeder Rechnung
                </h2>

                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=2070&q=80"
                    alt="Checkliste und Dokumente für rechtssichere Rechnungsstellung"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <ul className="list-inside list-disc text-gray-700 space-y-2 mb-6">
                  <li>Vollständiger Name und Anschrift des leistenden Unternehmens</li>
                  <li>Steuernummer oder Umsatzsteuer-Identifikationsnummer</li>
                  <li>Rechnungsdatum und fortlaufende Rechnungsnummer</li>
                  <li>Leistungszeitraum bzw. Datum der Lieferung/Leistung</li>
                  <li>Art und Umfang der Leistung/Produkte mit Einzelpreisen</li>
                  <li>Netto-, Steuerbetrag (spezifische MwSt-Sätze) und Bruttobetrag</li>
                  <li>Zahlungsbedingungen und Bankverbindung</li>
                  <li>Hinweis bei Steuerbefreiung oder Reverse-Charge, falls zutreffend</li>
                </ul>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Tipp:</strong> Eine klare, gut strukturierte Rechnung erhöht die Chance
                    auf pünktliche Zahlung. Verwenden Sie eindeutige Positionsbeschreibungen und
                    vermeiden Sie Abkürzungen, die der Empfänger nicht verstehen könnte.
                  </p>
                </div>

                <p className="text-gray-700">
                  Beachten Sie auch unsere Hinweise zur{' '}
                  <Link
                    href="/blog/e-rechnung-leitfaden"
                    className="text-[#14ad9f] hover:underline"
                  >
                    E-Rechnung-Pflicht ab 2025
                  </Link>
                  , die zusätzliche Anforderungen mit sich bringt.
                </p>
              </section>

              <section
                id="fehler-vermeiden"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  Häufige Fehler & wie man sie vermeidet
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-3">Häufige Fehler:</h3>
                    <ol className="list-decimal list-inside text-red-700 space-y-2 text-sm">
                      <li>Fehlende oder falsche Rechnungsnummer</li>
                      <li>Unklare Leistungsbeschreibung</li>
                      <li>Falsche Steuerbehandlung</li>
                      <li>Keine Zahlungsbedingungen</li>
                      <li>Fehlende Bankverbindung</li>
                    </ol>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Lösungen:</h3>
                    <ol className="list-decimal list-inside text-green-700 space-y-2 text-sm">
                      <li>Automatisches Nummernsystem verwenden</li>
                      <li>Präzise und nachvollziehbare Beschreibungen</li>
                      <li>Reverse-Charge & Kleinunternehmerregelung prüfen</li>
                      <li>Klare Zahlungsziele und Mahnprozesse</li>
                      <li>Vollständige Kontaktdaten angeben</li>
                    </ol>
                  </div>
                </div>

                <p className="text-gray-700">
                  Weitere Informationen zu{' '}
                  <Link href="/blog/steuer-grundlagen" className="text-[#14ad9f] hover:underline">
                    steuerlichen Grundlagen
                  </Link>
                  finden Sie in unserem entsprechenden Guide.
                </p>
              </section>

              <section
                id="prozesse-automatisieren"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  Prozesse digitalisieren & automatisieren
                </h2>

                <p className="text-gray-700 leading-relaxed mb-6">
                  Digitalisierung reduziert Fehler und spart Zeit. Automatisierte Rechnungsstellung
                  aus Zeiterfassung, Projektmanagement-Tools oder Buchhaltungssystemen hilft,
                  manuelle Eingaben zu vermeiden.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <img
                      src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80"
                      alt="Digitale Buchhaltung und Automatisierung von Rechnungen"
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                    <h3 className="font-semibold text-gray-900 mb-2">Automatisierung:</h3>
                    <ul className="text-gray-700 list-inside list-disc text-sm space-y-1">
                      <li>Automatische Rechnungsnummern</li>
                      <li>Vorlagen mit Pflichtfeldern</li>
                      <li>Integration mit Payment-Anbietern</li>
                    </ul>
                  </div>
                  <div>
                    <img
                      src="https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=1600&q=80"
                      alt="Team verwendet Rechnungs- und Buchhaltungssoftware"
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                    <h3 className="font-semibold text-gray-900 mb-2">Wiederkehrende Rechnungen:</h3>
                    <p className="text-gray-700 text-sm">
                      Für wiederkehrende Leistungen bieten sich Abo-Rechnungen oder wiederkehrende
                      Buchungen an. Prüfen Sie Exportformate (CSV, DATEV, ZUGFeRD) für den
                      Steuerberater.
                    </p>
                  </div>
                </div>

                <div className="bg-[#14ad9f]/10 border border-[#14ad9f]/20 rounded-lg p-4">
                  <p className="text-gray-800 text-sm">
                    <strong>Taskilo-Tipp:</strong> Mit unserem integrierten Rechnungssystem können
                    Sie direkt aus Projekten heraus Rechnungen erstellen und dabei Zeiterfassung
                    sowie{' '}
                    <Link href="/blog/zahlungsablaeufe" className="text-[#14ad9f] hover:underline">
                      optimierte Zahlungsabläufe
                    </Link>{' '}
                    nutzen.
                  </p>
                </div>
              </section>

              <section
                id="vorlage-checklist"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">5</span>
                  </div>
                  Rechnung-Checkliste (zum Kopieren)
                </h2>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Muster-Rechnung:</h3>
                  <pre className="whitespace-pre-wrap text-gray-700 text-sm">
                    {`RECHNUNG

Rechnungsnummer: 2025-001
Rechnungsdatum: 01.01.2025
Leistungszeitraum: 01.01.2025 - 01.01.2025

Rechnungsempfänger:
[Firmenname]
[Straße Hausnummer]
[PLZ Ort]

Leistungsbeschreibung:
Webdesign - 10 Stunden à 60,00 €     600,00 €

Nettobetrag:                          600,00 €
Umsatzsteuer 19%:                     114,00 €
GESAMTBETRAG:                         714,00 €

Zahlungsziel: 14 Tage ohne Abzug
Bankverbindung: DE00 0000 0000 0000 0000 00

Bei Kleinunternehmern:
&quot;Kleinunternehmer nach §19 UStG - keine Ausweisung der Umsatzsteuer&quot;`}
                  </pre>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Checkliste vor Versand:</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>✓ Alle Pflichtangaben vorhanden</li>
                    <li>✓ Rechnungsnummer fortlaufend</li>
                    <li>✓ Leistung eindeutig beschrieben</li>
                    <li>✓ Beträge korrekt berechnet</li>
                    <li>✓ Zahlungsziel angegeben</li>
                    <li>✓ Bankdaten vollständig</li>
                  </ul>
                </div>
              </section>

              <section
                id="tools"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">6</span>
                  </div>
                  Nützliche Tools & Vorlagen
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">
                      Empfohlene Features:
                    </h3>
                    <ul className="text-green-700 space-y-2 text-sm">
                      <li>• Automatische Rechnungsnummerierung</li>
                      <li>• Wiederkehrende Rechnungen</li>
                      <li>• Mahnwesen-Integration</li>
                      <li>• Export für Steuerberater (DATEV, CSV)</li>
                      <li>• Online-Payment Integration</li>
                      <li>• GoBD-konforme Archivierung</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">
                      Zusätzliche Funktionen:
                    </h3>
                    <ul className="text-blue-700 space-y-2 text-sm">
                      <li>• Zeiterfassung für Stundenabrechnungen</li>
                      <li>• Projektmanagement-Integration</li>
                      <li>• Kunde-Lieferant-Portal</li>
                      <li>• Mobile Apps für unterwegs</li>
                      <li>• Dashboard und Reporting</li>
                      <li>• E-Rechnung Standards (XRechnung, ZUGFeRD)</li>
                    </ul>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">
                  Bei der Auswahl sollten Sie auf{' '}
                  <Link href="/blog/kundenkommunikation" className="text-[#14ad9f] hover:underline">
                    professionelle Kundenkommunikation
                  </Link>
                  und nahtlose Integration in Ihre Arbeitsabläufe achten.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Hinweis:</strong> Kostenlose Tools haben oft Beschränkungen bei
                    Rechnungsanzahl oder Funktionsumfang. Prüfen Sie auch die Exportmöglichkeiten
                    für Ihren Steuerberater.
                  </p>
                </div>
              </section>

              <section
                id="taskilo-features"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">7</span>
                  </div>
                  Rechnungen mit Taskilo
                </h2>

                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=2070&q=80"
                    alt="Moderne Arbeitsplätze und digitale Lösungen für Rechnungsstellung"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="bg-[#14ad9f] text-white rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-bold mb-3">Taskilo: Ihre All-in-One Lösung</h3>
                  <p className="mb-4">
                    Mit Taskilo erstellen Sie professionelle Rechnungen direkt aus Ihren Projekten
                    heraus - mit integrierter Zeiterfassung, automatischer Berechnung und
                    E-Rechnung-Kompatibilität.
                  </p>
                  <Link
                    href="/dashboard/company"
                    className="inline-flex items-center bg-white text-[#14ad9f] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Jetzt Rechnungen erstellen
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Taskilo Vorteile:</h3>
                    <ul className="space-y-2 text-green-700 text-sm">
                      <li>✓ Direkte Rechnungserstellung aus Projekten</li>
                      <li>✓ Integrierte Zeiterfassung</li>
                      <li>✓ E-Rechnung-ready (XRechnung, ZUGFeRD)</li>
                      <li>✓ Stripe-Integration für Online-Payments</li>
                      <li>✓ Automatische Archivierung</li>
                      <li>✓ Mahnwesen inklusive</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">
                      Workflow-Integration:
                    </h3>
                    <ul className="space-y-2 text-blue-700 text-sm">
                      <li>✓ Projektmanagement + Abrechnung</li>
                      <li>✓ Kundenportal für Transparenz</li>
                      <li>✓ Mobile App für unterwegs</li>
                      <li>✓ DATEV-Export für Steuerberater</li>
                      <li>✓ Dashboard mit Kennzahlen</li>
                      <li>✓ Team-Kollaboration</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section
                id="faq"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl scroll-mt-24"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">8</span>
                  </div>
                  FAQ - Häufige Fragen
                </h2>

                <dl className="space-y-6">
                  <div className="border-b border-gray-200 pb-4">
                    <dt className="font-semibold text-gray-900 mb-2">
                      Muss ich als Einzelunternehmer Rechnungen ausstellen?
                    </dt>
                    <dd className="text-gray-700 text-sm">
                      Ja, für Unternehmer besteht bei Lieferung/Leistung an andere Unternehmer
                      grundsätzlich Rechnungspflicht zur Dokumentation des Umsatzes und für die
                      ordnungsgemäße Buchführung.
                    </dd>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <dt className="font-semibold text-gray-900 mb-2">
                      Wie lange muss ich Rechnungen aufbewahren?
                    </dt>
                    <dd className="text-gray-700 text-sm">
                      In Deutschland besteht eine steuerrechtliche Aufbewahrungspflicht von 10
                      Jahren für Rechnungen und Buchungsbelege. Diese gilt sowohl für Papier- als
                      auch digitale Dokumente.
                    </dd>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <dt className="font-semibold text-gray-900 mb-2">
                      Darf ich Rechnungen nachträglich ändern?
                    </dt>
                    <dd className="text-gray-700 text-sm">
                      Nein, Rechnungen dürfen nach dem Versand nicht mehr geändert werden. Bei
                      Fehlern müssen Sie eine Stornorechnung erstellen und eine neue, korrekte
                      Rechnung ausstellen.
                    </dd>
                  </div>

                  <div className="border-b border-gray-200 pb-4">
                    <dt className="font-semibold text-gray-900 mb-2">
                      Was ist bei wiederkehrenden Rechnungen zu beachten?
                    </dt>
                    <dd className="text-gray-700 text-sm">
                      Jede Rechnung muss eine fortlaufende, einmalige Nummer haben. Auch bei
                      wiederkehrenden Leistungen muss jede einzelne Rechnung alle Pflichtangaben
                      enthalten und den aktuellen Leistungszeitraum ausweisen.
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-gray-900 mb-2">
                      Wie funktioniert die Kleinunternehmerregelung bei Rechnungen?
                    </dt>
                    <dd className="text-gray-700 text-sm">
                      Kleinunternehmer nach §19 UStG weisen keine Umsatzsteuer aus und müssen den
                      entsprechenden Hinweis auf der Rechnung vermerken: &quot;Kleinunternehmer nach
                      §19 UStG - keine Ausweisung der Umsatzsteuer&quot;.
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 bg-[#14ad9f]/10 border border-[#14ad9f]/20 rounded-lg p-4">
                  <p className="text-gray-800 text-sm">
                    <strong>Weitere Hilfe benötigt?</strong> Lesen Sie auch unsere Artikel zu
                    <Link href="/blog/steuer-grundlagen" className="text-[#14ad9f] hover:underline">
                      Steuer-Grundlagen
                    </Link>{' '}
                    und{' '}
                    <Link
                      href="/blog/e-rechnung-leitfaden"
                      className="text-[#14ad9f] hover:underline"
                    >
                      E-Rechnung-Pflicht
                    </Link>
                    .
                  </p>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="w-80 flex-shrink-0">
              <div className="sticky top-20 space-y-6" style={{ position: 'sticky', top: '5rem' }}>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Inhaltsverzeichnis</h3>
                  <nav className="space-y-2">
                    {tableOfContents.map(item => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="block text-sm text-gray-600 hover:text-[#14ad9f] hover:bg-[#14ad9f]/10 px-3 py-2 rounded transition-colors"
                      >
                        {item.title}
                      </a>
                    ))}
                  </nav>
                </div>

                {/* Sidebar Image */}
                <div className="rounded-xl overflow-hidden shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2070&q=80"
                    alt="Geschäftsanalyse und Finanzplanung"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Quick Contact */}
                <div className="bg-[#14ad9f]/95 backdrop-blur-sm text-white rounded-xl p-6 shadow-xl">
                  <h4 className="font-bold mb-3">Fragen zur Rechnungsstellung?</h4>
                  <p className="text-sm mb-4 opacity-90">
                    Unser Support hilft bei Vorlagen, Automatisierung und rechtlichen Fragen.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-block text-sm bg-white text-[#14ad9f] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Kontakt aufnehmen
                  </Link>
                </div>

                {/* Additional Image */}
                <div className="rounded-xl overflow-hidden shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=2070&q=80"
                    alt="Professionelle Beratung und Kundenservice"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Related Articles */}
                <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-xl">
                  <h4 className="font-bold text-gray-900 mb-4">Weitere Beiträge</h4>
                  <div className="space-y-4">
                    <Link href="/blog/e-rechnung-leitfaden" className="block group">
                      <div className="bg-gray-50 hover:bg-[#14ad9f]/10 rounded-lg p-4 transition-colors">
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#14ad9f] text-sm mb-2">
                          E-Rechnung 2025: Kompletter Leitfaden
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Alles zur E-Rechnung-Pflicht: Termine, Standards und Umsetzung.
                        </p>
                      </div>
                    </Link>

                    <Link href="/blog/digitalisierung-kleinunternehmen" className="block group">
                      <div className="bg-gray-50 hover:bg-[#14ad9f]/10 rounded-lg p-4 transition-colors">
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#14ad9f] text-sm mb-2">
                          Digitalisierung für Kleinunternehmen
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Tipps und Tools für die digitale Transformation kleiner Betriebe.
                        </p>
                      </div>
                    </Link>

                    <Link href="/blog/steuer-grundlagen" className="block group">
                      <div className="bg-gray-50 hover:bg-[#14ad9f]/10 rounded-lg p-4 transition-colors">
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#14ad9f] text-sm mb-2">
                          Steuer-Grundlagen für Freelancer
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Wichtige steuerliche Aspekte und Abschreibungsmöglichkeiten.
                        </p>
                      </div>
                    </Link>

                    <Link href="/blog/perfektes-angebot" className="block group">
                      <div className="bg-gray-50 hover:bg-[#14ad9f]/10 rounded-lg p-4 transition-colors">
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#14ad9f] text-sm mb-2">
                          Das perfekte Angebot erstellen
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Professionelle Angebote, die überzeugen und zum Auftrag führen.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Call to Action */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Bereit für professionelle Rechnungen?</h2>
            <p className="text-lg mb-6">
              Starten Sie jetzt mit Taskilo: Vorlagen, Automatisierung und GoBD-konforme
              Archivierung für Ihr Unternehmen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-white text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Kostenlos registrieren
              </Link>
              <Link
                href="/dashboard/company"
                className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-[#14ad9f] transition-colors"
              >
                Dashboard öffnen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
