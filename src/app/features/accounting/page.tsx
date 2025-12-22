'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HeroHeader } from '@/components/hero8-header';
import { 
  ArrowRight, 
  FileText, 
  CreditCard, 
  Shield, 
  CheckCircle2, 
  Building2,
  Users,
  Sparkles,
  Database,
  Calculator,
  FileCheck,
  Globe,
} from 'lucide-react';

// Feature type definition
interface Feature {
  title: string;
  description: string;
  image: string;
  badges: string[];
  href: string;
}

// Single Feature Card with Split Exit Animation (same as features-8.tsx)
function FeatureCard({ 
  feature, 
  index, 
  totalFeatures 
}: { 
  feature: Feature; 
  index: number; 
  totalFeatures: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Track scroll progress for this card
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start 70%', 'start -30%'],
  });

  // Entry animation (0 to 0.25 of scroll progress)
  const cardScale = useTransform(scrollYProgress, [0, 0.25], [0.85, 1]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const cardY = useTransform(scrollYProgress, [0, 0.25], [100, 0]);

  // Exit animation - when scrolling past (0.6 to 1 of scroll progress)
  // Image half slides to its side
  const imageX = useTransform(scrollYProgress, [0.6, 1], [0, -300]);
  const imageRotate = useTransform(scrollYProgress, [0.6, 1], [0, -12]);
  const imageOpacity = useTransform(scrollYProgress, [0.6, 0.9], [1, 0]);
  
  // Text half slides to opposite side
  const textX = useTransform(scrollYProgress, [0.6, 1], [0, 300]);
  const textRotate = useTransform(scrollYProgress, [0.6, 1], [0, 12]);
  const textOpacity = useTransform(scrollYProgress, [0.6, 0.9], [1, 0]);

  const topOffset = 100;
  const isImageLeft = index % 2 === 0;

  return (
    <div
      ref={cardRef}
      className="h-[700px] lg:h-[600px]"
    >
      <motion.div
        style={{ 
          scale: cardScale, 
          opacity: cardOpacity, 
          y: cardY,
          position: 'sticky',
          top: topOffset,
          zIndex: totalFeatures - index,
        }}
        className="will-change-transform px-4"
      >
        <Link href="/register/company" className="block group">
          <div className="relative mx-auto max-w-6xl">
            {/* Card Container with both halves absolutely positioned for independent movement */}
            <div className="relative h-72 lg:h-[420px]">
              
              {/* Image Half */}
              <motion.div 
                className={`absolute top-0 ${isImageLeft ? 'left-0' : 'right-0'} w-full lg:w-1/2 h-full rounded-t-3xl ${isImageLeft ? 'lg:rounded-l-3xl lg:rounded-tr-none' : 'lg:rounded-r-3xl lg:rounded-tl-none'} overflow-hidden shadow-2xl`}
                style={{
                  x: isImageLeft ? imageX : textX,
                  rotate: isImageLeft ? imageRotate : textRotate,
                  opacity: imageOpacity,
                }}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-black/10 to-transparent" />
                
                {/* Badges on Image */}
                <div className="absolute bottom-6 left-6 flex flex-wrap gap-2">
                  {feature.badges.map((badge, i) => (
                    <span
                      key={i}
                      className="bg-white/95 backdrop-blur-sm text-gray-800 font-semibold px-4 py-2 rounded-full shadow-lg text-sm"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </motion.div>
              
              {/* Text Half */}
              <motion.div 
                className={`absolute top-0 ${isImageLeft ? 'right-0' : 'left-0'} w-full lg:w-1/2 h-full p-8 lg:p-12 flex flex-col justify-center bg-white rounded-b-3xl ${isImageLeft ? 'lg:rounded-r-3xl lg:rounded-bl-none' : 'lg:rounded-l-3xl lg:rounded-br-none'} shadow-2xl`}
                style={{
                  x: isImageLeft ? textX : imageX,
                  rotate: isImageLeft ? textRotate : imageRotate,
                  opacity: textOpacity,
                }}
              >
                <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-4 group-hover:text-[#14ad9f] transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed text-lg">
                  {feature.description}
                </p>
                <div className="flex items-center text-[#14ad9f] font-semibold text-lg group-hover:gap-3 transition-all duration-300">
                  Kostenlos testen
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </motion.div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}

export default function AccountingPage() {
  const features: Feature[] = [
    {
      title: 'Rechnungen & Angebote',
      description: 'Professionelle Rechnungen in Sekunden erstellen. Mit über 30 Vorlagen, automatischer Nummerierung und Live-PDF-Vorschau.',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2072&auto=format&fit=crop',
      badges: ['GoBD-konform', '30+ Vorlagen'],
      href: '/dashboard/company/demo/finance/invoices',
    },
    {
      title: 'XRechnung & ZUGFeRD',
      description: 'Elektronische Rechnungen im deutschen Standard für öffentliche Auftraggeber. Hybride PDF-Rechnungen mit maschinenlesbaren XML-Daten.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
      badges: ['B2G-ready', 'ZUGFeRD 2.0'],
      href: '/dashboard/company/demo/finance/einvoices',
    },
    {
      title: 'Mahnwesen & Zahlungen',
      description: 'Automatisches mehrstufiges Mahnwesen mit konfigurierbaren Fristen. Zahlungsabgleich mit Bankkonten und Stripe-Integration.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop',
      badges: ['Automatisiert', 'Multi-Bank'],
      href: '/dashboard/company/demo/finance/reminders',
    },
    {
      title: 'Ausgaben & Belege',
      description: 'Belege erfassen mit OCR-Erkennung. Automatische Kategorisierung und Vorsteuerabzug. Alle Belege GoBD-konform archiviert.',
      image: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=2070&auto=format&fit=crop',
      badges: ['OCR-Erkennung', 'Belegarchiv'],
      href: '/dashboard/company/demo/finance/expenses',
    },
    {
      title: 'DATEV & Steuerberater',
      description: 'Nahtloser Export im EXTF-Format für Ihren Steuerberater. USt-Voranmeldung, Kontenrahmen SKR03/04 und BWA auf Knopfdruck.',
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=2070&auto=format&fit=crop',
      badges: ['DATEV-Export', 'SKR03/04'],
      href: '/dashboard/company/demo/finance/accounting',
    },
    {
      title: 'Kassenbuch & Projekte',
      description: 'Digitales Kassenbuch für Bargeschäfte mit täglichem Abschluss. Projektbezogene Kostenerfassung und Auswertungen.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
      badges: ['Kassenbuch', 'Kostenstellen'],
      href: '/dashboard/company/demo/finance/cashbook',
    },
  ];

  const complianceFeatures = [
    { 
      icon: FileCheck, 
      title: 'GoBD-Konform', 
      description: 'Revisionssichere Buchführung nach deutschen Steuervorschriften - finanzamtssicher.',
      badge: 'Compliance'
    },
    { 
      icon: Database, 
      title: 'DATEV Export', 
      description: 'Nahtlose Integration mit Ihrem Steuerberater durch standardisierten DATEV-Export.',
      badge: 'Integration'
    },
    { 
      icon: FileText, 
      title: 'XRechnung', 
      description: 'Elektronische Rechnungen im deutschen Standard für öffentliche Auftraggeber.',
      badge: 'E-Invoice'
    },
    { 
      icon: Shield, 
      title: 'Kleinunternehmer', 
      description: 'Vollständige Unterstützung der §19 UStG Regelung mit korrekten Hinweisen.',
      badge: '§19 UStG'
    },
  ];

  const accountingCategories = [
    {
      title: 'Rechnungswesen',
      icon: FileText,
      features: ['Rechnungen erstellen', 'Angebote & Kostenvoranschläge', 'Auftragsbestätigungen', 'Lieferscheine', 'Gutschriften & Stornos', 'Wiederkehrende Rechnungen'],
    },
    {
      title: 'E-Rechnungen',
      icon: Globe,
      features: ['XRechnung (B2G)', 'ZUGFeRD 2.0', 'Peppol-Netzwerk'],
    },
    {
      title: 'Steuer & Compliance',
      icon: Shield,
      features: ['GoBD-Archivierung', 'Kleinunternehmer §19', 'USt-Voranmeldung', 'Vorsteuerabzug'],
    },
    {
      title: 'Banking & Zahlungen',
      icon: CreditCard,
      features: ['Zahlungsabgleich', 'Automatisches Mahnwesen', 'Zahlungserinnerungen', 'Multi-Bank via FinAPI'],
    },
    {
      title: 'Buchhaltung',
      icon: Calculator,
      features: ['Kassenbuch', 'Kontenrahmen SKR03/04', 'Kostenstellen', 'BWA & Auswertungen'],
    },
    {
      title: 'Integration',
      icon: Database,
      features: ['DATEV-Export', 'Ausgabenverwaltung', 'Belegarchiv mit OCR'],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <HeroHeader />

      {/* Hero Section */}
      <section className="relative min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800">
        {/* Background Image with Teal Gradient Overlay */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&h=1080&fit=crop"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/95 via-teal-700/90 to-teal-900/95" />
        </div>
        <div className="relative z-10 pb-8 pt-20 sm:pb-12 sm:pt-24 md:pb-16 md:pt-28 lg:pb-20 lg:pt-28">
          <div className="relative mx-auto max-w-6xl px-6 flex flex-col-reverse items-center gap-8 sm:gap-10 lg:flex-row lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-block px-5 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-semibold text-white mb-6 border border-white/20"
              >
                GoBD-konforme Buchhaltung
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-2xl sm:text-3xl font-semibold leading-snug tracking-tight md:text-4xl xl:text-5xl text-white drop-shadow-lg"
              >
                <span className="block">Buchhaltung, die sich</span>
                <span className="block text-teal-200">selbst erledigt</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-6 sm:mt-8 max-w-2xl text-pretty text-base sm:text-lg text-white/90 drop-shadow-md"
              >
                Von XRechnung über DATEV-Export bis zum automatischen Mahnwesen - alles was deutsche Unternehmen für ihre Buchhaltung brauchen.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-8 sm:mt-12 flex flex-col items-center justify-center gap-3 sm:gap-2 sm:flex-row lg:justify-start"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/register/company"
                    className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] font-bold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg"
                  >
                    Kostenlos starten
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white hover:text-[#14ad9f] transition-all duration-300 text-lg"
                  >
                    Demo anfordern
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Bild im eigenen div */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="w-full max-w-xl lg:w-1/2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="h-auto w-full object-contain rounded-2xl shadow-2xl"
                src="/images/features/accounting-hero.png"
                alt="Taskilo - Ihr Partner für Rechnungwesen"
              />
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-10 pb-12 md:pb-16"
        >
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '100%', label: 'GoBD-konform' },
                { value: '< 2 Min', label: 'Rechnung erstellen' },
                { value: '24+', label: 'Buchhaltungs-Funktionen' },
                { value: '150+', label: 'Banken via FinAPI' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Cards with Scroll Animation */}
      <section className="relative bg-linear-to-br from-gray-50 to-gray-100 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-0">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                feature={feature}
                index={index}
                totalFeatures={features.length}
              />
            ))}
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f]/10 rounded-full text-sm font-semibold text-[#14ad9f] mb-6"
            >
              <Sparkles className="h-4 w-4" />
              Alle Funktionen
            </motion.span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Alles was Sie brauchen
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Von der Rechnung bis zum Steuerexport - alles in einem System
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {accountingCategories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="h-full bg-gray-50 hover:bg-white rounded-2xl p-6 transition-all duration-300 border border-gray-100 hover:border-[#14ad9f]/30 hover:shadow-lg">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#14ad9f]/10 text-[#14ad9f] group-hover:bg-[#14ad9f] group-hover:text-white transition-colors duration-300">
                      <category.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#14ad9f] transition-colors duration-300">
                      {category.title}
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {category.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-[#14ad9f] shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Taskilo Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f]/10 rounded-full text-sm font-semibold text-[#14ad9f] mb-6"
            >
              <Sparkles className="h-4 w-4" />
              Warum Taskilo?
            </motion.span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Perfekt für<br />
              <span className="text-[#14ad9f]">deutsche Unternehmen</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Wir kennen die Anforderungen des deutschen Steuerrechts - und erfüllen sie zu 100%.
            </p>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          >
            {[
              { icon: Building2, value: '1.000+', label: 'Aktive Unternehmen' },
              { icon: FileText, value: '50.000+', label: 'Rechnungen pro Monat' },
              { icon: Users, value: '10.000+', label: 'Zufriedene Nutzer' },
              { icon: Shield, value: '100%', label: 'DSGVO-konform' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-2xl bg-white hover:bg-[#14ad9f]/5 transition-colors duration-300 shadow-sm"
              >
                <stat.icon className="h-8 w-8 text-[#14ad9f] mx-auto mb-3" />
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* German Compliance Section */}
      <section className="py-24 bg-linear-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f]/20 rounded-full text-sm font-semibold text-[#14ad9f] mb-6"
            >
              <Shield className="h-4 w-4" />
              Made in Germany
            </motion.span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Deutsche Standards.<br />
              <span className="text-[#14ad9f]">Deutsche Qualität.</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Entwickelt für den deutschen Markt mit voller Unterstützung aller relevanten Standards.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                viewport={{ once: true }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group"
              >
                <div className="h-full bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:bg-white/10 hover:border-[#14ad9f]/30 transition-all duration-300">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#14ad9f]/20 text-[#14ad9f] mb-6 group-hover:bg-[#14ad9f] group-hover:text-white transition-colors duration-300">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-[#14ad9f] bg-[#14ad9f]/10 rounded-full mb-4">
                    {feature.badge}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#14ad9f] transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional Compliance Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-wrap justify-center gap-6 md:gap-12"
          >
            {[
              'Unveränderliche Nummerierung',
              'Revisionssichere Archivierung',
              'Automatische Stornorechnungen',
              'EU-Geschäfte & Reverse-Charge',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="h-5 w-5 text-[#14ad9f]" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-linear-to-r from-[#14ad9f] to-teal-600">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center px-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Starten Sie jetzt mit professioneller Buchhaltung
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Kostenlos testen - keine Kreditkarte erforderlich
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register/company"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] font-bold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg"
            >
              Kostenlos registrieren
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/features/business"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white hover:text-[#14ad9f] transition-all duration-300 text-lg"
            >
              Alle Features ansehen
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
