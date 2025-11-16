'use client';

import React from 'react';
import {
  FiDollarSign,
  FiUsers,
  FiBriefcase,
  FiInfo,
  FiBarChart,
  FiCreditCard,
  FiHelpCircle,
  FiTrendingUp,
  FiShield,
  FiCheck,
  FiArrowRight,
  FiStar,
  FiHome,
  FiTool,
} from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';

export default function PreisinformationenGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />

        {/* Breadcrumb Navigation */}
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <Breadcrumb>
            <BreadcrumbList className="text-white/80">
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="hover:text-white transition-colors">
                  Startseite
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbLink href="/blog" className="hover:text-white transition-colors">
                  Blog
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbPage className="text-white font-medium">Preisinformationen</BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="text-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <FiDollarSign className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
                  Preisinformationen bei Taskilo
                </h1>
                <p className="text-xl text-white/90 drop-shadow-md">
                  Transparente Preisstrukturen für alle Services
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="space-y-12">
            {/* Wichtiger Hinweis */}
            <section>
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg shadow-lg p-6">
                <div className="flex items-start gap-4">
                  <FiInfo className="text-amber-600 text-xl mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">Wichtiger Hinweis</h3>
                    <p className="text-amber-800 mb-3">
                      Die konkreten Preisdetails variieren je nach Service, Anbieter und Region. Für
                      genaue Preisinformationen empfehlen wir Ihnen:
                    </p>
                    <ul className="space-y-2 text-amber-800">
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-amber-600 shrink-0" />
                        <span>Direkte Anfrage bei den Dienstleistern</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-amber-600 shrink-0" />
                        <span>Nutzung unseres Kostenvoranschlag-Systems</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-amber-600 shrink-0" />
                        <span>Vergleich mehrerer Angebote</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Preismodelle */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center">
                    <FiBarChart className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Unsere Preismodelle</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Festpreise */}
                  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <FiCreditCard className="text-[#14ad9f] text-xl" />
                      <h3 className="text-xl font-semibold text-gray-900">Festpreise</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Für standardisierte Services mit klarem Leistungsumfang
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-green-500 shrink-0" />
                        <span>Transparente Preisangabe vorab</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-green-500 shrink-0" />
                        <span>Keine versteckten Kosten</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-green-500 shrink-0" />
                        <span>Sofortige Buchung möglich</span>
                      </li>
                    </ul>
                  </div>

                  {/* Stundenbasiert */}
                  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <FiTrendingUp className="text-[#14ad9f] text-xl" />
                      <h3 className="text-xl font-semibold text-gray-900">Stundenbasiert</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Für individuelle Projekte mit flexiblem Zeitaufwand
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-green-500 shrink-0" />
                        <span>Flexibel anpassbar</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-green-500 shrink-0" />
                        <span>Präzise Zeiterfassung</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiCheck className="text-green-500 shrink-0" />
                        <span>Faire Abrechnung</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Service-Kategorien */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <FiBriefcase className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Preisrichtwerte nach Kategorien
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Haushaltsservices */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FiHome className="text-[#14ad9f] text-xl" />
                      <h3 className="text-xl font-semibold text-gray-900">Haushaltsservices</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Reinigung</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">15-25€/Stunde</span>
                          <br />
                          Je nach Umfang und Region
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Gartenpflege</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">20-35€/Stunde</span>
                          <br />
                          Inklusive Grundausstattung
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Umzug</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">25-40€/Stunde</span>
                          <br />
                          Pro Helfer, Material separat
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Handwerk */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FiTool className="text-[#14ad9f] text-xl" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        Handwerk & Reparaturen
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Elektriker</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">45-65€/Stunde</span>
                          <br />
                          Zzgl. Material und Anfahrt
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Maler</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">30-50€/Stunde</span>
                          <br />
                          Je nach Komplexität
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Klempner</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">50-70€/Stunde</span>
                          <br />
                          Notdienst Aufschlag möglich
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Digitale Services */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FiBriefcase className="text-[#14ad9f] text-xl" />
                      <h3 className="text-xl font-semibold text-gray-900">Digitale Services</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Webdesign</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">40-80€/Stunde</span>
                          <br />
                          Oder Projektpauschale
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Marketing</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">35-75€/Stunde</span>
                          <br />
                          Je nach Spezialisierung
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">IT-Support</h4>
                        <p className="text-gray-600">
                          <span className="font-medium">40-60€/Stunde</span>
                          <br />
                          Remote oder vor Ort
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Hinweis:</strong> Dies sind Richtwerte zur Orientierung. Die
                    tatsächlichen Preise können je nach Anbieter, Region, Komplexität und
                    Marktsituation variieren.
                  </p>
                </div>
              </div>
            </section>

            {/* Kostenfaktoren */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <FiTrendingUp className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Faktoren der Preisbildung</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Grundfaktoren</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <FiStar className="text-[#14ad9f] mt-1 shrink-0" />
                        <div>
                          <h4 className="font-medium text-gray-900">Erfahrung & Qualifikation</h4>
                          <p className="text-gray-600 text-sm">
                            Expertise und Zertifizierungen des Anbieters
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiUsers className="text-[#14ad9f] mt-1 shrink-0" />
                        <div>
                          <h4 className="font-medium text-gray-900">Nachfrage & Verfügbarkeit</h4>
                          <p className="text-gray-600 text-sm">
                            Regionale Marktlage und Auslastung
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiShield className="text-[#14ad9f] mt-1 shrink-0" />
                        <div>
                          <h4 className="font-medium text-gray-900">Versicherung & Garantie</h4>
                          <p className="text-gray-600 text-sm">
                            Zusätzliche Absicherungen und Gewährleistungen
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Zusatzkosten</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <FiTool className="text-[#14ad9f] mt-1 shrink-0" />
                        <div>
                          <h4 className="font-medium text-gray-900">Material & Werkzeug</h4>
                          <p className="text-gray-600 text-sm">
                            Benötigte Materialien und Spezialwerkzeuge
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiArrowRight className="text-[#14ad9f] mt-1 shrink-0" />
                        <div>
                          <h4 className="font-medium text-gray-900">Anfahrt & Logistik</h4>
                          <p className="text-gray-600 text-sm">Fahrtkosten und Transportaufwand</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FiHelpCircle className="text-[#14ad9f] mt-1 shrink-0" />
                        <div>
                          <h4 className="font-medium text-gray-900">Komplexität & Dringlichkeit</h4>
                          <p className="text-gray-600 text-sm">Schwierigkeitsgrad und Zeitdruck</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tipps für faire Preise */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <FiHelpCircle className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Tipps für faire Preise</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FiUsers className="text-[#14ad9f]" />
                      Für Kunden
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Mehrere Angebote einholen und vergleichen</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Detaillierte Leistungsbeschreibung anfordern</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Bewertungen und Referenzen prüfen</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Kostenvoranschlag schriftlich bestätigen lassen</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FiBriefcase className="text-[#14ad9f]" />
                      Für Dienstleister
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Transparente Preisgestaltung kommunizieren</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Alle Kostenpunkte klar aufschlüsseln</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Marktübliche Preise recherchieren</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiCheck className="text-green-500 mt-1 shrink-0" />
                        <span>Qualität und Service als Mehrwert hervorheben</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section>
              <div className="bg-gradient-to-br from-[#14ad9f] to-teal-600 rounded-lg shadow-xl p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-4">Bereit für Ihren nächsten Service?</h2>
                <p className="text-lg mb-6 text-white/90">
                  Finden Sie qualifizierte Dienstleister mit fairen Preisen
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/auftrag/get-started"
                    className="bg-white text-[#14ad9f] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <FiArrowRight />
                    Service jetzt buchen
                  </Link>
                  <Link
                    href="/services"
                    className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <FiDollarSign />
                    Alle Services & Preise
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
