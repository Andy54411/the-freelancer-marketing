import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  ExternalLink, 
  Users, 
  FileText,
  Video,
  BookOpen,
  ArrowRight,
  Lightbulb,
  HelpCircle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kontakt & Community | Taskilo',
  description: 'Kontaktiere das Taskilo Support-Team oder stöbere in der Community für Hilfe und Tipps.',
};

export default function KontaktPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header/Appbar */}
      <header className="sticky top-0 z-50 border-b bg-white border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo and Product Name */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <Link 
                  href="/hilfe" 
                  className="text-sm font-medium text-gray-900 hover:text-teal-700"
                >
                  Taskilo Kalender Hilfe
                </Link>
              </div>
            </div>

            {/* Center: Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/hilfe"
                className="text-sm font-medium pb-4 pt-5 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
              >
                Hilfecenter
              </Link>
              <Link 
                href="/kontakt"
                className="text-sm font-medium pb-4 pt-5 border-b-2 border-teal-600 text-teal-600"
              >
                Kontakt
              </Link>
            </nav>

            {/* Right: Product Link */}
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                target="_blank"
              >
                <span>Taskilo Kalender</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-linear-to-b from-teal-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-linear-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 mb-4">
              Willkommen im Taskilo Support Center
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Finde Antworten, kontaktiere unser Team oder tausche dich mit der Community aus
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Beschreibe dein Anliegen..."
                  className="w-full px-4 py-3 pl-12 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  aria-label="Suche nach Hilfe-Artikeln"
                />
                <div className="absolute left-4 top-3.5 text-gray-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <button 
                  className="absolute right-3 top-2.5 bg-teal-600 text-white px-4 py-1.5 rounded-md hover:bg-teal-700 text-sm font-medium"
                  aria-label="Suchen"
                >
                  Suchen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Featured Articles */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-normal text-gray-900">
              Beliebte Hilfe-Artikel
            </h2>
            <Link 
              href="/hilfe" 
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Alle anzeigen
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Featured Card 1 */}
            <Link 
              href="/hilfe/terminplan/erstellen"
              className="group border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
            >
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2 group-hover:text-teal-600">
                Terminplan erstellen
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Erstelle deinen ersten Terminplan und ermögliche es Kunden, direkt bei dir zu buchen...
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Anleitung
                </span>
                <span>156 Upvotes</span>
              </div>
            </Link>

            {/* Featured Card 2 */}
            <Link 
              href="/hilfe/terminplan/verfuegbarkeit"
              className="group border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
            >
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2 group-hover:text-teal-600">
                Verfügbarkeit prüfen
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Erfahre, wie du Kalenderkonflikte vermeidest und deine Verfügbarkeit über mehrere Kalender...
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Anleitung
                </span>
                <span>89 Upvotes</span>
              </div>
            </Link>

            {/* Featured Card 3 */}
            <Link 
              href="/hilfe/terminplan/teilen"
              className="group border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white"
            >
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2 group-hover:text-teal-600">
                Terminplan teilen
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Teile deinen Terminplan über verschiedene Kanäle und erreiche deine Kunden dort, wo sie sind...
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Video
                </span>
                <span>112 Upvotes</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Contact Options */}
        <section className="mb-16">
          <h2 className="text-2xl font-normal text-gray-900 mb-6">
            Kontaktiere uns direkt
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Email Support */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">E-Mail Support</h3>
              <p className="text-sm text-gray-600 mb-4">
                Sende uns eine E-Mail und erhalte innerhalb von 24 Stunden eine Antwort.
              </p>
              <a 
                href="mailto:support@taskilo.de"
                className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                support@taskilo.de
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Live Chat */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Live Chat</h3>
              <p className="text-sm text-gray-600 mb-4">
                Chatte mit unserem Support-Team für schnelle Antworten.
              </p>
              <button className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium">
                Chat starten
                <ArrowRight className="w-3 h-3" />
              </button>
              <div className="mt-2 text-xs text-gray-500">
                Verfügbar: Mo-Fr, 9:00-18:00 Uhr
              </div>
            </div>

            {/* Phone Support */}
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Telefon Support</h3>
              <p className="text-sm text-gray-600 mb-4">
                Rufe uns an für persönliche Unterstützung bei komplexen Fragen.
              </p>
              <a 
                href="tel:+4930123456789"
                className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                +49 30 123 456 789
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="mt-2 text-xs text-gray-500">
                Verfügbar: Mo-Fr, 9:00-18:00 Uhr
              </div>
            </div>
          </div>
        </section>

        {/* Ask Community Card */}
        <section className="mb-16">
          <div className="bg-linear-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <Users className="w-8 h-8 text-teal-600" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nicht das, wonach du suchst?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Stelle deine Frage der Community und erhalte Hilfe von anderen Taskilo-Nutzern
                </p>
                <button className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg hover:bg-teal-700 font-medium">
                  Frage stellen
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-2xl font-normal text-gray-900 mb-6">
            Hilfe nach Kategorie
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category Cards */}
            {[
              {
                title: 'Terminplan erstellen',
                description: 'Erste Schritte mit Terminplänen und Buchungsseiten',
                count: '12 Artikel',
                href: '/hilfe/terminplan',
                color: 'teal'
              },
              {
                title: 'Kalender synchronisieren',
                description: 'Verbinde externe Kalender und vermeide Konflikte',
                count: '8 Artikel',
                href: '/hilfe/kalender',
                color: 'blue'
              },
              {
                title: 'Benachrichtigungen',
                description: 'Verwalte E-Mail- und Push-Benachrichtigungen',
                count: '6 Artikel',
                href: '/hilfe/benachrichtigungen',
                color: 'purple'
              },
              {
                title: 'Integrationen',
                description: 'Verbinde Taskilo mit deinen Lieblingstools',
                count: '15 Artikel',
                href: '/hilfe/integrationen',
                color: 'green'
              },
              {
                title: 'Zahlungen & Abrechnung',
                description: 'Verwalte dein Abonnement und Zahlungsmethoden',
                count: '10 Artikel',
                href: '/hilfe/zahlungen',
                color: 'orange'
              },
              {
                title: 'Datenschutz & Sicherheit',
                description: 'Schütze deine Daten und verwalte Zugriffsrechte',
                count: '7 Artikel',
                href: '/hilfe/sicherheit',
                color: 'red'
              },
            ].map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="group border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all bg-white"
              >
                <h3 className="font-medium text-gray-900 mb-2 group-hover:text-teal-600">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {category.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{category.count}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Useful Links Section */}
        <section className="mt-16 pt-8 border-t border-gray-200 mb-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Nützliche Links</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/about" className="hover:text-teal-600">Über Taskilo</Link>
                </li>
                <li>
                  <Link href="/community-richtlinien" className="hover:text-teal-600">Community-Richtlinien</Link>
                </li>
                <li>
                  <Link href="/product-expert" className="hover:text-teal-600">Product Expert werden</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Entwickler</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/status" className="hover:text-teal-600">Status-Seite</Link>
                </li>
                <li>
                  <Link href="/api-docs" className="hover:text-teal-600">API-Dokumentation</Link>
                </li>
                <li>
                  <Link href="/changelog" className="hover:text-teal-600">Changelog</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Folge uns</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="https://twitter.com/taskilo" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 flex items-center gap-1">
                    Twitter <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com/company/taskilo" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 flex items-center gap-1">
                    LinkedIn <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="https://github.com/taskilo" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 flex items-center gap-1">
                    GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
