'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';

// Helper function to create slugs for feature detail pages
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .trim();
};
import {
  Search,
  Shield,
  CreditCard,
  Smartphone,
  Bell,
  Users,
  Clock,
  Star,
  MapPin,
  Zap,
  BarChart3,
  Globe,
  HeadphonesIcon,
  Briefcase,
  Home,
  Wrench,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Calendar,
  FileText,
  Settings,
} from 'lucide-react';

const featuresData = {
  hero: {
    title: 'Features die Taskilo auszeichnen',
    subtitle: 'Entdecken Sie alle Funktionen unserer modernen Service-Plattform',
    description:
      'Von der intelligenten Anbietersuche bis zur sicheren Zahlungsabwicklung - Taskilo bietet alles, was Sie für erfolgreiche Service-Projekte benötigen.',
  },

  categories: [
    {
      title: '🔍 Intelligente Suche & Matching',
      description: 'Finden Sie den perfekten Dienstleister',
      features: [
        {
          icon: Search,
          title: 'KI-basierte Anbietersuche',
          description:
            'Intelligente Algorithmen finden den perfekten Match für Ihr Projekt basierend auf Standort, Verfügbarkeit und Expertise.',
        },
        {
          icon: MapPin,
          title: 'Geo-lokalisierte Suche',
          description:
            'Finden Sie Dienstleister in Ihrer direkten Umgebung mit präziser Standortbestimmung und Radiusfilter.',
        },
        {
          icon: Star,
          title: 'Bewertungsbasiertes Ranking',
          description:
            'Sortierung nach Kundenbewertungen, Abschlussquote und Qualitätskriterien für optimale Ergebnisse.',
        },
        {
          icon: Zap,
          title: 'Sofortbuchung verfügbar',
          description:
            'Direktbuchung bei verfügbaren Anbietern ohne Wartezeit - ideal für dringende Projekte.',
        },
      ],
    },

    {
      title: '🛡️ Sicherheit & Vertrauen',
      description: 'Maximaler Schutz für alle Beteiligten',
      features: [
        {
          icon: Shield,
          title: 'Verifizierte Dienstleister',
          description:
            'Alle Anbieter durchlaufen einen mehrstufigen Verifikationsprozess inklusive Identitätsprüfung und Qualifikationsnachweis.',
        },
        {
          icon: CheckCircle,
          title: 'Qualitätsgarantie',
          description:
            'Geld-zurück-Garantie bei nicht zufriedenstellender Leistung mit unserem umfassenden Schutzprogramm.',
        },
        {
          icon: FileText,
          title: 'Transparente Verträge',
          description:
            'Klare Projektbeschreibungen, Preise und Bedingungen - alles digital dokumentiert und rechtlich bindend.',
        },
        {
          icon: HeadphonesIcon,
          title: '24/7 Support-System',
          description:
            'Unser KI-gestützter Support ist rund um die Uhr verfügbar für alle Fragen und Probleme.',
        },
      ],
    },

    {
      title: '💳 Moderne Zahlungssysteme',
      description: 'Sichere und flexible Bezahlung',
      features: [
        {
          icon: CreditCard,
          title: 'Stripe-Integration',
          description:
            'Sichere Zahlungsabwicklung mit Stripe - alle gängigen Zahlungsmethoden inklusive SEPA, Kreditkarte und PayPal.',
        },
        {
          icon: DollarSign,
          title: '3 Abrechnungsmodelle',
          description:
            'Festpreis (B2C), Meilenstein-basiert (B2B) oder Stundenabrechnung - je nach Projektanforderung.',
        },
        {
          icon: Settings,
          title: 'Escrow-Service',
          description:
            'Treuhänderservice hält Zahlungen sicher bis zur erfolgreichen Projektabwicklung.',
        },
        {
          icon: BarChart3,
          title: 'Automatische Rechnungen',
          description:
            'Integration mit DATEV und sevdesk für automatische Buchhaltung und steuerconforme Rechnungsstellung.',
        },
      ],
    },

    {
      title: '📱 Digital-First Experience',
      description: 'Modern und benutzerfreundlich',
      features: [
        {
          icon: Smartphone,
          title: 'Mobile-First Design',
          description:
            'Optimiert für alle Geräte - von Desktop bis Smartphone mit progressiver Web-App Funktionalität.',
        },
        {
          icon: Bell,
          title: 'Smart Notifications',
          description:
            'Echtzeit-Benachrichtigungen über Projektfortschritt, Nachrichten und wichtige Updates.',
        },
        {
          icon: Globe,
          title: 'Multi-Platform App',
          description:
            'Native iOS und Android Apps zusätzlich zur Web-Plattform für optimale Nutzererfahrung.',
        },
        {
          icon: Zap,
          title: 'Blitzschnelle Performance',
          description: 'Next.js 15 basierte Architektur für Ladezeiten unter 2 Sekunden weltweit.',
        },
      ],
    },

    {
      title: '🏢 Business Features',
      description: 'Professionelle Tools für Unternehmen',
      features: [
        {
          icon: Briefcase,
          title: 'B2B Dashboard',
          description:
            'Umfassendes Management-Dashboard für Unternehmen mit Projektübersicht, Team-Management und Reporting.',
        },
        {
          icon: Users,
          title: 'Team & Rollen',
          description:
            'Multi-User Accounts mit Rollenverwaltung - von Mitarbeitern bis Geschäftsführung.',
        },
        {
          icon: TrendingUp,
          title: 'Business Intelligence',
          description:
            'Detaillierte Analytics, Performance-Tracking und ROI-Analyse für strategische Entscheidungen.',
        },
        {
          icon: Calendar,
          title: 'Projektmanagement',
          description:
            'Integrierte Zeiterfassung, Meilenstein-Tracking und Deadline-Management für komplexe Projekte.',
        },
      ],
    },

    {
      title: '🎯 Service-Kategorien',
      description: 'Vielfältige Dienstleistungen',
      features: [
        {
          icon: Home,
          title: 'Haushaltsservices',
          description:
            'Reinigung, Gartenpflege, Umzüge, Kinderbetreuung und alle Dienstleistungen rund ums Heim.',
        },
        {
          icon: Wrench,
          title: 'Handwerk & Reparaturen',
          description:
            'Elektriker, Klempner, Maler, Schreiner und alle handwerklichen Fachkräfte mit Qualifikationsnachweis.',
        },
        {
          icon: Globe,
          title: 'Digitale Services',
          description:
            'Webdesign, Marketing, IT-Support, Grafikdesign und alle digitalen Dienstleistungen.',
        },
        {
          icon: Briefcase,
          title: 'Business Services',
          description:
            'Beratung, Buchhaltung, Übersetzungen, Legal Services und professionelle B2B-Dienstleistungen.',
        },
      ],
    },
  ],

  stats: [
    { number: '10,000+', label: 'Verifizierte Dienstleister' },
    { number: '50,000+', label: 'Erfolgreiche Projekte' },
    { number: '4.9/5', label: 'Durchschnittliche Bewertung' },
    { number: '24/7', label: 'Support verfügbar' },
  ],

  integrations: [
    { name: 'Stripe', description: 'Sichere Zahlungen' },
    { name: 'Google Ads', description: 'Marketing Integration' },
    { name: 'DATEV', description: 'Buchhaltung' },
    { name: 'sevdesk', description: 'Rechnungsstellung' },
    { name: 'Firebase', description: 'Cloud Backend' },
    { name: 'Gemini AI', description: 'KI-Support' },
  ],
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Navigation Header */}
        <HeroHeader />

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
              Alle Features im Überblick
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              {featuresData.hero.title}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-4 max-w-4xl mx-auto drop-shadow-md">
              {featuresData.hero.subtitle}
            </p>
            <p className="text-lg text-white/80 mb-8 max-w-3xl mx-auto">
              {featuresData.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-3 shadow-lg border-2 border-white"
              >
                <Link href="/auftrag/get-started">Jetzt Service buchen</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-3 shadow-lg bg-transparent"
              >
                <Link href="/register/company/step1">Als Anbieter registrieren</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {featuresData.stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                    {stat.number}
                  </div>
                  <div className="text-white/80 text-sm md:text-base">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Sections */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto space-y-20">
            {featuresData.categories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                    {category.title}
                  </h2>
                  <p className="text-xl text-white/80 max-w-3xl mx-auto">{category.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {category.features.map((feature, featureIndex) => {
                    const featureSlug = createSlug(feature.title);
                    return (
                      <Link key={featureIndex} href={`/features/${featureSlug}`}>
                        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer group">
                          <CardHeader>
                            <div className="flex items-center space-x-3">
                              <div className="p-3 bg-[#14ad9f]/10 rounded-lg group-hover:bg-[#14ad9f]/20 transition-colors">
                                <feature.icon className="h-6 w-6 text-[#14ad9f]" />
                              </div>
                              <CardTitle className="text-xl text-gray-900 group-hover:text-[#14ad9f] transition-colors">
                                {feature.title}
                              </CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-gray-600 text-base leading-relaxed">
                              {feature.description}
                            </CardDescription>
                            <div className="mt-4 text-[#14ad9f] text-sm font-medium group-hover:underline">
                              Mehr erfahren →
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
              🔗 Nahtlose Integrationen
            </h2>
            <p className="text-xl text-white/80 mb-12">
              Taskilo arbeitet mit den besten Tools zusammen
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {featuresData.integrations.map((integration, index) => (
                <Card
                  key={index}
                  className="bg-white/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold text-gray-900 mb-2">{integration.name}</h3>
                    <p className="text-sm text-gray-600">{integration.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 drop-shadow-lg">
              Bereit für Ihr nächstes Projekt?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Starten Sie noch heute und erleben Sie die Zukunft der Service-Vermittlung
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-3 shadow-lg border-2 border-white"
              >
                <Link href="/auftrag/get-started">Projekt starten</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-3 shadow-lg bg-transparent"
              >
                <Link href="/register/company/step1">Anbieter werden</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
