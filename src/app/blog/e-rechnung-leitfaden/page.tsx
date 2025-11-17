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
  title: 'E-Rechnung 2025: Kompletter Leitfaden für Unternehmen - Taskilo',
  description:
    'Alles zur E-Rechnung-Pflicht ab 2025: Übergangszeiten, Mindestbeträge, XRechnung & ZUGFeRD Standards. Praxistipps für B2B-Rechnungen.',
  keywords:
    'E-Rechnung, XRechnung, ZUGFeRD, B2B Rechnungen, Elektronische Rechnung, 2025, Taskilo, Rechnungsstellung',
  openGraph: {
    title: 'E-Rechnung 2025: Der komplette Leitfaden für Unternehmen',
    description:
      'Alle wichtigen Infos zur E-Rechnung-Pflicht: Von Übergangszeiten bis zu technischen Standards.',
    type: 'article',
  },
};

const tableOfContents = [
  { id: 'was-ist-e-rechnung', title: '1. Was ist eine E-Rechnung?' },
  { id: 'pflicht-termine', title: '2. Wichtige Termine & Übergangszeiten' },
  { id: 'mindestbetraege', title: '3. Mindestbeträge & Ausnahmen' },
  { id: 'betroffene-unternehmen', title: '4. Welche Unternehmen sind betroffen?' },
  { id: 'technische-standards', title: '5. Technische Standards' },
  { id: 'umsetzung', title: '6. Praktische Umsetzung' },
  { id: 'vorteile', title: '7. Vorteile der E-Rechnung' },
  { id: 'taskilo-support', title: '8. E-Rechnung mit Taskilo' },
];

export default function ERechnungLeitfadenPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-linear-to-br from-black/10 to-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Use existing HeroHeader */}
        <HeroHeader />

        {/* Breadcrumb */}
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
                  E-Rechnung Leitfaden
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* SEO-optimized Header */}
        <div className="text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hero Image */}
            <div className="mb-8 rounded-lg overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Digitale Rechnungsstellung und E-Rechnung"
                className="w-full h-64 object-cover"
              />
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                  E-Rechnung 2025: Der komplette Leitfaden
                </h1>
                <p className="text-xl text-white/95 leading-relaxed drop-shadow-md mt-2">
                  Alles was Sie über die E-Rechnung-Pflicht wissen müssen
                </p>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-[#14ad9f] mb-4">Quick Facts zur E-Rechnung</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Start:</strong> 01.01.2025
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Euro className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Mindestbetrag:</strong> Ab 250€ Bruttobetrag
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Betrifft:</strong> B2B-Rechnungen
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Übergangszeit:</strong> Bis 31.12.2026
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Standards:</strong> XRechnung, ZUGFeRD
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Nicht betroffen:</strong> B2C
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-8 relative">
            {/* Content */}
            <div className="flex-1 max-w-4xl">
              {/* Wichtiger Hinweis */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 shadow-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                  <div>
                    <h2 className="text-lg font-bold text-amber-800 mb-2">Wichtiger Hinweis</h2>
                    <p className="text-amber-700">
                      Dieser Leitfaden basiert auf den aktuellen Gesetzen und BMF-Verlautbarungen.
                      Konsultieren Sie bei spezifischen Fragen Ihren Steuerberater oder
                      Rechtsanwalt.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Was ist eine E-Rechnung? */}
              <section
                id="was-ist-e-rechnung"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  Was ist eine E-Rechnung?
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80"
                    alt="Digitale Dokumentenverwaltung und elektronische Rechnungen"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    Eine E-Rechnung ist eine Rechnung, die in einem{' '}
                    <strong>strukturierten elektronischen Format</strong>
                    ausgestellt, übermittelt und empfangen wird und eine elektronische Verarbeitung
                    ermöglicht.
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Das IST eine E-Rechnung:
                    </h3>
                    <ul className="space-y-2 text-green-700">
                      <li>• XRechnung (deutsche Standard)</li>
                      <li>• ZUGFeRD 2.0.1 oder höher</li>
                      <li>• Factur-X (französisch/deutsch)</li>
                      <li>• UBL (Universal Business Language)</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Das ist KEINE E-Rechnung:
                    </h3>
                    <ul className="space-y-2 text-red-700">
                      <li>• PDF-Rechnungen per E-Mail</li>
                      <li>• Word- oder Excel-Dateien</li>
                      <li>• Bilder oder gescannte Rechnungen</li>
                      <li>• Einfache E-Mails mit Rechnungstext</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 2. Wichtige Termine & Übergangszeiten */}
              <section
                id="pflicht-termine"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  Wichtige Termine & Übergangszeiten
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Kalender und wichtige Termine für die E-Rechnung-Pflicht"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">01.01.2025</h3>
                      <p className="text-blue-700">
                        <strong>Start der E-Rechnung-Pflicht</strong>
                        <br />
                        Alle Unternehmen müssen E-Rechnungen empfangen können.
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-3">01.01.2026</h3>
                      <p className="text-yellow-700">
                        <strong>Ende der Übergangszeit (normal)</strong>
                        <br />
                        Pflicht zur Ausstellung von E-Rechnungen für die meisten Unternehmen.
                      </p>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-orange-800 mb-3">01.01.2027</h3>
                      <p className="text-orange-700">
                        <strong>Ende der verlängerten Übergangszeit</strong>
                        <br />
                        Auch kleine Unternehmen (Umsatz unter 800.000€) müssen E-Rechnungen
                        ausstellen.
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-3">Ab 2027</h3>
                      <p className="text-green-700">
                        <strong>Vollständige E-Rechnung-Pflicht</strong>
                        <br />
                        Alle B2B-Rechnungen ab 250€ müssen elektronisch erstellt werden.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Mindestbeträge & Ausnahmen */}
              <section
                id="mindestbetraege"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  Mindestbeträge & Ausnahmen
                </h2>

                <div className="space-y-6">
                  <div className="bg-[#14ad9f] text-white rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-3">250€ Mindestbetrag</h3>
                    <p>
                      Die E-Rechnung-Pflicht gilt nur für Rechnungen mit einem{' '}
                      <strong>Bruttobetrag ab 250€</strong>. Kleinbetragsrechnungen unter 250€
                      können weiterhin in Papierform oder als PDF versendet werden.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-3">
                        Ausnahmen - Keine E-Rechnung nötig:
                      </h3>
                      <ul className="space-y-2 text-green-700">
                        <li>• Rechnungen unter 250€ Bruttobetrag</li>
                        <li>• B2C-Rechnungen (an Endverbraucher)</li>
                        <li>• Kleinbetragsrechnungen (§ 33 UStDV)</li>
                        <li>• Rechnungen an Privatpersonen</li>
                        <li>• Export-Rechnungen (außerhalb Deutschland)</li>
                      </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-red-800 mb-3">
                        E-Rechnung erforderlich:
                      </h3>
                      <ul className="space-y-2 text-red-700">
                        <li>• B2B-Rechnungen ab 250€ Bruttobetrag</li>
                        <li>• Rechnungen zwischen deutschen Unternehmen</li>
                        <li>• Rechnungen an deutsche Gesellschaften</li>
                        <li>• Rechnungen an Freiberufler mit Umsatzsteuer-ID</li>
                        <li>• Alle umsatzsteuerpflichtigen Leistungen</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Welche Unternehmen sind betroffen? */}
              <section
                id="betroffene-unternehmen"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  Welche Unternehmen sind betroffen?
                </h2>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">
                        Betroffene Unternehmen:
                      </h3>
                      <ul className="space-y-2 text-blue-700">
                        <li>• Alle deutschen Unternehmen (GmbH, AG, etc.)</li>
                        <li>• Einzelunternehmer mit Umsatzsteuer-ID</li>
                        <li>• Freiberufler mit Umsatzsteuer-ID</li>
                        <li>• Personengesellschaften (OHG, KG, GbR)</li>
                        <li>• Vereine und Stiftungen (bei B2B-Geschäften)</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Nicht betroffene Bereiche:
                      </h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Privatpersonen (B2C-Rechnungen)</li>
                        <li>• Kleinunternehmer nach § 19 UStG</li>
                        <li>• Rechnungen ins Ausland</li>
                        <li>• Steuerfreie Umsätze</li>
                        <li>• Innenumsätze in Organkreisen</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                      Besonderheiten für kleine Unternehmen:
                    </h3>
                    <p className="text-yellow-700 mb-3">
                      Unternehmen mit einem Vorjahresumsatz unter 800.000€ haben eine verlängerte
                      Übergangszeit bis zum 31.12.2026 für die Ausstellung von E-Rechnungen.
                    </p>
                    <p className="text-yellow-700">
                      <strong>Wichtig:</strong> Auch diese Unternehmen müssen ab 01.01.2025
                      E-Rechnungen empfangen können!
                    </p>
                  </div>
                </div>
              </section>

              {/* 5. Technische Standards */}
              <section
                id="technische-standards"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">5</span>
                  </div>
                  Technische Standards
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1518186285589-2f7649de83e0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80"
                    alt="Technische Standards und Software-Entwicklung"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">XRechnung</h3>
                      <ul className="space-y-2 text-blue-700">
                        <li>• Deutscher Standard für E-Rechnungen</li>
                        <li>• Basiert auf der EU-Norm EN 16931</li>
                        <li>• Reine XML-Datei (maschinenlesbar)</li>
                        <li>• Kostenloser Standard</li>
                        <li>• Empfohlen für öffentliche Auftraggeber</li>
                      </ul>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-3">ZUGFeRD</h3>
                      <ul className="space-y-2 text-green-700">
                        <li>• Hybrid-Format: PDF + XML-Daten</li>
                        <li>• Version 2.0.1 oder höher erforderlich</li>
                        <li>• Für Menschen lesbar (PDF-Ansicht)</li>
                        <li>• Maschinenverarbeitbar (XML-Daten)</li>
                        <li>• Weit verbreitet in der Wirtschaft</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-800 mb-3">
                      Weitere akzeptierte Formate:
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-purple-700 mb-2">Factur-X</h4>
                        <p className="text-purple-600 text-sm">
                          Französisch-deutscher Standard, kompatibel mit ZUGFeRD
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-purple-700 mb-2">UBL</h4>
                        <p className="text-purple-600 text-sm">
                          Universal Business Language, internationaler Standard
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Übertragungswege:</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• E-Mail mit strukturierter Datei im Anhang</li>
                      <li>• Elektronische Datenaustausch-Plattformen (EDI)</li>
                      <li>• Cloud-basierte Rechnungsportale</li>
                      <li>• Direkte API-Integration zwischen Systemen</li>
                      <li>• PEPPOL-Netzwerk (Pan-European Public Procurement OnLine)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 6. Praktische Umsetzung */}
              <section
                id="umsetzung"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">6</span>
                  </div>
                  Praktische Umsetzung
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Team-Meeting und praktische Umsetzung von Projekten"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <div className="bg-[#14ad9f] text-white rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-3">3 Schritte zur E-Rechnung</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-white text-[#14ad9f] rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                          1
                        </div>
                        <h4 className="font-semibold mb-1">Software wählen</h4>
                        <p className="text-sm opacity-90">E-Rechnung-fähige Software auswählen</p>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-8 bg-white text-[#14ad9f] rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                          2
                        </div>
                        <h4 className="font-semibold mb-1">Prozesse anpassen</h4>
                        <p className="text-sm opacity-90">Interne Abläufe digitalisieren</p>
                      </div>
                      <div className="text-center">
                        <div className="w-8 h-8 bg-white text-[#14ad9f] rounded-full flex items-center justify-center font-bold mx-auto mb-2">
                          3
                        </div>
                        <h4 className="font-semibold mb-1">Team schulen</h4>
                        <p className="text-sm opacity-90">Mitarbeiter in neuen Prozessen schulen</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-3">
                        Software-Optionen:
                      </h3>
                      <ul className="space-y-2 text-green-700">
                        <li>• Cloud-basierte Rechnungssoftware</li>
                        <li>• ERP-Systeme mit E-Rechnung-Modul</li>
                        <li>• Spezialisierte E-Rechnung-Tools</li>
                        <li>• API-Integration in bestehende Systeme</li>
                        <li>• Buchhaltungssoftware mit E-Rechnung</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">
                        Wichtige Funktionen:
                      </h3>
                      <ul className="space-y-2 text-blue-700">
                        <li>• XRechnung und ZUGFeRD-Export</li>
                        <li>• Automatische Validierung</li>
                        <li>• Empfang und Verarbeitung von E-Rechnungen</li>
                        <li>• Integration in Buchhaltung</li>
                        <li>• Archivierung (GoBD-konform)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-orange-800 mb-3">
                      Herausforderungen & Lösungen:
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-orange-700">
                          Herausforderung: Alte Systeme
                        </h4>
                        <p className="text-orange-600 text-sm">
                          Lösung: Schrittweise Migration oder API-Integration
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-700">
                          Herausforderung: Mitarbeiter-Schulung
                        </h4>
                        <p className="text-orange-600 text-sm">
                          Lösung: Frühe Einbindung und regelmäßige Trainings
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-700">
                          Herausforderung: Verschiedene Standards
                        </h4>
                        <p className="text-orange-600 text-sm">
                          Lösung: Multi-Format-fähige Software wählen
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 7. Vorteile der E-Rechnung */}
              <section
                id="vorteile"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">7</span>
                  </div>
                  Vorteile der E-Rechnung
                </h2>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-3">
                        Für Rechnungssteller:
                      </h3>
                      <ul className="space-y-2 text-green-700">
                        <li>• Schnellere Zahlungen (bis zu 30% früher)</li>
                        <li>• Geringere Kosten (keine Porto-/Druckkosten)</li>
                        <li>• Weniger Fehler durch Automatisierung</li>
                        <li>• Bessere Nachverfolgung</li>
                        <li>• Umweltfreundlicher</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">
                        Für Rechnungsempfänger:
                      </h3>
                      <ul className="space-y-2 text-blue-700">
                        <li>• Automatische Verarbeitung möglich</li>
                        <li>• Weniger manuelle Eingaben</li>
                        <li>• Schnellere Freigabeprozesse</li>
                        <li>• Bessere Datenqualität</li>
                        <li>• Digitale Archivierung</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-800 mb-3">
                      Volkswirtschaftliche Vorteile:
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">-20%</div>
                        <p className="text-purple-700 text-sm">Verarbeitungskosten</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">+50%</div>
                        <p className="text-purple-700 text-sm">Verarbeitungsgeschwindigkeit</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">-90%</div>
                        <p className="text-purple-700 text-sm">Papierverbrauch</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 8. E-Rechnung mit Taskilo */}
              <section
                id="taskilo-support"
                className="bg-white rounded-lg border border-gray-200 p-8 mb-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">8</span>
                  </div>
                  E-Rechnung mit Taskilo
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Moderne Arbeitsplätze und digitale Lösungen"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <div className="bg-[#14ad9f] text-white rounded-lg p-8 text-center">
                    <h3 className="text-2xl font-bold mb-4">Taskilo ist E-Rechnung-ready!</h3>
                    <p className="text-lg mb-6">
                      Unsere Plattform unterstützt bereits alle E-Rechnung-Standards und macht die
                      Umstellung für Sie einfach und sicher.
                    </p>
                    <Link
                      href="/dashboard/company"
                      className="inline-flex items-center bg-white text-[#14ad9f] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Jetzt E-Rechnungen erstellen
                    </Link>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-3">
                        Taskilo Features:
                      </h3>
                      <ul className="space-y-2 text-green-700">
                        <li>• XRechnung und ZUGFeRD 2.0.1 Export</li>
                        <li>• Automatische 250€-Erkennung</li>
                        <li>• Integrierte Validierung</li>
                        <li>• GoBD-konforme Archivierung</li>
                        <li>• Nahtlose Buchhaltungs-Integration</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-800 mb-3">Automatisierung:</h3>
                      <ul className="space-y-2 text-blue-700">
                        <li>• Automatische Format-Auswahl</li>
                        <li>• Direkte Übertragung an Kunden</li>
                        <li>• Status-Tracking in Echtzeit</li>
                        <li>• Integration in Projektmanagement</li>
                        <li>• Stripe-basierte Zahlungsabwicklung</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                      Ihre nächsten Schritte:
                    </h3>
                    <ol className="space-y-2 text-yellow-700">
                      <li>1. Registrieren Sie sich kostenlos bei Taskilo</li>
                      <li>2. Vervollständigen Sie Ihr Unternehmensprofil</li>
                      <li>3. Erstellen Sie Ihre erste E-Rechnung</li>
                      <li>4. Testen Sie alle Features in der Übergangszeit</li>
                      <li>5. Seien Sie ab 2025 vollständig compliant</li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* Call to Action */}
              <div className="bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Bereit für die E-Rechnung?</h2>
                <p className="text-lg mb-6">
                  Starten Sie noch heute mit Taskilo und seien Sie optimal auf die
                  E-Rechnung-Pflicht vorbereitet.
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

            {/* Table of Contents Sidebar */}
            <aside className="w-80 shrink-0">
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
                    src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Geschäftsanalyse und Finanzplanung"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Quick Contact */}
                <div className="bg-[#14ad9f]/95 backdrop-blur-sm text-white rounded-xl p-6 shadow-xl">
                  <h4 className="font-bold mb-3">Fragen zur E-Rechnung?</h4>
                  <p className="text-sm mb-4 opacity-90">
                    Unser Support-Team hilft Ihnen gerne bei der Umsetzung.
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
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Professionelle Beratung und Kundenservice"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Related Articles */}
                <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-xl">
                  <h4 className="font-bold text-gray-900 mb-4">Weitere Beiträge</h4>
                  <div className="space-y-4">
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

                    <Link href="/blog/rechnungsstellung-tipps" className="block group">
                      <div className="bg-gray-50 hover:bg-[#14ad9f]/10 rounded-lg p-4 transition-colors">
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#14ad9f] text-sm mb-2">
                          Professionelle Rechnungsstellung
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Best Practices für korrekte und ansprechende Rechnungen.
                        </p>
                      </div>
                    </Link>

                    <Link href="/blog/steuerliche-vorteile-freelancer" className="block group">
                      <div className="bg-gray-50 hover:bg-[#14ad9f]/10 rounded-lg p-4 transition-colors">
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#14ad9f] text-sm mb-2">
                          Steuerliche Vorteile für Freelancer
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Welche Ausgaben Sie als Freiberufler absetzen können.
                        </p>
                      </div>
                    </Link>

                    <Link href="/blog/buchhaltung-automatisieren" className="block group">
                      <div className="bg-gray-50 hover:bg-[#14ad9f]/10 rounded-lg p-4 transition-colors">
                        <h5 className="font-semibold text-gray-900 group-hover:text-[#14ad9f] text-sm mb-2">
                          Buchhaltung automatisieren
                        </h5>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Zeit sparen durch clevere Automatisierung der Buchhaltung.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
