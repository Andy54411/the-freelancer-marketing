'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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

interface AvailablePayoutData {
  availableAmount: number;
  currency: string;
  orderCount: number;
  orders: AvailableOrder[];
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
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');

  useEffect(() => {
    if (!user || !uid) return;
    loadAvailablePayouts();
  }, [user, uid]);

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

  const loadAvailablePayouts = async () => {
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
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!availableData || availableData.availableAmount <= 0 || payoutLoading) return;

    const confirmPayout = confirm(
      `Auszahlung bestätigen\n\n` +
        `Verfügbarer Betrag: ${formatCurrency(availableData.availableAmount)}\n` +
        `Anzahl Aufträge: ${availableData.orderCount}\n\n` +
        `Der Betrag wird in 1-2 Werktagen auf Ihr Bankkonto überwiesen.\n\n` +
        `Möchten Sie die Auszahlung beantragen?`
    );

    if (!confirmPayout) return;

    try {
      setPayoutLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/company/${uid}/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Auszahlung für ${availableData.orderCount} abgeschlossene Aufträge`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Auszahlung fehlgeschlagen');
      }

      const result = await response.json();

      setSuccess(
        `Auszahlung erfolgreich beantragt!\n` +
          `Betrag: ${formatCurrency(result.payout.amount)}\n` +
          `Voraussichtliche Ankunft: ${result.payout.estimatedArrival}`
      );

      // Reload data to show updated state
      setTimeout(() => {
        loadAvailablePayouts();
        if (activeTab === 'history') {
          loadPayoutHistory();
        }
        setSuccess(null);
      }, 3000);
    } catch (err) {

      setError(err instanceof Error ? err.message : 'Auszahlung fehlgeschlagen');
    } finally {
      setPayoutLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'Unbekannt';

    let date: Date;

    // Firebase Timestamp mit _seconds und _nanoseconds
    if (dateInput._seconds) {
      date = new Date(dateInput._seconds * 1000);
    }
    // Firestore Timestamp mit toDate() Methode
    else if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    }
    // Standard Date Object
    else if (dateInput instanceof Date) {
      date = dateInput;
    }
    // String oder Number
    else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      date = new Date(dateInput);
    }
    // Fallback
    else {

      return 'Unbekannt';
    }

    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Ausgezahlt</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Ausstehend</Badge>;
      case 'in_transit':
        return <Badge className="bg-blue-100 text-blue-800">Unterwegs</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Storniert</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Fehlgeschlagen</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
                {availableData && availableData.availableAmount > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-[#14ad9f]/5 rounded-lg">
                        <div className="text-2xl font-bold text-[#14ad9f]">
                          {formatCurrency(availableData.availableAmount)}
                        </div>
                        <div className="text-sm text-gray-600">Verfügbarer Betrag</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {availableData.orderCount}
                        </div>
                        <div className="text-sm text-gray-600">Abgeschlossene Aufträge</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">1-2 Werktage</div>
                        <div className="text-sm text-gray-600">Auszahlungsdauer</div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={handleRequestPayout}
                        disabled={payoutLoading}
                        className="bg-[#14ad9f] hover:bg-[#129488] text-white px-8 py-2"
                      >
                        {payoutLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Auszahlung wird beantragt...
                          </>
                        ) : (
                          <>
                            <Banknote className="h-4 w-4 mr-2" />
                            Auszahlung beantragen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <Euro className="h-12 w-12 mx-auto" />
                    </div>
                    <div className="text-lg font-medium text-gray-600 mb-2">
                      Keine Auszahlung verfügbar
                    </div>
                    <div className="text-sm text-gray-500">
                      Schließen Sie Aufträge ab, um Auszahlungen zu erhalten
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Ready for Payout */}
            {availableData && availableData.orders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Aufträge bereit zur Auszahlung</span>
                  </CardTitle>
                  <CardDescription>
                    Diese abgeschlossenen Aufträge sind für die Auszahlung vorgesehen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableData.orders.map(order => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{order.projectTitle}</div>
                          <div className="text-sm text-gray-500">
                            Abgeschlossen am {formatDate(order.completedAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-[#14ad9f]">
                            {formatCurrency(order.amount)}
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Bereit zur Auszahlung
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
            <div className="space-y-3 text-sm text-gray-600">
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
