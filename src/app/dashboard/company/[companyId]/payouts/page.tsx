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
  Euro
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';
  created: number;
  arrival_date?: number;
  description?: string;
  failure_message?: string;
  failure_code?: string;
  method: string;
  destination: {
    id: string;
    last4?: string;
    bank_name?: string;
    account_holder_type?: string;
  };
}

interface PayoutSummary {
  totalPayouts: number;
  totalAmount: number;
  pendingAmount: number;
  lastPayout?: Payout;
}

export default function PayoutOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const companyId = params.companyId as string;

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !companyId) return;
    loadPayoutHistory();
  }, [user, companyId]);

  const loadPayoutHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/get-payout-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUserId: companyId })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Auszahlungshistorie');
      }

      const data = await response.json();
      setPayouts(data.payouts || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error loading payout history:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: currency.toUpperCase() 
    }).format(amount / 100); // Convert from cents
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: Payout['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ausgezahlt
        </Badge>;
      case 'in_transit':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Clock className="w-3 h-3 mr-1" />
          Unterwegs
        </Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Ausstehend
        </Badge>;
      case 'failed':
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Fehlgeschlagen
        </Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <XCircle className="w-3 h-3 mr-1" />
          Storniert
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const downloadInvoice = async (payoutId: string) => {
    try {
      const response = await fetch('/api/generate-payout-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firebaseUserId: companyId,
          payoutId: payoutId
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren der Rechnung');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Auszahlung_${payoutId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading invoice:', err);
      alert('Fehler beim Download der Rechnung');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push(`/dashboard/company/${companyId}/settings`)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Auszahlungen
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Übersicht über Ihre Auszahlungen und Rechnungen
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <Button 
              onClick={loadPayoutHistory}
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Erneut versuchen
            </Button>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Euro className="w-4 h-4" />
                  Gesamtauszahlungen
                </CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {formatCurrency(summary.totalAmount)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Anzahl Auszahlungen
                </CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {summary.totalPayouts}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <Clock className="w-4 h-4" />
                  Ausstehend
                </CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {formatCurrency(summary.pendingAmount)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Payouts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Auszahlungshistorie
            </CardTitle>
            <CardDescription>
              Alle Ihre Auszahlungen mit Status und Download-Möglichkeit für Rechnungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Keine Auszahlungen gefunden
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Ihre Auszahlungshistorie wird hier angezeigt, sobald Sie Ihre erste Auszahlung beantragt haben.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payouts.map((payout) => (
                  <div 
                    key={payout.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                        <Euro className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(payout.amount, payout.currency)}
                          </span>
                          {getStatusBadge(payout.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(payout.created)}
                          </span>
                          {payout.arrival_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Erwartet: {formatDate(payout.arrival_date)}
                            </span>
                          )}
                          {payout.destination.bank_name && (
                            <span>
                              {payout.destination.bank_name} ****{payout.destination.last4}
                            </span>
                          )}
                        </div>
                        {payout.failure_message && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            Fehler: {payout.failure_message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {(payout.status === 'paid' || payout.status === 'in_transit') && (
                        <Button
                          onClick={() => downloadInvoice(payout.id)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Rechnung
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
