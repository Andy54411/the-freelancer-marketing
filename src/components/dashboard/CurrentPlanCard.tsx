'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Crown, Zap, CreditCard, Gift, ArrowUpRight, Mail, Plus } from 'lucide-react';
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

interface EmailStatus {
  type: 'gmail' | 'taskilo' | 'none';
  email?: string;
  plan?: PlanInfo;
}

interface CurrentPlanCardProps {
  companyId: string;
}

export function CurrentPlanCard({ companyId }: CurrentPlanCardProps) {
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmailStatus = async () => {
      try {
        // Prüfe zuerst Gmail-Verbindung
        const gmailResponse = await fetch(`/api/company/${companyId}/gmail-auth-status`);
        const gmailData = await gmailResponse.json();
        
        if (gmailData.hasConfig && gmailData.status === 'connected') {
          setEmailStatus({
            type: 'gmail',
            email: gmailData.email,
          });
          setLoading(false);
          return;
        }

        // Prüfe Taskilo Webmail Subscription
        const response = await fetch(`/api/company/${companyId}/subscription`);
        const data = await response.json();
        
        if (data.success && data.subscription) {
          setEmailStatus({
            type: 'taskilo',
            plan: data.subscription,
          });
        } else {
          // Keine E-Mail-Anbindung
          setEmailStatus({
            type: 'none',
          });
        }
      } catch {
        // Keine E-Mail-Anbindung
        setEmailStatus({
          type: 'none',
        });
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      loadEmailStatus();
    }
  }, [companyId]);

  const getPlanIcon = (planId?: string) => {
    if (!planId) return <Zap className="h-4 w-4 text-gray-500" />;
    
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
    if (!emailStatus?.plan) return null;
    const plan = emailStatus.plan;
    
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

  // Keine E-Mail-Anbindung - Aufforderung zur Erstellung
  if (!emailStatus || emailStatus.type === 'none') {
    return (
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">E-Mail einrichten</span>
        </div>
        <p className="text-xs text-amber-600 mb-2">
          Verbinden Sie Ihre E-Mail für volle Funktionalität.
        </p>
        <Link 
          href={`/dashboard/company/${companyId}/settings?view=email-integration`}
          className="flex items-center justify-center gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium py-1.5 px-3 rounded-md transition-colors"
        >
          <Plus className="h-3 w-3" />
          E-Mail verbinden
        </Link>
      </div>
    );
  }

  // Gmail verbunden
  if (emailStatus.type === 'gmail') {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
            </svg>
            <span className="text-xs font-semibold text-gray-700">E-Mail-Konto</span>
          </div>
          <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">
            Verbunden
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Gmail</p>
            {emailStatus.email && (
              <p className="text-xs text-gray-500 truncate">{emailStatus.email}</p>
            )}
          </div>
          
          <Link 
            href="/webmail/pricing"
            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap shrink-0"
            title="Zu Taskilo Webmail wechseln"
          >
            Taskilo Mail
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  // Taskilo Webmail
  const plan = emailStatus.plan;
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
