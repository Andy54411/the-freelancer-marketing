'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  Users,
  CalendarDays,
  Clock,
  Plane,
  BarChart3,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  DollarSign,
} from 'lucide-react';

const featuresData = [
  {
    icon: Users,
    title: 'Mitarbeiterverwaltung',
    description: 'Alle Mitarbeiterdaten zentral verwalten. Stammdaten, Vertrage und Qualifikationen.',
  },
  {
    icon: CalendarDays,
    title: 'Dienstplanung',
    description: 'Schichtplane erstellen und verwalten. Mit Wunschzeiten und automatischer Optimierung.',
  },
  {
    icon: Clock,
    title: 'Zeiterfassung',
    description: 'Arbeitszeiten per App oder Terminal erfassen. Gesetzeskonform und automatisch berechnet.',
  },
  {
    icon: DollarSign,
    title: 'Gehaltsabrechnung',
    description: 'Löhne und Gehälter berechnen. Export für DATEV und andere Lohnbuchhaltungssysteme.',
  },
  {
    icon: Plane,
    title: 'Urlaub & Abwesenheit',
    description: 'Urlaubsanträge, Krankmeldungen und Abwesenheiten digital verwalten.',
  },
  {
    icon: BarChart3,
    title: 'Personal-Analytics',
    description: 'Auswertungen zu Arbeitszeiten, Kosten und Produktivität auf einen Blick.',
  },
];

const workflowSteps = [
  {
    step: 1,
    title: 'Mitarbeiter anlegen',
    description: 'Erfassen Sie Stammdaten und laden Sie Dokumente hoch.',
  },
  {
    step: 2,
    title: 'Dienstplan erstellen',
    description: 'Planen Sie Schichten und berücksichtigen Sie Wunschzeiten.',
  },
  {
    step: 3,
    title: 'Zeit erfassen',
    description: 'Mitarbeiter stempeln per App ein und aus.',
  },
  {
    step: 4,
    title: 'Auswerten & Exportieren',
    description: 'Generieren Sie Reports und exportieren Sie zu DATEV.',
  },
];

const benefitsData = [
  {
    title: 'Für HR & Geschäftsführung',
    benefits: [
      'Zentrale Verwaltung aller Personaldaten',
      'Übersicht über alle Arbeitszeiten und Kosten',
      'Automatische Compliance mit Arbeitszeitgesetz',
      'Detaillierte Auswertungen und Reports',
      'Nahtloser DATEV-Export',
    ],
  },
  {
    title: 'Für Mitarbeiter',
    benefits: [
      'Einfache Zeiterfassung per App',
      'Dienstplan immer dabei',
      'Urlaubsanträge digital stellen',
      'Eigene Arbeitszeiten einsehen',
      'Wunschzeiten angeben',
    ],
  },
];

const statsData = [
  { value: 'All-in-One', label: 'HR-Losung' },
  { value: '< 5 Min', label: 'Dienstplan erstellen' },
  { value: '100%', label: 'Arbeitszeitgesetz-konform' },
];

export default function HRManagementPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700">
        <HeroHeader />

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-left"
              >
                <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
                  Business Solutions
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Personal-<br />
                  <span className="text-teal-200">management</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Dienstplanung, Zeiterfassung und Gehaltsabrechnung in einem System. 
                  Sparen Sie Zeit und behalten Sie den Überblick über Ihr Team.
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
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden lg:block"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Dienstplan - KW 51</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-5 gap-2 text-xs text-center mb-3">
                        <span className="text-gray-500">Mo</span>
                        <span className="text-gray-500">Di</span>
                        <span className="text-gray-500">Mi</span>
                        <span className="text-gray-500">Do</span>
                        <span className="text-gray-500">Fr</span>
                      </div>
                      {['Max M.', 'Anna S.', 'Peter W.'].map((name, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-700 w-16">{name}</span>
                          <div className="flex-1 grid grid-cols-5 gap-1">
                            {[...Array(5)].map((_, j) => (
                              <div
                                key={j}
                                className={`h-8 rounded text-xs flex items-center justify-center ${
                                  Math.random() > 0.2
                                    ? 'bg-[#14ad9f]/20 text-[#14ad9f]'
                                    : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                {Math.random() > 0.2 ? '8h' : '-'}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {statsData.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/80 text-lg">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Alles für Ihr Personalmanagement
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Von der Einstellung bis zur Abrechnung - alles in einem System
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresData.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-[#14ad9f]/10 rounded-xl flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-[#14ad9f]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              So einfach funktioniert es
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              In vier Schritten zum effizienten Personalmanagement
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {workflowSteps.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-gray-50 rounded-2xl p-6 h-full">
                  <div className="w-12 h-12 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
                {index < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-[#14ad9f]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Vorteile für alle Beteiligten
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefitsData.map((group, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-2 border-gray-100 shadow-lg">
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-linear-to-r from-[#14ad9f] to-teal-600">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Starten Sie jetzt mit modernem Personalmanagement
          </h2>
          <p className="text-xl text-white/90 mb-10">
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
              <Link href="/features/business">Alle Features ansehen</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
