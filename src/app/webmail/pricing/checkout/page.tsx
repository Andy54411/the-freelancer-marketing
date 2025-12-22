'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Check, 
  CreditCard, 
  Lock, 
  Mail, 
  User, 
  Sun, 
  Moon,
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

const PLANS = {
  domain: {
    id: 'domain',
    name: 'Eigene Domain',
    price: 1.99,
    priceYearly: 19.99,
    hasDomain: true,
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
    name: 'BusinessMail',
    price: 4.99,
    priceYearly: 49.99,
    hasDomain: true,
    features: [
      '50 GB E-Mail-Speicher',
      '100 GB Cloud-Speicher',
      'Eigene Wunsch-Domain',
      '500 E-Mail-Adressen',
      'Premium Support',
      'Team-Funktionen',
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
  const { isDark, toggleTheme } = useWebmailTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const planId = searchParams.get('plan') as keyof typeof PLANS;
  const domainFromUrl = searchParams.get('domain');
  const plan = PLANS[planId];

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
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

  const currentPrice = billingCycle === 'monthly' ? plan.price : plan.priceYearly;
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
      setSubmitError('Verbindungsfehler. Bitte pruefen Sie Ihre Internetverbindung.');
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
            <Link
              href="/webmail/pricing"
              className={cn(
                'flex items-center gap-2 transition-colors',
                isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Zurueck zu den Tarifen</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/webmail" className="flex items-center gap-3">
              <Image
                src="/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg"
                alt="Taskilo"
                width={40}
                height={40}
                className="rounded-lg"
              />
            </Link>
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
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
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
                  <Label className={cn('mb-3 block', isDark ? 'text-gray-300' : 'text-gray-700')}>
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
                      <div className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
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
                      <div className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {plan.priceYearly.toFixed(2)} EUR/Jahr
                      </div>
                    </button>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className={cn('mb-2 block', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Vorname
                    </Label>
                    <div className="relative">
                      <User className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-gray-400')} />
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
                    <Label htmlFor="lastName" className={cn('mb-2 block', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Nachname
                    </Label>
                    <div className="relative">
                      <User className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-gray-400')} />
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
                  <Label htmlFor="email" className={cn('mb-2 block', isDark ? 'text-gray-300' : 'text-gray-700')}>
                    E-Mail-Adresse (für Rechnung)
                  </Label>
                  <div className="relative">
                    <Mail className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-gray-400')} />
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
                    <Label htmlFor="domain" className={cn('mb-2 block', isDark ? 'text-gray-300' : 'text-gray-700')}>
                      Ihre Wunsch-Domain {domainFromUrl ? '' : '(optional)'}
                    </Label>
                    <div className="relative">
                      <Globe className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5', isDark ? 'text-gray-500' : 'text-gray-400')} />
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
                      <p className={cn('text-sm mt-1', isDark ? 'text-gray-500' : 'text-gray-400')}>
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
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Jetzt {currentPrice.toFixed(2)} EUR bezahlen
                    </>
                  )}
                </Button>

                {/* Security Note */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Lock className={cn('w-4 h-4', isDark ? 'text-gray-500' : 'text-gray-400')} />
                  <span className={cn(isDark ? 'text-gray-400' : 'text-gray-500')}>
                    Sichere Zahlung ueber Stripe
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
                    {currentPrice.toFixed(2)} EUR
                  </span>
                </div>
                <span className={cn('text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  {billingCycle === 'monthly' ? 'pro Monat' : 'pro Jahr'}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Savings */}
              {savings && billingCycle === 'yearly' && (
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

              {/* Trial Notice */}
              <div
                className={cn(
                  'mt-4 p-3 rounded-lg text-sm',
                  isDark ? 'bg-[#303134]' : 'bg-gray-50'
                )}
              >
                <p className={cn(isDark ? 'text-gray-300' : 'text-gray-600')}>
                  30 Tage Geld-zurueck-Garantie. Keine Fragen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
