'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HardDrive, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CancelPlanModal } from '@/components/storage/CancelPlanModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface StoragePlan {
  id: string;
  name: string;
  storage: number; // in bytes
  price: number;
  description: string;
  popular?: boolean;
  priceId: string; // Stripe Price ID
}

interface StorageUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStorage: number; // in bytes
  usedStorage: number; // in bytes
  companyId: string;
  onSelectPlan?: (plan: StoragePlan) => void;
}

const STORAGE_PLANS: StoragePlan[] = [
  {
    id: '1gb',
    name: '1 GB',
    storage: 1 * 1024 * 1024 * 1024,
    price: 0.99,
    description: 'Kleine Unternehmen',
    priceId: 'price_1SGgbzD5Lvjon30afg8y0RnG',
  },
  {
    id: '10gb',
    name: '10 GB',
    storage: 10 * 1024 * 1024 * 1024,
    price: 2.99,
    description: 'Wachsende Teams',
    popular: true,
    priceId: 'price_1SGgc0D5Lvjon30awN46TFta',
  },
  {
    id: '30gb',
    name: '30 GB',
    storage: 30 * 1024 * 1024 * 1024,
    price: 5.99,
    description: 'Große Datenmengen',
    priceId: 'price_1SGgc0D5Lvjon30a1F3dSji5',
  },
  {
    id: '50gb',
    name: '50 GB',
    storage: 50 * 1024 * 1024 * 1024,
    price: 9.99,
    description: 'Unternehmen',
    priceId: 'price_1SGgc1D5Lvjon30aSEOc32sW',
  },
  {
    id: '100gb',
    name: '100 GB',
    storage: 100 * 1024 * 1024 * 1024,
    price: 14.99,
    description: 'Große Unternehmen',
    priceId: 'price_1SGgc2D5Lvjon30aeXWpEY2D',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    storage: Number.MAX_SAFE_INTEGER,
    price: 19.9,
    description: 'Ohne Limite',
    priceId: 'price_1SGgc2D5Lvjon30amD74brGD',
  },
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function StorageUpgradeModal({
  open,
  onOpenChange,
  currentStorage,
  usedStorage,
  companyId,
  onSelectPlan,
}: StorageUpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string>('free');
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load current plan from Firestore
  useEffect(() => {
    if (!companyId || !open) return;

    const loadCurrentPlan = async () => {
      try {
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);

        if (companySnap.exists()) {
          const data = companySnap.data();
          setCurrentPlanId(data.storagePlanId || 'free');

          // Check if there's an active Stripe subscription
          const hasSubscription = !!(
            data.stripeSubscriptionId &&
            (data.subscriptionStatus === 'active' || data.subscriptionStatus === 'trialing')
          );
          setHasActiveSubscription(hasSubscription);
        }
      } catch (error) {
        console.error('Error loading current plan:', error);
      }
    };

    loadCurrentPlan();
  }, [companyId, open]);

  const handleSelectPlan = async (plan: StoragePlan) => {
    if (loading) return;

    setLoading(true);
    setSelectedPlan(plan.id);

    try {
      // Create Stripe Checkout Session for company-wide storage
      const response = await fetch('/api/storage/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          planId: plan.id,
          storage: plan.storage,
          companyId,
          successUrl: `${window.location.origin}/dashboard/company/${companyId}?storage=success`,
          cancelUrl: `${window.location.origin}/dashboard/company/${companyId}?storage=canceled`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Checkout-Session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Keine Checkout-URL erhalten');
      }
    } catch (error) {
      console.error('Storage upgrade error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Upgrade');
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-[#14ad9f]" />
            Speicher erweitern
          </DialogTitle>
          <DialogDescription>Wähle dein Speicher-Paket</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Usage - Compact */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Aktuell: {formatFileSize(currentStorage)}</span>
              <span>Verwendet: {formatFileSize(usedStorage)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  (usedStorage / currentStorage) * 100 < 70
                    ? 'bg-green-500'
                    : (usedStorage / currentStorage) * 100 < 90
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((usedStorage / currentStorage) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Pricing Plans - Compact */}
          <div className="space-y-2">
            {STORAGE_PLANS.map(plan => (
              <button
                key={plan.id}
                disabled={loading}
                onClick={() => handleSelectPlan(plan)}
                className={`w-full border-2 rounded-lg p-3 transition-all text-left relative disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                    : 'border-gray-200 hover:border-[#14ad9f]'
                } ${selectedPlan === plan.id ? 'ring-2 ring-[#14ad9f]' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 right-3 bg-[#14ad9f] text-white text-[10px] px-2 py-0">
                    Beliebt
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{plan.name}</span>
                      <span className="text-xs text-gray-500">• {plan.description}</span>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-lg font-bold text-[#14ad9f]">€{plan.price.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-500">/Monat</div>
                  </div>
                  {loading && selectedPlan === plan.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#14ad9f] ml-2" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Trust Elements - Compact */}
          <div className="text-[10px] text-gray-500 text-center pt-1 border-t">
            💳 Monatlich kündbar • Sichere Zahlung • Sofortige Aktivierung
          </div>

          {/* Cancel Button - Only show if user has active paid plan with Stripe subscription */}
          {currentPlanId !== 'free' && hasActiveSubscription && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Aktuellen Plan kündigen
            </Button>
          )}

          {/* Info message for paid plans without active subscription */}
          {currentPlanId !== 'free' && !hasActiveSubscription && (
            <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded-md">
              ℹ️ Sie haben derzeit kein aktives Abonnement
            </div>
          )}
        </div>
      </DialogContent>

      {/* Cancel Plan Modal */}
      <CancelPlanModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        companyId={companyId}
        currentPlanId={currentPlanId}
        currentUsage={usedStorage}
        onCancelComplete={() => {
          setShowCancelModal(false);
          onOpenChange(false);
          toast.success('Plan erfolgreich gekündigt');
          // Reload page to refresh storage data
          window.location.reload();
        }}
      />
    </Dialog>
  );
}
