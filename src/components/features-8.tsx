'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, FileText, Database, CreditCard, Shield, CheckCircle2, Sparkles, Building2, Users } from 'lucide-react';

// Feature type definition
interface Feature {
  title: string;
  description: string;
  image: string;
  badges: string[];
  href: string;
}

// Single Feature Card with Split Exit Animation
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
        <Link href={feature.href} className="block group">
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
                  Mehr erfahren
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

// CTA Card with same animation as Feature Cards
function CTACard({ 
  index, 
  totalFeatures 
}: { 
  index: number; 
  totalFeatures: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start 80%', 'start 30%'],
  });

  // Z-axis animation - comes from behind (small/far) to front (full size)
  const cardScale = useTransform(scrollYProgress, [0, 1], [0.3, 1]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.8, 1]);
  const cardZ = useTransform(scrollYProgress, [0, 1], [-500, 0]);
  const cardRotateX = useTransform(scrollYProgress, [0, 1], [15, 0]);

  const topOffset = 80 + index * 10;

  return (
    <div
      ref={cardRef}
      className="h-[600px] lg:h-[500px]"
      style={{ perspective: '1500px' }}
    >
      <motion.div
        style={{ 
          scale: cardScale, 
          opacity: cardOpacity, 
          z: cardZ,
          rotateX: cardRotateX,
          position: 'sticky',
          top: topOffset,
          zIndex: totalFeatures + 10,
          transformStyle: 'preserve-3d',
        }}
        className="will-change-transform"
      >
        <div 
          className="relative mx-auto max-w-6xl rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #14ad9f 0%, #0d9488 50%, #0f766e 100%)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.2)',
          }}
        >
          <div className="relative p-10 lg:p-16 text-center">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-teal-300/20 rounded-full translate-x-1/4 translate-y-1/4 blur-2xl" />
            
            <div className="relative z-10">
              <h3 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4">
                Noch mehr entdecken
              </h3>
              <p className="text-lg lg:text-xl text-white/90 max-w-2xl mx-auto mb-8">
                Recruiting, Personalverwaltung, Lagerbestand und vieles mehr - entdecken Sie alle Business-Funktionen von Taskilo.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/features/business"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] font-bold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg"
                >
                  Alle Features ansehen
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/register/company"
                  className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white hover:text-[#14ad9f] transition-all duration-300 text-lg"
                >
                  Kostenlos starten
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function FeaturesSection() {
  const features: Feature[] = [
    {
      title: 'XRechnung & E-Invoicing',
      description: 'GoBD-konforme Rechnungen mit automatischem DATEV-Export und deutschem Steuerrecht. Erstellen Sie professionelle Rechnungen in Sekunden.',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2072&auto=format&fit=crop',
      badges: ['100% GoBD-konform', 'DATEV-Export'],
      href: '/features/accounting',
    },
    {
      title: 'Banking & Zahlungen',
      description: 'Stripe, Revolut & FinAPI Integration mit automatischem Transaktionsabgleich. Alle Bankkonten zentral verwalten.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=2070&auto=format&fit=crop',
      badges: ['DSGVO-konform', 'Multi-Bank'],
      href: '/features/banking',
    },
    {
      title: 'Zeiterfassung & Dienstplanung',
      description: 'Mobile Stempeluhr, Schichtplanung und automatische Überstundenberechnung. Vollständig konform mit dem Arbeitszeitgesetz.',
      image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?q=80&w=2070&auto=format&fit=crop',
      badges: ['Gesetzeskonform', 'Mobile App'],
      href: '/features/time-tracking',
    },
    {
      title: 'Multi-Plattform Advertising',
      description: 'Google, Meta & LinkedIn Ads Manager mit Kampagnen-Automatisierung und ROI-Tracking. Alle Werbeplattformen zentral steuern.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
      badges: ['3 Plattformen', 'ROI-Tracking'],
      href: '/features/advertising',
    },
    {
      title: 'Team-Kommunikation',
      description: 'E-Mail-Integration, Team-Postfächer und Vorlagen. Professionelle Kommunikation mit Kunden und Mitarbeitern.',
      image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop',
      badges: ['Multi-Account', 'Echtzeit'],
      href: '/features/email',
    },
    {
      title: 'Workspace & Projekte',
      description: 'Kanban-Boards, Aufgabenverwaltung und Team-Kollaboration. Alle Projekte übersichtlich an einem Ort.',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
      badges: ['Team-Kollaboration', 'Echtzeit-Sync'],
      href: '/features/workspace',
    },
  ];

  const complianceFeatures = [
    { 
      icon: FileText, 
      title: 'XRechnung', 
      description: 'Elektronische Rechnungen im deutschen Standard - automatisch erstellt und direkt versandbereit.',
      badge: 'E-Invoice'
    },
    { 
      icon: Database, 
      title: 'DATEV Export', 
      description: 'Nahtlose Integration mit Ihrem Steuerberater durch standardisierten DATEV-Export.',
      badge: 'Integration'
    },
    { 
      icon: CreditCard, 
      title: 'FinAPI Banking', 
      description: 'Automatischer Kontoabgleich und Zahlungsimport von über 3.000 deutschen Banken.',
      badge: 'Banking'
    },
    { 
      icon: Shield, 
      title: 'GoBD-Konform', 
      description: 'Revisionssichere Buchführung nach deutschen Steuervorschriften - finanzamtssicher.',
      badge: 'Compliance'
    },
  ];

  return (
    <section className="relative bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header with Teal Background */}
      <div className="bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 pt-20 pb-32 md:pt-28 md:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-block px-5 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-semibold text-white mb-6 border border-white/20"
            >
              All-in-One Business Suite
            </motion.span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Alles was Ihr Unternehmen braucht
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto drop-shadow-md">
              Von GoBD-konformer Buchhaltung über Multi-Plattform Werbung bis hin zur Team-Kommunikation - alles in einer Plattform.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Feature Cards with Sticky Scroll Animation */}
      <div className="relative -mt-20 md:-mt-28 pb-20 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          <div className="space-y-0">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                feature={feature}
                index={index}
                totalFeatures={features.length}
              />
            ))}
            
            {/* CTA Card - appears as last card with same animation */}
            <CTACard index={features.length} totalFeatures={features.length + 1} />
          </div>
        </div>
      </div>

      {/* Why Taskilo Section - What is Taskilo */}
      <div className="bg-white py-24">
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
              Die Business-Plattform für<br />
              <span className="text-[#14ad9f]">deutsche Unternehmen</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Taskilo vereint alle Geschäftsprozesse in einer Plattform - von der Buchhaltung über HR bis zum Marketing. 
              100% konform mit deutschen Steuervorschriften.
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
                className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-[#14ad9f]/5 transition-colors duration-300"
              >
                <stat.icon className="h-8 w-8 text-[#14ad9f] mx-auto mb-3" />
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* German Compliance Section */}
      <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 py-24">
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
              Entwickelt für den deutschen Markt mit voller Unterstützung aller relevanten Standards und Integrationen.
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
              'Kleinunternehmer §19 UStG',
              'Umsatzsteuer-Voranmeldung',
              'Revisionssichere Archivierung',
              'Automatische Belegerkennung',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="h-5 w-5 text-[#14ad9f]" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
