'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HeroHeader } from '@/components/hero8-header';
import {
  ArrowRight,
  Star,
  Zap,
  FileText,
  CreditCard,
  Clock,
  Users,
  Briefcase,
  TrendingUp,
  Package,
  FolderKanban,
  Mail,
  Calendar,
  ShoppingBag,
  Headphones,
  Shield,
  Globe,
} from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badges: string[];
  highlight?: boolean;
}

const featuresData: Feature[] = [
  {
    title: 'Tasker',
    description: 'Finden Sie qualifizierte Dienstleister für jede Aufgabe. Von Handwerk bis IT - alle Services auf einen Blick.',
    href: '/services',
    icon: Users,
    badges: ['Geprüfte Anbieter', 'Sofort verfügbar'],
    highlight: true,
  },
  {
    title: 'Marktplatz',
    description: 'Veröffentlichen Sie Projekte und erhalten Sie Angebote von qualifizierten Dienstleistern. Sichere Zahlungsabwicklung mit Escrow-System.',
    href: '/marketplace',
    icon: ShoppingBag,
    badges: ['Escrow-Schutz', 'Bewertungssystem'],
  },
  {
    title: 'XRechnung & E-Invoicing',
    description: 'GoBD-konforme Rechnungen mit automatischem DATEV-Export und deutschem Steuerrecht.',
    href: '/features/accounting',
    icon: FileText,
    badges: ['100% GoBD-konform'],
  },
  {
    title: 'Banking & Zahlungen',
    description: 'Stripe, Revolut & FinAPI Integration mit automatischem Transaktionsabgleich.',
    href: '/features/banking',
    icon: CreditCard,
    badges: ['DSGVO-konform', 'Multi-Bank'],
  },
  {
    title: 'Kundenservice',
    description: 'Ticket-System, Live-Chat und Kundenkommunikation. Alle Anfragen zentral verwalten.',
    href: '/features/service',
    icon: Headphones,
    badges: ['Omnichannel', 'KI-Support'],
  },
  {
    title: 'Zeiterfassung',
    description: 'Dienstplanung, Arbeitszeiterfassung und Integration mit Lohnbuchhaltung.',
    href: '/features/time-tracking',
    icon: Clock,
    badges: ['Gesetzeskonform'],
  },
  {
    title: 'Personalverwaltung',
    description: 'Digitale Mitarbeiterakte, Dienstplanung und Gehaltsabrechnung in einem System.',
    href: '/features/hr-management',
    icon: Users,
    badges: ['All-in-One HR'],
  },
  {
    title: 'Recruiting & Stellenanzeigen',
    description: 'Stellenanzeigen erstellen, auf Jobportalen veröffentlichen und Bewerbungen verwalten.',
    href: '/features/recruiting',
    icon: Briefcase,
    badges: ['10+ Jobportale'],
  },
  {
    title: 'Taskilo Advertising',
    description: 'Multi-Channel Werbung mit Google Ads, LinkedIn und Meta. Alle Kampagnen zentral verwalten.',
    href: '/features/advertising',
    icon: TrendingUp,
    badges: ['Multi-Platform'],
  },
  {
    title: 'Lagerbestandsverwaltung',
    description: 'Produkte verwalten, Bestände tracken und automatische Warnungen bei niedrigem Bestand.',
    href: '/features/inventory',
    icon: Package,
    badges: ['Echtzeit-Sync'],
  },
  {
    title: 'Workspace & Projekte',
    description: 'Projekte, Aufgaben und Dokumente organisieren. Kanban-Boards und Team-Kollaboration.',
    href: '/features/workspace',
    icon: FolderKanban,
    badges: ['Team-Kollaboration'],
  },
  {
    title: 'E-Mail Integration',
    description: 'Professionelle E-Mail-Verwaltung mit Vorlagen, Tracking und CRM-Integration.',
    href: '/features/email',
    icon: Mail,
    badges: ['Multi-Account'],
  },
  {
    title: 'Kalender & Termine',
    description: 'Termine, Aufgaben und Ressourcen zentral planen. Synchronisation mit Google & Outlook.',
    href: '/features/calendar',
    icon: Calendar,
    badges: ['Sync'],
  },
];

const statsData = [
  { value: '10.000+', label: 'Zufriedene Unternehmen' },
  { value: '62%', label: 'Durchschnittliche Zeitersparnis' },
  { value: '100%', label: 'Made in Germany' },
  { value: '24/7', label: 'Support verfügbar' },
];

const whyTaskiloData = [
  {
    icon: Zap,
    title: 'Alles in einer Plattform',
    description: 'Keine Insellösungen mehr. Alle Tools arbeiten nahtlos zusammen.',
  },
  {
    icon: Shield,
    title: 'Deutsche Compliance',
    description: 'GoBD, DSGVO, Arbeitszeitgesetz - wir erfüllen alle Anforderungen.',
  },
  {
    icon: Globe,
    title: 'Cloud-basiert',
    description: 'Zugriff von überall. Sichere deutsche Rechenzentren.',
  },
  {
    icon: Star,
    title: 'Exzellenter Support',
    description: 'Deutschsprachiger Support, der Ihre Branche versteht.',
  },
];

export default function BusinessFeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-teal-700">
        <HeroHeader />

        <section className="pt-32 pb-24 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="outline" className="mb-6 bg-white/10 text-white border-white/20 px-4 py-1">
                Business Solutions
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Alle Tools für Ihr <br />
                <span className="text-teal-200">erfolgreiches Unternehmen</span>
              </h1>
              <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
                Von Marktplatz über Buchhaltung bis Recruiting - Taskilo bietet alles, 
                was moderne Unternehmen brauchen. Alles in einer Plattform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg"
                >
                  <Link href="/register/company">
                    Kostenlos starten
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
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="pb-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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

      {/* Features Grid */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Alles was Ihr Unternehmen braucht
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Von GoBD-konformer Buchhaltung über Multi-Plattform Werbung bis hin zu 
              unserem Dienstleister-Marktplatz - alles in einer Plattform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresData.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Link href={feature.href} className="block group h-full">
                  <Card className={`h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 ${
                    feature.highlight 
                      ? 'bg-gradient-to-br from-[#14ad9f] to-teal-600 text-white' 
                      : 'bg-white'
                  }`}>
                    <CardContent className="p-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                        feature.highlight 
                          ? 'bg-white/20' 
                          : 'bg-[#14ad9f]/10'
                      }`}>
                        <feature.icon className={`h-7 w-7 ${
                          feature.highlight ? 'text-white' : 'text-[#14ad9f]'
                        }`} />
                      </div>
                      
                      <h3 className={`text-xl font-bold mb-2 group-hover:underline decoration-2 underline-offset-4 ${
                        feature.highlight ? 'text-white' : 'text-gray-900'
                      }`}>
                        {feature.title}
                      </h3>
                      
                      <p className={`mb-4 leading-relaxed ${
                        feature.highlight ? 'text-white/90' : 'text-gray-600'
                      }`}>
                        {feature.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {feature.badges.map((badge, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className={`text-xs ${
                              feature.highlight 
                                ? 'bg-white/20 text-white border-white/30' 
                                : 'bg-[#14ad9f]/10 text-[#14ad9f] border-0'
                            }`}
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className={`flex items-center font-medium ${
                        feature.highlight ? 'text-white' : 'text-[#14ad9f]'
                      }`}>
                        Mehr erfahren
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Taskilo Section */}
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
              Warum Taskilo?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Die Vorteile einer integrierten Plattform
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyTaskiloData.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-8 w-8 text-[#14ad9f]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-[#14ad9f] to-teal-600">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Bereit, Ihr Unternehmen zu digitalisieren?
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Starten Sie kostenlos und entdecken Sie, wie Taskilo Ihren Arbeitsalltag vereinfacht.
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
    </div>
  );
}
