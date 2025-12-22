'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  FileText,
  MessageSquare,
  CreditCard,
  Clock,
  Users,
  Briefcase,
  TrendingUp,
  Package,
  FolderKanban,
  Mail,
  Calendar,
} from 'lucide-react';

const featuresData = [
  {
    title: 'XRechnung & E-Invoicing',
    description: 'GoBD-konforme Rechnungen mit automatischem DATEV-Export und deutschem Steuerrecht.',
    href: '/features/accounting',
    gradient: 'from-emerald-400 to-teal-600',
    badges: ['100% GoBD-konform'],
    icon: FileText,
    secondaryIcons: [MessageSquare],
  },
  {
    title: 'Banking & Zahlungen',
    description: 'Stripe, Revolut & FinAPI Integration mit automatischem Transaktionsabgleich.',
    href: '/features/banking',
    gradient: 'from-blue-400 to-indigo-600',
    badges: ['DSGVO-konform', 'Multi-Bank'],
    icon: CreditCard,
    secondaryIcons: [],
  },
  {
    title: 'Zeiterfassung',
    description: 'Dienstplanung, Arbeitszeiterfassung und Integration mit Lohnbuchhaltung.',
    href: '/features/time-tracking',
    gradient: 'from-orange-400 to-red-500',
    badges: ['Gesetzeskonform', 'Mobile App'],
    icon: Clock,
    secondaryIcons: [],
  },
  {
    title: 'Personalverwaltung',
    description: 'Digitale Mitarbeiterakte, Dienstplanung und Gehaltsabrechnung in einem System.',
    href: '/features/hr-management',
    gradient: 'from-purple-400 to-violet-600',
    badges: ['All-in-One HR'],
    icon: Users,
    secondaryIcons: [],
  },
  {
    title: 'Recruiting & Stellenanzeigen',
    description: 'Stellenanzeigen erstellen, auf Jobportalen veröffentlichen und Bewerbungen verwalten.',
    href: '/features/recruiting',
    gradient: 'from-pink-400 to-rose-600',
    badges: ['10+ Jobportale'],
    icon: Briefcase,
    secondaryIcons: [],
  },
  {
    title: 'Taskilo Advertising',
    description: 'Multi-Channel Werbung mit Google Ads, LinkedIn und Meta. Alle Kampagnen zentral verwalten.',
    href: '/features/advertising',
    gradient: 'from-amber-400 to-orange-600',
    badges: ['Multi-Platform', 'ROI-Tracking'],
    icon: TrendingUp,
    secondaryIcons: [],
  },
  {
    title: 'Lagerbestandsverwaltung',
    description: 'Produkte verwalten, Bestände tracken und automatische Warnungen bei niedrigem Bestand.',
    href: '/features/inventory',
    gradient: 'from-lime-400 to-green-600',
    badges: ['Echtzeit-Sync'],
    icon: Package,
    secondaryIcons: [],
  },
  {
    title: 'Workspace & Projekte',
    description: 'Projekte, Aufgaben und Dokumente organisieren. Kanban-Boards und Team-Kollaboration.',
    href: '/features/workspace',
    gradient: 'from-cyan-400 to-blue-600',
    badges: ['Team-Kollaboration'],
    icon: FolderKanban,
    secondaryIcons: [],
  },
  {
    title: 'E-Mail Integration',
    description: 'Professionelle E-Mail-Verwaltung mit Vorlagen, Tracking und CRM-Integration.',
    href: '/features/email',
    gradient: 'from-red-400 to-pink-600',
    badges: ['Multi-Account'],
    icon: Mail,
    secondaryIcons: [],
  },
  {
    title: 'Kalender & Termine',
    description: 'Termine, Aufgaben und Ressourcen zentral planen. Synchronisation mit Google & Outlook.',
    href: '/features/calendar',
    gradient: 'from-sky-400 to-cyan-600',
    badges: ['Sync mit Google/Outlook'],
    icon: Calendar,
    secondaryIcons: [],
  },
];

const statsData = [
  { value: '10.000+', label: 'Zufriedene Unternehmen' },
  { value: '62%', label: 'Durchschnittliche Zeitersparnis' },
  { value: '100%', label: 'Made in Germany' },
  { value: '24/7', label: 'Support verfügbar' },
];

export default function BusinessFeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700">
        <HeroHeader />

        {/* Hero Section */}
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
                Von Zeiterfassung über Buchhaltung bis Recruiting - Taskilo bietet alles, 
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

      {/* Features Grid - Large Cards with Image Left, Text Right */}
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
              WhatsApp Business - alles in einer Plattform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {featuresData.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link href={feature.href} className="block group">
                  <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-full">
                    <div className="flex flex-col lg:flex-row h-full">
                      {/* Visual Section with Gradient and Icon */}
                      <div className={`relative lg:w-1/2 h-56 lg:h-auto min-h-[220px] bg-linear-to-br ${feature.gradient} overflow-hidden flex items-center justify-center`}>
                        {/* Main Icon */}
                        <div className="relative z-10">
                          <feature.icon className="h-24 w-24 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                        
                        {/* Badges on Image */}
                        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                          {feature.badges.map((badge, i) => (
                            <Badge
                              key={i}
                              className="bg-white/95 text-gray-800 border-0 font-medium px-3 py-1.5 shadow-md text-sm"
                            >
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        {/* Floating Secondary Icons */}
                        {feature.secondaryIcons.length > 0 && (
                          <div className="absolute top-4 right-4 flex gap-2">
                            {feature.secondaryIcons.map((Icon, i) => (
                              <div
                                key={i}
                                className="w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center"
                              >
                                <Icon className="h-5 w-5 text-[#14ad9f]" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Text Section */}
                      <div className="lg:w-1/2 p-6 lg:p-8 flex flex-col justify-center">
                        <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#14ad9f] transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 mb-4 leading-relaxed text-base">
                          {feature.description}
                        </p>
                        <div className="flex items-center text-[#14ad9f] font-semibold group-hover:gap-2 transition-all">
                          Mehr erfahren
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
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

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Alles in einer Plattform',
                description: 'Keine Insellosugen mehr. Alle Tools arbeiten nahtlos zusammen und teilen Daten automatisch.',
              },
              {
                icon: CheckCircle,
                title: 'Deutsche Compliance',
                description: 'GoBD, DSGVO, Arbeitszeitgesetz - wir kennen die Anforderungen und erfullen sie.',
              },
              {
                icon: Star,
                title: 'Exzellenter Support',
                description: 'Deutschsprachiger Support, der Ihre Branche versteht. Schnell und kompetent.',
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
                <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-8 w-8 text-[#14ad9f]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
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
