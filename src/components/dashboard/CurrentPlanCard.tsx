'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Crown, Zap, CreditCard, Gift, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanInfo {
  planId: string;
  planName: string;
  status: string;
  statusLabel: string;
  isTrialing: boolean;
  daysRemaining?: number;
  trialEndsAt?: string;
  priceGross: number;
  billingInterval: string;
}

interface CurrentPlanCardProps {
  companyId: string;
}

export function CurrentPlanCard({ companyId }: CurrentPlanCardProps) {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const response = await fetch(`/api/company/${companyId}/subscription`);
        const data = await response.json();
        
        if (data.success && data.subscription) {
          setPlan(data.subscription);
        }
      } catch {
        // Fallback zu Free Plan
        setPlan({
          planId: 'free',
          planName: 'FreeMail',
          status: 'active',
          statusLabel: 'Kostenlos',
          isTrialing: false,
          priceGross: 0,
          billingInterval: 'monthly',
        });
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      loadPlan();
    }
  }, [companyId]);

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Zap className="h-4 w-4 text-gray-500" />;
      case 'domain':
      case 'pro':
        return <CreditCard className="h-4 w-4 text-teal-500" />;
      case 'business':
        return <Crown className="h-4 w-4 text-amber-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    if (!plan) return null;
    
    if (plan.isTrialing) {
      return (
        <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">
          <Gift className="h-2.5 w-2.5 mr-0.5" />
          Trial
        </Badge>
      );
    }
    
    if (plan.status === 'active' && plan.planId !== 'free') {
      return (
        <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">
          Aktiv
        </Badge>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-4 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getPlanIcon(plan.planId)}
          <span className="text-xs font-semibold text-gray-700">Aktueller Tarif</span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{plan.planName}</p>
          {plan.priceGross > 0 ? (
            <p className="text-xs text-gray-500">
              {plan.priceGross.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              /{plan.billingInterval === 'monthly' ? 'Mon.' : 'Jahr'}
            </p>
          ) : (
            <p className="text-xs text-gray-500">Kostenlos</p>
          )}
        </div>
        
        <Link 
          href="/webmail/pricing"
          className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          Upgrade
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {plan.isTrialing && plan.daysRemaining !== undefined && (
        <div className="mt-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
          Testphase endet in {plan.daysRemaining} {plan.daysRemaining === 1 ? 'Tag' : 'Tagen'}
        </div>
      )}
    </div>
  );
}
