/**
 * Pricing Overview Page
 * 
 * Übersichtsseite für alle Taskilo-Preise
 * Verlinkt zu Webmail und Business-Pricing
 */

'use client';

import { Mail, Building2, ArrowRight, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { HeroHeader } from '@/components/hero8-header';

const pricingCategories = [
  {
    id: 'webmail',
    title: 'Taskilo Webmail',
    description: 'Professionelle E-Mail-Postfächer mit eigener Domain',
    icon: Mail,
    href: '/pricing/webmail',
    color: 'from-blue-500 to-indigo-600',
    startPrice: '2,99 €',
    priceLabel: '/Postfach/Monat',
    features: [
      'Eigene Domain',
      'IMAP/SMTP Zugang',
      'Spam- und Virenschutz',
      'Kalender & Kontakte',
    ],
  },
  {
    id: 'business',
    title: 'Taskilo Business',
    description: 'Premium-Module für Ihr Unternehmen',
    icon: Building2,
    href: '/pricing/business',
    color: 'from-[#14ad9f] to-teal-700',
    startPrice: '9,99 €',
    priceLabel: '/Modul/Monat',
    features: [
      'WhatsApp Business Integration',
      'Taskilo Advertising',
      'Recruiting-System',
      'Workspace Pro',
    ],
  },
];

const comparisonFeatures = [
  { feature: 'Kostenlose Testphase', webmail: true, business: '7 Tage' },
  { feature: 'Deutsche Server', webmail: true, business: true },
  { feature: 'DSGVO-konform', webmail: true, business: true },
  { feature: 'Support', webmail: 'E-Mail', business: 'Priorität' },
  { feature: 'API-Zugang', webmail: 'Professional+', business: true },
  { feature: 'Dashboard-Integration', webmail: true, business: true },
];

export default function PricingOverviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <HeroHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#14ad9f]/10 text-[#14ad9f] text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Einfache, transparente Preise
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Preise, die zu Ihrem Unternehmen passen
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Wählen Sie die passenden Produkte für Ihr Unternehmen. 
            Keine versteckten Kosten, jederzeit kündbar.
          </p>
        </div>
      </section>

      {/* Category Cards */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {pricingCategories.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6`}>
                  <category.icon className="w-7 h-7 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {category.title}
                </h2>
                <p className="text-gray-600 mb-4">{category.description}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-sm text-gray-500">ab</span>
                  <span className="text-3xl font-bold text-gray-900">{category.startPrice}</span>
                  <span className="text-gray-500">{category.priceLabel}</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {category.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-600">
                      <Check className="w-4 h-4 text-[#14ad9f]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-2 text-[#14ad9f] font-semibold group-hover:gap-3 transition-all">
                  Preise ansehen
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Vergleich</h2>
            <p className="text-gray-600">
              Alle Taskilo-Produkte im Überblick
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-4 font-medium text-gray-500">Feature</th>
                  <th className="text-center px-6 py-4 font-medium text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4" />
                      Webmail
                    </div>
                  </th>
                  <th className="text-center px-6 py-4 font-medium text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Business
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="px-6 py-4 text-gray-700">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.webmail === true ? (
                        <Check className="w-5 h-5 text-[#14ad9f] mx-auto" />
                      ) : (
                        <span className="text-gray-600">{row.webmail}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.business === true ? (
                        <Check className="w-5 h-5 text-[#14ad9f] mx-auto" />
                      ) : (
                        <span className="text-gray-600">{row.business}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Fragen zu unseren Preisen?
          </h2>
          <p className="text-gray-600 mb-6">
            Unser Support-Team hilft Ihnen gerne bei der Wahl des richtigen Pakets.
          </p>
          <Link
            href="/kontakt"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-colors"
          >
            Kontakt aufnehmen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-[#14ad9f] to-teal-700">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Starten Sie noch heute
          </h2>
          <p className="text-white/90 mb-8">
            Registrieren Sie sich kostenlos und entdecken Sie alle Funktionen von Taskilo.
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
