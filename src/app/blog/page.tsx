'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Zap,
  CreditCard,
  ChevronDown,
  Shield,
  Clock,
  DollarSign,
  Star,
  CheckCircle,
  MessageSquare,
  Phone,
  Mail,
  Wrench,
  Home,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
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
    icon: Zap,
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
    icon: CreditCard,
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
    icon: Shield,
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
    icon: Wrench,
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
    icon: MessageSquare,
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
function FAQItem({ faq, index }: { faq: { question: string; answer: string }; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      viewport={{ once: true }}
      className="border border-gray-200 rounded-lg bg-white/95 backdrop-blur-sm overflow-hidden"
    >
      <motion.button
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ backgroundColor: 'rgba(20, 173, 159, 0.05)' }}
      >
        <span className="font-medium text-gray-900">{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-[#14ad9f] shrink-0 ml-2" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4">
              <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// FAQ Section Component
function FAQSection({ section, sectionIndex }: { section: (typeof faqSections)[0]; sectionIndex: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
      viewport={{ once: true, margin: '-50px' }}
      className="mb-12"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 bg-linear-to-br from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center"
          >
            <section.icon className="text-white w-6 h-6" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
        </div>

        <div className="space-y-4">
          {section.faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&q=80"
          alt="Help Center Background"
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/90 to-teal-700/95" />
      </div>
      <div className="relative z-10">
        <HeroHeader />

        {/* Breadcrumb Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="text-white/90 hover:text-white transition-colors flex items-center">
                    <Home className="w-4 h-4 mr-1" />
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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white py-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg tracking-tight">
              Taskilo Hilfe & Information
            </h1>
            <p className="text-xl text-white/95 drop-shadow-md mb-6 max-w-3xl leading-relaxed">
              Alles was Sie über Taskilo wissen müssen - von ersten Schritten bis zu erweiterten
              Features. Sichere Zahlungen, geprüfte Dienstleister und transparente Preise.
            </p>
            <div className="flex flex-wrap gap-6 text-base text-white/90">
              {[
                { icon: CheckCircle, text: 'Kostenlose Registrierung' },
                { icon: Shield, text: '100% sichere Zahlungen' },
                { icon: Star, text: 'Geprüfte Dienstleister' },
              ].map((item, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <item.icon className="text-white w-5 h-5" />
                  {item.text}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-white/98 backdrop-blur-sm rounded-xl shadow-2xl p-8 mb-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Schnellnavigation</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {faqSections.map((section, index) => (
                <motion.a
                  key={section.id}
                  href={`#${section.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.02, borderColor: '#14ad9f' }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-[#14ad9f]/5 transition-all group"
                >
                  <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                    <section.icon className="w-5 h-5 text-[#14ad9f] group-hover:text-taskilo-hover" />
                  </motion.div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-taskilo-hover">
                    {section.title}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Platform Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
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
                {[
                  { icon: Home, title: 'Haushaltsservices', desc: 'Reinigung, Gartenpflege, Handwerk, Umzüge und mehr' },
                  { icon: Wrench, title: 'Handwerk', desc: 'Maler, Elektriker, Klempner, Schreiner und Fachkräfte' },
                  { icon: Zap, title: 'Digitale Services', desc: 'Webdesign, Marketing, IT-Support, Grafik und mehr' },
                  { icon: Briefcase, title: 'Business Services', desc: 'Beratung, Übersetzungen, Buchhaltung, Legal Services' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="text-center p-6 bg-linear-to-br from-[#14ad9f]/10 to-[#14ad9f]/20 rounded-lg border border-[#14ad9f]/30"
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 bg-linear-to-br from-[#14ad9f] to-taskilo-hover rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <item.icon className="text-white w-7 h-7" />
                    </motion.div>
                    <h3 className="font-semibold mb-2 text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>

        {/* FAQ Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {faqSections.map((section, sectionIndex) => (
            <div key={section.id} id={section.id}>
              <FAQSection section={section} sectionIndex={sectionIndex} />
            </div>
          ))}
        </div>

        {/* Existing Articles */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detaillierte Anleitungen</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.a
                  href="/blog/zahlungsablaeufe"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <CreditCard className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Zahlungsabläufe bei Taskilo
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Komplette Anleitung zu sicheren Zahlungen, Stripe Connect und
                        Abrechnungsprozessen für Kunden und Dienstleister.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>5 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Zahlungen & Sicherheit</span>
                      </div>
                    </div>
                  </div>
                </motion.a>

                <motion.a
                  href="/blog/preisinformationen"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <DollarSign className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Preisinformationen & Tarife
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Transparente Preisstrukturen, Kostenfaktoren und Richtwerte für alle
                        Service-Kategorien bei Taskilo.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>6 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Preise & Kostenübersicht</span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <motion.a
                  href="/blog/verifizierungsprozess"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-green-500 to-green-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <Shield className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Unser Verifizierungsprozess
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Schritt-für-Schritt Erklärung, wie wir Anbieter prüfen: Personalausweis,
                        Gewerbeschein, Referenzen und Zertifikate für Ihr Vertrauen.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>4 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Qualität & Sicherheit</span>
                      </div>
                    </div>
                  </div>
                </motion.a>

                <motion.a
                  href="/blog/kaeufer-schutz-garantie"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <Shield className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Käuferschutz & Garantie
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Detaillierte Erklärung der sicheren Bezahlung, Geld-zurück-Garantie,
                        Schlichtungsverfahren und Absicherung bis 10.000€.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>7 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Käuferschutz & Garantien</span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <motion.a
                  href="/blog/umzugscheckliste"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <Home className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Checkliste für den Umzug
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Kompletter 8-Wochen-Leitfaden mit Zeitplan, Kostenübersicht und Profi-Tipps
                        für einen stressfreien Umzug.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>8 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Umzug & Planung</span>
                      </div>
                    </div>
                  </div>
                </motion.a>

                <motion.a
                  href="/blog/renovierungsfehler"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-red-500 to-red-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <Wrench className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Die 5 häufigsten Fehler bei der Renovierung
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Vermeiden Sie teure Renovierungsfehler! Expertenratschläge für Planung,
                        Budget und Umsetzung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>6 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Renovierung & Tipps</span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <motion.a
                  href="/blog/wann-elektriker"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-yellow-500 to-yellow-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <Zap className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Wann brauche ich einen professionellen Elektriker?
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Sicherheits-Leitfaden: Welche Elektroarbeiten Sie selbst machen dürfen und
                        wann der Profi ran muss.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>7 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Elektro & Sicherheit</span>
                      </div>
                    </div>
                  </div>
                </motion.a>

                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="bg-linear-to-r from-gray-100 to-gray-200 rounded-lg p-6 border-2 border-dashed border-gray-300"
                >
                  <div className="flex items-start gap-4">
                    <BookOpen className="w-6 h-6 text-gray-500 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-gray-700">
                        Weitere Kunden-Ratgeber
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Mehr praktische Tipps und Anleitungen für Hausbesitzer sind in Vorbereitung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Zap className="w-3 h-3" />
                        <span>Bald verfügbar</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.section>

          {/* Neue Sektion für Anbieter */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Leitfäden für Dienstleister</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.a
                  href="/blog/perfektes-angebot"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-indigo-500 to-indigo-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <Briefcase className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        So schreibst du das perfekte Angebot
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        7-Elemente-Framework für überzeugende Angebote: Von der Kostenaufstellung
                        bis zum professionellen Abschluss.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>9 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Angebote & Verkauf</span>
                      </div>
                    </div>
                  </div>
                </motion.a>

                <motion.a
                  href="/blog/kundenkommunikation"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-pink-500 to-pink-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <MessageSquare className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Tipps zur Kundenkommunikation auf Taskilo
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        5-Phasen-Kommunikationsstrategie: Vom ersten Kontakt bis zur perfekten
                        Bewertung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>8 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Kommunikation & Service</span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <motion.a
                  href="/blog/steuer-grundlagen"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-emerald-500 to-emerald-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <DollarSign className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        Steuer-Grundlagen für Selbstständige
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Kompletter Steuer-Leitfaden: Gewerbeanmeldung, Umsatzsteuer, Buchhaltung und
                        Steuererklärung verständlich erklärt.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>12 Min. Lesezeit</span>
                        <span>•</span>
                        <span>Steuern & Finanzen</span>
                      </div>
                    </div>
                  </div>
                </motion.a>

                <motion.a
                  href="/blog/e-rechnung-leitfaden"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="block bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-lg p-6 shadow-md group"
                >
                  <div className="flex items-start gap-4">
                    <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                      <Briefcase className="w-6 h-6 mt-1" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        E-Rechnung 2025: Kompletter Leitfaden
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-sm text-white/90 mb-3">
                        Alles zur E-Rechnung-Pflicht: Übergangszeiten, Mindestbeträge, XRechnung &
                        ZUGFeRD Standards für Unternehmen.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <Clock className="w-3 h-3" />
                        <span>15 Min. Lesezeit</span>
                        <span>•</span>
                        <span>E-Rechnung & Digitalisierung</span>
                      </div>
                    </div>
                  </div>
                </motion.a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-linear-to-r from-gray-100 to-gray-200 rounded-lg p-6 border-2 border-dashed border-gray-300"
                >
                  <div className="flex items-start gap-4">
                    <BookOpen className="w-6 h-6 text-gray-500 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2 text-gray-700">Weitere Artikel</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Mehr detaillierte Anleitungen und Tutorials sind in Vorbereitung.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Zap className="w-3 h-3" />
                        <span>Bald verfügbar</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Contact & Support */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-12">
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Brauchen Sie weitere Hilfe?
                </h2>
                <p className="text-gray-600">Unser Support-Team hilft Ihnen gerne weiter</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: MessageSquare,
                    title: 'Live Chat',
                    info: 'Mo-Fr 9:00-18:00 Uhr',
                    buttonText: 'Chat starten',
                    href: '#',
                    color: '[#14ad9f]',
                    bgFrom: 'from-[#14ad9f]/10',
                    bgTo: 'to-teal-100',
                    border: 'border-[#14ad9f]/20',
                  },
                  {
                    icon: Mail,
                    title: 'E-Mail Support',
                    info: 'support@taskilo.de',
                    buttonText: 'E-Mail senden',
                    href: 'mailto:support@taskilo.de',
                    color: 'blue-500',
                    bgFrom: 'from-blue-50',
                    bgTo: 'to-blue-100',
                    border: 'border-blue-200',
                  },
                  {
                    icon: Phone,
                    title: 'Telefon',
                    info: '+49 (0) 30 1234 5678',
                    buttonText: 'Anrufen',
                    href: 'tel:+4930123456789',
                    color: 'green-500',
                    bgFrom: 'from-green-50',
                    bgTo: 'to-green-100',
                    border: 'border-green-200',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className={`text-center p-6 bg-linear-to-br ${item.bgFrom} ${item.bgTo} rounded-lg border ${item.border}`}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 + index * 0.1 }}
                      viewport={{ once: true }}
                      className={`w-12 h-12 bg-${item.color} rounded-full flex items-center justify-center mx-auto mb-4`}
                      style={{ backgroundColor: index === 0 ? '#14ad9f' : index === 1 ? '#3b82f6' : '#22c55e' }}
                    >
                      <item.icon className="text-white w-5 h-5" />
                    </motion.div>
                    <h3 className="font-semibold mb-2 text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{item.info}</p>
                    <motion.a
                      href={item.href}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`inline-block text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
                      style={{ backgroundColor: index === 0 ? '#14ad9f' : index === 1 ? '#3b82f6' : '#22c55e' }}
                    >
                      {item.buttonText}
                    </motion.a>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
