'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Users, Shield, Zap, ArrowRight, Sun, Moon, Globe, Search, Loader2 } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
      { text: '2 GB Cloud-Speicher', description: 'Platz für ca. 400 Fotos' },
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
      { text: '25 GB Cloud-Speicher', description: 'Platz für ca. 5.000 Fotos' },
      { text: '10 E-Mail-Adressen', description: '@taskilo.de' },
      { text: 'Werbefreies Postfach', description: 'Keine Werbebanner' },
      { text: 'Priorität Support', description: 'Schnellere Antwortzeiten' },
    ],
    ctaText: '1 Monat gratis testen',
    ctaHref: '/webmail/pricing/checkout?plan=pro',
  },
  {
    id: 'business',
    name: 'BusinessMail',
    badge: 'Für Unternehmen',
    price: 4.99,
    priceUnit: '/Monat',
    features: [
      { text: '50 GB E-Mail-Speicher', description: 'und bis zu 100 MB Anhänge' },
      { text: '100 GB Cloud-Speicher', description: 'Platz für ca. 20.000 Fotos' },
      { text: 'Eigene Wunsch-Domain', description: 'z.B. mail@ihre-firma.com' },
      { text: '500 E-Mail-Adressen', description: 'unter Ihrer Domain' },
      { text: 'Premium Support', description: 'Telefonischer Support' },
      { text: 'Team-Funktionen', description: 'Gemeinsame Kalender & Aufgaben' },
    ],
    ctaText: 'Jetzt starten',
    ctaHref: '/webmail/pricing/checkout?plan=business',
  },
];

function PlanCard({ plan, isDark }: { plan: Plan; isDark: boolean }) {
  const priceWhole = Math.floor(plan.price);
  const priceCents = Math.round((plan.price - priceWhole) * 100);

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
      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
            <div>
              <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                {feature.text}
              </span>
              {feature.description && (
                <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {feature.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Link
        href={plan.ctaHref}
        className={cn(
          'block w-full py-3 px-6 rounded-full text-center font-semibold transition-all',
          plan.popular
            ? 'bg-linear-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg hover:shadow-xl'
            : isDark
              ? 'bg-[#5f6368] text-white hover:bg-[#6f7378]'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        )}
      >
        {plan.ctaText}
        <ArrowRight className="w-4 h-4 inline-block ml-2" />
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
  const { isDark, toggleTheme } = useWebmailTheme();

  return (
    <div
      className={cn(
        'min-h-screen transition-colors',
        isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]'
      )}
    >
      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-50 border-b backdrop-blur-sm',
          isDark
            ? 'bg-[#202124]/95 border-[#5f6368]'
            : 'bg-white/95 border-gray-200'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/webmail" className="flex items-center gap-3">
              <Image
                src="/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg"
                alt="Taskilo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className={cn('font-semibold text-lg', isDark ? 'text-white' : 'text-gray-900')}>
                Taskilo Mail
              </span>
            </Link>
            <div className={cn('h-6 w-px', isDark ? 'bg-[#5f6368]' : 'bg-gray-300')} />
            <span className={cn('text-lg font-medium', isDark ? 'text-gray-300' : 'text-gray-600')}>
              Unsere Tarife
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                'p-2 rounded-full transition-colors',
                isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              )}
              aria-label={isDark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Language Selector */}
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              )}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm">Deutsch</span>
            </button>

            {/* Login Link */}
            <Link
              href="/webmail"
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                isDark
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              )}
            >
              Anmelden
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1
            className={cn(
              'text-4xl md:text-5xl font-bold mb-4',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            Wählen Sie Ihren{' '}
            <span className="text-teal-500">E-Mail-Tarif</span>
          </h1>
          <p
            className={cn(
              'text-lg max-w-2xl mx-auto',
              isDark ? 'text-gray-400' : 'text-gray-600'
            )}
          >
            Von kostenlosem E-Mail-Postfach bis zu Premium-Funktionen mit mehr Speicher,
            eigener Domain und werbefreiem Postfach. Finden Sie den passenden Tarif.
          </p>
        </div>
      </section>

      {/* Pricing Cards - 4 columns on large screens */}
      <section className="pb-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          isDark ? 'bg-[#292a2d]' : 'bg-white'
        )}
      >
        <div className="max-w-6xl mx-auto">
          <h2
            className={cn(
              'text-2xl font-bold text-center mb-12',
              isDark ? 'text-white' : 'text-gray-900'
            )}
          >
            Alle Tarife im Vergleich
          </h2>

          <div className={cn('rounded-xl overflow-x-auto border', isDark ? 'border-[#5f6368]' : 'border-gray-200')}>
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className={cn(isDark ? 'bg-[#303134]' : 'bg-gray-50')}>
                  <th className={cn('px-4 py-4 text-left font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                    Feature
                  </th>
                  {WEBMAIL_PLANS.map((plan) => (
                    <th
                      key={plan.id}
                      className={cn(
                        'px-4 py-4 text-center font-semibold whitespace-nowrap',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'E-Mail-Speicher', values: ['1 GB', '1 GB', '10 GB', '50 GB'] },
                  { feature: 'Cloud-Speicher', values: ['2 GB', '2 GB', '25 GB', '100 GB'] },
                  { feature: 'Max. Anhangsgröße', values: ['20 MB', '20 MB', '50 MB', '100 MB'] },
                  { feature: 'E-Mail-Adressen', values: ['2', '100', '10', '500'] },
                  { feature: 'Eigene Domain', values: [false, true, false, true] },
                  { feature: 'Werbefrei', values: [false, false, true, true] },
                  { feature: 'Kalender & Aufgaben', values: [true, true, true, true] },
                  { feature: 'Video-Meetings', values: [false, false, true, true] },
                  { feature: 'Team-Funktionen', values: [false, false, false, true] },
                  { feature: 'Priorität Support', values: [false, false, true, true] },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      'border-t',
                      isDark ? 'border-[#5f6368]' : 'border-gray-200'
                    )}
                  >
                    <td className={cn('px-4 py-4', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      {row.feature}
                    </td>
                    {row.values.map((value, vIdx) => (
                      <td key={vIdx} className="px-4 py-4 text-center">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <Check className="w-5 h-5 text-teal-500 mx-auto" />
                          ) : (
                            <span className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                              -
                            </span>
                          )
                        ) : (
                          <span className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-gray-900')}>
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
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                  isDark ? 'bg-teal-500/20' : 'bg-teal-50'
                )}
              >
                <Shield className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className={cn('font-semibold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                DSGVO-konform
              </h3>
              <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                Ihre Daten werden in Deutschland gespeichert und sind DSGVO-konform geschützt.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                  isDark ? 'bg-teal-500/20' : 'bg-teal-50'
                )}
              >
                <Zap className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className={cn('font-semibold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
                Schnell & Zuverlässig
              </h3>
              <p className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-600')}>
                99,9% Verfügbarkeit und blitzschneller Zugang zu Ihren E-Mails.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                  isDark ? 'bg-teal-500/20' : 'bg-teal-50'
                )}
              >
                <Users className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className={cn('font-semibold mb-2', isDark ? 'text-white' : 'text-gray-900')}>
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
