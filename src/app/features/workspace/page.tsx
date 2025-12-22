'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  FolderKanban,
  Users,
  CheckSquare,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Kanban,
  Calendar,
} from 'lucide-react';

const featuresData = [
  {
    icon: FolderKanban,
    title: 'Projektübersicht',
    description: 'Alle Projekte mit Status, Fortschritt und Deadlines auf einen Blick.',
  },
  {
    icon: Kanban,
    title: 'Kanban-Boards',
    description: 'Aufgaben visuell verwalten mit Drag-and-Drop.',
  },
  {
    icon: CheckSquare,
    title: 'Aufgabenverwaltung',
    description: 'Aufgaben erstellen, zuweisen und verfolgen.',
  },
  {
    icon: Users,
    title: 'Team-Kollaboration',
    description: 'Gemeinsam an Projekten arbeiten mit Kommentaren und Updates.',
  },
  {
    icon: FileText,
    title: 'Dokumentenverwaltung',
    description: 'Projektdokumente zentral speichern und teilen.',
  },
  {
    icon: Clock,
    title: 'Zeiterfassung',
    description: 'Arbeitszeit auf Projekte und Aufgaben buchen.',
  },
];

const statsData = [
  { value: 'Unbegrenzt', label: 'Projekte' },
  { value: 'Echtzeit', label: 'Zusammenarbeit' },
  { value: '360°', label: 'Projektüberblick' },
];

const projectsPreview = [
  { name: 'Website Relaunch', progress: 75, tasks: '12/16', status: 'In Arbeit', color: 'bg-blue-500' },
  { name: 'App Entwicklung', progress: 30, tasks: '8/28', status: 'In Arbeit', color: 'bg-purple-500' },
  { name: 'Marketing Kampagne', progress: 100, tasks: '10/10', status: 'Abgeschlossen', color: 'bg-green-500' },
];

export default function WorkspacePage() {
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
                  Workspace &<br />
                  <span className="text-teal-200">Projekte</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Verwalten Sie Projekte und Aufgaben im Team. 
                  Kanban-Boards, Zeiterfassung und Dokumentenverwaltung in einem.
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
                      <h3 className="font-semibold text-gray-900">Aktive Projekte</h3>
                      <Button size="sm" className="bg-[#14ad9f] hover:bg-[#14ad9f]/90 text-xs">
                        <FolderKanban className="h-3 w-3 mr-1" />
                        Neues Projekt
                      </Button>
                    </div>
                    <div className="p-4 space-y-4">
                      {projectsPreview.map((project, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${project.color}`}></div>
                              <span className="font-medium text-gray-900 text-sm">{project.name}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                project.status === 'Abgeschlossen'
                                  ? 'bg-green-50 text-green-600 border-green-200'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}
                            >
                              {project.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>Fortschritt</span>
                            <span>{project.tasks} Aufgaben</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${project.color}`}
                              style={{ width: `${project.progress}%` }}
                            ></div>
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
              Professionelles Projektmanagement
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Alle Werkzeuge für erfolgreiche Projektarbeit
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

      {/* Views */}
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
                icon: Kanban,
                title: 'Kanban-Board',
                description: 'Visuelle Aufgabenverwaltung mit Drag-and-Drop.',
              },
              {
                icon: CheckSquare,
                title: 'Listenansicht',
                description: 'Alle Aufgaben übersichtlich in einer Liste.',
              },
              {
                icon: Calendar,
                title: 'Kalenderansicht',
                description: 'Deadlines und Meilensteine im Kalender.',
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
              Verbunden mit allen anderen Taskilo-Modulen
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              'Zeiterfassung',
              'Kalender',
              'E-Mail',
              'Kunden',
              'Rechnungen',
              'Dokumente',
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
                Warum Taskilo Workspace?
              </h2>
              <ul className="space-y-4">
                {[
                  'Alle Projekte an einem Ort',
                  'Echtzeit-Zusammenarbeit im Team',
                  'Flexible Ansichten für jeden Workflow',
                  'Integrierte Zeiterfassung',
                  'Dokumentenverwaltung inklusive',
                  'Detaillierte Projekt-Reports',
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
                <h3 className="font-semibold text-gray-900 mb-4">Projekt-Dashboard</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Aktive Projekte', value: '8' },
                    { label: 'Offene Aufgaben', value: '34' },
                    { label: 'Diese Woche fällig', value: '12' },
                    { label: 'Überfällig', value: '2', color: 'text-red-600' },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold ${stat.color || 'text-gray-900'}`}>
                        {stat.value}
                      </p>
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
            Starten Sie jetzt mit professionellem Projektmanagement
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
