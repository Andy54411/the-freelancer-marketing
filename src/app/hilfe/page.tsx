import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroHeader } from '@/components/hero8-header';
import { Calendar, Mail, FileText, Users, CreditCard, HelpCircle, ChevronRight, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hilfe & Support | Taskilo',
  description: 'Finde Antworten auf häufige Fragen und lerne, wie du Taskilo optimal nutzt.',
};

const helpCategories = [
  {
    icon: Calendar,
    title: 'Kalender & Terminplanung',
    description: 'Termine erstellen, Verfügbarkeit verwalten und Terminpläne teilen.',
    links: [
      { title: 'Terminplan erstellen', href: '/hilfe/terminplan/erstellen' },
      { title: 'Verfügbarkeit prüfen', href: '/hilfe/terminplan/verfuegbarkeit' },
      { title: 'Terminplan teilen', href: '/hilfe/terminplan/teilen' },
    ],
    color: 'bg-teal-50 text-teal-600',
  },
  {
    icon: Mail,
    title: 'E-Mail & Webmail',
    description: 'E-Mail-Konto einrichten, Nachrichten verwalten und Signaturen anpassen.',
    links: [
      { title: 'E-Mail einrichten', href: '/hilfe/email/einrichten' },
      { title: 'Signatur erstellen', href: '/hilfe/email/signatur' },
    ],
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: FileText,
    title: 'Rechnungen & Buchhaltung',
    description: 'Rechnungen erstellen, Ausgaben erfassen und GoBD-konform arbeiten.',
    links: [
      { title: 'Rechnung erstellen', href: '/hilfe/buchhaltung/rechnung-erstellen' },
      { title: 'Kleinunternehmer-Regelung', href: '/hilfe/buchhaltung/kleinunternehmer' },
    ],
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Users,
    title: 'Kunden & Kontakte',
    description: 'Kunden anlegen, Kontakte importieren und Kommunikation verwalten.',
    links: [
      { title: 'Kunden anlegen', href: '/hilfe/kunden/anlegen' },
      { title: 'Kontakte importieren', href: '/hilfe/kunden/importieren' },
    ],
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: CreditCard,
    title: 'Zahlungen & Banking',
    description: 'Bankkonten verbinden, Zahlungen empfangen und Auszahlungen verwalten.',
    links: [
      { title: 'Bankkonto verbinden', href: '/hilfe/banking/verbinden' },
      { title: 'Auszahlung anfordern', href: '/hilfe/banking/auszahlung' },
    ],
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: HelpCircle,
    title: 'Erste Schritte',
    description: 'Taskilo einrichten, Profil vervollständigen und loslegen.',
    links: [
      { title: 'Schnellstart', href: '/hilfe/erste-schritte/schnellstart' },
      { title: 'Profil einrichten', href: '/hilfe/erste-schritte/profil' },
    ],
    color: 'bg-pink-50 text-pink-600',
  },
];

export default function HilfePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeroHeader />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-50 via-white to-teal-50 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Wie können wir dir helfen?
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Finde Antworten auf deine Fragen oder kontaktiere unseren Support.
          </p>
          
          {/* Search Box */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Suche nach Hilfe-Artikeln..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 focus:outline-none text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category) => (
              <div
                key={category.title}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center mb-4`}>
                  <category.icon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {category.title}
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  {category.description}
                </p>
                <ul className="space-y-2">
                  {category.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center text-[#14ad9f] hover:text-teal-700 text-sm group"
                      >
                        <ChevronRight className="w-4 h-4 mr-1 group-hover:translate-x-1 transition-transform" />
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Keine Antwort gefunden?
          </h2>
          <p className="text-gray-600 mb-8">
            Unser Support-Team hilft dir gerne weiter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/kontakt"
              className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              Kontakt aufnehmen
            </Link>
            <Link
              href="mailto:support@taskilo.de"
              className="border-2 border-gray-200 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:border-gray-300 transition-colors"
            >
              support@taskilo.de
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
