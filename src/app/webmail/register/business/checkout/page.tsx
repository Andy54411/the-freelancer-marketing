'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Check, CreditCard, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

type BillingCycle = 'monthly' | 'yearly';

interface Plan {
  id: BillingCycle;
  name: string;
  price: number;
  priceYearly: number;
  billing: string;
  savings?: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'Monatlich',
    price: 9.99,
    priceYearly: 0,
    billing: 'Pro Monat',
    features: [
      'Professionelle E-Mail-Adresse',
      '2 TB Cloud-Speicher pro Nutzer',
      'Kalender & Kontakte',
      'Video-Konferenzen',
      'Taskilo Workspace',
      'Premium Support',
    ],
  },
  {
    id: 'yearly',
    name: 'Jährlich',
    price: 99.00,
    priceYearly: 8.25,
    billing: 'Pro Jahr (99,00 € jährlich)',
    savings: 'Spare 21 € pro Jahr',
    features: [
      'Professionelle E-Mail-Adresse',
      '2 TB Cloud-Speicher pro Nutzer',
      'Kalender & Kontakte',
      'Video-Konferenzen',
      'Taskilo Workspace',
      'Premium Support',
      '2 Monate gratis',
    ],
  },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  const domain = searchParams.get('domain') || '';
  const username = searchParams.get('username') || '';
  
  const [selectedPlan, setSelectedPlan] = useState<BillingCycle>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Revolut Checkout erstellen
      const response = await fetch('/api/webmail/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company,
          domain,
          email,
          username,
          firstName,
          lastName,
          plan: selectedPlan,
          amount: selectedPlanData?.price || 9.99,
          currency: 'EUR',
          employees,
          region,
          trialDays: 14,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Fehler beim Erstellen des Checkouts');
        setIsProcessing(false);
        return;
      }

      // Checkout URL öffnen - Revolut Zahlungsseite
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        // Fallback: Weiter zur Organization-Seite wenn kein Checkout nötig
        const params = new URLSearchParams({
          company,
          domain,
          email,
          username,
          firstName,
          lastName,
          plan: selectedPlan,
          amount: String(selectedPlanData?.price || 0),
          employees,
          region,
        });
        router.push(`/webmail/register/business/organization?${params.toString()}`);
      }
    } catch (err) {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-12 mb-8">
        <Link href="/">
          <Image 
            src="/images/taskilo-logo-transparent.png" 
            alt="Taskilo" 
            width={140} 
            height={44}
            className="h-12 w-auto"
          />
        </Link>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-8">
        <div className="w-full max-w-5xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 p-3 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-[32px] font-normal text-gray-900 mb-4 leading-tight">
              Wählen Sie Ihren Tarif
            </h1>
            <p className="text-[15px] text-gray-700 leading-relaxed">
              Starten Sie mit <span className="font-semibold text-[#14ad9f]">14 Tagen kostenloser Testphase</span>.
              Keine Kreditkarte erforderlich während der Testphase. Nach 14 Tagen wird das gewählte Abo automatisch aktiviert.
            </p>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "relative p-8 rounded-2xl border-2 transition-all duration-200 text-left hover:shadow-lg",
                  selectedPlan === plan.id
                    ? "border-[#14ad9f] bg-teal-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                {/* Selection Badge */}
                {selectedPlan === plan.id && (
                  <div className="absolute top-4 right-4 bg-[#14ad9f] rounded-full p-2">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Savings Badge */}
                {plan.savings && (
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {plan.savings}
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <div className="flex items-center gap-3 mb-4">
                  {plan.id === 'monthly' ? (
                    <Calendar className="w-6 h-6 text-[#14ad9f]" />
                  ) : (
                    <CreditCard className="w-6 h-6 text-[#14ad9f]" />
                  )}
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.priceYearly > 0 ? plan.priceYearly.toFixed(2) : plan.price.toFixed(2)} €
                    </span>
                    <span className="text-gray-600 text-sm">
                      {plan.id === 'yearly' ? '/ Monat' : '/ Monat'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.billing}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-[#14ad9f] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* Trial Info */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="bg-[#14ad9f] rounded-full p-3">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  14 Tage kostenlos testen
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Testen Sie alle Funktionen von Taskilo Webmail 14 Tage lang völlig kostenlos. 
                  <strong className="text-gray-900"> Kreditkarte erforderlich</strong> - Sie können 
                  jederzeit während der Testphase kündigen. Nach Ablauf der Testphase 
                  wird automatisch das von Ihnen gewählte Abo ({selectedPlanData?.name}) aktiviert 
                  und die Zahlung über Revolut abgebucht.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Zusammenfassung
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">E-Mail-Adresse:</span>
                <span className="font-medium text-gray-900">{username}@{domain}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unternehmen:</span>
                <span className="font-medium text-gray-900">{company}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Domain:</span>
                <span className="font-medium text-gray-900">{domain}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Gewählter Tarif:</span>
                <span className="font-medium text-gray-900">{selectedPlanData?.name}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Heute zu zahlen:</span>
                  <span className="text-2xl font-bold text-[#14ad9f]">0,00 €</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Nach 14 Tagen: {selectedPlanData?.price.toFixed(2)} € {selectedPlanData?.id === 'yearly' ? 'jährlich' : 'monatlich'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              style={{ 
                backgroundColor: '#14ad9f',
                color: 'white',
                opacity: isProcessing ? 0.6 : 1
              }}
              className="w-full max-w-md px-8 py-4 rounded-full font-semibold transition-all text-base shadow-md hover:shadow-lg disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird verarbeitet...
                </span>
              ) : (
                '14 Tage kostenlos testen'
              )}
            </button>

            <p className="text-xs text-gray-600 text-center max-w-md">
              Sichere Zahlung über Revolut Merchant. Ihre Zahlungsdaten werden verschlüsselt übertragen.
              Sie können jederzeit während der Testphase kündigen.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
