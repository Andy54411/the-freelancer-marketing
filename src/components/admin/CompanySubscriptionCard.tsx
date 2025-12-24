'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Zap,
  Crown,
  Gift,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoiceUrl?: string;
  paymentMethod?: string;
}

interface SubscriptionSummary {
  planId: string;
  planName: string;
  status: string;
  statusLabel: string;
  billingInterval: string;
  priceGross: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  daysRemaining: number;
  isTrialing: boolean;
  nextBillingDate?: string;
  lastPaymentDate?: string;
  features: string[];
}

interface CompanySubscriptionCardProps {
  companyId: string;
}

export function CompanySubscriptionCard({ companyId }: CompanySubscriptionCardProps) {
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/subscription`);
      const data = await response.json();
      
      if (data.success) {
        setSubscription(data.subscription);
        setTransactions(data.transactions || []);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Fehler beim Laden der Subscription');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const getStatusBadge = (status: string, statusLabel: string) => {
    const statusConfig: Record<string, { className: string; icon: React.ReactNode }> = {
      trialing: { 
        className: 'bg-purple-100 text-purple-800', 
        icon: <Gift className="h-3 w-3 mr-1" /> 
      },
      active: { 
        className: 'bg-green-100 text-green-800', 
        icon: <CheckCircle className="h-3 w-3 mr-1" /> 
      },
      past_due: { 
        className: 'bg-yellow-100 text-yellow-800', 
        icon: <AlertCircle className="h-3 w-3 mr-1" /> 
      },
      cancelled: { 
        className: 'bg-gray-100 text-gray-800', 
        icon: <Clock className="h-3 w-3 mr-1" /> 
      },
      expired: { 
        className: 'bg-red-100 text-red-800', 
        icon: <AlertCircle className="h-3 w-3 mr-1" /> 
      },
    };

    const config = statusConfig[status] || statusConfig.expired;

    return (
      <Badge className={config.className}>
        {config.icon}
        {statusLabel}
      </Badge>
    );
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Zap className="h-5 w-5 text-gray-500" />;
      case 'domain':
      case 'pro':
        return <CreditCard className="h-5 w-5 text-teal-500" />;
      case 'business':
        return <Crown className="h-5 w-5 text-amber-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getTransactionStatusBadge = (status: Transaction['status']) => {
    const config = {
      paid: { className: 'bg-green-100 text-green-800', label: 'Bezahlt' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Offen' },
      failed: { className: 'bg-red-100 text-red-800', label: 'Fehlgeschlagen' },
      refunded: { className: 'bg-gray-100 text-gray-800', label: 'Erstattet' },
    };
    const { className, label } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Tarif & Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Tarif & Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Tarif & Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Kein aktives Abonnement</p>
            <p className="text-xs text-gray-400 mt-1">Free Plan</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            {getPlanIcon(subscription.planId)}
            <span className="ml-2">Tarif & Abonnement</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadSubscription}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Info */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{subscription.planName}</h3>
            <p className="text-sm text-gray-500">
              {subscription.billingInterval === 'monthly' ? 'Monatlich' : 'Jaehrlich'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-600">
              {formatPrice(subscription.priceGross)}
            </p>
            <p className="text-xs text-gray-500">
              pro {subscription.billingInterval === 'monthly' ? 'Monat' : 'Jahr'}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {getStatusBadge(subscription.status, subscription.statusLabel)}
          {subscription.isTrialing && subscription.trialEndsAt && (
            <span className="text-xs text-purple-600">
              Endet am {formatDate(subscription.trialEndsAt)}
            </span>
          )}
        </div>

        {/* Trial Warning */}
        {subscription.isTrialing && subscription.daysRemaining <= 3 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Testphase endet in {subscription.daysRemaining} {subscription.daysRemaining === 1 ? 'Tag' : 'Tagen'}
              </span>
            </div>
          </div>
        )}

        <Separator />

        {/* Billing Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Aktuelle Periode</p>
            <p className="font-medium">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Verbleibend</p>
            <p className="font-medium">{subscription.daysRemaining} Tage</p>
          </div>
          {subscription.nextBillingDate && (
            <div>
              <p className="text-gray-500">Naechste Abrechnung</p>
              <p className="font-medium">{formatDate(subscription.nextBillingDate)}</p>
            </div>
          )}
          {subscription.lastPaymentDate && (
            <div>
              <p className="text-gray-500">Letzte Zahlung</p>
              <p className="font-medium">{formatDate(subscription.lastPaymentDate)}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Features */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Enthaltene Features</p>
          <div className="grid grid-cols-1 gap-1">
            {subscription.features.slice(0, 5).map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="h-3 w-3 text-teal-500 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
            {subscription.features.length > 5 && (
              <p className="text-xs text-gray-400 mt-1">
                +{subscription.features.length - 5} weitere Features
              </p>
            )}
          </div>
        </div>

        {/* Transaktionen */}
        {transactions.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Transaktionen</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-500">Datum</th>
                      <th className="text-left py-2 font-medium text-gray-500">Beschreibung</th>
                      <th className="text-right py-2 font-medium text-gray-500">Betrag</th>
                      <th className="text-center py-2 font-medium text-gray-500">Status</th>
                      <th className="text-center py-2 font-medium text-gray-500">Rechnung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 text-gray-600">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="py-2 text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900">
                          {formatPrice(transaction.amount)}
                        </td>
                        <td className="py-2 text-center">
                          {getTransactionStatusBadge(transaction.status)}
                        </td>
                        <td className="py-2 text-center">
                          {transaction.invoiceUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => window.open(transaction.invoiceUrl, '_blank')}
                              title="Rechnung anzeigen"
                            >
                              <FileText className="h-4 w-4 text-teal-600" />
                            </Button>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {transactions.length === 0 && subscription.planId !== 'free' && (
          <>
            <Separator />
            <div className="text-center py-3">
              <p className="text-sm text-gray-500">Keine Transaktionen vorhanden</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
