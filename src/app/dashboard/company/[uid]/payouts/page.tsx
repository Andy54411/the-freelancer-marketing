'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '@/firebase/clients';
import {
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
  Award,
  Star,
  Crown,
  User,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TaskiloLevel, PayoutConfig } from '@/services/TaskiloLevelService';

interface AvailableOrder {
  id: string;
  orderId?: string; // Die echte Auftrags-ID (kann sich von id unterscheiden wenn id = escrowId)
  amount: number;
  completedAt: unknown;
  projectTitle: string;
  invoiceStatus?: 'pending' | 'requested' | 'uploaded' | 'downloaded';
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

// EscrowBalanceData und PayoutRequest werden inline typisiert via escrowData state

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

  // Escrow-basierte States (ersetzen Stripe)
  const [escrowData, setEscrowData] = useState<{
    taskerLevel: TaskiloLevel;
    payoutConfig: PayoutConfig & { isInstantPayout: boolean };
    balance: { inClearing: number; available: number; released: number; currency: string };
    grossBalance: { inClearing: number; available: number; released: number };
    platformFees: { inClearing: number; available: number; released: number; total: number };
    counts: { inClearing: number; available: number; released: number };
    payoutOptions: { standard: PayoutOption; express: PayoutOption | null };
    orders: AvailableOrder[];
    canPayout: boolean;
  } | null>(null);
  const [historyData, setHistoryData] = useState<PayoutHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [selectedPayoutOption, setSelectedPayoutOption] = useState<'standard' | 'express'>('standard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [ordersWithMissingInvoices, setOrdersWithMissingInvoices] = useState<AvailableOrder[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [pendingExpressPayout, setPendingExpressPayout] = useState(false);

  // Refs für Realtime-Listener
  const ordersUnsubscribeRef = useRef<(() => void) | null>(null);

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

  // Level Icons
  const getLevelIcon = (level: TaskiloLevel) => {
    switch (level) {
      case 'top_rated': return <Crown className="h-5 w-5 text-amber-500" />;
      case 'level2': return <Star className="h-5 w-5 text-purple-500" />;
      case 'level1': return <Award className="h-5 w-5 text-blue-500" />;
      default: return <User className="h-5 w-5 text-gray-500" />;
    }
  };

  const getLevelName = (level: TaskiloLevel) => {
    switch (level) {
      case 'top_rated': return 'Top Rated';
      case 'level2': return 'Level 2';
      case 'level1': return 'Level 1';
      default: return 'Neuer Tasker';
    }
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

  // Lade Escrow-basierte Payout-Daten (mit Level-Info)
  const loadEscrowData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Auth Token holen
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Nicht authentifiziert');
      }

      const response = await fetch(`/api/company/${uid}/payout`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Laden der Auszahlungsdaten');
      }

      const data = await response.json();
      
      setEscrowData({
        taskerLevel: data.taskerLevel,
        payoutConfig: data.payoutConfig,
        balance: data.balance,
        grossBalance: data.grossBalance || { inClearing: 0, available: 0, released: 0 },
        platformFees: data.platformFees || { inClearing: 0, available: 0, released: 0, total: 0 },
        counts: data.counts,
        payoutOptions: data.payoutOptions,
        orders: data.orders || [],
        canPayout: data.canPayout,
      });
      
      setLastUpdated(new Date());
      
      // Prüfe welche Aufträge keine hochgeladene Rechnung haben
      if (data.orders && Array.isArray(data.orders)) {
        const missingInvoices = data.orders.filter(
          (order: AvailableOrder) => !order.invoiceStatus || order.invoiceStatus === 'pending' || order.invoiceStatus === 'requested'
        );
        setOrdersWithMissingInvoices(missingInvoices);
      } else {
        setOrdersWithMissingInvoices([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [uid]);

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
      _snapshot => {
        // Nach Änderungen in Aufträgen, Escrow-Daten neu laden
        loadEscrowData();
      },
      _error => {
        // Fehler beim Listener - ignorieren
      }
    );
  }, [uid, loadEscrowData]);

  // Manual Refresh Funktion
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      setError(null);

      await loadEscrowData();

      setSuccess('Daten erfolgreich aktualisiert');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadEscrowData, isRefreshing]);

  // Initial Load useEffect
  useEffect(() => {
    if (!user || !uid) return;

    // Lade initiale Daten
    loadEscrowData();

    // Setup Realtime Listener
    setupOrdersListener();

    // Cleanup bei Component unmount
    return () => {
      if (ordersUnsubscribeRef.current) {
        ordersUnsubscribeRef.current();
      }
    };
  }, [user, uid, loadEscrowData, setupOrdersListener]);

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
    } catch {
      setError('Fehler beim Laden der Auszahlungshistorie');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRequestPayout = async (isExpressPayout: boolean = false) => {
    if (!escrowData || escrowData.balance.available <= 0 || payoutLoading) return;

    // Prüfe ob alle Aufträge eine hochgeladene Rechnung haben
    if (ordersWithMissingInvoices.length > 0) {
      const orderTitles = ordersWithMissingInvoices
        .map(o => o.projectTitle || `Auftrag ${o.id.slice(-6)}`)
        .join(', ');
      
      setError(
        `Auszahlung nicht möglich: Für folgende Aufträge wurde noch keine Rechnung hochgeladen: ${orderTitles}. ` +
        `Bitte laden Sie zuerst für alle abgeschlossenen Aufträge eine Rechnung hoch.`
      );
      return;
    }

    if (isExpressPayout && !escrowData.payoutOptions.express) {
      setError('Express-Auszahlung ist für Ihr Level nicht verfügbar.');
      return;
    }

    // Modal öffnen statt confirm()
    setPendingExpressPayout(isExpressPayout);
    setShowPayoutModal(true);
  };

  const executePayoutRequest = async () => {
    if (!escrowData || escrowData.balance.available <= 0) return;
    
    const isExpressPayout = pendingExpressPayout;
    setShowPayoutModal(false);

    try {
      setPayoutLoading(true);
      setError(null);
      setSuccess(null);

      // Auth Token holen
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(`/api/company/${uid}/payout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: `${isExpressPayout ? 'Express ' : ''}Auszahlung für ${escrowData.orders.length} abgeschlossene Aufträge`,
          isExpressPayout: isExpressPayout,
          escrowIds: escrowData.orders.map(o => o.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Auszahlung fehlgeschlagen');
      }

      const result = await response.json();

      setSuccess(
        `${isExpressPayout ? 'Express ' : ''}Auszahlung erfolgreich beantragt!\n` +
        `Betrag: ${formatCurrency(result.amount || escrowData.balance.available)}\n` +
        `Anzahl Escrows: ${result.escrowsReleased || escrowData.orders.length}`
      );

      // Reload data immediately to show updated state
      loadEscrowData();
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

            {loading && (
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

        {/* Warnung: Fehlende Rechnungen */}
        {ordersWithMissingInvoices.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <FileText className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Auszahlung blockiert:</strong> Für {ordersWithMissingInvoices.length} Auftrag/Aufträge wurde noch keine Rechnung hochgeladen. 
              Bitte laden Sie alle Rechnungen hoch, bevor Sie eine Auszahlung beantragen können.
              <ul className="mt-2 list-disc list-inside text-sm">
                {ordersWithMissingInvoices.slice(0, 5).map((order) => (
                  <li key={order.id}>
                    {order.projectTitle || `Auftrag ${(order.orderId || order.id).slice(-6)}`}
                    {' - '}
                    <a 
                      href={`/dashboard/company/${uid}/orders/${order.orderId || order.id}`}
                      className="text-amber-700 underline hover:text-amber-900"
                    >
                      Rechnung hochladen
                    </a>
                  </li>
                ))}
                {ordersWithMissingInvoices.length > 5 && (
                  <li>... und {ordersWithMissingInvoices.length - 5} weitere</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Available Payout Card - Level-basiert */}
        {activeTab === 'available' && escrowData && (
          <>
            {/* Level Info Banner */}
            <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getLevelIcon(escrowData.taskerLevel)}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getLevelName(escrowData.taskerLevel)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {escrowData.payoutConfig.isInstantPayout
                          ? 'Sofortige kostenlose Auszahlungen freigeschaltet'
                          : `Standard: ${escrowData.payoutConfig.clearingDays} Tage Wartezeit | Express: ${escrowData.payoutConfig.expressDays} Tage (${escrowData.payoutConfig.expressFeePercent}% Gebühr)`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Taskilo Platform-Gebühr: {escrowData.payoutConfig.platformFeePercent}% (wird bei Auftragszahlung abgezogen)
                      </p>
                    </div>
                  </div>
                  {escrowData.payoutConfig.isInstantPayout && (
                    <Badge className="bg-teal-100 text-teal-800">Premium Benefit</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

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
                  {/* Platform-Gebühr Übersicht */}
                  {escrowData.platformFees && escrowData.platformFees.total > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600 font-medium">Platform-Gebühren Übersicht</div>
                        <Badge variant="outline" className="text-xs">
                          {escrowData.payoutConfig.platformFeePercent}% Gebühr
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Brutto (Kundenzahlung):</span>
                          <span className="font-medium ml-2">{formatCurrency(escrowData.grossBalance?.available || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Platform-Gebühr:</span>
                          <span className="font-medium text-red-600 ml-2">-{formatCurrency(escrowData.platformFees.available)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Netto (Ihre Auszahlung):</span>
                          <span className="font-bold text-green-600 ml-2">{formatCurrency(escrowData.balance.available)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Gesamt einbehaltene Platform-Gebühren: {formatCurrency(escrowData.platformFees.total)}
                      </p>
                    </div>
                  )}
                  
                  {/* Balance Uebersicht */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-green-600 font-medium">Verfügbar (Netto)</div>
                          <div className="text-2xl font-bold text-green-700">
                            {formatCurrency(escrowData.balance.available)}
                          </div>
                          {escrowData.grossBalance && escrowData.grossBalance.available > 0 && (
                            <div className="text-xs text-gray-500">
                              Brutto: {formatCurrency(escrowData.grossBalance.available)}
                            </div>
                          )}
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        {escrowData.counts.available} Aufträge bereit zur Auszahlung
                      </p>
                    </div>

                    {escrowData.balance.inClearing > 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-yellow-600 font-medium">In Clearing (Netto)</div>
                            <div className="text-2xl font-bold text-yellow-700">
                              {formatCurrency(escrowData.balance.inClearing)}
                            </div>
                            {escrowData.grossBalance && escrowData.grossBalance.inClearing > 0 && (
                              <div className="text-xs text-gray-500">
                                Brutto: {formatCurrency(escrowData.grossBalance.inClearing)}
                              </div>
                            )}
                          </div>
                          <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                        <p className="text-xs text-yellow-600 mt-2">
                          {escrowData.counts.inClearing} Aufträge warten auf Freigabe
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-blue-600 font-medium">Bereits ausgezahlt (Netto)</div>
                          <div className="text-2xl font-bold text-blue-700">
                            {formatCurrency(escrowData.balance.released)}
                          </div>
                          {escrowData.grossBalance && escrowData.grossBalance.released > 0 && (
                            <div className="text-xs text-gray-500">
                              Brutto: {formatCurrency(escrowData.grossBalance.released)}
                            </div>
                          )}
                        </div>
                        <CreditCard className="h-8 w-8 text-blue-500" />
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        {escrowData.counts.released} Aufträge abgeschlossen
                      </p>
                    </div>
                  </div>

                  {/* Payout Options */}
                  <div className={`grid gap-4 ${escrowData.payoutOptions.express ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Standard Payout */}
                    <Card
                      className={`border-2 transition-colors cursor-pointer ${
                        escrowData.balance.available > 0
                          ? selectedPayoutOption === 'standard'
                            ? 'border-[#14ad9f] bg-teal-50'
                            : 'border-gray-200 hover:border-[#14ad9f]'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      }`}
                      onClick={() => escrowData.balance.available > 0 && setSelectedPayoutOption('standard')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Banknote className="h-5 w-5 text-[#14ad9f]" />
                            <h3 className="font-semibold">{escrowData.payoutOptions.standard.name}</h3>
                            {escrowData.payoutConfig.isInstantPayout && (
                              <Badge className="bg-teal-100 text-teal-800 text-xs">Level 2+</Badge>
                            )}
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
                              {formatCurrency(escrowData.balance.available)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gebühr:</span>
                            <span className="font-medium text-green-600">Kostenlos</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sie erhalten:</span>
                            <span className="font-bold text-lg">
                              {formatCurrency(escrowData.payoutOptions.standard.finalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dauer:</span>
                            <span className="font-medium">
                              {escrowData.payoutOptions.standard.estimatedTime}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          {escrowData.payoutOptions.standard.description}
                        </p>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            disabled={payoutLoading || escrowData.balance.available <= 0 || !escrowData.canPayout}
                            onClick={() => handleRequestPayout(false)}
                            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white w-full"
                          >
                            {payoutLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                Wird bearbeitet...
                              </>
                            ) : (
                              <>
                                <Banknote className="h-3 w-3 mr-2" />
                                {escrowData.payoutConfig.isInstantPayout ? 'Sofort auszahlen' : 'Standard Auszahlung'}
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Express Payout - nur fuer new/level1 */}
                    {escrowData.payoutOptions.express && (
                      <Card
                        className={`border-2 transition-colors cursor-pointer ${
                          escrowData.balance.available > 0
                            ? selectedPayoutOption === 'express'
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-gray-200 hover:border-orange-400'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                        }`}
                        onClick={() => escrowData.balance.available > 0 && setSelectedPayoutOption('express')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <Zap className="h-5 w-5 text-orange-500" />
                              <h3 className="font-semibold">{escrowData.payoutOptions.express.name}</h3>
                              <Badge className="bg-orange-100 text-orange-800 text-xs">Schnell</Badge>
                            </div>
                            <input
                              type="radio"
                              name="payoutOption"
                              checked={selectedPayoutOption === 'express'}
                              readOnly
                              className="h-4 w-4 text-orange-500"
                            />
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Verfügbar:</span>
                              <span className="font-medium">
                                {formatCurrency(escrowData.balance.available)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gebühr ({escrowData.payoutOptions.express.feePercentage}%):</span>
                              <span className="font-medium text-orange-600">
                                -{formatCurrency(escrowData.payoutOptions.express.fee)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sie erhalten:</span>
                              <span className="font-bold text-lg">
                                {formatCurrency(escrowData.payoutOptions.express.finalAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Dauer:</span>
                              <span className="font-medium text-orange-600">
                                {escrowData.payoutOptions.express.estimatedTime}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            {escrowData.payoutOptions.express.description}
                          </p>
                          <div className="mt-3">
                            <Button
                              size="sm"
                              disabled={payoutLoading || escrowData.balance.available <= 0 || !escrowData.canPayout}
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
                                  Express Auszahlung
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Keine Daten */}
        {activeTab === 'available' && !escrowData && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Euro className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Keine Auszahlungen verfügbar</h3>
              <p className="text-gray-500 mt-2">
                Sobald Sie Aufträge abschließen, werden die Einnahmen hier angezeigt.
              </p>
            </CardContent>
          </Card>
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
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>Auszahlungen erfolgen automatisch auf Ihr hinterlegtes Bankkonto</span>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Bearbeitungszeit: 1-2 Werktage für SEPA-Überweisungen</span>
              </div>
              <div className="flex items-start space-x-2">
                <CreditCard className="h-4 w-4 text-gray-600 mt-0.5 shrink-0" />
                <span>Nur abgeschlossene und bewertete Aufträge sind auszahlungsbereit</span>
              </div>
              <div className="flex items-start space-x-2">
                <Euro className="h-4 w-4 text-[#14ad9f] mt-0.5 shrink-0" />
                <span>Platform-Gebühren werden automatisch abgezogen</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auszahlung Bestätigungs-Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {pendingExpressPayout ? (
                <Zap className="h-5 w-5 text-amber-500" />
              ) : (
                <Banknote className="h-5 w-5 text-teal-600" />
              )}
              Auszahlung bestätigen
            </DialogTitle>
            <DialogDescription>
              {pendingExpressPayout
                ? 'Express-Auszahlung innerhalb von 2 Werktagen'
                : 'Standard-Auszahlung innerhalb von 5-7 Werktagen'}
            </DialogDescription>
          </DialogHeader>

          {escrowData && (
            <div className="space-y-4 py-4">
              {/* Auszahlungstyp */}
              <div className={`rounded-lg p-4 ${pendingExpressPayout ? 'bg-amber-50 border border-amber-200' : 'bg-teal-50 border border-teal-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {pendingExpressPayout ? (
                    <Zap className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-teal-600" />
                  )}
                  <span className="font-medium">
                    {pendingExpressPayout ? 'Express-Auszahlung' : 'Sofortige Auszahlung'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {pendingExpressPayout
                    ? escrowData.payoutOptions.express?.description
                    : escrowData.payoutOptions.standard.description}
                </p>
              </div>

              {/* Betragsübersicht */}
              <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Verfügbarer Betrag</span>
                  <span className="font-medium">{formatCurrency(escrowData.grossBalance.available)}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Platform-Gebühr ({escrowData.payoutConfig.platformFeePercent}%)</span>
                  <span className="text-gray-500">- {formatCurrency(escrowData.platformFees.available)}</span>
                </div>

                {pendingExpressPayout && escrowData.payoutOptions.express && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-600">Express-Gebühr ({escrowData.payoutOptions.express.feePercentage}%)</span>
                    <span className="text-amber-600">- {formatCurrency(escrowData.payoutOptions.express.fee)}</span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold">Auszahlungsbetrag</span>
                  <span className="text-xl font-bold text-teal-600">
                    {formatCurrency(
                      pendingExpressPayout && escrowData.payoutOptions.express
                        ? escrowData.payoutOptions.express.finalAmount
                        : escrowData.payoutOptions.standard.finalAmount
                    )}
                  </span>
                </div>
              </div>

              {/* Auftragsinfo */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>{escrowData.orders.length} {escrowData.orders.length === 1 ? 'Auftrag' : 'Aufträge'} zur Auszahlung</span>
              </div>

              {/* Dauer */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  Dauer: {pendingExpressPayout && escrowData.payoutOptions.express
                    ? escrowData.payoutOptions.express.estimatedTime
                    : escrowData.payoutOptions.standard.estimatedTime}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowPayoutModal(false)}
              disabled={payoutLoading}
            >
              Abbrechen
            </Button>
            <Button
              onClick={executePayoutRequest}
              disabled={payoutLoading}
              className={pendingExpressPayout ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-600 hover:bg-teal-700'}
            >
              {payoutLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                <>
                  {pendingExpressPayout ? <Zap className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Jetzt auszahlen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
