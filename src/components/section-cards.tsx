'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // useAuth importieren
import { collection, query, where, getDocs } from 'firebase/firestore'; // onSnapshot, doc, getDoc entfernt
import { db } from '@/firebase/clients';
import {
  TrendingUp as IconTrendingUp,
  Package as IconPackage,
  Mail as IconMail,
  Euro as IconCurrencyEuro,
  Wallet as IconWallet,
  Download as IconDownload,
} from "lucide-react"
import Link from 'next/link';
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardStats {
  monthlyRevenue: number;
  newOrders: number;
  activeOrders: number;
  availableBalance: number;
  pendingBalance: number;
}

export function SectionCards() {
  // unreadMessagesCount direkt aus dem AuthContext holen
  const { user: currentUser, unreadMessagesCount } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    newOrders: 0,
    activeOrders: 0,
    availableBalance: 0,
    pendingBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wenn kein Benutzer angemeldet ist, nichts tun.
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const uid = currentUser.uid;
    setLoading(true);

    // Einmalige Abfrage für die Auftragsstatistiken und Guthaben.
    const fetchStatsAndBalance = async () => {
      try {
        // 1. Auftragsdaten aus Firestore abrufen
        const ordersRef = collection(db, 'auftraege');
        const q = query(ordersRef, where('selectedAnbieterId', '==', uid));
        const querySnapshot = await getDocs(q);

        let monthlyRevenue = 0;
        let newOrders = 0;
        let activeOrders = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        querySnapshot.forEach(doc => {
          const order = doc.data();
          if ((order.status === 'ABGESCHLOSSEN' || order.status === 'BEZAHLT') && order.paidAt) {
            const orderDate = order.paidAt.toDate();
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
              monthlyRevenue += order.jobCalculatedPriceInCents || 0;
            }
          }
          if (order.status === 'zahlung_erhalten_clearing') newOrders++;
          if (order.status === 'AKTIV' || order.status === 'IN BEARBEITUNG') activeOrders++;
        });

        // 2. Stripe-Guthaben abrufen
        let availableBalance = 0;
        let pendingBalance = 0;

        try {
          // Use the simple mock version temporarily to avoid timeout issues
          const balanceResponse = await fetch(`/api/get-stripe-balance?firebaseUserId=${encodeURIComponent(uid)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            availableBalance = (balanceData.available || 0) / 100; // Convert from cents to euros
            pendingBalance = (balanceData.pending || 0) / 100;
          } else {
            console.warn(`Stripe balance API error: ${balanceResponse.status} ${balanceResponse.statusText}`);
            // Bei Fehlern wird Balance auf 0 gelassen
            const errorData = await balanceResponse.json().catch(() => ({}));
            console.warn('Error details:', errorData);
          }
        } catch (balanceError) {
          console.warn('Failed to fetch Stripe balance:', balanceError);
          // Bei Netzwerkfehlern wird Balance auf 0 gelassen
        }

        // Setze alle Statistiken
        setStats({ 
          monthlyRevenue: monthlyRevenue / 100, 
          newOrders, 
          activeOrders,
          availableBalance,
          pendingBalance 
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          monthlyRevenue: 0,
          newOrders: 0,
          activeOrders: 0,
          availableBalance: 0,
          pendingBalance: 0,
        });
      }
    };

    // Führe die Abfrage aus und setze den Ladezustand danach auf false.
    fetchStatsAndBalance().finally(() => setLoading(false));

    // Da es keine Listener mehr gibt, ist keine Cleanup-Funktion nötig.
  }, [currentUser]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!currentUser || stats.availableBalance <= 0) return;

    const confirmWithdraw = confirm(
      `Auszahlung beantragen:\n\n` +
      `Verfügbares Guthaben: ${formatCurrency(stats.availableBalance)}\n` +
      `Plattformgebühr (4,5%): ${formatCurrency(stats.availableBalance * 0.045)}\n` +
      `Auszahlungsbetrag: ${formatCurrency(stats.availableBalance * 0.955)}\n\n` +
      `Möchten Sie die Auszahlung jetzt beantragen?`
    );

    if (!confirmWithdraw) return;

    setIsWithdrawing(true);

    try {
      const response = await fetch('/api/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firebaseUserId: currentUser.uid,
          amount: Math.floor(stats.availableBalance * 100), // Convert to cents
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Auszahlung erfolgreich beantragt!\n\nPayout ID: ${result.payoutId}\nBetrag: ${formatCurrency(stats.availableBalance * 0.955)}\n\nDas Geld wird in 1-2 Werktagen auf Ihr Konto überwiesen.`);
        
        // Refresh stats to show updated balance
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Auszahlung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Payout error:', error);
      alert(`Fehler bei der Auszahlung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="h-32 animate-pulse bg-gray-200 dark:bg-gray-800"></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      {/* Guthaben Card */}
      <Card className="@container/card h-full bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <IconWallet size={16} /> Verfügbares Guthaben
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-green-800 dark:text-green-200">
            {formatCurrency(stats.availableBalance)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300 flex-1">
              {stats.pendingBalance > 0 
                ? `+${formatCurrency(stats.pendingBalance)} ausstehend` 
                : 'Sofort verfügbar'
              }
            </Badge>
            <Button 
              size="sm" 
              onClick={handleWithdraw}
              disabled={isWithdrawing || stats.availableBalance <= 0}
              className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
            >
              {isWithdrawing ? (
                <span>Wird verarbeitet...</span>
              ) : (
                <>
                  <IconDownload size={14} className="mr-1" />
                  Auszahlen
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="@container/card h-full">
        <CardHeader>
          <CardDescription className="flex items-center gap-2"><IconCurrencyEuro size={16} /> Monatlicher Umsatz</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats.monthlyRevenue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Aktueller Monat
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
      <Link href={`/dashboard/company/${currentUser?.uid}/orders/overview`} className="block">
        <Card className="@container/card h-full hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><IconPackage size={16} /> Neue Aufträge</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.newOrders}
            </CardTitle>
            <CardAction>
              <Badge variant={stats.newOrders > 0 ? "destructive" : "outline"}>
                Warten auf Annahme
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>
      <Link href={`/dashboard/company/${currentUser?.uid}/orders/overview`} className="block">
        <Card className="@container/card h-full hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><IconPackage size={16} /> Aktive Aufträge</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.activeOrders}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                In Bearbeitung
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>
      <Link href={`/dashboard/company/${currentUser?.uid}/inbox`} className="block">
        <Card className="@container/card h-full hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><IconMail size={16} /> Ungelesene Nachrichten</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {unreadMessagesCount}
            </CardTitle>
            <CardAction>
              <Badge variant={unreadMessagesCount > 0 ? "destructive" : "outline"}>
                Zum Posteingang
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}
