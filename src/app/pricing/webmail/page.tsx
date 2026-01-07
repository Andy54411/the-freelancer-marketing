/**
 * Webmail Pricing Page
 * 
 * Zeigt Preise für Taskilo Webmail:
 * - Einzelne E-Mail-Postfächer
 * - Domain-Pakete
 * - Speicherupgrades
 */

'use client';

import { useState } from 'react';
import { Check, Mail, HardDrive, ArrowRight, Shield, Zap } from 'lucide-react';
import Link from 'next/link';
import { HeroHeader } from '@/components/hero8-header';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const webmailPlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Webmail Basic',
    description: 'Professionelle E-Mail mit eigener Domain',
    price: 2.99,
    period: '/Postfach/Monat',
    features: [
      '5 GB Speicher pro Postfach',
      'Eigene Domain verknüpfen',
      'IMAP/SMTP Zugang',
      'Spam- und Virenschutz',
      'Webmail-Oberfläche',
      'Mobile App-Zugang',
    ],
  },
  {
    id: 'professional',
    name: 'Webmail Professional',
    description: 'Ideal für kleine Unternehmen',
    price: 4.99,
    period: '/Postfach/Monat',
    features: [
      '25 GB Speicher pro Postfach',
      'Eigene Domain inklusive',
      'IMAP/SMTP Zugang',
      'Erweiterte Spam-Filter',
      'Kalender-Integration',
      'Kontakt-Synchronisation',
      'Prioritäts-Support',
    ],
    highlighted: true,
    badge: 'Empfohlen',
  },
  {
    id: 'business',
    name: 'Webmail Business',
    description: 'Für wachsende Teams',
    price: 7.99,
    period: '/Postfach/Monat',
    features: [
      '50 GB Speicher pro Postfach',
      'Eigene Domain inklusive',
      'Unbegrenzte Aliasse',
      'DKIM/DMARC-Konfiguration',
      'Archivierungsfunktion',
      'Admin-Dashboard',
      'API-Zugang',
      '24/7 Premium-Support',
    ],
  },
];

const domainPackages = [
  {
    id: 'domain-starter',
    name: '5 Postfächer',
    price: 12.99,
    originalPrice: 14.95,
    features: ['5 E-Mail-Postfächer', '1 Domain inklusive', '25 GB Gesamt-Speicher'],
  },
  {
    id: 'domain-business',
    name: '10 Postfächer',
    price: 24.99,
    originalPrice: 29.90,
    features: ['10 E-Mail-Postfächer', '2 Domains inklusive', '100 GB Gesamt-Speicher'],
  },
  {
    id: 'domain-enterprise',
    name: '25 Postfächer',
    price: 49.99,
    originalPrice: 62.25,
    features: ['25 E-Mail-Postfächer', '5 Domains inklusive', '500 GB Gesamt-Speicher'],
  },
];

export default function WebmailPricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const yearlyDiscount = 0.17; // 17% Rabatt bei jährlicher Zahlung

  const getPrice = (price: number) => {
    if (billingCycle === 'yearly') {
      return (price * (1 - yearlyDiscount) * 12).toFixed(2).replace('.', ',');
    }
    return price.toFixed(2).replace('.', ',');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <HeroHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#14ad9f]/10 text-[#14ad9f] text-sm font-medium mb-6">
            <Mail className="w-4 h-4" />
            Professionelle E-Mail-Lösungen
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Taskilo Webmail Preise
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Professionelle E-Mail-Postfächer mit eigener Domain, 
            Spam-Schutz und nahtloser Integration in Ihr Taskilo Dashboard.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-2 bg-gray-100 rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Jährlich
              <span className="ml-2 text-xs text-[#14ad9f] font-bold">-17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {webmailPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-8 transition-all hover:shadow-xl ${
                  plan.highlighted ? 'border-[#14ad9f] shadow-lg' : 'border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-[#14ad9f] text-white text-sm font-medium">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      {getPrice(plan.price)} €
                    </span>
                  </div>
                  <span className="text-gray-500 text-sm">
                    {billingCycle === 'yearly' ? '/Postfach/Jahr' : plan.period}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-600">
                      <Check className="w-5 h-5 text-[#14ad9f] flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/registrieren"
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    plan.highlighted
                      ? 'bg-[#14ad9f] text-white hover:bg-teal-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Jetzt starten
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domain Packages */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Domain-Pakete</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Sparen Sie mit unseren Paketangeboten für mehrere Postfächer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {domainPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">{pkg.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {pkg.price.toFixed(2).replace('.', ',')} €
                  </span>
                  <span className="text-gray-500">/Monat</span>
                  <span className="text-sm text-gray-400 line-through">
                    {pkg.originalPrice.toFixed(2).replace('.', ',')} €
                  </span>
                </div>
                <ul className="space-y-2">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-[#14ad9f]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Warum Taskilo Webmail?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#14ad9f]/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-[#14ad9f]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">DSGVO-konform</h3>
              <p className="text-gray-600">
                Gehostet in Deutschland mit höchsten Datenschutzstandards
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#14ad9f]/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-[#14ad9f]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Nahtlose Integration</h3>
              <p className="text-gray-600">
                Vollständig in Ihr Taskilo Dashboard integriert
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#14ad9f]/10 flex items-center justify-center mx-auto mb-4">
                <HardDrive className="w-7 h-7 text-[#14ad9f]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Flexibler Speicher</h3>
              <p className="text-gray-600">
                Jederzeit erweiterbar nach Ihren Bedürfnissen
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-[#14ad9f] to-teal-700">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Bereit für professionelle E-Mail?
          </h2>
          <p className="text-white/90 mb-8">
            Starten Sie noch heute mit Taskilo Webmail und präsentieren Sie sich professionell.
          </p>
          <Link
            href="/registrieren"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-[#14ad9f] font-semibold hover:shadow-xl transition-all"
          >
            Kostenlos registrieren
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
