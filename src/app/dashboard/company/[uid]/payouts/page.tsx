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

export default function PayoutOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = (params?.uid as string) || '';

  const [availableData, setAvailableData] = useState<AvailablePayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !uid) return;
    loadAvailablePayouts();
  }, [user, uid]);

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
      console.error('Error loading available payouts:', err);
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
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('Payout request error:', err);
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
      console.log('Unknown date format:', dateInput);
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

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
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
                    <div className="text-lg font-bold text-green-600">
                      1-2 Werktage
                    </div>
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
                {availableData.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {order.projectTitle}
                      </div>
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
                <span>
                  Auszahlungen erfolgen automatisch auf Ihr hinterlegtes Bankkonto
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>
                  Bearbeitungszeit: 1-2 Werktage für SEPA-Überweisungen
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <CreditCard className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>
                  Nur abgeschlossene und bewertete Aufträge sind auszahlungsbereit
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <Euro className="h-4 w-4 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                <span>
                  Platform-Gebühren werden automatisch abgezogen
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}