import type { Metadata } from 'next';
import { ArrowLeft, Shield, CheckCircle, FileText, Star, Camera, Clock } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Unser Verifizierungsprozess - Wie wir Anbieter prüfen | Taskilo',
  description:
    'Erfahren Sie detailliert, wie Taskilo Anbieter verifiziert. Von Personalausweis bis Gewerbeschein - transparente Erklärung unseres mehrstufigen Prüfprozesses.',
  keywords: 'Verifizierung, Anbieter-Prüfung, Sicherheit, Qualitätskontrolle, Taskilo',
  openGraph: {
    title: 'Unser Verifizierungsprozess - Wie wir Anbieter prüfen',
    description:
      'Detaillierte Erklärung unseres mehrstufigen Verifizierungsprozesses für maximale Sicherheit und Qualität.',
    type: 'article',
  },
};

export default function VerifizierungsprozessPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-linear-to-br from-black/10 to-black/20 pointer-events-none"></div>
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
              <Shield className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">
                Unser Verifizierungsprozess
              </h1>
            </div>
            <p className="text-xl text-white/95 leading-relaxed drop-shadow-md">
              Transparenz schafft Vertrauen. Erfahren Sie Schritt für Schritt, wie wir jeden
              Anbieter auf Taskilo sorgfältig prüfen und verifizieren.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-xl text-gray-700 leading-relaxed">
              Bei Taskilo setzen wir auf{' '}
              <strong>höchste Qualitäts- und Sicherheitsstandards</strong>. Jeder Anbieter
              durchläuft unseren mehrstufigen Verifizierungsprozess, bevor er Services auf unserer
              Plattform anbieten kann. Hier erklären wir Ihnen transparent, was genau wir prüfen.
            </p>
          </div>

          {/* Verification Steps */}
          <div className="space-y-12">
            {/* Step 1: Identity Verification */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border-white/30 border">
              <div className="flex items-start space-x-4">
                <div className="bg-[#14ad9f] text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-[#14ad9f]" />
                    Identitätsprüfung
                  </h2>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Was wir prüfen:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Personalausweis oder Reisepass:</strong> Vollständige
                          Identitätsprüfung mit Abgleich der persönlichen Daten
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Meldebestätigung:</strong> Nachweis der aktuellen Wohnadresse
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Video-Verifizierung:</strong> Persönliche Identitätsprüfung per
                          Videocall
                        </span>
                      </li>
                    </ul>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800">
                        <strong>Warum wichtig:</strong> Nur verifizierte Personen können Services
                        anbieten. Dies schützt vor Betrug und sorgt für Nachvollziehbarkeit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Professional Qualification */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <div className="flex items-start space-x-4">
                <div className="bg-[#14ad9f] text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <Star className="w-6 h-6 mr-2 text-[#14ad9f]" />
                    Fachliche Qualifikation
                  </h2>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Was wir prüfen:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Gewerbeschein/Handwerkskarte:</strong> Nachweis der gewerblichen
                          Berechtigung
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Berufszertifikate:</strong> Branchenspezifische
                          Qualifikationsnachweise
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Versicherungsnachweise:</strong> Haftpflicht- und
                          Berufshaftpflichtversicherung
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Referenzen & Portfolio:</strong> Nachweis bisheriger Arbeiten und
                          Kundenbewertungen
                        </span>
                      </li>
                    </ul>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-800">
                        <strong>Qualitätsgarantie:</strong> Nur fachlich qualifizierte Anbieter
                        erhalten Zugang. Je nach Gewerk prüfen wir spezifische Qualifikationen und
                        Zertifizierungen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Background Check */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <div className="flex items-start space-x-4">
                <div className="bg-[#14ad9f] text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <Shield className="w-6 h-6 mr-2 text-[#14ad9f]" />
                    Sicherheitsprüfung
                  </h2>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Was wir prüfen:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Führungszeugnis:</strong> Bei sicherheitsrelevanten Services (z.B.
                          Haushaltsnahe Dienstleistungen)
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Schufa-Auskunft:</strong> Finanzielle Zuverlässigkeit bei größeren
                          Projekten
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Referenz-Validierung:</strong> Überprüfung von Kundenbewertungen
                          und Referenzen
                        </span>
                      </li>
                    </ul>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-orange-800">
                        <strong>Ihre Sicherheit:</strong> Bei services in Ihrem Zuhause oder mit
                        wertvollen Gegenständen führen wir erweiterte Sicherheitsprüfungen durch.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Quality Assessment */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <div className="flex items-start space-x-4">
                <div className="bg-[#14ad9f] text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <Camera className="w-6 h-6 mr-2 text-[#14ad9f]" />
                    Qualitätsbewertung
                  </h2>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Was wir prüfen:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Probeauftrag:</strong> Bei Premium-Anbietern führen wir
                          Testaufträge durch
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Portfolio-Bewertung:</strong> Fachliche Beurteilung bisheriger
                          Arbeiten
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mt-0.5 shrink-0" />
                        <span>
                          <strong>Kommunikationstest:</strong> Überprüfung der Kundenorientierung
                        </span>
                      </li>
                    </ul>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-purple-800">
                        <strong>Premium-Qualität:</strong> Anbieter mit &quot;Verifiziert&quot;
                        Badge haben alle Prüfungen mit Bestnote bestanden und werden regelmäßig
                        überwacht.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Levels */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Unsere Verifizierungsstufen
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Basic Verification */}
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Basis-Verifizierung</h3>
                <p className="text-gray-600 mb-4">
                  Identitätsprüfung und grundlegende Qualifikation
                </p>
                <div className="text-sm text-gray-500">
                  ✓ Personalausweis
                  <br />
                  ✓ Gewerbeschein
                  <br />✓ Basis-Referenzen
                </div>
              </div>

              {/* Standard Verification */}
              <div className="bg-blue-50 rounded-xl p-6 text-center border-2 border-blue-200">
                <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Standard-Verifizierung</h3>
                <p className="text-gray-600 mb-4">Erweiterte Prüfung für mehr Sicherheit</p>
                <div className="text-sm text-gray-500">
                  ✓ Basis + Versicherung
                  <br />
                  ✓ Referenz-Validierung
                  <br />✓ Portfolio-Bewertung
                </div>
              </div>

              {/* Premium Verification */}
              <div className="bg-[#14ad9f] bg-opacity-10 rounded-xl p-6 text-center border-2 border-[#14ad9f]">
                <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Premium-Verifizierung</h3>
                <p className="text-gray-600 mb-4">Höchste Qualitäts- und Sicherheitsstandards</p>
                <div className="text-sm text-gray-500">
                  ✓ Standard + Probeauftrag
                  <br />
                  ✓ Führungszeugnis
                  <br />✓ Kontinuierliche Überwachung
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-16 bg-gray-50 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-[#14ad9f]" />
              Wie lange dauert die Verifizierung?
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-[#14ad9f] rounded-full"></div>
                <span>
                  <strong>Basis-Verifizierung:</strong> 1-2 Werktage
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>
                  <strong>Standard-Verifizierung:</strong> 3-5 Werktage
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>
                  <strong>Premium-Verifizierung:</strong> 5-10 Werktage
                </span>
              </div>
            </div>
            <p className="text-gray-600 mt-4">
              Die Dauer hängt von der Vollständigkeit der eingereichten Unterlagen ab. Fehlende
              Dokumente können den Prozess verzögern.
            </p>
          </div>

          {/* Call to Action */}
          <div className="mt-16 bg-linear-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Vertrauen Sie auf geprüfte Qualität</h2>
            <p className="text-xl text-[#e6fffe] mb-6">
              Buchen Sie Services von verifizierten Anbietern und profitieren Sie von unserem
              mehrstufigen Qualitätssicherungsprozess.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/services"
                className="bg-white text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Services durchstöbern
              </Link>
              <Link
                href="/register/company"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-[#14ad9f] transition-colors"
              >
                Als Anbieter registrieren
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
