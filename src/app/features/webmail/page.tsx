'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Zap,
  CheckCircle,
  Globe,
  Lock,
  Users,
  ArrowRight,
  Sparkles,
  Server,
  HardDrive,
  Check
} from 'lucide-react';
import { HeroHeader } from '@/components/hero8-header';
import { DemoRequestModal } from '@/components/demo-request-modal';

export default function WebmailFeaturePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const features = [
    {
      icon: Shield,
      title: 'DSGVO-konform',
      description: 'Alle Daten werden ausschließlich in deutschen Rechenzentren gespeichert.'
    },
    {
      icon: Globe,
      title: 'Eigene Domain',
      description: 'Nutzen Sie Ihre eigene Domain für professionelle E-Mail-Adressen.'
    },
    {
      icon: HardDrive,
      title: 'Bis zu 50 GB Speicher',
      description: 'Großzügiger Speicher für E-Mails und Dateien in allen Tarifen.'
    },
    {
      icon: Zap,
      title: 'Blitzschnell',
      description: 'Modernste Infrastruktur für schnelle E-Mail-Zustellung in Echtzeit.'
    },
    {
      icon: Lock,
      title: 'Ende-zu-Ende Verschlüsselung',
      description: 'Ihre Kommunikation ist durch modernste Verschlüsselung geschützt.'
    },
    {
      icon: Users,
      title: 'Team-Postfächer',
      description: 'Unbegrenzt viele Postfächer für Ihr gesamtes Team.'
    }
  ];

  const plans = [
    {
      name: 'FreeMail',
      price: '0,00',
      period: '/Monat',
      description: 'Perfekt zum Testen',
      features: [
        '1 GB E-Mail Speicher',
        '2 GB Cloud Speicher',
        '@taskilo.de Adresse',
        'Webmail-Zugriff',
        'Spam-Schutz',
        'Kostenlos für immer'
      ],
      cta: 'Kostenlos starten',
      href: '/webmail/pricing',
      highlighted: false
    },
    {
      name: 'Eigene Domain',
      price: '1,99',
      period: '/Monat',
      description: 'Ihre professionelle Adresse',
      features: [
        'FreeMail-Postfach inklusive',
        'Eigene Wunsch-Domain',
        '100 E-Mail-Adressen',
        'Individuelle Adressen',
        'Weltweite Domains',
        '.de, .com, .eu, .io uvm.'
      ],
      cta: 'Domain registrieren',
      href: '/webmail/pricing',
      highlighted: false
    },
    {
      name: 'ProMail',
      price: '2,99',
      period: '/Monat',
      description: 'Für professionelle Nutzung',
      features: [
        '10 GB E-Mail Speicher',
        '25 GB Cloud Speicher',
        'Werbefreies Postfach',
        '10 E-Mail-Adressen',
        'Bis zu 50 MB Anhänge',
        'Priorität Support'
      ],
      cta: 'Jetzt upgraden',
      href: '/webmail/pricing',
      highlighted: true
    },
    {
      name: 'Taskilo Business',
      price: '29,99',
      period: '/Monat',
      description: 'Komplettlösung für Unternehmen',
      features: [
        'Company Dashboard',
        'Rechnungen & Buchhaltung',
        'CRM & Kundenverwaltung',
        'Zeiterfassung & Personal',
        'Banking & Zahlungen',
        'Premium Support 24/7'
      ],
      cta: 'Kostenlos testen',
      href: '/webmail/pricing',
      highlighted: false
    }
  ];

  const comparisons = [
    {
      provider: 'Gmail',
      storage: '15 GB',
      price: 'Kostenlos',
      domain: 'Nein',
      dsgvo: 'USA'
    },
    {
      provider: 'Microsoft 365',
      storage: '50 GB',
      price: 'ab 5,60€',
      domain: 'Ja',
      dsgvo: 'USA/EU'
    },
    {
      provider: 'Taskilo',
      storage: '1-25 GB',
      price: '0-2,99€',
      domain: 'Ja (ab 1,99€)',
      dsgvo: 'Deutschland'
    }
  ];

  return (
    <>
      <HeroHeader />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-linear-to-br from-teal-500 via-teal-600 to-teal-700 text-white">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-size-[20px_20px]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-semibold mb-6">
                  <Sparkles className="h-4 w-4" />
                  Made in Germany
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                  Professionelle E-Mail für Ihr Unternehmen
                </h1>
                <p className="text-xl text-teal-100 mb-8 leading-relaxed">
                  Sicherer Webmailer mit eigener Domain, großzügigem Speicher und 
                  DSGVO-konformer Datenhaltung in Deutschland. Ab 0€/Monat.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/webmail/pricing"
                    className="inline-flex items-center justify-center gap-2 bg-white text-teal-600 px-8 py-4 rounded-lg hover:bg-teal-50 font-semibold text-lg transition-colors"
                  >
                    Jetzt starten
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => setIsDemoModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white/10 font-semibold text-lg transition-colors"
                  >
                    Demo anfragen
                  </button>
                </div>
                
                {/* Trust Badges */}
                <div className="mt-8 flex flex-wrap gap-6 items-center">
                  <div className="flex items-center gap-2 text-white/90">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-medium">DSGVO-konform</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <Server className="h-5 w-5" />
                    <span className="text-sm font-medium">Made in Germany</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <Lock className="h-5 w-5" />
                    <span className="text-sm font-medium">SSL-verschlüsselt</span>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                className="relative"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <Image
                    src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop"
                    alt="Taskilo Webmail Interface"
                    width={800}
                    height={600}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-teal-900/30 to-transparent" />
                </div>
                {/* Floating Stats */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-2xl p-6">
                  <div className="text-3xl font-bold text-teal-600">50 GB</div>
                  <div className="text-sm text-gray-600">Speicher inklusive</div>
                </div>
                <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-2xl p-6">
                  <div className="text-3xl font-bold text-teal-600">ab 0€</div>
                  <div className="text-sm text-gray-600">pro Monat</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Warum Taskilo Webmail?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Professionelle E-Mail-Kommunikation mit allen Features, die moderne Unternehmen benötigen.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-24 bg-linear-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Warum Taskilo Webmail?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Vergleichen Sie uns mit den führenden Anbietern
              </p>
            </motion.div>
            
            {/* Comparison Table */}
            <motion.div 
              className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {/* Header */}
              <div className="grid grid-cols-4 border-b border-gray-200">
                <div className="p-6 bg-gray-50"></div>
                {comparisons.map((comp, index) => (
                  <div 
                    key={index}
                    className={`p-6 text-center ${
                      comp.provider === 'Taskilo' 
                        ? 'bg-teal-600' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <h3 className={`text-lg font-bold ${
                      comp.provider === 'Taskilo' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {comp.provider}
                    </h3>
                  </div>
                ))}
              </div>

              {/* Speicher */}
              <div className="grid grid-cols-4 border-b border-gray-200">
                <div className="p-6 bg-gray-50 font-medium text-gray-900">
                  Speicher
                </div>
                {comparisons.map((comp, index) => (
                  <div 
                    key={index}
                    className="p-6 text-center font-semibold text-gray-900"
                  >
                    {comp.storage}
                  </div>
                ))}
              </div>

              {/* Preis */}
              <div className="grid grid-cols-4 border-b border-gray-200">
                <div className="p-6 bg-gray-50 font-medium text-gray-900">
                  Preis pro Monat
                </div>
                {comparisons.map((comp, index) => (
                  <div 
                    key={index}
                    className="p-6 text-center"
                  >
                    <span className={`text-2xl font-bold ${
                      comp.provider === 'Taskilo' ? 'text-teal-600' : 'text-gray-900'
                    }`}>
                      {comp.price}
                    </span>
                  </div>
                ))}
              </div>

              {/* Domain */}
              <div className="grid grid-cols-4 border-b border-gray-200">
                <div className="p-6 bg-gray-50 font-medium text-gray-900">
                  Eigene Domain
                </div>
                {comparisons.map((comp, index) => (
                  <div 
                    key={index}
                    className="p-6 text-center"
                  >
                    {comp.domain === 'Ja' || comp.domain.startsWith('Ja (') ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                        <Check className="w-4 h-4 text-green-600" />
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Datenschutz */}
              <div className="grid grid-cols-4">
                <div className="p-6 bg-gray-50 font-medium text-gray-900">
                  Datenschutz
                </div>
                {comparisons.map((comp, index) => (
                  <div 
                    key={index}
                    className="p-6 text-center"
                  >
                    <span className={`font-medium ${
                      comp.dsgvo === 'Deutschland' ? 'text-teal-600' : 'text-gray-600'
                    }`}>
                      {comp.dsgvo}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="grid grid-cols-4 bg-gray-50 border-t border-gray-200">
                <div className="p-6"></div>
                {comparisons.map((comp, index) => (
                  <div key={index} className="p-6">
                    {comp.provider === 'Taskilo' && (
                      <Link
                        href="/webmail/pricing"
                        className="block text-center bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium transition-colors"
                      >
                        Jetzt starten
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.p 
              className="text-center text-sm text-gray-500 mt-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Stand: Dezember 2025
            </motion.p>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 bg-linear-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Transparente Preise
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Wählen Sie den Plan, der am besten zu Ihnen passt. Keine versteckten Kosten.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  className={`relative bg-white rounded-2xl shadow-lg p-6 ${
                    plan.highlighted 
                      ? 'ring-2 ring-teal-600 transform scale-105' 
                      : 'hover:shadow-xl'
                  } transition-all`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Beliebt
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price}€
                      </span>
                      <span className="text-gray-600 ml-1">
                        {plan.period}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-teal-600 text-white">
          <motion.div 
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Bereit für professionelle E-Mail-Kommunikation?
            </h2>
            <p className="text-xl text-teal-100 mb-8">
              Starten Sie noch heute mit FreeMail – kostenlos und ohne Kreditkarte.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/webmail/pricing"
                className="inline-flex items-center justify-center gap-2 bg-white text-teal-600 px-8 py-4 rounded-lg hover:bg-teal-50 font-semibold text-lg transition-colors"
              >
                Kostenlos starten
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white/10 font-semibold text-lg transition-colors"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
      
      <DemoRequestModal 
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </>
  );
}
