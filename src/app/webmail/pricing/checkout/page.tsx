'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Check, 
  CreditCard, 
  Lock, 
  Mail, 
  User, 
  Loader2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import { HeroHeader } from '@/components/hero8-header';

interface PlanType {
  id: string;
  name: string;
  price: number;
  priceYearly: number;
  hasDomain: boolean;
  hasEmailAddon: boolean;
  emailAddonPrice: number;
  emailAddonPriceYearly: number;
  features: string[];
}

const PLANS: Record<string, PlanType> = {
  domain: {
    id: 'domain',
    name: 'Eigene Domain',
    price: 1.99,
    priceYearly: 19.99,
    hasDomain: true,
    hasEmailAddon: false,
    emailAddonPrice: 0,
    emailAddonPriceYearly: 0,
    features: [
      'FreeMail-Postfach inklusive',
      'Eigene Wunsch-Domain',
      '100 E-Mail-Adressen',
      'Individuelle Adressen',
      'Weltweite Domains',
    ],
  },
  pro: {
    id: 'pro',
    name: 'ProMail',
    price: 2.99,
    priceYearly: 29.99,
    hasDomain: false,
    hasEmailAddon: false,
    emailAddonPrice: 0,
    emailAddonPriceYearly: 0,
    features: [
      '10 GB E-Mail-Speicher',
      '25 GB Cloud-Speicher',
      '10 E-Mail-Adressen',
      'Werbefreies Postfach',
      'Priorität Support',
    ],
  },
  business: {
    id: 'business',
    name: 'Taskilo Business',
    price: 29.99,
    priceYearly: 299.99,
    hasDomain: false,
    hasEmailAddon: true,
    emailAddonPrice: 2.99,
    emailAddonPriceYearly: 29.99,
    features: [
      'Company Dashboard',
      'Rechnungen & Angebote (GoBD)',
      'Geschäftspartner (CRM)',
      'Zeiterfassung',
      'Personal & Recruiting',
      'Workspace',
      'Banking Integration',
      'DATEV Export',
      'Premium Support',
    ],
  },
};

const CheckoutSchema = z.object({
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  firstName: z.string().min(2, 'Vorname muss mindestens 2 Zeichen haben'),
  lastName: z.string().min(2, 'Nachname muss mindestens 2 Zeichen haben'),
  domain: z.string().optional(),
});

type BillingCycle = 'monthly' | 'yearly';

export default function WebmailCheckoutPage() {
  const { isDark } = useWebmailTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const planId = searchParams.get('plan') as keyof typeof PLANS;
  const domainFromUrl = searchParams.get('domain');
  const trialFromUrl = searchParams.get('trial') === 'true';
  const plan = PLANS[planId];

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isTrial, setIsTrial] = useState(trialFromUrl && planId === 'business');
  const [includeEmail, setIncludeEmail] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    domain: domainFromUrl || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!plan) {
      router.push('/webmail/pricing');
    }
  }, [plan, router]);

  if (!plan) {
    return null;
  }

  // Calculate prices with optional email addon
  const basePrice = billingCycle === 'monthly' ? plan.price : plan.priceYearly;
  const emailAddonPrice = plan.hasEmailAddon && includeEmail 
    ? (billingCycle === 'monthly' ? plan.emailAddonPrice : plan.emailAddonPriceYearly) 
    : 0;
  const currentPrice = basePrice + (emailAddonPrice || 0);
  const savings = billingCycle === 'yearly' ? (plan.price * 12 - plan.priceYearly).toFixed(2) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    const result = CheckoutSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/webmail/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          isTrial: isTrial && plan.id === 'business',
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setSubmitError(data.error || 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
      }
    } catch {
      setSubmitError('Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div
      className={cn(
        'min-h-screen transition-colors',
        isDark ? 'bg-[#202124]' : 'bg-[#f6f8fc]'
      )}
    >
      {/* Unified Header */}
      <HeroHeader />

      <main className="max-w-5xl mx-auto px-4 py-12 mt-16">
        {/* Back Link */}
        <Link
          href="/webmail/pricing"
          className={cn(
            'inline-flex items-center gap-2 mb-6 transition-colors',
            isDark ? 'text-white hover:text-white' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Zurueck zu den Tarifen</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-3">
            <div
              className={cn(
                'rounded-2xl p-6 md:p-8',
                isDark ? 'bg-[#292a2d]' : 'bg-white'
              )}
            >
              <h1
                className={cn(
                  'text-2xl font-bold mb-6',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                Bestellen Sie {plan.name}
              </h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Billing Cycle Toggle */}
                <div>
                  <Label className={cn('mb-3 block', isDark ? 'text-white' : 'text-gray-700')}>
                    Abrechnungszeitraum
                  </Label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={cn(
                        'flex-1 p-4 rounded-xl border-2 transition-all text-left',
                        billingCycle === 'monthly'
                          ? 'border-teal-500 bg-teal-500/10'
                          : isDark
                            ? 'border-[#5f6368] hover:border-[#8f9398]'
                            : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                        Monatlich
                      </div>
                      <div className={cn('text-sm', isDark ? 'text-white' : 'text-gray-500')}>
                        {plan.price.toFixed(2)} EUR/Monat
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={cn(
                        'flex-1 p-4 rounded-xl border-2 transition-all text-left relative',
                        billingCycle === 'yearly'
                          ? 'border-teal-500 bg-teal-500/10'
                          : isDark
                            ? 'border-[#5f6368] hover:border-[#8f9398]'
                            : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="absolute -top-2 right-3 bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Spare {((1 - plan.priceYearly / (plan.price * 12)) * 100).toFixed(0)}%
                      </div>
                      <div className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                        Jaehrlich
                      </div>
                      <div className={cn('text-sm', isDark ? 'text-white' : 'text-gray-500')}>
                        {plan.priceYearly.toFixed(2)} EUR/Jahr
                      </div>
                    </button>
                  </div>
                </div>

                {/* Email Add-on Option (only for business plan) */}
                {plan.hasEmailAddon && (
                  <div>
                    <Label className={cn('mb-3 block', isDark ? 'text-white' : 'text-gray-700')}>
                      E-Mail & Domain hinzufügen
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIncludeEmail(!includeEmail)}
                      className={cn(
                        'w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4',
                        includeEmail
                          ? 'border-teal-500 bg-teal-500/10'
                          : isDark
                            ? 'border-[#5f6368] hover:border-[#8f9398]'
                            : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0',
                        includeEmail 
                          ? 'bg-teal-500 border-teal-500' 
                          : isDark ? 'border-[#5f6368]' : 'border-gray-300'
                      )}>
                        {includeEmail && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                          ProMail-Postfach hinzufügen
                        </div>
                        <div className={cn('text-sm', isDark ? 'text-white' : 'text-gray-500')}>
                          10 GB E-Mail, 25 GB Cloud, eigene Domain, werbefreies Postfach
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-teal-500 font-semibold">
                          +{billingCycle === 'monthly' ? plan.emailAddonPrice?.toFixed(2) : plan.emailAddonPriceYearly?.toFixed(2)} EUR
                        </div>
                        <div className={cn('text-xs', isDark ? 'text-gray-500' : 'text-white')}>
                          /{billingCycle === 'monthly' ? 'Monat' : 'Jahr'}
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className={cn('mb-2 block', isDark ? 'text-white' : 'text-gray-700')}>
                      Vorname
                    </Label>
                    <div className="relative">
                      <User className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-white')} />
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={cn(
                          'pl-10',
                          isDark ? 'bg-[#303134] border-[#5f6368] text-white' : 'bg-white border-gray-200',
                          errors.firstName && 'border-red-500'
                        )}
                        placeholder="Max"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className={cn('mb-2 block', isDark ? 'text-white' : 'text-gray-700')}>
                      Nachname
                    </Label>
                    <div className="relative">
                      <User className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-white')} />
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={cn(
                          'pl-10',
                          isDark ? 'bg-[#303134] border-[#5f6368] text-white' : 'bg-white border-gray-200',
                          errors.lastName && 'border-red-500'
                        )}
                        placeholder="Mustermann"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className={cn('mb-2 block', isDark ? 'text-white' : 'text-gray-700')}>
                    E-Mail-Adresse (für Rechnung)
                  </Label>
                  <div className="relative">
                    <Mail className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-white')} />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={cn(
                        'pl-10',
                        isDark ? 'bg-[#303134] border-[#5f6368] text-white' : 'bg-white border-gray-200',
                        errors.email && 'border-red-500'
                      )}
                      placeholder="max@beispiel.de"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Domain (for Domain and Business plans) */}
                {plan.hasDomain && (
                  <div>
                    <Label htmlFor="domain" className={cn('mb-2 block', isDark ? 'text-white' : 'text-gray-700')}>
                      Ihre Wunsch-Domain {domainFromUrl ? '' : '(optional)'}
                    </Label>
                    <div className="relative">
                      <Globe className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-white')} />
                      <Input
                        id="domain"
                        value={formData.domain}
                        onChange={(e) => handleInputChange('domain', e.target.value.toLowerCase())}
                        className={cn(
                          'pl-10',
                          isDark ? 'bg-[#303134] border-[#5f6368] text-white' : 'bg-white border-gray-200'
                        )}
                        placeholder="erika-muster.de"
                        readOnly={!!domainFromUrl}
                      />
                    </div>
                    {domainFromUrl ? (
                      <p className={cn('text-sm mt-1 text-teal-500')}>
                        Ihre ausgewählte Domain: {domainFromUrl}
                      </p>
                    ) : (
                      <p className={cn('text-sm mt-1', isDark ? 'text-gray-500' : 'text-white')}>
                        Sie können Ihre Domain auch später wählen. Verfügbar: .de, .com, .eu, .io, .net und mehr
                      </p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {submitError && (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-500">{submitError}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold text-lg rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Wird verarbeitet...
                    </>
                  ) : isTrial && plan.id === 'business' ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      7 Tage kostenlos starten
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Jetzt {currentPrice.toFixed(2)} EUR bezahlen
                    </>
                  )}
                </Button>

                {/* Security Note */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Lock className={cn('w-4 h-4', isDark ? 'text-gray-500' : 'text-white')} />
                  <span className={cn(isDark ? 'text-white' : 'text-gray-500')}>
                    Sichere Zahlung über Stripe
                  </span>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div
              className={cn(
                'rounded-2xl p-6 sticky top-24',
                isDark ? 'bg-[#292a2d]' : 'bg-white'
              )}
            >
              <h2
                className={cn(
                  'text-lg font-semibold mb-4',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
              >
                Ihre Bestellung
              </h2>

              <div className={cn('pb-4 mb-4 border-b', isDark ? 'border-[#5f6368]' : 'border-gray-200')}>
                <div className="flex justify-between items-center mb-2">
                  <span className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>
                    {plan.name}
                  </span>
                  <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                    {(billingCycle === 'monthly' ? plan.price : plan.priceYearly).toFixed(2)} EUR
                  </span>
                </div>
                {plan.hasEmailAddon && includeEmail && (
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn('text-sm', isDark ? 'text-white' : 'text-gray-600')}>
                      + ProMail-Postfach
                    </span>
                    <span className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-600')}>
                      {(billingCycle === 'monthly' ? plan.emailAddonPrice : plan.emailAddonPriceYearly)?.toFixed(2)} EUR
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-dashed mt-2">
                  <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                    Gesamt
                  </span>
                  <span className="text-teal-500 font-bold text-lg">
                    {currentPrice.toFixed(2)} EUR
                  </span>
                </div>
                <span className={cn('text-sm', isDark ? 'text-white' : 'text-gray-500')}>
                  {billingCycle === 'monthly' ? 'pro Monat' : 'pro Jahr'}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className={cn('text-sm', isDark ? 'text-white' : 'text-gray-600')}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Savings */}
              {savings && billingCycle === 'yearly' && !isTrial && (
                <div
                  className={cn(
                    'p-3 rounded-lg text-center',
                    isDark ? 'bg-teal-500/20' : 'bg-teal-50'
                  )}
                >
                  <span className="text-teal-600 font-medium">
                    Sie sparen {savings} EUR pro Jahr
                  </span>
                </div>
              )}

              {/* Trial Notice for Business */}
              {isTrial && plan.id === 'business' && (
                <div
                  className={cn(
                    'p-4 rounded-lg border-2 border-teal-500 bg-teal-500/10'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-teal-500" />
                    <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                      7 Tage kostenlos testen
                    </span>
                  </div>
                  <p className={cn('text-sm', isDark ? 'text-white' : 'text-gray-600')}>
                    Sie zahlen heute nichts. Erst nach 7 Tagen wird Ihr Abo aktiviert und {currentPrice.toFixed(2)} EUR {billingCycle === 'monthly' ? 'monatlich' : 'jaehrlich'} berechnet.
                  </p>
                  <p className={cn('text-sm mt-2', isDark ? 'text-white' : 'text-gray-500')}>
                    Jederzeit vor Ablauf der Testphase kuendbar.
                  </p>
                </div>
              )}

              {/* Default Trial Notice */}
              {!isTrial && (
                <div
                  className={cn(
                    'mt-4 p-3 rounded-lg text-sm',
                    isDark ? 'bg-[#303134]' : 'bg-gray-50'
                  )}
                >
                  <p className={cn(isDark ? 'text-white' : 'text-gray-600')}>
                    30 Tage Geld-zurueck-Garantie. Keine Fragen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
