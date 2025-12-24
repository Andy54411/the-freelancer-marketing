'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import { ArrowRight } from 'lucide-react';
import {
  Search,
  Shield,
  CreditCard,
  Smartphone,
  Bell,
  Users,
  Star,
  MapPin,
  Zap,
  BarChart3,
  MessageSquare,
  Clock,
  HeadphonesIcon,
  Briefcase,
  Home,
  Wrench,
  TrendingUp,
  CheckCircle,
  Award,
  Calendar,
  FileText,
  UserCheck,
  Sparkles,
} from 'lucide-react';


const featuresData = {
  highlightFeatures: [
    {
      title: 'Intelligente Anbietersuche',
      description: 'Finden Sie in Sekunden den perfekten Dienstleister für Ihr Projekt - dank KI-gestützter Matching-Algorithmen und präziser Geo-Lokalisierung.',
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
      features: ['KI-basiertes Matching', 'Lokale Anbieter', 'Echtzeit-Verfügbarkeit', 'Sofortbuchung möglich'],
    },
    {
      title: 'Maximale Sicherheit',
      description: 'Verifizierte Dienstleister, sichere Zahlungen und umfassender Käuferschutz - Ihre Projekte sind bei uns in besten Händen.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
      features: ['Verifizierte Profile', 'Sichere Bezahlung', 'Geld-zurück-Garantie', '24/7 Support'],
    },
    {
      title: 'Transparente Abwicklung',
      description: 'Von der Anfrage bis zur Fertigstellung - behalten Sie jederzeit den Überblick über Ihr Projekt mit Live-Updates und direkter Kommunikation.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      features: ['Live-Tracking', 'Chat-Funktion', 'Meilenstein-Updates', 'Digitale Verträge'],
    },
  ],
  categories: [
    {
      title: 'Für Auftraggeber',
      icon: Users,
      color: 'bg-blue-500',
      features: [
        {
          icon: Search,
          title: 'Schnelle Anbietersuche',
          description: 'Finden Sie qualifizierte Dienstleister in Ihrer Nähe - gefiltert nach Bewertungen, Verfügbarkeit und Expertise.',
        },
        {
          icon: Star,
          title: 'Bewertungssystem',
          description: 'Echte Bewertungen von verifizierten Kunden helfen Ihnen, die beste Entscheidung zu treffen.',
        },
        {
          icon: Shield,
          title: 'Käuferschutz',
          description: 'Ihre Zahlung ist durch unseren Treuhand-Service geschützt bis zur erfolgreichen Projektabwicklung.',
        },
        {
          icon: MessageSquare,
          title: 'Direkte Kommunikation',
          description: 'Chatten Sie direkt mit Anbietern, teilen Sie Dateien und klären Sie alle Details vor Projektstart.',
        },
        {
          icon: Bell,
          title: 'Smart Notifications',
          description: 'Bleiben Sie informiert mit Echtzeit-Benachrichtigungen über Angebote, Nachrichten und Projektupdates.',
        },
        {
          icon: CreditCard,
          title: 'Flexible Zahlung',
          description: 'Bezahlen Sie sicher per SEPA, Kreditkarte oder PayPal - ganz wie es für Sie am besten passt.',
        },
      ],
    },
    {
      title: 'Für Dienstleister',
      icon: Briefcase,
      color: 'bg-[#14ad9f]',
      features: [
        {
          icon: Zap,
          title: 'Qualifizierte Anfragen',
          description: 'Erhalten Sie passende Projektanfragen basierend auf Ihren Fähigkeiten und Ihrem Standort.',
        },
        {
          icon: Calendar,
          title: 'Auftragsverwaltung',
          description: 'Verwalten Sie alle Projekte, Termine und Kunden zentral in Ihrem persönlichen Dashboard.',
        },
        {
          icon: Award,
          title: 'Reputation aufbauen',
          description: 'Sammeln Sie positive Bewertungen und bauen Sie Ihre Online-Reputation systematisch auf.',
        },
        {
          icon: BarChart3,
          title: 'Business Analytics',
          description: 'Verstehen Sie Ihr Geschäft besser mit detaillierten Statistiken zu Umsatz, Anfragen und Performance.',
        },
        {
          icon: FileText,
          title: 'Automatische Rechnungen',
          description: 'Erstellen Sie professionelle Rechnungen automatisch - GoBD-konform und steuerlich korrekt.',
        },
        {
          icon: TrendingUp,
          title: 'Wachstumschancen',
          description: 'Erschließen Sie neue Kundensegmente und steigern Sie Ihren Umsatz durch unsere Plattform.',
        },
      ],
    },
    {
      title: 'Plattform-Features',
      icon: Sparkles,
      color: 'bg-purple-500',
      features: [
        {
          icon: Smartphone,
          title: 'Mobile-First',
          description: 'Nutzen Sie Taskilo auf allen Geräten - Desktop, Tablet oder Smartphone, überall optimiert.',
        },
        {
          icon: Clock,
          title: '24/7 Verfügbar',
          description: 'Buchen Sie Services rund um die Uhr - unsere Plattform ist immer für Sie da.',
        },
        {
          icon: UserCheck,
          title: 'Verifizierte Profile',
          description: 'Alle Anbieter durchlaufen einen strengen Verifikationsprozess mit Identitätsprüfung.',
        },
        {
          icon: HeadphonesIcon,
          title: 'KI-Support',
          description: 'Unser KI-gestützter Chatbot hilft Ihnen sofort bei Fragen - ergänzt durch menschlichen Support.',
        },
        {
          icon: MapPin,
          title: 'Lokale Fokussierung',
          description: 'Finden Sie Dienstleister in Ihrer direkten Umgebung für schnelle und persönliche Services.',
        },
        {
          icon: CheckCircle,
          title: 'Qualitätsgarantie',
          description: 'Nicht zufrieden? Wir finden eine Lösung oder Sie erhalten Ihr Geld zurück.',
        },
      ],
    },
  ],
  stats: [
    { number: '10.000+', label: 'Verifizierte Dienstleister' },
    { number: '50.000+', label: 'Erfolgreiche Projekte' },
    { number: '4.9/5', label: 'Durchschnittliche Bewertung' },
    { number: '< 2 Min', label: 'Durchschnittliche Antwortzeit' },
  ],
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroHeader />

      {/* Hero Section with Gradient */}
      <section className="relative bg-linear-to-br from-[#14ad9f] to-teal-600 py-20 px-4 pt-32">
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
              Alle Features im Überblick
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg"
          >
            Alles was Sie für erfolgreiche Projekte brauchen
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/90 mb-8 max-w-3xl mx-auto"
          >
            Von der Suche bis zur Abwicklung - Taskilo macht die Vermittlung von Services so einfach wie nie zuvor.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                asChild
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-3 shadow-lg border-2 border-white group"
              >
                <Link href="/auftrag/get-started">
                  Jetzt Service buchen
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-3 shadow-lg bg-transparent"
              >
                <Link href="/register/company/step1">Als Anbieter registrieren</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {featuresData.stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true, margin: '-50px' }}
                className="text-center"
              >
                <motion.div
                  className="text-3xl md:text-4xl font-bold text-[#14ad9f] mb-2"
                  whileHover={{ scale: 1.1 }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-gray-600 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlight Features with Images */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Warum Taskilo?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Drei gute Gründe, warum Sie Taskilo für Ihre Service-Projekte nutzen sollten
            </p>
          </motion.div>

          <div className="space-y-20">
            {featuresData.highlightFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: '-50px' }}
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-12 items-center`}
              >
                <motion.div
                  className="w-full lg:w-1/2 relative h-80 lg:h-96 rounded-2xl overflow-hidden shadow-2xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                </motion.div>

                <div className="w-full lg:w-1/2 space-y-6">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feature.features.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-5 w-5 text-[#14ad9f] shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      {featuresData.categories.map((category, categoryIndex) => (
        <section
          key={categoryIndex}
          className={`py-20 px-4 ${categoryIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center mb-12"
            >
              <div className="flex justify-center mb-4">
                <div className={`p-3 ${category.color} rounded-full`}>
                  <category.icon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {category.title}
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.features.map((feature, featureIndex) => (
                <motion.div
                  key={featureIndex}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: featureIndex * 0.1 }}
                  viewport={{ once: true, margin: '-50px' }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <Card className="h-full bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <motion.div
                          className="p-3 bg-gray-100 rounded-lg group-hover:bg-[#14ad9f] transition-colors duration-300 shrink-0"
                          whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          <feature.icon className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors duration-300" />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#14ad9f] transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80"
            alt="Team Background"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/95 to-teal-700/90" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-50px' }}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 drop-shadow-lg">
            Bereit für Ihr nächstes Projekt?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            Starten Sie noch heute und erleben Sie die Zukunft der Service-Vermittlung
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {['Kostenlose Registrierung', 'Verifizierte Anbieter', 'Sichere Zahlung'].map(
              (benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="text-white/90 text-base">{benefit}</span>
                </motion.div>
              )
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                asChild
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-3 shadow-lg border-2 border-white group"
              >
                <Link href="/auftrag/get-started">
                  Projekt starten
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-3 shadow-lg bg-transparent"
              >
                <Link href="/register/company/step1">Anbieter werden</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
