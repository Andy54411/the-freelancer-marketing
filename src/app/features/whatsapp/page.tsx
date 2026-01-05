'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import FooterSection from '@/components/footer';
import {
  MessageCircle,
  Users,
  Shield,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Bot,
  Clock,
  FileText,
  Zap,
  Send,
  UserCheck,
} from 'lucide-react';

const featuresData = [
  {
    icon: MessageCircle,
    title: 'Team-Inbox',
    description: 'Alle WhatsApp-Nachrichten zentral im Team bearbeiten.',
  },
  {
    icon: FileText,
    title: 'Nachrichtenvorlagen',
    description: 'Vorgefertigte Antworten für häufige Kundenanfragen.',
  },
  {
    icon: Bot,
    title: 'Chatbot-Automatisierung',
    description: 'Automatische Antworten außerhalb der Geschäftszeiten.',
  },
  {
    icon: Users,
    title: 'Kontaktverwaltung',
    description: 'Kunden direkt in Taskilo CRM verknüpfen.',
  },
  {
    icon: Clock,
    title: 'Nachricht planen',
    description: 'Nachrichten zeitgesteuert versenden.',
  },
  {
    icon: Shield,
    title: 'DSGVO-konform',
    description: 'Alle Daten in Deutschland gespeichert.',
  },
];

const statsData = [
  { value: '2 Mrd.', label: 'WhatsApp-Nutzer weltweit' },
  { value: '98%', label: 'Öffnungsrate' },
  { value: 'Echtzeit', label: 'Benachrichtigungen' },
];

const chatPreview = [
  { 
    sender: 'Kunde', 
    message: 'Hallo, ich habe eine Frage zu meiner Bestellung #1234', 
    time: '10:15',
    isCustomer: true 
  },
  { 
    sender: 'Team', 
    message: 'Guten Tag! Ich schaue mir das gerne an. Einen Moment bitte.', 
    time: '10:16',
    isCustomer: false 
  },
  { 
    sender: 'Team', 
    message: 'Ihre Bestellung wurde heute versendet. Die Sendungsnummer ist: DE123456789', 
    time: '10:18',
    isCustomer: false 
  },
  { 
    sender: 'Kunde', 
    message: 'Super, vielen Dank für die schnelle Antwort!', 
    time: '10:19',
    isCustomer: true 
  },
];

export default function WhatsAppPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-teal-700">
        <HeroHeader />

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
                <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  WhatsApp<br />
                  <span className="text-teal-200">Business</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-lg">
                  Kommunizieren Sie mit Ihren Kunden über WhatsApp. 
                  Team-Inbox, Vorlagen und Automatisierung.
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
                    <div className="p-4 border-b bg-[#25D366] flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-[#25D366]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Team-Inbox</h3>
                        <p className="text-white/80 text-xs">3 Mitarbeiter online</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 bg-[#ECE5DD] min-h-[250px]">
                      {chatPreview.map((msg, i) => (
                        <div 
                          key={i} 
                          className={`flex ${msg.isCustomer ? 'justify-start' : 'justify-end'}`}
                        >
                          <div 
                            className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                              msg.isCustomer 
                                ? 'bg-white' 
                                : 'bg-[#DCF8C6]'
                            }`}
                          >
                            <p className="text-sm text-gray-800">{msg.message}</p>
                            <p className="text-xs text-gray-500 text-right mt-1">{msg.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-[#F0F0F0] flex items-center gap-2">
                      <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-400">
                        Nachricht eingeben...
                      </div>
                      <Button size="sm" className="rounded-full bg-[#25D366] hover:bg-[#128C7E]">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="pb-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid grid-cols-3 gap-8">
              {statsData.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>

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
              Professionelle Kundenkommunikation
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nutzen Sie den beliebtesten Messenger für Ihre Geschäftskommunikation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresData.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-0 bg-white">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-[#25D366]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
              Anwendungsfälle
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              So nutzen erfolgreiche Unternehmen WhatsApp Business
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: UserCheck,
                title: 'Kundenservice',
                description: 'Beantworten Sie Kundenanfragen schnell und persönlich. Höhere Kundenzufriedenheit durch direkte Kommunikation.',
                benefits: ['Schnelle Reaktionszeiten', 'Persönliche Betreuung', 'Höhere Kundenzufriedenheit'],
              },
              {
                icon: Send,
                title: 'Auftragsbestätigungen',
                description: 'Senden Sie automatische Bestätigungen für Bestellungen, Termine und Lieferungen.',
                benefits: ['Automatische Benachrichtigungen', 'Sendungsverfolgung', 'Terminbestätigungen'],
              },
              {
                icon: Zap,
                title: 'Marketing-Kampagnen',
                description: 'Erreichen Sie Ihre Kunden mit Angeboten und News direkt auf dem Smartphone.',
                benefits: ['98% Öffnungsrate', 'Personalisierte Nachrichten', 'Hohe Conversion'],
              },
              {
                icon: Clock,
                title: 'Terminverwaltung',
                description: 'Erinnerungen und Bestätigungen für Termine automatisch per WhatsApp versenden.',
                benefits: ['Weniger No-Shows', 'Einfache Terminänderungen', 'Automatische Erinnerungen'],
              },
            ].map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-0 shadow-lg">
                  <CardContent className="p-8">
                    <div className="w-14 h-14 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mb-6">
                      <useCase.icon className="h-7 w-7 text-[#14ad9f]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {useCase.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {useCase.description}
                    </p>
                    <ul className="space-y-2">
                      {useCase.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-[#25D366]" />
                          {benefit}
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

      <section className="py-24 px-4 bg-gradient-to-r from-[#14ad9f] to-teal-600">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Starten Sie mit WhatsApp Business
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Verbinden Sie Ihr WhatsApp mit Taskilo und kommunizieren Sie effizienter mit Ihren Kunden.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg"
            >
              <Link href="/register/company">
                Jetzt kostenlos starten
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-4 bg-transparent"
            >
              <Link href="/contact">Beratungstermin vereinbaren</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <FooterSection />
    </div>
  );
}
