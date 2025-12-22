'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  Calendar,
  Clock,
  Users,
  Bell,
  Repeat,
  Video,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  CalendarCheck,
  CalendarPlus,
  Share2,
} from 'lucide-react';

const featuresData = [
  {
    icon: Calendar,
    title: 'Terminverwaltung',
    description: 'Alle Termine übersichtlich im Kalender. Tag, Woche oder Monatsansicht.',
  },
  {
    icon: Users,
    title: 'Team-Kalender',
    description: 'Verfügbarkeiten des Teams sehen und Termine koordinieren.',
  },
  {
    icon: Repeat,
    title: 'Wiederkehrende Termine',
    description: 'Serienetermine erstellen für regelmäßige Meetings und Aufgaben.',
  },
  {
    icon: Bell,
    title: 'Erinnerungen',
    description: 'Automatische Benachrichtigungen per E-Mail und Push.',
  },
  {
    icon: Video,
    title: 'Video-Integration',
    description: 'Zoom, Google Meet und Microsoft Teams direkt integriert.',
  },
  {
    icon: Share2,
    title: 'Kalender-Sync',
    description: 'Synchronisierung mit Google Calendar, Outlook und iCal.',
  },
];

const statsData = [
  { value: '24/7', label: 'Online-Buchung' },
  { value: '3+', label: 'Kalender-Integrationen' },
  { value: '100%', label: 'Synchron' },
];

const upcomingEvents = [
  { title: 'Team-Meeting', time: '09:00', duration: '1h', type: 'video', color: 'bg-blue-100 text-blue-700' },
  { title: 'Kundentermin - Meier GmbH', time: '11:00', duration: '30min', type: 'person', color: 'bg-green-100 text-green-700' },
  { title: 'Projektbesprechung', time: '14:00', duration: '2h', type: 'video', color: 'bg-purple-100 text-purple-700' },
  { title: 'Telefonat - Herr Schmidt', time: '16:30', duration: '15min', type: 'phone', color: 'bg-yellow-100 text-yellow-700' },
];

export default function CalendarPage() {
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
                  Kalender &<br />
                  <span className="text-teal-200">Terminplanung</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Behalten Sie den Überblick über alle Termine. 
                  Koordinieren Sie Ihr Team und synchronisieren Sie mit externen Kalendern.
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
                      <h3 className="font-semibold text-gray-900">Heute, 15. Januar</h3>
                      <Button size="sm" className="bg-[#14ad9f] hover:bg-[#14ad9f]/90 text-xs">
                        <CalendarPlus className="h-3 w-3 mr-1" />
                        Neuer Termin
                      </Button>
                    </div>
                    <div className="p-4 space-y-3">
                      {upcomingEvents.map((event, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-2 h-12 rounded-full ${event.color.split(' ')[0]}`}></div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                            <p className="text-xs text-gray-500">{event.time} - {event.duration}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs ${event.color}`}>
                            {event.type === 'video' ? 'Video' : event.type === 'phone' ? 'Telefon' : 'Vor Ort'}
                          </Badge>
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
              Alles für Ihre Terminplanung
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Professionelle Terminverwaltung für Teams und Einzelpersonen
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

      {/* Calendar Views */}
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
              Flexible Ansichten
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Wahlen Sie die Ansicht, die zu Ihrem Workflow passt
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Tagesansicht',
                description: 'Detaillierte Übersicht aller Termine eines Tages mit Zeitslots.',
                icon: Clock,
              },
              {
                title: 'Wochenansicht',
                description: 'Die ganze Woche auf einen Blick. Ideal für die Planung.',
                icon: Calendar,
              },
              {
                title: 'Monatsansicht',
                description: 'Langfristige Planung mit Übersicht über den gesamten Monat.',
                icon: CalendarCheck,
              },
            ].map((view, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <view.icon className="h-10 w-10 text-[#14ad9f]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{view.title}</h3>
                <p className="text-gray-600">{view.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
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
              Nahtlose Integration
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Verbinden Sie Ihren bestehenden Kalender
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              'Google Calendar',
              'Microsoft Outlook',
              'Apple iCal',
              'Zoom',
              'Google Meet',
              'Microsoft Teams',
            ].map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl px-8 py-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <span className="font-medium text-gray-700">{integration}</span>
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
                Warum Taskilo Kalender?
              </h2>
              <ul className="space-y-4">
                {[
                  'Alle Termine an einem Ort',
                  'Echtzeit-Synchronisierung',
                  'Team-Verfügbarkeiten auf einen Blick',
                  'Automatische Erinnerungen',
                  'Video-Meetings integriert',
                  'Mobile App für unterwegs',
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
                <h3 className="font-semibold text-gray-900 mb-4">Team-Verfügbarkeit</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Max Mustermann', status: 'Verfügbar', color: 'bg-green-500' },
                    { name: 'Anna Schmidt', status: 'Im Meeting', color: 'bg-red-500' },
                    { name: 'Peter Meier', status: 'Abwesend', color: 'bg-gray-400' },
                    { name: 'Sarah Weber', status: 'Verfügbar', color: 'bg-green-500' },
                  ].map((member, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#14ad9f]/20 rounded-full flex items-center justify-center text-[#14ad9f] font-medium text-sm">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-gray-700">{member.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${member.color}`}></div>
                        <span className="text-sm text-gray-500">{member.status}</span>
                      </div>
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
            Starten Sie jetzt mit professioneller Terminplanung
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
