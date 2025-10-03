'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Euro, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StripeBalanceData {
  available: number;
  pending: number;
  currency: string;
  source: string;
  error?: string;
}

interface StripeBalanceWidgetProps {
  companyUid: string;
  size?: 'compact' | 'full';
  showPayoutButton?: boolean;
  className?: string;
}

export default function StripeBalanceWidget({
  companyUid,
  size = 'compact',
  showPayoutButton = true,
  className = '',
}: StripeBalanceWidgetProps) {
  const router = useRouter();
  const [balance, setBalance] = useState<StripeBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!companyUid) return;
    loadBalance();
  }, [companyUid]);

  const loadBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/get-stripe-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUserId: companyUid }),
      });

      if (!response.ok) {
        throw new Error('Failed to load balance');
      }

      const data = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Guthabens');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleRequestPayout = async () => {
    if (!balance || balance.available <= 0) {
      alert('Kein verfügbares Guthaben für Auszahlung.');
      return;
    }

    if (payoutLoading) return;

    try {
      setPayoutLoading(true);

      const response = await fetch('/api/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUserId: companyUid,
          amount: balance.available, // Full available balance
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Auszahlung fehlgeschlagen');
      }

      const payoutData = await response.json();

      // Success feedback
      alert(
        `Auszahlung erfolgreich angefordert! Payout-ID: ${payoutData.payoutId}\n\nDer Betrag wird in 1-2 Werktagen auf Ihr Bankkonto überwiesen.`
      );

      // Reload balance to reflect changes
      await loadBalance();

      // Navigate to payouts page to show details
      router.push(`/dashboard/company/${companyUid}/payouts`);
    } catch (err) {
      alert(
        `Fehler bei der Auszahlung: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleViewPayouts = () => {
    router.push(`/dashboard/company/${companyUid}/payouts`);
  };

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Euro className="w-4 h-4" />
            Guthaben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Euro className="w-4 h-4" />
            Guthaben
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
          <Button onClick={loadBalance} variant="outline" size="sm" className="mt-2 w-full">
            Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!balance) {
    return null;
  }

  const hasAvailableBalance = balance.available > 0;
  const hasPendingBalance = balance.pending > 0;

  if (size === 'compact') {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Euro className="w-4 h-4 text-[#14ad9f]" />
            Guthaben
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Available Balance */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Verfügbar</span>
            <span
              className={`font-semibold ${hasAvailableBalance ? 'text-green-600' : 'text-gray-500'}`}
            >
              {formatCurrency(balance.available, balance.currency)}
            </span>
          </div>

          {/* Pending Balance */}
          {hasPendingBalance && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ausstehend</span>
              <span className="font-semibold text-yellow-600">
                +{formatCurrency(balance.pending, balance.currency)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {hasAvailableBalance && showPayoutButton && (
              <Button
                onClick={handleRequestPayout}
                disabled={payoutLoading}
                size="sm"
                className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {payoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Auszahlung...
                  </>
                ) : (
                  'Auszahlen'
                )}
              </Button>
            )}

            <Button onClick={handleViewPayouts} variant="outline" size="sm" className="w-full">
              Auszahlungshistorie
            </Button>
          </div>

          {/* Source indicator */}
          {balance.source && (
            <div className="pt-2 text-xs text-gray-400">
              <Badge variant="secondary" className="text-xs">
                {balance.source === 'stripe_api' ? 'Live' : 'Cache'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full size layout
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="w-5 h-5 text-[#14ad9f]" />
          Stripe Guthaben
        </CardTitle>
        <CardDescription>Verfügbares Guthaben für Auszahlungen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Verfügbar</div>
            <div
              className={`text-2xl font-bold ${hasAvailableBalance ? 'text-green-700' : 'text-gray-500'}`}
            >
              {formatCurrency(balance.available, balance.currency)}
            </div>
          </div>

          {hasPendingBalance && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">Ausstehend</div>
              <div className="text-2xl font-bold text-yellow-700">
                +{formatCurrency(balance.pending, balance.currency)}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {hasAvailableBalance && showPayoutButton && (
            <Button
              onClick={handleRequestPayout}
              disabled={payoutLoading}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              {payoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Auszahlung wird bearbeitet...
                </>
              ) : (
                <>
                  <Euro className="w-4 h-4 mr-2" />
                  Vollständige Auszahlung anfordern
                </>
              )}
            </Button>
          )}

          <Button onClick={handleViewPayouts} variant="outline">
            Auszahlungshistorie anzeigen
          </Button>
        </div>

        {/* Status Information */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>• Auszahlungen werden in 1-2 Werktagen bearbeitet</p>
          <p>• Geld wird automatisch nach Order-Bestätigung verfügbar</p>
          {balance.source && (
            <p>• Datenquelle: {balance.source === 'stripe_api' ? 'Live-Daten' : 'Cache'}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
