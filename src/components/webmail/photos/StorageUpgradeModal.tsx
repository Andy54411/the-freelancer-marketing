'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  HardDrive,
  Sparkles,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface StorageUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  currentPlan?: string;
  currentStorage?: number;
  onUpgradeSuccess?: (planId: string) => void;
}

interface StoragePlan {
  id: string;
  name: string;
  storage: number;
  storageFormatted: string;
  priceMonthly: number;
  priceYearly: number;
  yearlyDiscount: number;
  features: string[];
  isRecommended: boolean;
  isPromo?: boolean;
  promoPrice?: number;
  promoDuration?: string;
  icon: React.ComponentType<{ className?: string }>;
  tier: 'basic' | 'standard';
}

// Taskilo Speicherpläne (angelehnt an Google One)
const STORAGE_PLANS: StoragePlan[] = [
  {
    id: 'basic_15gb',
    name: 'Kostenlos',
    storage: 15 * 1024 * 1024 * 1024,
    storageFormatted: '15 GB',
    priceMonthly: 0,
    priceYearly: 0,
    yearlyDiscount: 0,
    features: [
      'Grundlegender Speicherplatz',
      'Foto-Upload und -Verwaltung',
      'Automatische Kategorisierung',
    ],
    isRecommended: false,
    icon: HardDrive,
    tier: 'basic',
  },
  {
    id: 'basic_100gb',
    name: 'Basic',
    storage: 100 * 1024 * 1024 * 1024,
    storageFormatted: '100 GB',
    priceMonthly: 1.99,
    priceYearly: 19.99,
    yearlyDiscount: 16,
    features: [
      'Speicherplatz mit bis zu 5 Personen teilen',
      'Erweiterte Foto-Organisation',
      'Prioritärer Support',
    ],
    isRecommended: false,
    icon: HardDrive,
    tier: 'basic',
  },
  {
    id: 'standard_200gb',
    name: 'Standard',
    storage: 200 * 1024 * 1024 * 1024,
    storageFormatted: '200 GB',
    priceMonthly: 2.99,
    priceYearly: 29.99,
    yearlyDiscount: 17,
    features: [
      'Speicherplatz mit bis zu 5 Personen teilen',
      'KI-gestützte Fotoverbesserung',
      '3% Cashback auf Taskilo-Käufe',
    ],
    isRecommended: true,
    icon: Sparkles,
    tier: 'standard',
  },
];

export function StorageUpgradeModal({
  isOpen,
  onClose,
  userEmail,
  currentPlan = 'basic_15gb',
  onUpgradeSuccess,
}: StorageUpgradeModalProps) {
  const { isDark } = useWebmailTheme();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset beim Schließen
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setError(null);
      setProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlanData = STORAGE_PLANS.find(p => p.id === currentPlan);
  const upgradePlans = STORAGE_PLANS.filter(p => {
    if (p.id === currentPlan) return false;
    if (p.priceMonthly === 0 && currentPlanData && currentPlanData.priceMonthly > 0) return false;
    return true;
  });

  const handleUpgrade = async (planId: string) => {
    const plan = STORAGE_PLANS.find(p => p.id === planId);
    if (!plan || plan.priceMonthly === 0) return;

    setSelectedPlan(planId);
    setProcessing(true);
    setError(null);

    try {
      // Revolut Merchant API für Abonnement aufrufen
      const response = await fetch('/api/storage/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          planId,
          billingCycle,
          amount: billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly,
          currency: 'EUR',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upgrade fehlgeschlagen');
      }

      // Zur Revolut-Bezahlseite weiterleiten
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        onUpgradeSuccess?.(planId);
        onClose();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'basic':
        return isDark ? 'text-gray-400' : 'text-gray-600';
      case 'standard':
        return isDark ? 'text-teal-400' : 'text-teal-600';
      default:
        return isDark ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getTierBg = (tier: string, isRecommended: boolean) => {
    if (isRecommended) {
      return isDark ? 'bg-teal-900/30 border-teal-500' : 'bg-teal-50 border-teal-500';
    }
    return isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div 
        className={`relative w-full max-w-3xl rounded-2xl shadow-2xl my-8 ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b rounded-t-2xl ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Taskilo Speicher-Abo upgraden
            </h2>
            {currentPlanData && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Aktuelles Abo: {currentPlanData.name} ({currentPlanData.storageFormatted})
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Billing Toggle */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? (isDark ? 'bg-teal-600 text-white' : 'bg-teal-600 text-white')
                  : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? (isDark ? 'bg-teal-600 text-white' : 'bg-teal-600 text-white')
                  : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              Jährlich
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                billingCycle === 'yearly'
                  ? 'bg-white/20'
                  : (isDark ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-700')
              }`}>
                Spare 16%
              </span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Plans List */}
        <div className="px-6 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Aktuelles Abo */}
          {currentPlanData && (
            <div className={`p-4 rounded-xl border-2 ${
              isDark ? 'bg-gray-800/50 border-gray-600' : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <currentPlanData.icon className={`w-5 h-5 ${getTierColor(currentPlanData.tier)}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {currentPlanData.name} ({currentPlanData.storageFormatted})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                      }`}>
                        Aktuelles Abo
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentPlanData.priceMonthly === 0 
                        ? 'Kostenlos' 
                        : `${formatPrice(currentPlanData.priceMonthly)}/Monat`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade-Optionen Header */}
          <div className={`text-sm font-medium uppercase tracking-wide ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Upgrade-Optionen
          </div>

          {/* Plan Cards */}
          {upgradePlans.map((plan) => {
            const isExpanded = expandedPlan === plan.id;
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const isCurrent = plan.id === currentPlan;

            return (
              <div
                key={plan.id}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  getTierBg(plan.tier, plan.isRecommended)
                }`}
              >
                {/* Empfohlen Badge */}
                {plan.isRecommended && (
                  <div className="bg-teal-600 text-white text-xs font-medium px-3 py-1 text-center">
                    Empfohlen
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        plan.isRecommended
                          ? (isDark ? 'bg-teal-800' : 'bg-teal-100')
                          : (isDark ? 'bg-gray-700' : 'bg-gray-100')
                      }`}>
                        <plan.icon className={`w-5 h-5 ${getTierColor(plan.tier)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {plan.name} ({plan.storageFormatted})
                          </span>
                        </div>
                        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Users className="w-3.5 h-3.5 inline mr-1" />
                          Speicherplatz mit bis zu 5 Personen teilen
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      {plan.priceMonthly === 0 ? (
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Kostenlos
                        </span>
                      ) : (
                        <>
                          <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formatPrice(price)}
                            <span className={`text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              /{billingCycle === 'yearly' ? 'Jahr' : 'Monat'}
                            </span>
                          </div>
                          {billingCycle === 'yearly' && (
                            <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                              {plan.yearlyDiscount}% gespart
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Features (expandable) */}
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      className={`flex items-center gap-1 text-sm ${
                        isDark ? 'text-teal-400' : 'text-teal-600'
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          Alle Vorteile ausblenden
                          <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Alle Vorteile auf einen Blick
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <ul className="mt-3 space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isDark ? 'text-teal-400' : 'text-teal-600'
                            }`} />
                            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Upgrade Button */}
                  {plan.priceMonthly > 0 && !isCurrent && (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={processing}
                      className={`w-full mt-4 py-3 rounded-lg font-medium transition-colors ${
                        plan.isRecommended
                          ? 'bg-teal-600 text-white hover:bg-teal-700'
                          : (isDark 
                              ? 'bg-gray-700 text-white hover:bg-gray-600' 
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200')
                      } disabled:opacity-50`}
                    >
                      {processing && selectedPlan === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Wird verarbeitet...
                        </span>
                      ) : (
                        `${billingCycle === 'yearly' ? 'Jahresabo' : 'Monatsabo'} für ${formatPrice(price)} wählen`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t text-center ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Jederzeit kündbar. Mit dem Abschluss eines Abos stimmst du den{' '}
            <a href="/agb" className="underline hover:text-teal-500">Nutzungsbedingungen</a> zu.
            Der Speicherplatz steht dir für Taskilo Fotos, Drive und Mail zur Verfügung.
          </p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Noch nicht bereit für ein Upgrade?{' '}
            <button 
              onClick={onClose}
              className={`underline ${isDark ? 'text-teal-400' : 'text-teal-600'}`}
            >
              Kontospeicherplatz freigeben
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
