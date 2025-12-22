'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  Briefcase,
  Users,
  FileSearch,
  MessageSquare,
  BarChart3,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Share2,
  UserPlus,
} from 'lucide-react';

const featuresData = [
  {
    icon: Briefcase,
    title: 'Stellenanzeigen erstellen',
    description: 'Professionelle Stellenanzeigen in Minuten erstellen mit Vorlagen und KI-Unterstützung.',
  },
  {
    icon: Share2,
    title: 'Multi-Channel-Posting',
    description: 'Veroffentlichen Sie auf Indeed, StepStone, LinkedIn und Ihrer Karriereseite.',
  },
  {
    icon: FileSearch,
    title: 'Bewerbermanagement',
    description: 'Alle Bewerbungen an einem Ort. Filtern, bewerten und vergleichen.',
  },
  {
    icon: MessageSquare,
    title: 'Kommunikation',
    description: 'E-Mail-Vorlagen und automatische Benachrichtigungen für Bewerber.',
  },
  {
    icon: Users,
    title: 'Team-Kollaboration',
    description: 'Kollegen einladen, Bewertungen teilen und gemeinsam entscheiden.',
  },
  {
    icon: BarChart3,
    title: 'Recruiting-Analytics',
    description: 'Auswertungen zu Kanalen, Zeit bis zur Einstellung und Kosten pro Hire.',
  },
];

const processSteps = [
  {
    step: 1,
    title: 'Stelle ausschreiben',
    description: 'Erstellen Sie eine Stellenanzeige und veroffentlichen Sie auf mehreren Kanalen.',
  },
  {
    step: 2,
    title: 'Bewerbungen sammeln',
    description: 'Alle Bewerbungen kommen automatisch in Ihrem Dashboard an.',
  },
  {
    step: 3,
    title: 'Kandidaten bewerten',
    description: 'Filtern, vergleichen und bewerten Sie mit Ihrem Team.',
  },
  {
    step: 4,
    title: 'Einstellen',
    description: 'Senden Sie Zusagen und übernehmen Sie Kandidaten in die Personalverwaltung.',
  },
];

const statsData = [
  { value: '70%', label: 'schneller besetzte Stellen' },
  { value: '10+', label: 'Jobportale angebunden' },
  { value: '5x', label: 'mehr Reichweite' },
];

const jobPreviewData = [
  { title: 'Senior Entwickler (m/w/d)', location: 'München', status: 'Aktiv', applications: 23 },
  { title: 'Marketing Manager (m/w/d)', location: 'Remote', status: 'Aktiv', applications: 15 },
  { title: 'Buchhalter (m/w/d)', location: 'Berlin', status: 'Entwurf', applications: 0 },
];

export default function RecruitingPage() {
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
                  Recruiting &<br />
                  <span className="text-teal-200">Stellenanzeigen</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Finden Sie die besten Talente für Ihr Unternehmen. 
                  Stellenanzeigen erstellen, veroffentlichen und Bewerbungen verwalten.
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
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Offene Stellen</h3>
                      <Button size="sm" className="bg-[#14ad9f] hover:bg-[#14ad9f]/90 text-xs">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Neue Stelle
                      </Button>
                    </div>
                    <div className="p-4 space-y-3">
                      {jobPreviewData.map((job, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                            <p className="text-xs text-gray-500">{job.location}</p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                job.status === 'Aktiv'
                                  ? 'bg-green-50 text-green-600 border-green-200'
                                  : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}
                            >
                              {job.status}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">{job.applications} Bewerbungen</p>
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
              Alles für erfolgreiches Recruiting
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Von der Stellenanzeige bis zur Einstellung - alles in einem System
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

      {/* Process Section */}
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
              Der Recruiting-Prozess
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              In vier Schritten zum neuen Teammitglied
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {processSteps.map((item, index) => (
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
                {index < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="h-6 w-6 text-[#14ad9f]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Channels Section */}
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
              Veroffentlichen Sie auf allen Kanalen
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mit einem Klick auf den beliebtesten Jobportalen prasent sein
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6">
            {['Indeed', 'StepStone', 'LinkedIn', 'Xing', 'Monster', 'Jobware', 'Ihre Karriereseite'].map((channel, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl px-6 py-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <span className="font-medium text-gray-700">{channel}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Warum Taskilo Recruiting?
              </h2>
              <ul className="space-y-4">
                {[
                  'Alle Bewerbungen an einem Ort verwalten',
                  'Zeit sparen durch Automatisierung',
                  'Bessere Kandidaten durch mehr Reichweite',
                  'Team-Kollaboration bei der Auswahl',
                  'Nahtlose Integration mit Personalverwaltung',
                  'Detaillierte Auswertungen und KPIs',
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-[#14ad9f] shrink-0" />
                    <span className="text-gray-700 text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gray-50 rounded-2xl p-8"
            >
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Bewerberpipeline</h3>
                <div className="space-y-4">
                  {[
                    { stage: 'Neu eingegangen', count: 12, color: 'bg-blue-100 text-blue-700' },
                    { stage: 'In Prüfung', count: 8, color: 'bg-yellow-100 text-yellow-700' },
                    { stage: 'Interview geplant', count: 4, color: 'bg-purple-100 text-purple-700' },
                    { stage: 'Angebot gesendet', count: 2, color: 'bg-green-100 text-green-700' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-700">{item.stage}</span>
                      <Badge className={`${item.color} border-0`}>{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
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
            Starten Sie jetzt mit modernem Recruiting
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
