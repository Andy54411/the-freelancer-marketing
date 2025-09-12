'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  Download,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileText,
  Euro,
  AlertCircle,
  Banknote,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AvailableOrder {
  id: string;
  amount: number;
  completedAt: any;
  projectTitle: string;
}

interface PayoutOption {
  name: string;
  fee: number;
  feePercentage: number;
  estimatedTime: string;
  description: string;
  finalAmount: number;
  available?: boolean;
}

interface AvailablePayoutData {
  availableAmount: number;
  currency: string;
  orderCount: number;
  orders: AvailableOrder[];
  payoutOptions: {
    standard: PayoutOption;
    express: PayoutOption;
  };
}

interface StripeBalanceData {
  available: number;
  pending: number;
  currency: string;
  source: string;
  lastUpdated?: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  orderCount: number;
  estimatedArrival: string;
  status: string;
  method: string;
}

interface PayoutHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  arrival_date: number;
  method: string;
  description?: string;
}

interface PayoutHistoryData {
  payouts: PayoutHistoryItem[];
  summary: {
    totalPayouts: number;
    totalAmount: number;
    pendingAmount: number;
    lastPayout: PayoutHistoryItem | null;
  };
}

export default function PayoutOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = (params?.uid as string) || '';

  const [availableData, setAvailableData] = useState<AvailablePayoutData | null>(null);
  const [historyData, setHistoryData] = useState<PayoutHistoryData | null>(null);
  const [stripeBalance, setStripeBalance] = useState<StripeBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [selectedPayoutOption, setSelectedPayoutOption] = useState<'standard' | 'express'>(
    'standard'
  );
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs für Realtime-Listener
  const ordersUnsubscribeRef = useRef<(() => void) | null>(null);
  const quotesUnsubscribeRef = useRef<(() => void) | null>(null);
  const webhookUnsubscribeRef = useRef<(() => void) | null>(null);

  // Helper functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPayoutStatusBadge = (status: string) => {
    const statusConfig = {
      paid: {
        label: 'Ausgezahlt',
        variant: 'default' as const,
        color: 'text-green-700 bg-green-100',
      },
      pending: {
        label: 'Ausstehend',
        variant: 'secondary' as const,
        color: 'text-yellow-700 bg-yellow-100',
      },
      in_transit: {
        label: 'Unterwegs',
        variant: 'outline' as const,
        color: 'text-blue-700 bg-blue-100',
      },
      failed: {
        label: 'Fehlgeschlagen',
        variant: 'destructive' as const,
        color: 'text-red-700 bg-red-100',
      },
      canceled: {
        label: 'Storniert',
        variant: 'secondary' as const,
        color: 'text-gray-700 bg-gray-100',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const loadAvailablePayouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/company/${uid}/payout`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der verfügbaren Auszahlungen');
      }

      const data = await response.json();
      setAvailableData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // Berechne payoutOptions basierend auf STRIPE Balance (nicht Payout API)
  const calculatePayoutOptions = useCallback((stripeAvailable: number) => {
    if (stripeAvailable > 0) {
      const standardAmount = stripeAvailable;
      const expressAmount = stripeAvailable * 0.97; // 3% Gebühr abziehen
      const expressFee = stripeAvailable * 0.03;

      return {
        standard: {
          name: 'Standard Auszahlung',
          fee: 0,
          feePercentage: 0,
          estimatedTime: '1-2 Werktage',
          description: 'Standard Banküberweisungen dauern normalerweise 1-2 Werktage.',
          finalAmount: standardAmount,
          available: true,
        },
        express: {
          name: 'Express Auszahlung',
          fee: expressFee,
          feePercentage: 3,
          estimatedTime: 'Sofort',
          description: 'Express-Auszahlungen werden sofort bearbeitet, kosten aber 3% Gebühr.',
          finalAmount: expressAmount,
          available: true,
        },
      };
    } else {
      // Keine Auszahlung verfügbar
      return {
        standard: {
          name: 'Standard Auszahlung',
          fee: 0,
          feePercentage: 0,
          estimatedTime: '1-2 Werktage',
          description: 'Standard Banküberweisungen dauern normalerweise 1-2 Werktage.',
          finalAmount: 0,
          available: false,
        },
        express: {
          name: 'Express Auszahlung',
          fee: 0,
          feePercentage: 3,
          estimatedTime: 'Sofort',
          description: 'Express-Auszahlungen werden sofort bearbeitet, kosten aber 3% Gebühr.',
          finalAmount: 0,
          available: false,
        },
      };
    }
  }, []);

  // Stripe Balance laden mit Caching
  const loadStripeBalance = useCallback(
    async (forceRefresh = false) => {
      try {
        setBalanceLoading(true);
        const url = `/api/company/${uid}/stripe-balance${forceRefresh ? '?force=true' : ''}`;
        const response = await fetch(url);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.balance) {
            setStripeBalance({
              available: result.balance.available?.[0]?.amountEuro || 0,
              pending: result.balance.pending?.[0]?.amountEuro || 0,
              currency: result.balance.available?.[0]?.currency || 'eur',
              source: result.cached ? 'cache' : 'stripe_api',
              lastUpdated: result.balance.timestamp,
            });

            // Show cache status in console
            if (result.cached) {
            } else {
            }
          }
        } else {
          console.error('Balance API error');
          setStripeBalance(null);
        }
      } catch (err) {
        console.error('Fehler beim Laden der Stripe Balance:', err);
        setStripeBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    },
    [uid]
  );

  // Realtime Listener für Aufträge
  const setupOrdersListener = useCallback(() => {
    if (ordersUnsubscribeRef.current) {
      ordersUnsubscribeRef.current();
    }

    const ordersQuery = query(
      collection(db, 'auftraege'),
      where('selectedAnbieterId', '==', uid),
      where('status', '==', 'ABGESCHLOSSEN'),
      orderBy('updatedAt', 'desc')
    );

    ordersUnsubscribeRef.current = onSnapshot(
      ordersQuery,
      snapshot => {
        // Nach Änderungen in Aufträgen → Payout-Daten neu laden
        loadAvailablePayouts();
        loadStripeBalance();
      },
      error => {
        console.error('Fehler beim Aufträge-Listener:', error);
      }
    );
  }, [uid, loadAvailablePayouts, loadStripeBalance]);

  // Realtime Listener für Quote Payments
  const setupQuotesListener = useCallback(() => {
    if (quotesUnsubscribeRef.current) {
      quotesUnsubscribeRef.current();
    }

    const quotesQuery = query(
      collection(db, 'quotes'),
      where('providerId', '==', uid),
      orderBy('updatedAt', 'desc')
    );

    quotesUnsubscribeRef.current = onSnapshot(
      quotesQuery,
      snapshot => {
        // Nach Änderungen in Quotes → Payout-Daten neu laden
        loadAvailablePayouts();
        loadStripeBalance();
      },
      error => {
        console.error('Fehler beim Quotes-Listener:', error);
      }
    );
  }, [uid, loadAvailablePayouts, loadStripeBalance]);

  // Webhook Event Listener für Stripe Updates (mit Fehlerbehandlung)
  const setupWebhookListener = useCallback(() => {
    try {
      const webhookQuery = query(
        collection(db, 'realtime_events'),
        where('processed', '==', false),
        orderBy('timestamp', 'desc')
      );

      return onSnapshot(
        webhookQuery,
        snapshot => {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const eventData = change.doc.data();

              // Handle different event types
              if (
                eventData.event_type === 'payout_updated' ||
                eventData.event_type === 'balance_updated'
              ) {
                // Force refresh balance data
                loadStripeBalance(true);
                loadAvailablePayouts();

                // Mark as processed (mit try-catch)
                try {
                  updateDoc(change.doc.ref, { processed: true });
                } catch (updateError) {
                  console.warn('Could not mark webhook event as processed:', updateError);
                }
              }
            }
          });
        },
        error => {
          console.warn('Webhook listener not available - permissions missing:', error.message);
          // Webhook-Listener ist optional, die App funktioniert auch ohne
        }
      );
    } catch (error) {
      console.warn('Could not setup webhook listener - permissions missing:', error);
      // Return empty function if setup fails
      return () => {};
    }
  }, [loadAvailablePayouts, loadStripeBalance]);

  // Manual Refresh Funktion (mit Force-Refresh für Stripe Balance)
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      setError(null);

      await Promise.all([
        loadAvailablePayouts(),
        loadStripeBalance(true), // Force refresh from Stripe API
      ]);

      setSuccess('Daten erfolgreich aktualisiert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Manual refresh failed:', err);
      setError('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAvailablePayouts, loadStripeBalance, isRefreshing]);

  // Initial Load useEffect
  useEffect(() => {
    if (!user || !uid) return;

    // Lade initiale Daten
    loadAvailablePayouts();
    loadStripeBalance();

    // Setup Realtime Listeners
    setupOrdersListener();
    setupQuotesListener();

    // Setup Webhook-Listener (kann fehlschlagen wegen Berechtigungen)
    try {
      webhookUnsubscribeRef.current = setupWebhookListener();
    } catch (error) {
      console.warn('Webhook listener setup failed - continuing without it:', error);
      webhookUnsubscribeRef.current = null;
    }

    // Cleanup bei Component unmount
    return () => {
      if (ordersUnsubscribeRef.current) {
        ordersUnsubscribeRef.current();
      }
      if (quotesUnsubscribeRef.current) {
        quotesUnsubscribeRef.current();
      }
      if (webhookUnsubscribeRef.current) {
        webhookUnsubscribeRef.current();
      }
    };
  }, [
    user,
    uid,
    loadAvailablePayouts,
    loadStripeBalance,
    setupOrdersListener,
    setupQuotesListener,
    setupWebhookListener,
  ]);

  const loadPayoutHistory = async () => {
    try {
      setHistoryLoading(true);
      setError(null);

      const response = await fetch('/api/get-payout-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUserId: uid }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Auszahlungshistorie');
      }

      const data = await response.json();
      setHistoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRequestPayout = async (isExpressPayout: boolean = false) => {
    if (!availableData || availableData.availableAmount <= 0 || payoutLoading) return;

    const option = isExpressPayout
      ? availableData.payoutOptions.express
      : availableData.payoutOptions.standard;

    if (isExpressPayout && !option.available) {
      alert('Express Payout ist für diesen Betrag nicht verfügbar. Mindestbetrag: €5');
      return;
    }

    const confirmMessage =
      `Auszahlung bestätigen\n\n` +
      `${option.name}\n` +
      `Verfügbarer Betrag: ${formatCurrency(availableData.availableAmount)}\n` +
      `Gebühr: ${formatCurrency(option.fee)} (${option.feePercentage}%)\n` +
      `Auszahlungsbetrag: ${formatCurrency(option.finalAmount)}\n` +
      `Anzahl Aufträge: ${availableData.orderCount}\n` +
      `Dauer: ${option.estimatedTime}\n\n` +
      `${option.description}\n\n` +
      `Möchten Sie die Auszahlung beantragen?`;

    const confirmPayout = confirm(confirmMessage);

    if (!confirmPayout) return;

    try {
      setPayoutLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/company/${uid}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${isExpressPayout ? 'Express ' : ''}Auszahlung für ${availableData.orderCount} abgeschlossene Aufträge`,
          isExpressPayout: isExpressPayout,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Auszahlung fehlgeschlagen');
      }

      const result = await response.json();

      setSuccess(
        `${isExpressPayout ? 'Express ' : ''}Auszahlung erfolgreich beantragt!\n` +
          `Ursprungsbetrag: ${formatCurrency(result.payout.amount)}\n` +
          (result.payout.expressFee > 0
            ? `Gebühr: ${formatCurrency(result.payout.expressFee)} (${result.payout.expressFeePercentage}%)\n`
            : '') +
          `Auszahlungsbetrag: ${formatCurrency(result.payout.finalAmount)}\n` +
          `Voraussichtliche Ankunft: ${result.payout.estimatedArrival}`
      );

      // Reload data immediately to show updated state
      loadAvailablePayouts();
      loadStripeBalance();
      if (activeTab === 'history') {
        loadPayoutHistory();
      }

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auszahlung fehlgeschlagen');
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Auszahlungen</h1>
          </div>

          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Auszahlungen</h1>
            {lastUpdated && (
              <div className="text-sm text-gray-500 ml-4">
                Zuletzt aktualisiert:{' '}
                {lastUpdated ? formatDate(lastUpdated.getTime() / 1000) : 'Nie'}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Aktualisiert...' : 'Aktualisieren'}</span>
            </Button>

            {(balanceLoading || loading) && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span>Live-Update...</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'available'
                ? 'bg-white text-[#14ad9f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Verfügbare Auszahlungen
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              if (!historyData) {
                loadPayoutHistory();
              }
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-[#14ad9f] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Auszahlungshistorie
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 whitespace-pre-line">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Available Payout Card */}
        {activeTab === 'available' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Euro className="h-5 w-5 text-[#14ad9f]" />
                  <span>Verfügbare Auszahlung</span>
                </CardTitle>
                <CardDescription>
                  Einnahmen aus abgeschlossenen Aufträgen bereit zur Auszahlung
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Payout Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Standard Payout */}
                    <Card
                      className={`border-2 transition-colors cursor-pointer ${
                        stripeBalance && stripeBalance.available > 0
                          ? 'border-gray-200 hover:border-[#14ad9f]'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      }`}
                      onClick={() =>
                        stripeBalance &&
                        stripeBalance.available > 0 &&
                        setSelectedPayoutOption('standard')
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Banknote className="h-5 w-5 text-[#14ad9f]" />
                            <h3 className="font-semibold">Standard Auszahlung</h3>
                          </div>
                          <input
                            type="radio"
                            name="payoutOption"
                            checked={selectedPayoutOption === 'standard'}
                            readOnly
                            className="h-4 w-4 text-[#14ad9f]"
                          />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Verfügbar:</span>
                            <span className="font-medium">
                              {formatCurrency(stripeBalance?.available || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gebühr:</span>
                            <span className="font-medium text-green-600">Kostenlos</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sie erhalten:</span>
                            <span className="font-bold text-lg">
                              {formatCurrency(stripeBalance?.available || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dauer:</span>
                            <span className="font-medium">1-2 Werktage</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Standard Banküberweisungen dauern normalerweise 1-2 Werktage.
                        </p>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            disabled={
                              payoutLoading || !stripeBalance || stripeBalance.available <= 0
                            }
                            onClick={() => handleRequestPayout(false)}
                            className="bg-[#14ad9f] hover:bg-[#129488] text-white w-full"
                          >
                            {payoutLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                Wird bearbeitet...
                              </>
                            ) : (
                              <>
                                <Banknote className="h-3 w-3 mr-2" />
                                Standard Auszahlung beantragen
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Express Payout */}
                    <Card
                      className={`border-2 transition-colors cursor-pointer ${
                        stripeBalance && stripeBalance.available > 0
                          ? 'border-gray-200 hover:border-[#14ad9f]'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      }`}
                      onClick={() =>
                        stripeBalance &&
                        stripeBalance.available > 0 &&
                        setSelectedPayoutOption('express')
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-orange-500" />
                            <h3 className="font-semibold">Express Auszahlung</h3>
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              ⚡ Schnell
                            </Badge>
                          </div>
                          <input
                            type="radio"
                            name="payoutOption"
                            checked={selectedPayoutOption === 'express'}
                            disabled={!stripeBalance || stripeBalance.available <= 0}
                            readOnly
                            className="h-4 w-4 text-[#14ad9f]"
                          />
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Verfügbar:</span>
                            <span className="font-medium">
                              {formatCurrency(stripeBalance?.available || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gebühr (4,5%):</span>
                            <span className="font-medium text-orange-600">
                              -{formatCurrency((stripeBalance?.available || 0) * 0.045)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sie erhalten:</span>
                            <span className="font-bold text-lg">
                              {formatCurrency((stripeBalance?.available || 0) * 0.955)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dauer:</span>
                            <span className="font-medium text-orange-600">Sofort</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Express-Auszahlungen werden sofort bearbeitet, kosten aber 4,5% Gebühr.
                        </p>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            disabled={
                              payoutLoading || !stripeBalance || stripeBalance.available <= 0
                            }
                            onClick={() => handleRequestPayout(true)}
                            className="bg-orange-500 hover:bg-orange-600 text-white w-full"
                          >
                            {payoutLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                Wird bearbeitet...
                              </>
                            ) : (
                              <>
                                <Zap className="h-3 w-3 mr-2" />
                                Express Auszahlung beantragen
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Summary - nur wenn Stripe Balance verfügbar */}
                {stripeBalance && stripeBalance.available > 0 && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(availableData?.availableAmount || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Verfügbar</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {availableData?.orderCount || 0}
                      </div>
                      <div className="text-sm text-gray-600">Abgeschlossene Aufträge</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {selectedPayoutOption === 'express' ? '30 Min' : '1-3 Tage'}
                      </div>
                      <div className="text-sm text-gray-600">Auszahlungsdauer</div>
                    </div>
                  </div>
                )}

                {/* Stripe Balance Information */}
                {stripeBalance && (stripeBalance.pending > 0 || stripeBalance.available > 0) && (
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <CreditCard className="h-5 w-5 text-[#14ad9f]" />
                        <span>Stripe Kontoguthaben</span>
                        {balanceLoading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f]"></div>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Gesamtübersicht Ihres Stripe-Guthabens (verfügbar + ausstehend)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Available Stripe Balance */}
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-green-600 font-medium">
                                Sofort verfügbar
                              </div>
                              <div className="text-2xl font-bold text-green-700">
                                {formatCurrency(stripeBalance.available)}
                              </div>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                          <p className="text-xs text-green-600 mt-2">
                            Direkt für Auszahlungen verfügbar
                          </p>
                        </div>

                        {/* Pending Stripe Balance */}
                        {stripeBalance.pending > 0 && (
                          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-yellow-600 font-medium">
                                  Ausstehend
                                </div>
                                <div className="text-2xl font-bold text-yellow-700">
                                  {formatCurrency(stripeBalance.pending)}
                                </div>
                              </div>
                              <Clock className="h-8 w-8 text-yellow-500" />
                            </div>
                            <p className="text-xs text-yellow-600 mt-2">
                              Wird in 1-2 Werktagen verfügbar
                            </p>
                          </div>
                        )}

                        {/* Total Balance */}
                        {stripeBalance.pending > 0 && (
                          <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-blue-600 font-medium">
                                  Gesamtguthaben
                                </div>
                                <div className="text-2xl font-bold text-blue-700">
                                  {formatCurrency(stripeBalance.available + stripeBalance.pending)}
                                </div>
                              </div>
                              <Euro className="h-8 w-8 text-blue-500" />
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              Verfügbar ({formatCurrency(stripeBalance.available)}) + Ausstehend (
                              {formatCurrency(stripeBalance.pending)})
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Payout History */}
        {activeTab === 'history' && (
          <>
            {historyLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
                </CardContent>
              </Card>
            ) : historyData ? (
              <>
                {/* Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-[#14ad9f]" />
                      <span>Auszahlungsübersicht</span>
                    </CardTitle>
                    <CardDescription>Gesamtübersicht Ihrer Auszahlungen</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-[#14ad9f]/5 rounded-lg">
                        <div className="text-2xl font-bold text-[#14ad9f]">
                          {formatCurrency(historyData.summary.totalAmount / 100)}
                        </div>
                        <div className="text-sm text-gray-600">Gesamt ausgezahlt</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {historyData.summary.totalPayouts}
                        </div>
                        <div className="text-sm text-gray-600">Anzahl Auszahlungen</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {formatCurrency(historyData.summary.pendingAmount / 100)}
                        </div>
                        <div className="text-sm text-gray-600">Ausstehend</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* History List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <span>Auszahlungshistorie</span>
                    </CardTitle>
                    <CardDescription>Chronologische Übersicht aller Auszahlungen</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {historyData.payouts.length > 0 ? (
                      <div className="space-y-3">
                        {historyData.payouts.map(payout => (
                          <div
                            key={payout.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="font-medium text-gray-900">
                                  Auszahlung #{payout.id.slice(-8)}
                                </div>
                                {getPayoutStatusBadge(payout.status)}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Beantragt am {formatDate(payout.created * 1000)}
                                {payout.arrival_date && (
                                  <span className="ml-2">
                                    • Ankunft: {formatDate(payout.arrival_date * 1000)}
                                  </span>
                                )}
                              </div>
                              {payout.description && (
                                <div className="text-sm text-gray-400 mt-1">
                                  {payout.description}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-[#14ad9f]">
                                {formatCurrency(payout.amount / 100)}
                              </div>
                              <div className="text-sm text-gray-500">{payout.method || 'SEPA'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <Clock className="h-12 w-12 mx-auto" />
                        </div>
                        <div className="text-lg font-medium text-gray-600 mb-2">
                          Keine Auszahlungen gefunden
                        </div>
                        <div className="text-sm text-gray-500">
                          Ihre Auszahlungshistorie wird hier angezeigt
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <XCircle className="h-12 w-12 mx-auto" />
                  </div>
                  <div className="text-lg font-medium text-gray-600 mb-2">
                    Historie konnte nicht geladen werden
                  </div>
                  <Button onClick={loadPayoutHistory} variant="outline" className="mt-4">
                    Erneut versuchen
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <span>Auszahlungsinformationen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Auszahlungen erfolgen automatisch auf Ihr hinterlegtes Bankkonto</span>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Bearbeitungszeit: 1-2 Werktage für SEPA-Überweisungen</span>
              </div>
              <div className="flex items-start space-x-2">
                <CreditCard className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Nur abgeschlossene und bewertete Aufträge sind auszahlungsbereit</span>
              </div>
              <div className="flex items-start space-x-2">
                <Euro className="h-4 w-4 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                <span>Platform-Gebühren werden automatisch abgezogen</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
