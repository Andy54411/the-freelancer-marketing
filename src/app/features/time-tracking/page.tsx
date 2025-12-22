'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  Clock,
  Smartphone,
  MapPin,
  BarChart3,
  Users,
  Shield,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Calendar,
  FileText,
  TrendingUp,
} from 'lucide-react';

const statsData = [
  { value: '62%', label: 'Zeitersparnis bei der Erfassung' },
  { value: '100%', label: 'Gesetzeskonform' },
  { value: '< 3 Sek', label: 'Stempeln per App' },
];

const featuresData = [
  {
    icon: Smartphone,
    title: 'Mobile Stempeluhr',
    description: 'Mitarbeiter stempeln bequem per Smartphone-App ein und aus - auch im Außendienst.',
  },
  {
    icon: MapPin,
    title: 'GPS-Tracking',
    description: 'Optionales GPS-Tracking für Außendienst-Teams mit transparenter Standorterfassung.',
  },
  {
    icon: Calendar,
    title: 'Schichtplanung',
    description: 'Dienstpläne erstellen und automatisch mit der Zeiterfassung abgleichen.',
  },
  {
    icon: BarChart3,
    title: 'Überstunden-Berechnung',
    description: 'Automatische Berechnung von Überstunden, Zuschlägen und Pausenzeiten.',
  },
  {
    icon: FileText,
    title: 'DATEV-Export',
    description: 'Nahtloser Export zur Lohnbuchhaltung und Integration mit DATEV.',
  },
  {
    icon: Shield,
    title: 'Arbeitszeitgesetz',
    description: 'Vollständig konform mit dem deutschen Arbeitszeitgesetz und EU-Richtlinien.',
  },
];

const benefitsData = [
  {
    title: 'Für Unternehmen',
    benefits: [
      'Rechtssichere Dokumentation aller Arbeitszeiten',
      'Automatische Überstunden- und Zuschlagsberechnung',
      'Projektbezogene Zeiterfassung für genaue Kostenkalkulation',
      'Integration mit Lohnbuchhaltung spart Zeit und Fehler',
      'Übersichtliche Auswertungen und Reports',
    ],
  },
  {
    title: 'Für Mitarbeiter',
    benefits: [
      'Einfaches Stempeln per App oder Browser',
      'Transparente Übersicht über eigene Arbeitszeiten',
      'Urlaubsanträge und Abwesenheiten digital verwalten',
      'Korrekturanfragen einfach einreichen',
      'Überstunden-Konto jederzeit einsehbar',
    ],
  },
];

const useCasesData = [
  {
    title: 'Handwerksbetriebe',
    description: 'Teams im Außendienst erfassen Zeiten projektbezogen vor Ort.',
    icon: Users,
  },
  {
    title: 'Dienstleister',
    description: 'Stundenbasierte Abrechnung mit automatischer Projekterfassung.',
    icon: TrendingUp,
  },
  {
    title: 'Home-Office',
    description: 'Flexible Erfassung für Teams mit hybriden Arbeitsmodellen.',
    icon: Smartphone,
  },
  {
    title: 'Schichtbetriebe',
    description: 'Wechselschichten und Nachtarbeit rechtssicher dokumentieren.',
    icon: Clock,
  },
];

export default function TimeTrackingPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] to-teal-600 relative">
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      <div className="relative z-10">
        <HeroHeader />

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-left">
                <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
                  Unternehmenslösungen
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Zeiterfassung, <br />
                  <span className="text-teal-200">die einfach funktioniert</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Arbeitszeiten digital und gesetzeskonform erfassen. Mobile Stempeluhr, 
                  automatische Berechnungen und nahtlose Integration mit Ihrer Lohnbuchhaltung.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg"
                  >
                    <Link href="/register/company">
                      Jetzt kostenlos testen
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-4 bg-transparent"
                  >
                    <Link href="/contact">
                      <PlayCircle className="mr-2 h-5 w-5" />
                      Demo anfordern
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Max Mustermann</p>
                          <p className="text-white/70 text-sm">Eingestempelt seit 08:00</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500 text-white">Aktiv</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Anna Schmidt</p>
                          <p className="text-white/70 text-sm">Pause bis 12:30</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500 text-white">Pause</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Peter Weber</p>
                          <p className="text-white/70 text-sm">Heute: 7h 45min</p>
                        </div>
                      </div>
                      <Badge className="bg-gray-500 text-white">Feierabend</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {statsData.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/80 text-lg">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Alles für moderne Zeiterfassung
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                Von der mobilen Stempeluhr bis zum DATEV-Export - alles aus einer Hand
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuresData.map((feature, index) => (
                <Card key={index} className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#14ad9f]/10 rounded-xl">
                        <feature.icon className="h-6 w-6 text-[#14ad9f]" />
                      </div>
                      <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Vorteile für alle Beteiligten
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Zeiterfassung, die sowohl Unternehmen als auch Mitarbeitern nutzt
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {benefitsData.map((group, index) => (
                <Card key={index} className="border-2 border-gray-100 shadow-lg">
                  <CardHeader className="bg-[#14ad9f]/5">
                    <CardTitle className="text-2xl text-[#14ad9f]">{group.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-4">
                      {group.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-[#14ad9f] shrink-0 mt-0.5" />
                          <span className="text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Perfekt für jede Branche
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Flexible Zeiterfassung für unterschiedliche Arbeitsmodelle
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCasesData.map((useCase, index) => (
                <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <useCase.icon className="h-8 w-8 text-[#14ad9f]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{useCase.title}</h3>
                    <p className="text-gray-600 text-sm">{useCase.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-linear-to-r from-[#14ad9f] to-teal-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Starten Sie jetzt mit digitaler Zeiterfassung
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Kostenlos testen - keine Kreditkarte erforderlich
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg"
              >
                <Link href="/register/company">
                  Kostenlos registrieren
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-4 bg-transparent"
              >
                <Link href="/contact">Demo anfordern</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
