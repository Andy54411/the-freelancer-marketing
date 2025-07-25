'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  TrendingUp as IconTrendingUp,
  Package as IconPackage,
  Mail as IconMail,
  Euro as IconCurrencyEuro,
  Wallet as IconWallet,
  Download as IconDownload,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface DashboardStats {
  monthlyRevenue: number;
  newOrders: number;
  activeOrders: number;
  availableBalance: number;
  pendingBalance: number;
}

export function SectionCards() {
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
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const uid = currentUser.uid;
    setLoading(true);

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
          const balanceResponse = await fetch(
            `/api/get-stripe-balance?firebaseUserId=${encodeURIComponent(uid)}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            availableBalance = (balanceData.available || 0) / 100;
            pendingBalance = (balanceData.pending || 0) / 100;
          } else {
            console.warn(
              `Stripe balance API error: ${balanceResponse.status} ${balanceResponse.statusText}`
            );
            const errorData = await balanceResponse.json().catch(() => ({}));
            console.warn('Error details:', errorData);
          }
        } catch (balanceError) {
          console.warn('Failed to fetch Stripe balance:', balanceError);
        }

        setStats({
          monthlyRevenue: monthlyRevenue / 100,
          newOrders,
          activeOrders,
          availableBalance,
          pendingBalance,
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

    fetchStatsAndBalance().finally(() => setLoading(false));
  }, [currentUser]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!currentUser || stats.availableBalance <= 0) return;

    const confirmWithdraw = confirm(
      `Auszahlung bestätigen\n\n` +
        `Verfügbar: ${formatCurrency(stats.availableBalance)}\n` +
        `Gebühr: ${formatCurrency(stats.availableBalance * 0.045)}\n` +
        `Auszahlungsbetrag: ${formatCurrency(stats.availableBalance * 0.955)}\n\n` +
        `Möchten Sie fortfahren?`
    );

    if (!confirmWithdraw) return;

    setIsWithdrawing(true);

    try {
      const response = await fetch('/api/request-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUserId: currentUser.uid,
          amount: Math.floor(stats.availableBalance * 100),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Auszahlung erfolgreich beantragt!\n\nPayout ID: ${result.payoutId}\nBetrag: ${formatCurrency(stats.availableBalance * 0.955)}\n\nDas Geld wird in 1-2 Werktagen auf Ihr Konto überwiesen.`
        );
        window.location.reload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Auszahlung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Payout error:', error);
      alert(
        `Fehler bei Auszahlung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="min-h-[200px] animate-pulse bg-gray-200 dark:bg-gray-800"></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {/* Guthaben Card */}
      <Card className="@container/card min-h-[200px] flex flex-col bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardDescription className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm font-medium">
            <IconWallet size={18} className="flex-shrink-0" />
            <span>Verfügbares Guthaben</span>
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-green-800 dark:text-green-200">
            {formatCurrency(stats.availableBalance)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 flex flex-col flex-grow justify-end">
          <div className="flex flex-col gap-3">
            <Badge
              variant="outline"
              className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300 w-fit text-xs font-medium"
            >
              {stats.pendingBalance > 0
                ? `+${formatCurrency(stats.pendingBalance)} in Bearbeitung`
                : 'Verfügbar'}
            </Badge>
            <Button
              size="sm"
              onClick={handleWithdraw}
              disabled={isWithdrawing || stats.availableBalance <= 0}
              className="bg-green-600 hover:bg-green-700 text-white w-full text-sm font-medium shadow-md hover:shadow-lg transition-all"
            >
              {isWithdrawing ? (
                <span>Wird bearbeitet...</span>
              ) : (
                <>
                  <IconDownload size={14} className="mr-2 flex-shrink-0" />
                  <span>Auszahlen</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monatlicher Umsatz Card */}
      <Card className="@container/card min-h-[200px] flex flex-col hover:shadow-lg transition-all duration-200 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4 flex-grow">
          <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <IconCurrencyEuro size={18} className="flex-shrink-0" />
            <span>Monatlicher Umsatz</span>
          </CardDescription>
          <CardTitle className="text-2xl font-bold tabular-nums text-blue-800 dark:text-blue-200">
            {formatCurrency(stats.monthlyRevenue)}
          </CardTitle>
          <CardAction className="mt-auto">
            <Badge
              variant="outline"
              className="text-xs font-medium border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
            >
              <IconTrendingUp size={12} className="mr-1 flex-shrink-0" />
              <span>Aktueller Monat</span>
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Neue Bestellungen Card */}
      <Link href={`/dashboard/company/${currentUser?.uid}/orders/overview`} className="block group">
        <Card className="@container/card min-h-[200px] flex flex-col hover:shadow-lg transition-all duration-200 group-hover:scale-[1.02] border-orange-200 dark:border-orange-800 cursor-pointer">
          <CardHeader className="pb-4 flex-grow">
            <CardDescription className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm font-medium">
              <IconPackage size={18} className="flex-shrink-0" />
              <span>Neue Bestellungen</span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-orange-800 dark:text-orange-200">
              {stats.newOrders}
            </CardTitle>
            <CardAction className="mt-auto">
              <Badge
                variant={stats.newOrders > 0 ? 'destructive' : 'outline'}
                className="text-xs font-medium"
              >
                {stats.newOrders > 0 ? 'Ausstehend' : 'Aktuell'}
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>

      {/* Aktive Aufträge Card */}
      <Link href={`/dashboard/company/${currentUser?.uid}/orders/overview`} className="block group">
        <Card className="@container/card min-h-[200px] flex flex-col hover:shadow-lg transition-all duration-200 group-hover:scale-[1.02] border-purple-200 dark:border-purple-800 cursor-pointer">
          <CardHeader className="pb-4 flex-grow">
            <CardDescription className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-medium">
              <IconPackage size={18} className="flex-shrink-0" />
              <span>Aktive Aufträge</span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-purple-800 dark:text-purple-200">
              {stats.activeOrders}
            </CardTitle>
            <CardAction className="mt-auto">
              <Badge
                variant="outline"
                className="text-xs font-medium border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300"
              >
                In Bearbeitung
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>

      {/* Ungelesene Nachrichten Card */}
      <Link href={`/dashboard/company/${currentUser?.uid}/inbox`} className="block group">
        <Card className="@container/card min-h-[200px] flex flex-col hover:shadow-lg transition-all duration-200 group-hover:scale-[1.02] border-red-200 dark:border-red-800 cursor-pointer">
          <CardHeader className="pb-4 flex-grow">
            <CardDescription className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
              <IconMail size={18} className="flex-shrink-0" />
              <span>Ungelesene Nachrichten</span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-red-800 dark:text-red-200">
              {unreadMessagesCount}
            </CardTitle>
            <CardAction className="mt-auto">
              <Badge
                variant={unreadMessagesCount > 0 ? 'destructive' : 'outline'}
                className="text-xs font-medium"
              >
                Zum Posteingang
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
