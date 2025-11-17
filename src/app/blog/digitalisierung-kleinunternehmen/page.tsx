import type { Metadata } from 'next';
import {
  Smartphone,
  Cloud,
  Shield,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Zap,
  Users,
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
  title: 'Digitalisierung für Kleinunternehmen: Der komplette Leitfaden 2025 - Taskilo',
  description:
    'Digitale Transformation für kleine Betriebe: Von Cloud-Lösungen bis zur Automatisierung. Praktische Tipps für mehr Effizienz und Wachstum.',
  keywords:
    'Digitalisierung, Kleinunternehmen, Cloud, Automatisierung, Software, Digital Transformation, Taskilo',
  openGraph: {
    title: 'Digitalisierung für Kleinunternehmen: Der komplette Leitfaden',
    description:
      'Praktische Tipps für die digitale Transformation kleiner Betriebe und mehr Effizienz.',
    type: 'article',
  },
};

const tableOfContents = [
  { id: 'was-ist-digitalisierung', title: '1. Was bedeutet Digitalisierung?' },
  { id: 'vorteile-kleinunternehmen', title: '2. Vorteile für Kleinunternehmen' },
  { id: 'erste-schritte', title: '3. Erste Schritte zur Digitalisierung' },
  { id: 'wichtige-bereiche', title: '4. Wichtige Bereiche digitalisieren' },
  { id: 'cloud-loesungen', title: '5. Cloud-Lösungen nutzen' },
  { id: 'automatisierung', title: '6. Prozesse automatisieren' },
  { id: 'kosten-nutzen', title: '7. Kosten-Nutzen-Analyse' },
  { id: 'taskilo-digitalisierung', title: '8. Digitalisierung mit Taskilo' },
];

export default function DigitalisierungKleinunternehmenPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-linear-to-br from-black/10 to-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Use existing HeroHeader */}
        <HeroHeader />

        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumb className="mb-4">
            <BreadcrumbList className="text-white">
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-white hover:text-white/80">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbLink href="/blog" className="text-white hover:text-white/80">
                  Blog
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white font-semibold">
                  Digitalisierung Kleinunternehmen
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
                src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Digitale Transformation für Kleinunternehmen"
                className="w-full h-64 object-cover"
              />
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                  Digitalisierung für Kleinunternehmen
                </h1>
                <p className="text-xl text-white/95 leading-relaxed drop-shadow-md mt-2">
                  Der komplette Leitfaden für die digitale Transformation
                </p>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-[#14ad9f] mb-4">
                Quick Facts zur Digitalisierung
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Effizienz:</strong> Bis zu 40% Zeitersparnis
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Cloud className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Cloud:</strong> Flexibel von überall arbeiten
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Sicherheit:</strong> Moderne Datenschutz-Standards
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Automatisierung:</strong> Weniger manuelle Arbeit
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Kundenservice:</strong> Bessere Erreichbarkeit
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-[#14ad9f]" />
                    <span className="text-sm text-gray-700">
                      <strong>Wachstum:</strong> Skalierbare Lösungen
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
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                  <div>
                    <h2 className="text-lg font-bold text-blue-800 mb-2">Wichtiger Hinweis</h2>
                    <p className="text-blue-700">
                      Digitalisierung ist ein Prozess, kein Ereignis. Starten Sie klein und bauen
                      Sie schrittweise aus. Dieser Leitfaden hilft Ihnen dabei, die richtigen
                      Prioritäten zu setzen.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Was bedeutet Digitalisierung? */}
              <section
                id="was-ist-digitalisierung"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  Was bedeutet Digitalisierung?
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80"
                    alt="Digitale Transformation und Technologie"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    Digitalisierung für Kleinunternehmen bedeutet die{' '}
                    <strong>schrittweise Integration digitaler Technologien</strong>
                    in alle Geschäftsbereiche, um Prozesse zu verbessern, Kosten zu senken und neue
                    Geschäftsmöglichkeiten zu schaffen.
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Kernbereiche der Digitalisierung:
                    </h3>
                    <ul className="space-y-2 text-green-700">
                      <li>
                        • <strong>Kommunikation:</strong> E-Mail, Chat, Videokonferenzen
                      </li>
                      <li>
                        • <strong>Dokumentenmanagement:</strong> Digitale Ablage und Archivierung
                      </li>
                      <li>
                        • <strong>Rechnungswesen:</strong> Online-Buchhaltung und E-Rechnungen
                      </li>
                      <li>
                        • <strong>Kundenmanagement:</strong> CRM-Systeme und digitale Kundendaten
                      </li>
                      <li>
                        • <strong>Marketing:</strong> Social Media und Online-Werbung
                      </li>
                      <li>
                        • <strong>Verkauf:</strong> E-Commerce und Online-Buchungssysteme
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Digitalisierung vs. Digitale Transformation
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-[#14ad9f] mb-2">Digitalisierung</h4>
                        <p className="text-sm text-gray-600">
                          Umwandlung analoger Prozesse in digitale Formate (z.B. Papierrechnungen →
                          E-Rechnungen)
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#14ad9f] mb-2">
                          Digitale Transformation
                        </h4>
                        <p className="text-sm text-gray-600">
                          Grundlegende Neugestaltung von Geschäftsmodellen durch digitale
                          Technologien
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Vorteile für Kleinunternehmen */}
              <section
                id="vorteile-kleinunternehmen"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  Vorteile für Kleinunternehmen
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2032&q=80"
                    alt="Vorteile der Digitalisierung für kleine Unternehmen"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg p-4">
                      <h3 className="font-semibold text-[#14ad9f] mb-2 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Effizienzsteigerung
                      </h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Automatisierung wiederkehrender Aufgaben</li>
                        <li>• Schnellere Kommunikation mit Kunden</li>
                        <li>• Digitale Workflows und Prozesse</li>
                        <li>• Weniger Papierkram und manuelle Eingaben</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <Cloud className="w-4 h-4 mr-2" />
                        Flexibilität & Mobilität
                      </h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Arbeiten von überall möglich</li>
                        <li>• Cloud-basierte Datenspeicherung</li>
                        <li>• Mobile Apps für unterwegs</li>
                        <li>• Bessere Work-Life-Balance</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Besserer Kundenservice
                      </h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• 24/7 Online-Verfügbarkeit</li>
                        <li>• Schnellere Antwortzeiten</li>
                        <li>• Personalisierte Kundenerfahrungen</li>
                        <li>• Digitale Kundendatenbank</li>
                      </ul>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h3 className="font-semibold text-purple-800 mb-2 flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Kosteneinsparungen
                      </h3>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Weniger Papier und Druckkosten</li>
                        <li>• Reduzierte Bürokosten</li>
                        <li>• Automatisierte Buchhaltung</li>
                        <li>• Effizientere Ressourcennutzung</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Erste Schritte zur Digitalisierung */}
              <section
                id="erste-schritte"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  Erste Schritte zur Digitalisierung
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80"
                    alt="Erste Schritte zur digitalen Transformation"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                      Digitalisierungs-Roadmap für Kleinunternehmen
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm">1</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">IST-Analyse durchführen</h4>
                          <p className="text-sm text-gray-600">
                            Bewerten Sie Ihre aktuellen Prozesse und identifizieren Sie
                            Digitalisierungspotentiale.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm">2</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Prioritäten setzen</h4>
                          <p className="text-sm text-gray-600">
                            Beginnen Sie mit den Bereichen, die den größten Nutzen bei geringsten
                            Kosten bieten.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm">3</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Budget planen</h4>
                          <p className="text-sm text-gray-600">
                            Definieren Sie realistische Budgets für Software, Hardware und
                            Schulungen.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm">4</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Schrittweise umsetzen</h4>
                          <p className="text-sm text-gray-600">
                            Implementieren Sie Lösungen nacheinander, um Überforderung zu vermeiden.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Wichtige Bereiche digitalisieren */}
              <section
                id="wichtige-bereiche"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  Wichtige Bereiche digitalisieren
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-linear-to-br from-[#14ad9f]/10 to-teal-50 border border-[#14ad9f]/20 rounded-lg p-6">
                    <h3 className="font-bold text-[#14ad9f] mb-3">📊 Buchhaltung & Finanzen</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• Online-Buchhaltungssoftware</li>
                      <li>• Digitale Rechnungsstellung</li>
                      <li>• Banking-Apps nutzen</li>
                      <li>• Ausgabentracking</li>
                    </ul>
                  </div>

                  <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-bold text-blue-800 mb-3">👥 Kundenmanagement</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• CRM-System einführen</li>
                      <li>• Kundendatenbank aufbauen</li>
                      <li>• E-Mail-Marketing</li>
                      <li>• Online-Terminbuchung</li>
                    </ul>
                  </div>

                  <div className="bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-bold text-green-800 mb-3">📁 Dokumentenmanagement</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• Cloud-Speicher nutzen</li>
                      <li>• Digitale Ablagestruktur</li>
                      <li>• Dokumenten-Scanner</li>
                      <li>• Backup-Strategien</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 5. Cloud-Lösungen nutzen */}
              <section
                id="cloud-loesungen"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">5</span>
                  </div>
                  Cloud-Lösungen nutzen
                </h2>

                {/* Section Image */}
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80"
                    alt="Cloud Computing und digitale Infrastruktur"
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    Cloud-Computing ermöglicht es Kleinunternehmen, auf{' '}
                    <strong>professionelle IT-Infrastruktur zuzugreifen</strong>, ohne hohe
                    Investitionen in Hardware und Wartung tätigen zu müssen.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Vorteile der Cloud
                      </h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-1 mr-2 shrink-0" />
                          Geringe Startkosten
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-1 mr-2 shrink-0" />
                          Skalierbarkeit nach Bedarf
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-1 mr-2 shrink-0" />
                          Automatische Updates
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-1 mr-2 shrink-0" />
                          Ortsunabhängiger Zugriff
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-1 mr-2 shrink-0" />
                          Professionelle Sicherheit
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Empfohlene Cloud-Services
                      </h3>
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="font-semibold text-[#14ad9f] text-sm">
                            Google Workspace / Microsoft 365
                          </h4>
                          <p className="text-xs text-gray-600">
                            E-Mail, Kalender, Dokumentenerstellung
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="font-semibold text-[#14ad9f] text-sm">
                            Dropbox / OneDrive
                          </h4>
                          <p className="text-xs text-gray-600">
                            Dateispeicherung und -synchronisation
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="font-semibold text-[#14ad9f] text-sm">
                            Slack / Microsoft Teams
                          </h4>
                          <p className="text-xs text-gray-600">
                            Interne Kommunikation und Zusammenarbeit
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6. Prozesse automatisieren */}
              <section
                id="automatisierung"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">6</span>
                  </div>
                  Prozesse automatisieren
                </h2>

                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    Automatisierung hilft dabei,{' '}
                    <strong>wiederkehrende Aufgaben zu reduzieren</strong> und sich auf das
                    Kerngeschäft zu konzentrieren. Selbst einfache Automatisierungen können
                    erhebliche Zeitersparnisse bringen.
                  </p>

                  <div className="bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[#14ad9f] mb-4">
                      Automatisierungsmöglichkeiten für Kleinunternehmen
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          📧 E-Mail & Kommunikation
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Automatische E-Mail-Antworten</li>
                          <li>• Newsletter-Versendung</li>
                          <li>• Terminbestätigungen</li>
                          <li>• Rechnungserinnerungen</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          💰 Finanzen & Buchhaltung
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Wiederkehrende Rechnungen</li>
                          <li>• Zahlungserinnerungen</li>
                          <li>• Ausgabenkategorisierung</li>
                          <li>• Steuerberichte</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">👥 Kundenmanagement</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Lead-Erfassung</li>
                          <li>• Follow-up E-Mails</li>
                          <li>• Kundensegmentierung</li>
                          <li>• Feedback-Anfragen</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">📊 Reporting & Analyse</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Monatliche Reports</li>
                          <li>• Umsatzanalysen</li>
                          <li>• Kundenstatistiken</li>
                          <li>• Projektberichte</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 7. Kosten-Nutzen-Analyse */}
              <section
                id="kosten-nutzen"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">7</span>
                  </div>
                  Kosten-Nutzen-Analyse
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-4">
                      💸 Investitionskosten
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Einmalige Kosten:</h4>
                        <ul className="text-sm text-gray-700 space-y-1 mt-1">
                          <li>• Software-Lizenzen: 500€ - 2.000€</li>
                          <li>• Hardware-Upgrades: 1.000€ - 5.000€</li>
                          <li>• Schulungen: 500€ - 1.500€</li>
                          <li>• Setup & Migration: 500€ - 2.000€</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Laufende Kosten:</h4>
                        <ul className="text-sm text-gray-700 space-y-1 mt-1">
                          <li>• Software-Abos: 50€ - 300€/Monat</li>
                          <li>• Cloud-Speicher: 10€ - 100€/Monat</li>
                          <li>• Support: 50€ - 200€/Monat</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">
                      💰 Einsparungen & Nutzen
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          Direkte Einsparungen:
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1 mt-1">
                          <li>• Papierkram: 200€ - 500€/Jahr</li>
                          <li>• Arbeitszeit: 5-15 Std/Woche</li>
                          <li>• Bürokosten: 1.000€ - 3.000€/Jahr</li>
                          <li>• Fehlerreduktion: 10-30%</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          Zusätzlicher Nutzen:
                        </h4>
                        <ul className="text-sm text-gray-700 space-y-1 mt-1">
                          <li>• Besserer Kundenservice</li>
                          <li>• Neue Geschäftsmöglichkeiten</li>
                          <li>• Professionelleres Image</li>
                          <li>• Skalierbarkeit</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-[#14ad9f] mb-3">
                    📈 ROI-Berechnung (Return on Investment)
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Die meisten Kleinunternehmen erreichen innerhalb von{' '}
                    <strong>6-18 Monaten</strong> einen positiven ROI durch Digitalisierung. Die
                    Investition amortisiert sich durch Zeitersparnisse, Effizienzsteigerungen und
                    neue Geschäftsmöglichkeiten.
                  </p>
                </div>
              </section>

              {/* 8. Digitalisierung mit Taskilo */}
              <section
                id="taskilo-digitalisierung"
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8 shadow-xl"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">8</span>
                  </div>
                  Digitalisierung mit Taskilo
                </h2>

                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    Taskilo bietet eine{' '}
                    <strong>All-in-One-Plattform für die Digitalisierung</strong> Ihres
                    Kleinunternehmens. Von der Rechnungsstellung bis zum Projektmanagement - alles
                    in einer Lösung.
                  </p>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-linear-to-br from-[#14ad9f]/10 to-teal-50 border border-[#14ad9f]/20 rounded-lg p-6">
                      <h3 className="font-bold text-[#14ad9f] mb-3">💼 Geschäftsverwaltung</h3>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Digitale Rechnungsstellung</li>
                        <li>• Projektmanagement</li>
                        <li>• Kundenbeziehungen</li>
                        <li>• Dokumentenverwaltung</li>
                      </ul>
                    </div>

                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="font-bold text-blue-800 mb-3">⚡ Automatisierung</h3>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Wiederkehrende Rechnungen</li>
                        <li>• E-Mail-Erinnerungen</li>
                        <li>• Zahlungsabwicklung</li>
                        <li>• Reporting & Analytics</li>
                      </ul>
                    </div>

                    <div className="bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                      <h3 className="font-bold text-green-800 mb-3">📱 Mobile Lösung</h3>
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Überall verfügbar</li>
                        <li>• Echtzeitdaten</li>
                        <li>• Intuitive Bedienung</li>
                        <li>• Sichere Cloud-Infrastruktur</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[#14ad9f] mb-4">
                      🚀 Ihr Digitalisierungsplan mit Taskilo
                    </h3>
                    <ol className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <span className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                          1
                        </span>
                        <span className="text-gray-700">
                          Registrieren Sie sich kostenlos bei Taskilo
                        </span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                          2
                        </span>
                        <span className="text-gray-700">
                          Vervollständigen Sie Ihr Unternehmensprofil
                        </span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                          3
                        </span>
                        <span className="text-gray-700">
                          Starten Sie mit der digitalen Rechnungsstellung
                        </span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                          4
                        </span>
                        <span className="text-gray-700">
                          Erweitern Sie schrittweise um weitere Funktionen
                        </span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="w-6 h-6 bg-[#14ad9f] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                          5
                        </span>
                        <span className="text-gray-700">
                          Profitieren Sie von einem vollständig digitalisierten Geschäft
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* Call to Action */}
              <div className="bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Bereit für die Digitalisierung?</h2>
                <p className="text-lg mb-6">
                  Starten Sie noch heute mit Taskilo und digitalisieren Sie Ihr Kleinunternehmen
                  Schritt für Schritt.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register"
                    className="bg-white text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Kostenlos starten
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
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Erfolgreiche Digitalisierung im Kleinunternehmen"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {/* Quick Contact */}
                <div className="bg-[#14ad9f]/95 backdrop-blur-sm text-white rounded-xl p-6 shadow-xl">
                  <h4 className="font-bold mb-3">Digitalisierung geplant?</h4>
                  <p className="text-sm mb-4 opacity-90">
                    Unser Team berät Sie gerne bei Ihrer digitalen Transformation.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-block text-sm bg-white text-[#14ad9f] px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Beratung anfragen
                  </Link>
                </div>

                {/* Additional Image */}
                <div className="rounded-xl overflow-hidden shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80"
                    alt="Moderne Arbeitsplätze und digitale Tools"
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
                          Alles zur E-Rechnung-Pflicht und den neuen Standards.
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
