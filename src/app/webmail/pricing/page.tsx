'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Users, Shield, Zap, ArrowRight, Search, Loader2, ChevronDown } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HeroHeader } from '@/components/hero8-header';

interface PlanFeature {
  text: string;
  description?: string;
}

interface Plan {
  id: string;
  name: string;
  badge?: string;
  price: number;
  priceUnit: string;
  popular?: boolean;
  features: PlanFeature[];
  ctaText: string;
  ctaHref: string;
}

// Verfügbare TLDs mit Preisen (jährlich)
const AVAILABLE_TLDS = [
  { tld: '.de', price: 0.99, popular: true },
  { tld: '.com', price: 1.49, popular: true },
  { tld: '.net', price: 1.49, popular: true },
  { tld: '.org', price: 1.49, popular: false },
  { tld: '.eu', price: 0.99, popular: true },
  { tld: '.info', price: 0.99, popular: false },
  { tld: '.biz', price: 1.49, popular: false },
  { tld: '.online', price: 0.99, popular: false },
  { tld: '.shop', price: 2.99, popular: false },
  { tld: '.io', price: 4.99, popular: true },
  { tld: '.co', price: 2.49, popular: false },
  { tld: '.me', price: 1.99, popular: false },
  { tld: '.at', price: 1.49, popular: false },
  { tld: '.ch', price: 1.99, popular: false },
  { tld: '.uk', price: 1.49, popular: false },
  { tld: '.fr', price: 1.49, popular: false },
  { tld: '.es', price: 1.49, popular: false },
  { tld: '.it', price: 1.49, popular: false },
  { tld: '.nl', price: 1.49, popular: false },
  { tld: '.pl', price: 1.49, popular: false },
];

const WEBMAIL_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'FreeMail',
    badge: 'Kostenlos',
    price: 0,
    priceUnit: '/Monat',
    features: [
      { text: '1 GB E-Mail-Speicher', description: 'und bis zu 20 MB Anhänge' },
      { text: '2 GB Cloud-Speicher', description: 'Erweiterbar ab 0,99€/GB' },
      { text: '2 E-Mail-Adressen', description: '@taskilo.de' },
      { text: 'Webmail-Zugang', description: 'E-Mail, Kalender, Aufgaben' },
      { text: 'Standard Support' },
    ],
    ctaText: 'Jetzt registrieren',
    ctaHref: '/webmail?create=true',
  },
  {
    id: 'domain',
    name: 'Eigene Domain',
    badge: 'Persönliche E-Mail',
    price: 1.99,
    priceUnit: '/Monat',
    features: [
      { text: 'FreeMail-Postfach', description: 'mit allen Vorteilen' },
      { text: 'Eigene Wunsch-Domain', description: 'z.B. erika-muster.de' },
      { text: 'Individuelle Adressen', description: 'z.B. mail@erika-muster.de' },
      { text: '100 E-Mail-Adressen', description: 'selbst im Postfach anlegen' },
      { text: 'Weltweite Domains', description: '.de, .com, .eu, .io und mehr' },
    ],
    ctaText: 'Domain suchen',
    ctaHref: '#domain-search',
  },
  {
    id: 'pro',
    name: 'ProMail',
    badge: 'Mehr Speicher',
    price: 2.99,
    priceUnit: '/Monat',
    popular: true,
    features: [
      { text: '10 GB E-Mail-Speicher', description: 'und bis zu 50 MB Anhänge' },
      { text: '25 GB Cloud-Speicher', description: 'Erweiterbar ab 0,99€/GB' },
      { text: '10 E-Mail-Adressen', description: '@taskilo.de' },
      { text: 'Werbefreies Postfach', description: 'Keine Werbebanner' },
      { text: 'Priorität Support', description: 'Schnellere Antwortzeiten' },
    ],
    ctaText: '1 Monat gratis testen',
    ctaHref: '/webmail/pricing/checkout?plan=pro',
  },
  {
    id: 'business',
    name: 'Taskilo Business',
    badge: '7 Tage kostenlos',
    price: 29.99,
    priceUnit: '/Monat',
    features: [
      { text: 'Company Dashboard', description: 'Komplette Unternehmensverwaltung' },
      { text: 'Rechnungen & Angebote', description: 'GoBD-konforme Buchhaltung mit E-Rechnung' },
      { text: 'Geschäftspartner (CRM)', description: 'Kundenverwaltung & Kommunikation' },
      { text: 'Zeiterfassung', description: 'Arbeitszeiten digital erfassen' },
      { text: 'Personal & Recruiting', description: 'Mitarbeiter, Dienstplan, Gehaltsabrechnung' },
      { text: 'Workspace', description: 'Projekte, Aufgaben & Dokumente' },
      { text: 'Banking & Zahlungen', description: 'Revolut Business, Konten & Kassenbuch' },
      { text: 'Online-Zahlungen', description: 'Kartenzahlungen via Revolut Merchant' },
      { text: 'Lagerbestand', description: 'Inventar & Bestandsverwaltung' },
      { text: 'Taskilo Advertising', description: 'Google, Meta & LinkedIn Ads' },
      { text: 'WhatsApp Business', description: 'Kundenkommunikation per WhatsApp' },
      { text: 'DATEV Export', description: 'Nahtlose Steuerberater-Anbindung' },
      { text: 'Premium Support', description: 'Telefonischer Support' },
    ],
    ctaText: '7 Tage kostenlos testen',
    ctaHref: '/webmail/pricing/checkout?plan=business&trial=true',
  },
];

function PlanCard({ plan, isDark }: { plan: Plan; isDark: boolean }) {
  const [expandedFeatures, setExpandedFeatures] = useState<number[]>([]);
  const priceWhole = Math.floor(plan.price);
  const priceCents = Math.round((plan.price - priceWhole) * 100);

  const toggleFeature = (idx: number) => {
    setExpandedFeatures(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] hover:shadow-xl',
        plan.popular
          ? isDark
            ? 'border-teal-500 bg-[#292a2d] shadow-lg shadow-teal-500/20'
            : 'border-teal-500 bg-white shadow-lg shadow-teal-500/20'
          : isDark
            ? 'border-[#5f6368] bg-[#292a2d]'
            : 'border-gray-200 bg-white'
      )}
    >
      {/* Badge */}
      {plan.badge && (
        <div
          className={cn(
            'absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold',
            plan.popular
              ? 'bg-teal-500 text-white'
              : isDark
                ? 'bg-[#5f6368] text-gray-200'
                : 'bg-gray-100 text-gray-600'
          )}
        >
          {plan.badge}
        </div>
      )}

      {/* Plan Name */}
      <h3
        className={cn(
          'text-xl font-bold text-center mt-4',
          isDark ? 'text-white' : 'text-gray-900'
        )}
      >
        {plan.name}
      </h3>

      {/* Price */}
      <div className="text-center my-6">
        <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
          nur
        </span>
        <div className="flex items-start justify-center gap-1">
          <span className={cn('text-5xl font-bold', 'text-teal-500')}>
            {priceWhole}
          </span>
          <div className="flex flex-col items-start">
            <span className={cn('text-2xl font-bold', 'text-teal-500')}>
              {priceCents.toString().padStart(2, '0')}
            </span>
            <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
              EUR{plan.priceUnit}
            </span>
          </div>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, idx) => (
          <li key={idx}>
            {feature.description ? (
              <button
                type="button"
                onClick={() => toggleFeature(idx)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                        {feature.text}
                      </span>
                      <ChevronDown 
                        className={cn(
                          'w-4 h-4 transition-transform shrink-0 ml-2',
                          isDark ? 'text-gray-400' : 'text-gray-500',
                          expandedFeatures.includes(idx) && 'rotate-180'
                        )} 
                      />
                    </div>
                    {expandedFeatures.includes(idx) && (
                      <p className={cn('text-sm mt-1', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                  {feature.text}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Link
        href={plan.ctaHref}
        className={cn(
          'flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full text-center font-semibold transition-all whitespace-nowrap',
          plan.popular
            ? 'bg-linear-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg hover:shadow-xl'
            : isDark
              ? 'bg-[#5f6368] text-white hover:bg-[#6f7378]'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        )}
      >
        <span>{plan.ctaText}</span>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </Link>
    </div>
  );
}

// Domain Search Component
interface DomainResult {
  domain: string;
  tld: string;
  available: boolean;
  priceMonthly: number;
  priceYearly: number;
}

function DomainSearchSection({ isDark }: { isDark: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    setError(null);
    
    try {
      const response = await fetch('/api/webmail/domain-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: searchQuery }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || 'Domain-Prüfung fehlgeschlagen');
        setResults([]);
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section id="domain-search" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className={cn('text-3xl font-bold mb-4', isDark ? 'text-white' : 'text-gray-900')}>
            Finden Sie Ihre Wunsch-Domain
          </h2>
          <p className={cn('text-lg', isDark ? 'text-gray-400' : 'text-gray-600')}>
            Über 20 Domain-Endungen verfügbar: .de, .com, .eu, .io, .net und viele mehr
          </p>
        </div>

        {/* Search Box */}
        <div className={cn(
          'rounded-2xl p-6 md:p-8',
          isDark ? 'bg-[#292a2d]' : 'bg-white shadow-lg'
        )}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5',
                isDark ? 'text-gray-500' : 'text-gray-400'
              )} />
              <Input
                type="text"
                placeholder="Ihre Wunsch-Domain eingeben (z.B. erika-muster)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={cn(
                  'pl-12 h-14 text-lg',
                  isDark ? 'bg-[#303134] border-[#5f6368] text-white' : 'bg-gray-50 border-gray-200'
                )}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="h-14 px-8 bg-teal-500 hover:bg-teal-600 text-white font-semibold"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Suche...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Domain prüfen
                </>
              )}
            </Button>
          </div>

          {/* Available TLDs Preview */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {AVAILABLE_TLDS.filter(t => t.popular).map((tld) => (
              <span
                key={tld.tld}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  isDark ? 'bg-[#303134] text-gray-300' : 'bg-gray-100 text-gray-600'
                )}
              >
                {tld.tld} ab {tld.price.toFixed(2)}€/Mon.
              </span>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className={cn(
              'mt-6 p-4 rounded-lg border',
              isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
            )}>
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Search Results */}
          {hasSearched && !error && (
            <div className="mt-8">
              <h3 className={cn('font-semibold mb-4', isDark ? 'text-white' : 'text-gray-900')}>
                Suchergebnisse für &quot;{searchQuery}&quot;
              </h3>
              
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                </div>
              ) : results.length === 0 ? (
                <p className={cn('text-center py-8', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  Keine Ergebnisse gefunden. Bitte versuchen Sie einen anderen Namen.
                </p>
              ) : (
                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.domain}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border transition-all',
                        result.available
                          ? isDark
                            ? 'border-teal-500/50 bg-teal-500/10'
                            : 'border-teal-200 bg-teal-50'
                          : isDark
                            ? 'border-[#5f6368] bg-[#303134] opacity-60'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {result.available ? (
                          <Check className="w-5 h-5 text-teal-500" />
                        ) : (
                          <span className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                            Vergeben
                          </span>
                        )}
                        <span className={cn(
                          'font-medium',
                          result.available
                            ? isDark ? 'text-white' : 'text-gray-900'
                            : isDark ? 'text-gray-500' : 'text-gray-400'
                        )}>
                          {result.domain}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={cn(
                            'font-semibold block',
                            result.available ? 'text-teal-500' : isDark ? 'text-gray-500' : 'text-gray-400'
                          )}>
                            {result.priceMonthly.toFixed(2)}€/Mon.
                          </span>
                          <span className={cn(
                            'text-xs',
                            isDark ? 'text-gray-500' : 'text-gray-400'
                          )}>
                            ({result.priceYearly.toFixed(2)}€/Jahr)
                          </span>
                        </div>
                        {result.available && (
                          <Link
                            href={`/webmail/pricing/checkout?plan=domain&domain=${encodeURIComponent(result.domain)}`}
                            className="px-4 py-2 rounded-lg bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
                          >
                            Auswählen
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show All TLDs */}
              <details className="mt-6">
                <summary className={cn(
                  'cursor-pointer font-medium hover:text-teal-500 transition-colors',
                  isDark ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Alle {AVAILABLE_TLDS.length} Domain-Endungen anzeigen
                </summary>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {AVAILABLE_TLDS.map((tld) => (
                    <div
                      key={tld.tld}
                      className={cn(
                        'p-3 rounded-lg text-center',
                        isDark ? 'bg-[#303134]' : 'bg-gray-50'
                      )}
                    >
                      <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                        {tld.tld}
                      </span>
                      <span className={cn('block text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        ab {tld.price.toFixed(2)}€/Mon.
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function WebmailPricingPage() {
  const { isDark } = useWebmailTheme();

  return (
    <div
      className={cn(
        'min-h-screen transition-colors',
        isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]'
      )}
    >
      {/* Unified Header */}
      <HeroHeader />

      {/* Hero Section */}
      <section className="py-16 px-4 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1
            className={cn(
              'text-4xl md:text-5xl font-bold mb-4',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            Wählen Sie Ihren{' '}
            <span className="text-teal-500">Taskilo-Tarif</span>
          </h1>
          <p
            className={cn(
              'text-lg max-w-2xl mx-auto',
              isDark ? 'text-gray-400' : 'text-gray-600'
            )}
          >
            Von kostenlosem E-Mail-Postfach bis zur kompletten Business-Lösung mit 
            Rechnungswesen, CRM, Zeiterfassung und mehr. Finden Sie den passenden Tarif.
          </p>
        </div>
      </section>

      {/* Pricing Cards - 4 columns on large screens */}
      <section className="pb-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {WEBMAIL_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isDark={isDark} />
          ))}
        </div>
      </section>

      {/* Domain Search Section */}
      <DomainSearchSection isDark={isDark} />

      {/* Features Comparison */}
      <section
        className={cn(
          'py-16 px-4',
          isDark ? 'bg-[#292a2d]' : 'bg-linear-to-b from-white to-gray-50'
        )}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
            <span className={isDark ? 'text-white' : 'text-gray-800'}>Alle Tarife </span>
            <span className="text-teal-500">im Vergleich</span>
          </h2>
          <p className={cn('text-center mb-12', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Finden Sie den passenden Tarif für Ihre Anforderungen
          </p>

          <div className={cn(
            'rounded-2xl overflow-hidden shadow-lg',
            isDark ? 'bg-[#303134] border border-[#5f6368]' : 'bg-white border border-gray-100'
          )}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className={cn(
                    'border-b-2',
                    isDark ? 'bg-[#252528] border-teal-500/30' : 'bg-linear-to-r from-teal-500 to-teal-600'
                  )}>
                    <th className={cn(
                      'px-6 py-5 text-left font-semibold',
                      isDark ? 'text-teal-400' : 'text-white'
                    )}>
                      Feature
                    </th>
                    {WEBMAIL_PLANS.map((plan, idx) => (
                      <th
                        key={plan.id}
                        className={cn(
                          'px-4 py-5 text-center font-semibold whitespace-nowrap',
                          isDark ? 'text-white' : 'text-white',
                          idx === WEBMAIL_PLANS.length - 1 && 'bg-white/10'
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{plan.name}</span>
                          <span className={cn(
                            'text-xs font-normal',
                            isDark ? 'text-gray-400' : 'text-white/80'
                          )}>
                            {plan.price === 0 ? 'Kostenlos' : `${plan.price.toFixed(2)}€/Mon.`}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'E-Mail-Speicher', values: ['1 GB', '1 GB', '10 GB', '+2,99€/Mon.*'], note: true },
                    { feature: 'Cloud-Speicher', values: ['2 GB', '2 GB', '25 GB', 'inkl.*'] },
                    { feature: 'Max. Anhangsgröße', values: ['20 MB', '20 MB', '50 MB', 'inkl.*'] },
                    { feature: 'E-Mail-Adressen', values: ['2', '100', '10', 'inkl.*'] },
                    { feature: 'Eigene Domain', values: [false, true, false, 'inkl.*'] },
                    { feature: 'Werbefrei', values: [false, false, true, 'inkl.*'] },
                    { feature: 'Kalender & Aufgaben', values: [true, true, true, true] },
                  { feature: 'Company Dashboard', values: [false, false, false, true], highlight: true },
                  { feature: 'Rechnungen & Angebote (GoBD)', values: [false, false, false, true], highlight: true },
                  { feature: 'Geschäftspartner (CRM)', values: [false, false, false, true], highlight: true },
                  { feature: 'Zeiterfassung', values: [false, false, false, true], highlight: true },
                  { feature: 'Personal & Recruiting', values: [false, false, false, true], highlight: true },
                  { feature: 'Workspace (Projekte & Aufgaben)', values: [false, false, false, true], highlight: true },
                  { feature: 'Banking & Revolut Business', values: [false, false, false, true], highlight: true },
                  { feature: 'Online-Zahlungen (Revolut Merchant)', values: [false, false, false, true], highlight: true },
                  { feature: 'Lagerbestand', values: [false, false, false, true], highlight: true },
                  { feature: 'Zusätzlicher Cloud-Speicher', values: ['Buchbar', 'Buchbar', 'Buchbar', 'Buchbar'] },
                  { feature: 'Taskilo Advertising', values: [false, false, false, true], highlight: true },
                  { feature: 'WhatsApp Business', values: [false, false, false, true], highlight: true },
                  { feature: 'DATEV Export', values: [false, false, false, true], highlight: true },
                  { feature: 'Premium Support', values: [false, false, true, true] },
                ].map((row, idx, arr) => (
                  <tr
                    key={idx}
                    className={cn(
                      'border-t transition-colors duration-200',
                      isDark ? 'border-[#5f6368]' : 'border-gray-100',
                      (row as { highlight?: boolean }).highlight 
                        ? (isDark ? 'bg-teal-500/10 hover:bg-teal-500/15' : 'bg-teal-50/70 hover:bg-teal-50')
                        : (isDark ? 'hover:bg-[#35363a]' : 'hover:bg-gray-50'),
                      idx === arr.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className={cn(
                      'px-6 py-4', 
                      isDark ? 'text-gray-300' : 'text-gray-700',
                      (row as { highlight?: boolean }).highlight && (isDark ? 'text-teal-400 font-medium' : 'text-teal-700 font-medium')
                    )}>
                      {row.feature}
                    </td>
                    {row.values.map((value, vIdx) => (
                      <td 
                        key={vIdx} 
                        className={cn(
                          'px-4 py-4 text-center',
                          vIdx === row.values.length - 1 && (isDark ? 'bg-teal-500/5' : 'bg-teal-50/30')
                        )}
                      >
                        {typeof value === 'boolean' ? (
                          value ? (
                            <div className="flex items-center justify-center">
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                isDark ? 'bg-teal-500/20' : 'bg-teal-100'
                              )}>
                                <Check className="w-4 h-4 text-teal-500" />
                              </div>
                            </div>
                          ) : (
                            <span className={cn('text-lg', isDark ? 'text-gray-600' : 'text-gray-300')}>
                              —
                            </span>
                          )
                        ) : value === '+2,99€/Mon.*' ? (
                          <span className={cn(
                            'inline-flex items-center text-xs px-3 py-1.5 rounded-full font-medium', 
                            isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700'
                          )}>
                            +2,99€/Mon.*
                          </span>
                        ) : value === 'inkl.*' ? (
                          <span className={cn('text-xs font-medium', isDark ? 'text-teal-400' : 'text-teal-600')}>
                            inkl.*
                          </span>
                        ) : (
                          <span className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-gray-800')}>
                            {value}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          <p className={cn('text-xs mt-6 text-center', isDark ? 'text-gray-500' : 'text-gray-500')}>
            * Optional: ProMail-Postfach (E-Mail, Cloud, Domain) kann für einmalig +2,99€/Monat zum Taskilo Business Tarif hinzugebucht werden.
          </p>
        </div>
      </section>

      {/* Trust Section */}
      <section className={cn('py-16 px-4', isDark ? 'bg-[#292a2d]' : 'bg-white')}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-12">
            <span className={isDark ? 'text-white' : 'text-gray-800'}>Warum </span>
            <span className="text-teal-500">Taskilo?</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={cn(
              'flex flex-col items-center p-6 rounded-xl transition-all duration-200',
              isDark ? 'hover:bg-[#35363a]' : 'hover:bg-gray-50 hover:shadow-md'
            )}>
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                  isDark ? 'bg-teal-500/20' : 'bg-linear-to-br from-teal-100 to-teal-50'
                )}
              >
                <Shield className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className={cn('font-semibold mb-2', isDark ? 'text-white' : 'text-gray-800')}>
                DSGVO-konform
              </h3>
              <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                Ihre Daten werden in Deutschland gespeichert und sind DSGVO-konform geschützt.
              </p>
            </div>

            <div className={cn(
              'flex flex-col items-center p-6 rounded-xl transition-all duration-200',
              isDark ? 'hover:bg-[#35363a]' : 'hover:bg-gray-50 hover:shadow-md'
            )}>
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                  isDark ? 'bg-teal-500/20' : 'bg-linear-to-br from-teal-100 to-teal-50'
                )}
              >
                <Zap className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className={cn('font-semibold mb-2', isDark ? 'text-white' : 'text-gray-800')}>
                Schnell & Zuverlässig
              </h3>
              <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                99,9% Verfügbarkeit und blitzschneller Zugang zu Ihren E-Mails.
              </p>
            </div>

            <div className={cn(
              'flex flex-col items-center p-6 rounded-xl transition-all duration-200',
              isDark ? 'hover:bg-[#35363a]' : 'hover:bg-gray-50 hover:shadow-md'
            )}>
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                  isDark ? 'bg-teal-500/20' : 'bg-linear-to-br from-teal-100 to-teal-50'
                )}
              >
                <Users className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className={cn('font-semibold mb-2', isDark ? 'text-white' : 'text-gray-800')}>
                Deutscher Support
              </h3>
              <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                Unser Support-Team ist für Sie da - in deutscher Sprache.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={cn(
          'py-8 px-4 border-t',
          isDark ? 'bg-[#292a2d] border-[#5f6368]' : 'bg-gray-50 border-gray-200'
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/impressum"
              className={cn(
                'transition-colors',
                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Impressum
            </Link>
            <Link
              href="/agb"
              className={cn(
                'transition-colors',
                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              AGB
            </Link>
            <Link
              href="/datenschutz"
              className={cn(
                'transition-colors',
                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Datenschutz
            </Link>
            <Link
              href="/barrierefreiheit"
              className={cn(
                'transition-colors',
                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Barrierefreiheit
            </Link>
          </div>
          <p
            className={cn(
              'text-center text-sm mt-4',
              isDark ? 'text-gray-500' : 'text-gray-400'
            )}
          >
            2024 Taskilo GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}
