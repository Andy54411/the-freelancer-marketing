'use client';

import React, { useState } from 'react';
import {
  FiBookOpen,
  FiZap,
  FiCreditCard,
  FiChevronDown,
  FiChevronUp,
  FiShield,
  FiClock,
  FiDollarSign,
  FiStar,
  FiCheckCircle,
  FiMessageSquare,
  FiPhone,
  FiMail,
  FiTool,
  FiHome,
  FiBriefcase,
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

// FAQ Data Structure
const faqSections = [
  {
    id: 'getting-started',
    title: 'Erste Schritte',
    icon: FiZap,
    faqs: [
      {
        question: 'Wie funktioniert Taskilo?',
        answer:
          'Taskilo ist eine Plattform, die Kunden mit qualifizierten Dienstleistern verbindet. Kunden können Services buchen, Preise vergleichen und sichere Zahlungen abwickeln. Dienstleister können ihr Profil erstellen, Services anbieten und Aufträge verwalten.',
      },
      {
        question: 'Ist die Registrierung kostenlos?',
        answer:
          'Ja, die Registrierung ist sowohl für Kunden als auch für Dienstleister völlig kostenlos. Sie zahlen nur, wenn Sie einen Service buchen oder erfolgreich einen Auftrag abschließen.',
      },
      {
        question: 'Welche Services gibt es auf Taskilo?',
        answer:
          'Taskilo bietet eine breite Palette von Services: Handwerksleistungen, Reinigung, IT-Support, Design, Marketing, Beratung und vieles mehr. Von einfachen Haushaltsaufgaben bis hin zu komplexen B2B-Projekten.',
      },
      {
        question: 'Wie finde ich den richtigen Dienstleister?',
        answer:
          'Nutzen Sie unsere Suchfunktion, Filter nach Kategorien, Bewertungen und Preisen. Jeder Dienstleister hat ein detailliertes Profil mit Bewertungen, Portfolios und Qualifikationen.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Zahlungen & Preise',
    icon: FiCreditCard,
    faqs: [
      {
        question: 'Wie funktionieren die Zahlungen?',
        answer:
          'Alle Zahlungen laufen sicher über Stripe. Bei Festpreisprojekten wird das Geld treuhänderisch verwaltet und erst nach erfolgreicher Leistungserbringung freigegeben. Bei Stundenprojekten erfolgt die Abrechnung nach genehmigten Stunden.',
      },
      {
        question: 'Welche Zahlungsmethoden werden akzeptiert?',
        answer:
          'Wir akzeptieren alle gängigen Kreditkarten (Visa, Mastercard, American Express), SEPA-Lastschrift, Sofortüberweisung, PayPal und weitere lokale Zahlungsmethoden.',
      },
      {
        question: 'Fallen zusätzliche Gebühren an?',
        answer:
          'Für Kunden ist die Nutzung kostenfrei. Dienstleister zahlen eine geringe Provision (5-15%) nur bei erfolgreich abgeschlossenen Projekten. Keine versteckten Kosten oder Abonnements.',
      },
      {
        question: 'Wie funktioniert die Preisgestaltung?',
        answer:
          'Dienstleister können Festpreise oder Stundensätze anbieten. Bei Stundenprojekten werden nur genehmigte Stunden abgerechnet. Transparente Kostenaufstellung vor jeder Zahlung.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Sicherheit & Schutz',
    icon: FiShield,
    faqs: [
      {
        question: 'Ist mein Geld sicher?',
        answer:
          'Ja, absolut. Wir verwenden ein Treuhandsystem (Escrow). Ihr Geld wird sicher verwahrt und erst nach erfolgreicher Leistungserbringung und Ihrer Freigabe an den Dienstleister übertragen.',
      },
      {
        question: 'Was passiert bei Problemen mit einem Service?',
        answer:
          'Wir haben ein umfassendes Dispute-Management. Bei Problemen können Sie eine Beschwerde einreichen. Unser Team prüft den Fall und vermittelt zwischen beiden Parteien für eine faire Lösung.',
      },
      {
        question: 'Sind die Dienstleister geprüft?',
        answer:
          'Alle Dienstleister durchlaufen einen Verifizierungsprozess. Identität, Qualifikationen und Gewerbeanmeldung werden geprüft. Zusätzlich bewerten Kunden jeden Service.',
      },
      {
        question: 'Wie schützt Taskilo meine Daten?',
        answer:
          'Wir verwenden moderne Verschlüsselung, sichere Server in Deutschland und befolgen strikt die DSGVO. Ihre Daten werden niemals an Dritte verkauft oder weitergegeben.',
      },
    ],
  },
  {
    id: 'for-providers',
    title: 'Für Dienstleister',
    icon: FiTool,
    faqs: [
      {
        question: 'Wie werde ich Dienstleister auf Taskilo?',
        answer:
          'Registrieren Sie sich kostenlos, vervollständigen Sie Ihr Profil mit Qualifikationen und Portfolio, durchlaufen Sie die Verifizierung und schon können Sie Services anbieten und Aufträge erhalten.',
      },
      {
        question: 'Wie bekomme ich mehr Aufträge?',
        answer:
          'Optimieren Sie Ihr Profil, sammeln Sie positive Bewertungen, antworten Sie schnell auf Anfragen, bieten Sie konkurrenzfähige Preise und nutzen Sie unsere Marketing-Tools.',
      },
      {
        question: 'Wann erhalte ich mein Geld?',
        answer:
          'Bei Festpreisprojekten nach Kundenfreigabe, bei Stundenprojekten nach Genehmigung der Stunden. Auszahlungen erfolgen automatisch auf Ihr hinterlegtes Bankkonto, in der Regel innerhalb von 2-3 Werktagen.',
      },
      {
        question: 'Kann ich auch als Unternehmen teilnehmen?',
        answer:
          'Ja, sowohl Einzelpersonen als auch Unternehmen können sich als Dienstleister registrieren. Für Unternehmen bieten wir spezielle B2B-Features und Rechnungstools.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support & Hilfe',
    icon: FiMessageSquare,
    faqs: [
      {
        question: 'Wie erreiche ich den Kundensupport?',
        answer:
          'Unser Support-Team ist Mo-Fr 9-18 Uhr über Live-Chat, E-Mail (support@taskilo.de) und Telefon erreichbar. Für Premium-Nutzer bieten wir 24/7-Support.',
      },
      {
        question: 'Gibt es eine mobile App?',
        answer:
          'Ja, unsere Apps für iOS und Android bieten alle Funktionen der Web-Plattform. Verfügbar im App Store und Google Play Store.',
      },
      {
        question: 'Kann ich Termine direkt buchen?',
        answer:
          'Ja, viele Dienstleister bieten Online-Terminbuchung an. Sie können verfügbare Zeiten einsehen und direkt buchen, ähnlich wie bei einem Friseur-Online-Termin.',
      },
      {
        question: 'Was ist das Bewertungssystem?',
        answer:
          'Nach jedem abgeschlossenen Projekt können beide Seiten eine Bewertung (1-5 Sterne) und Kommentar hinterlassen. Dies schafft Vertrauen und Transparenz in der Community.',
      },
    ],
  },
];

// FAQ Item Component
function FAQItem({ faq }: { faq: { question: string; answer: string } }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white/95 backdrop-blur-sm">
      <button
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-gray-900">{faq.question}</span>
        {isOpen ? (
          <FiChevronUp className="text-[#14ad9f] shrink-0 ml-2" />
        ) : (
          <FiChevronDown className="text-[#14ad9f] shrink-0 ml-2" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

// FAQ Section Component
function FAQSection({ section }: { section: (typeof faqSections)[0] }) {
  return (
    <section className="mb-12">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-linear-to-br from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
            <section.icon className="text-white text-xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
        </div>

        <div className="space-y-4">
          {section.faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-linear-to-br from-black/10 to-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />

        {/* Breadcrumb Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="text-white/90 hover:text-white transition-colors">
                    <FiHome className="w-4 h-4 mr-1 inline" />
                    Startseite
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/70" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white font-semibold">
                  Hilfe & Information
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* SEO-optimized Header */}
        <div className="text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg tracking-tight">
              Taskilo Hilfe & Information
            </h1>
            <p className="text-xl text-white/95 drop-shadow-md mb-6 max-w-3xl leading-relaxed">
              Alles was Sie über Taskilo wissen müssen - von ersten Schritten bis zu erweiterten
              Features. Sichere Zahlungen, geprüfte Dienstleister und transparente Preise.
            </p>
            <div className="flex flex-wrap gap-6 text-base text-white/90">
              <span className="flex items-center gap-2">
                <FiCheckCircle className="text-white w-5 h-5" />
                Kostenlose Registrierung
              </span>
              <span className="flex items-center gap-2">
                <FiShield className="text-white w-5 h-5" />
                100% sichere Zahlungen
              </span>
              <span className="flex items-center gap-2">
                <FiStar className="text-white w-5 h-5" />
                Geprüfte Dienstleister
              </span>
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/98 backdrop-blur-sm rounded-xl shadow-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Schnellnavigation</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {faqSections.map(section => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#14ad9f] hover:bg-[#14ad9f]/5 transition-all group"
                >
                  <section.icon className="text-[#14ad9f] group-hover:text-taskilo-hover" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-taskilo-hover">
                    {section.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Was ist Taskilo?</h2>
                <p className="text-lg text-gray-600 max-w-4xl mx-auto">
                  Taskilo ist Deutschlands moderne Service-Plattform, die Kunden mit qualifizierten
                  Dienstleistern verbindet. Von Handwerksleistungen bis hin zu digitalen Services -
                  alles an einem Ort, sicher und transparent.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-6 bg-linear-to-br from-[#14ad9f]/10 to-[#14ad9f]/20 rounded-lg border border-[#14ad9f]/30">
                  <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-[#129488] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiHome className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">Haushaltsservices</h3>
                  <p className="text-sm text-gray-600">
                    Reinigung, Gartenpflege, Handwerk, Umzüge und mehr
                  </p>
                </div>

                <div className="text-center p-6 bg-linear-to-br from-[#14ad9f]/10 to-[#14ad9f]/20 rounded-lg border border-[#14ad9f]/30">
                  <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-[#129488] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiTool className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">Handwerk</h3>
                  <p className="text-sm text-gray-600">
                    Maler, Elektriker, Klempner, Schreiner und Fachkräfte
                  </p>
                </div>

                <div className="text-center p-6 bg-linear-to-br from-[#14ad9f]/10 to-[#14ad9f]/20 rounded-lg border border-[#14ad9f]/30">
                  <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-[#129488] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiZap className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">Digitale Services</h3>
                  <p className="text-sm text-gray-600">
                    Webdesign, Marketing, IT-Support, Grafik und mehr
                  </p>
                </div>

                <div className="text-center p-6 bg-linear-to-br from-[#14ad9f]/10 to-[#14ad9f]/20 rounded-lg border border-[#14ad9f]/30">
                  <div className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-[#129488] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiBriefcase className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">Business Services</h3>
                  <p className="text-sm text-gray-600">
                    Beratung, Übersetzungen, Buchhaltung, Legal Services
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* FAQ Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {faqSections.map(section => (
            <div key={section.id} id={section.id}>
              <FAQSection section={section} />
            </div>
          ))}
        </div>

        {/* Existing Articles */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detaillierte Anleitungen</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a
                  href="/blog/zahlungsablaeufe"
                  className="block bg-linear-to-r from-[#14ad9f] to-teal-600 hover:from-[#129488] hover:to-teal-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiCreditCard className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Zahlungsabläufe bei Taskilo</h3>
                      <p className="text-sm text-white/90 mb-3">
                        Komplette Anleitung zu sicheren Zahlungen, Stripe Connect und
                        Abrechnungsprozessen für Kunden und Dienstleister.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>5 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Zahlungen & Sicherheit</span>
                      </div>
                    </div>
                  </div>
                </a>

                <a
                  href="/blog/preisinformationen"
                  className="block bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiDollarSign className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Preisinformationen & Tarife</h3>
                      <p className="text-sm text-white/90 mb-3">
                        Transparente Preisstrukturen, Kostenfaktoren und Richtwerte für alle
                        Service-Kategorien bei Taskilo.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>6 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Preise & Kostenübersicht</span>
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <a
                  href="/blog/verifizierungsprozess"
                  className="block bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiShield className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Unser Verifizierungsprozess</h3>
                      <p className="text-sm text-white/90 mb-3">
                        Schritt-für-Schritt Erklärung, wie wir Anbieter prüfen: Personalausweis,
                        Gewerbeschein, Referenzen und Zertifikate für Ihr Vertrauen.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>4 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Qualität & Sicherheit</span>
                      </div>
                    </div>
                  </div>
                </a>

                <a
                  href="/blog/kaeufer-schutz-garantie"
                  className="block bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiShield className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Käuferschutz & Garantie</h3>
                      <p className="text-sm text-white/90 mb-3">
                        Detaillierte Erklärung der sicheren Bezahlung, Geld-zurück-Garantie,
                        Schlichtungsverfahren und Absicherung bis 10.000€.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>7 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Käuferschutz & Garantien</span>
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <a
                  href="/blog/umzugscheckliste"
                  className="block bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiHome className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Checkliste für den Umzug</h3>
                      <p className="text-sm text-white/90 mb-3">
                        Kompletter 8-Wochen-Leitfaden mit Zeitplan, Kostenübersicht und Profi-Tipps
                        für einen stressfreien Umzug.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>8 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Umzug & Planung</span>
                      </div>
                    </div>
                  </div>
                </a>

                <a
                  href="/blog/renovierungsfehler"
                  className="block bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiTool className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Die 5 häufigsten Fehler bei der Renovierung
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Vermeiden Sie teure Renovierungsfehler! Expertenratschläge für Planung,
                        Budget und Umsetzung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>6 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Renovierung & Tipps</span>
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <a
                  href="/blog/wann-elektriker"
                  className="block bg-linear-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiZap className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Wann brauche ich einen professionellen Elektriker?
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Sicherheits-Leitfaden: Welche Elektroarbeiten Sie selbst machen dürfen und
                        wann der Profi ran muss.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>7 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Elektro & Sicherheit</span>
                      </div>
                    </div>
                  </div>
                </a>

                <div className="bg-linear-to-r from-gray-100 to-gray-200 rounded-lg p-6 border-2 border-dashed border-gray-300">
                  <div className="flex items-start gap-4">
                    <FiBookOpen className="text-2xl text-gray-500 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-gray-700">
                        Weitere Kunden-Ratgeber
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Mehr praktische Tipps und Anleitungen für Hausbesitzer sind in Vorbereitung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FiZap className="w-3 h-3" />
                        <span>Bald verfügbar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Neue Sektion für Anbieter */}
          <section className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Leitfäden für Dienstleister</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a
                  href="/blog/perfektes-angebot"
                  className="block bg-linear-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiBriefcase className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        So schreibst du das perfekte Angebot
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        7-Elemente-Framework für überzeugende Angebote: Von der Kostenaufstellung
                        bis zum professionellen Abschluss.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>9 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Angebote & Verkauf</span>
                      </div>
                    </div>
                  </div>
                </a>

                <a
                  href="/blog/kundenkommunikation"
                  className="block bg-linear-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiMessageSquare className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Tipps zur Kundenkommunikation auf Taskilo
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        5-Phasen-Kommunikationsstrategie: Vom ersten Kontakt bis zur perfekten
                        Bewertung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>8 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Kommunikation & Service</span>
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <a
                  href="/blog/steuer-grundlagen"
                  className="block bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiDollarSign className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Steuer-Grundlagen für Selbstständige
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Kompletter Steuer-Leitfaden: Gewerbeanmeldung, Umsatzsteuer, Buchhaltung und
                        Steuererklärung verständlich erklärt.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>12 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Steuern & Finanzen</span>
                      </div>
                    </div>
                  </div>
                </a>

                <a
                  href="/blog/e-rechnung-leitfaden"
                  className="block bg-linear-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <FiBriefcase className="text-2xl mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        E-Rechnung 2025: Kompletter Leitfaden
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Alles zur E-Rechnung-Pflicht: Übergangszeiten, Mindestbeträge, XRechnung &
                        ZUGFeRD Standards für Unternehmen.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <FiClock className="w-3 h-3" />
                        <span>15 Min. Lesezeit</span>
                        <span>•</span>
                        <span>E-Rechnung & Digitalisierung</span>
                      </div>
                    </div>
                  </div>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-linear-to-r from-gray-100 to-gray-200 rounded-lg p-6 border-2 border-dashed border-gray-300">
                  <div className="flex items-start gap-4">
                    <FiBookOpen className="text-2xl text-gray-500 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-gray-700">Weitere Artikel</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Mehr detaillierte Anleitungen und Tutorials sind in Vorbereitung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FiZap className="w-3 h-3" />
                        <span>Bald verfügbar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Contact & Support */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-12">
          <section>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Brauchen Sie weitere Hilfe?
                </h2>
                <p className="text-gray-600">Unser Support-Team hilft Ihnen gerne weiter</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-linear-to-br from-[#14ad9f]/10 to-teal-100 rounded-lg border border-[#14ad9f]/20">
                  <div className="w-12 h-12 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiMessageSquare className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">Live Chat</h3>
                  <p className="text-sm text-gray-600 mb-4">Mo-Fr 9:00-18:00 Uhr</p>
                  <button className="bg-[#14ad9f] hover:bg-taskilo-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Chat starten
                  </button>
                </div>

                <div className="text-center p-6 bg-linear-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiMail className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">E-Mail Support</h3>
                  <p className="text-sm text-gray-600 mb-4">support@taskilo.de</p>
                  <a
                    href="mailto:support@taskilo.de"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block"
                  >
                    E-Mail senden
                  </a>
                </div>

                <div className="text-center p-6 bg-linear-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiPhone className="text-white text-xl" />
                  </div>
                  <h3 className="font-semibold mb-2 text-gray-900">Telefon</h3>
                  <p className="text-sm text-gray-600 mb-4">+49 (0) 30 1234 5678</p>
                  <a
                    href="tel:+4930123456789"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block"
                  >
                    Anrufen
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
