'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  Mail,
  Send,
  Inbox,
  Tag,
  Search,
  FileText,
  Shield,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Reply,
  Star,
  Paperclip,
  Users,
} from 'lucide-react';

const featuresData = [
  {
    icon: Inbox,
    title: 'Zentraler Posteingang',
    description: 'Alle E-Mails von verschiedenen Konten an einem Ort verwalten.',
  },
  {
    icon: Tag,
    title: 'Labels & Ordner',
    description: 'E-Mails organisieren mit benutzerdefinierten Labels und Ordnern.',
  },
  {
    icon: Search,
    title: 'Intelligente Suche',
    description: 'Finden Sie jede E-Mail in Sekunden mit Volltext-Suche.',
  },
  {
    icon: FileText,
    title: 'E-Mail-Vorlagen',
    description: 'Haufige Antworten als Vorlagen speichern und wiederverwenden.',
  },
  {
    icon: Users,
    title: 'Team-Postfächer',
    description: 'Gemeinsame Postfächer für Support und Vertrieb.',
  },
  {
    icon: Shield,
    title: 'Spam-Schutz',
    description: 'Intelligenter Spam-Filter halt unerwunschte E-Mails fern.',
  },
];

const statsData = [
  { value: 'Unbegrenzt', label: 'E-Mails speichern' },
  { value: 'Multi-Account', label: 'Unterstützung' },
  { value: '99.9%', label: 'Zustellrate' },
];

const emailPreviewData = [
  { from: 'Meier GmbH', subject: 'Angebot für Projekt 2024', time: '09:15', unread: true, starred: true },
  { from: 'Schmidt & Partner', subject: 'RE: Terminbestätigung', time: '08:42', unread: true, starred: false },
  { from: 'Amazon Web Services', subject: 'Ihre monatliche Rechnung', time: 'Gestern', unread: false, starred: false },
  { from: 'LinkedIn', subject: '5 neue Profilbesuche', time: 'Gestern', unread: false, starred: false },
];

export default function EmailPage() {
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
                  E-Mail<br />
                  <span className="text-teal-200">Integration</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Verwalten Sie alle E-Mails direkt in Taskilo. 
                  Verbinden Sie mehrere Konten und behalten Sie den Überblick.
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
                      <div className="flex items-center gap-2">
                        <Inbox className="h-5 w-5 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">Posteingang</h3>
                        <Badge className="bg-[#14ad9f] text-white">2 neu</Badge>
                      </div>
                      <Button size="sm" className="bg-[#14ad9f] hover:bg-[#14ad9f]/90 text-xs">
                        <Send className="h-3 w-3 mr-1" />
                        Verfassen
                      </Button>
                    </div>
                    <div className="divide-y">
                      {emailPreviewData.map((email, i) => (
                        <div key={i} className={`p-4 flex items-start gap-3 hover:bg-gray-50 cursor-pointer ${email.unread ? 'bg-blue-50/50' : ''}`}>
                          <div className="flex flex-col items-center gap-1">
                            {email.starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm ${email.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {email.from}
                              </span>
                              <span className="text-xs text-gray-500">{email.time}</span>
                            </div>
                            <p className={`text-sm truncate ${email.unread ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                              {email.subject}
                            </p>
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
              Professionelles E-Mail-Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Alle Features für produktives Arbeiten mit E-Mails
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

      {/* Providers */}
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
              Verbinden Sie Ihre E-Mail-Konten
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Unterstützung für alle gängigen E-Mail-Anbieter
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              'Gmail / Google Workspace',
              'Microsoft 365 / Outlook',
              'Yahoo Mail',
              'IMAP / POP3',
              'Apple iCloud',
              'Eigener Mailserver',
            ].map((provider, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-xl px-8 py-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <span className="font-medium text-gray-700">{provider}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
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
              Integriert in Ihren Workflow
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Mail,
                title: 'Kundenkommunikation',
                description: 'E-Mails werden automatisch mit Kundendaten verknupft.',
              },
              {
                icon: Paperclip,
                title: 'Dokumente anhangen',
                description: 'Rechnungen und Angebote direkt aus Taskilo versenden.',
              },
              {
                icon: Reply,
                title: 'Schnelle Antworten',
                description: 'Mit Vorlagen in Sekunden professionell antworten.',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-10 w-10 text-[#14ad9f]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
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
                Warum E-Mail in Taskilo?
              </h2>
              <ul className="space-y-4">
                {[
                  'Keine Kontextwechsel - alles an einem Ort',
                  'E-Mails automatisch mit Kunden verknupft',
                  'Team-Postfächer für bessere Zusammenarbeit',
                  'Dokumente direkt aus Taskilo versenden',
                  'Intelligente Suche über alle Konten',
                  'Voller Datenschutz - DSGVO-konform',
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
                <h3 className="font-semibold text-gray-900 mb-4">Verbundene Konten</h3>
                <div className="space-y-3">
                  {[
                    { email: 'info@firma.de', provider: 'Google Workspace', status: 'Verbunden' },
                    { email: 'support@firma.de', provider: 'Google Workspace', status: 'Verbunden' },
                    { email: 'max.mustermann@outlook.de', provider: 'Microsoft 365', status: 'Verbunden' },
                  ].map((account, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{account.email}</p>
                        <p className="text-xs text-gray-500">{account.provider}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-0">{account.status}</Badge>
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
            Alle E-Mails an einem Ort
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
