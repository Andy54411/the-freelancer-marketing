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
import { useAlertHelpers } from '@/components/ui/AlertProvider';
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
  hasActiveOrders?: boolean;
  pendingApprovals?: number;
}

export function SectionCards() {
  const { showSuccess, showError, showWarning } = useAlertHelpers();
  const { user: currentUser, unreadMessagesCount } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    newOrders: 0,
    activeOrders: 0,
    availableBalance: 0,
    pendingBalance: 0,
    hasActiveOrders: false,
    pendingApprovals: 0,
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

          // Debug: Zeige alle Status-Werte in der Konsole
          console.log(
            'Order Status:',
            order.status,
            'Original Price:',
            order.jobCalculatedPriceInCents
          );

          // VOLLSTÄNDIGE UMSATZBERECHNUNG - berücksichtige alle Einnahmen
          let orderTotalRevenue = 0;

          // 1. Basis-Auftragswert - NUR wenn Zahlung erhalten wurde
          if (order.jobCalculatedPriceInCents && order.jobCalculatedPriceInCents > 0) {
            if (
              order.status === 'zahlung_erhalten_clearing' ||
              order.status === 'ABGESCHLOSSEN' ||
              order.status === 'COMPLETED' ||
              order.status === 'BEZAHLT' ||
              order.status === 'PAID' ||
              order.status === 'geld_freigegeben'
            ) {
              orderTotalRevenue += order.jobCalculatedPriceInCents;
              console.log('Added PAID base order value:', order.jobCalculatedPriceInCents);
            } else {
              console.log(
                'SKIPPED unpaid base order:',
                order.jobCalculatedPriceInCents,
                'Status:',
                order.status
              );
            }
          }

          // 2. ZUSÄTZLICHE BEZAHLTE STUNDEN aus TimeTracking
          if (order.timeTracking?.timeEntries) {
            order.timeTracking.timeEntries.forEach((entry: any) => {
              // NUR WIRKLICH BEZAHLTE UND ÜBERTRAGENE BETRÄGE berücksichtigen
              if (
                entry.billableAmount &&
                entry.billableAmount > 0 &&
                (entry.status === 'transferred' ||
                  entry.status === 'paid' ||
                  entry.platformHoldStatus === 'transferred' ||
                  entry.billingStatus === 'transferred' ||
                  entry.paymentStatus === 'paid')
              ) {
                orderTotalRevenue += entry.billableAmount;
                console.log(
                  'Added PAID timetracking entry:',
                  entry.billableAmount,
                  'Status:',
                  entry.status
                );
              } else {
                console.log(
                  'SKIPPED unpaid timetracking entry:',
                  entry.billableAmount,
                  'Status:',
                  entry.status
                );
              }
            });
          }

          // Debug: Finaler Auftragsumsatz
          console.log('Final order revenue:', orderTotalRevenue, 'Order ID:', doc.id);
          monthlyRevenue += orderTotalRevenue;

          // Neue Aufträge (die auf Clearing warten)
          if (order.status === 'zahlung_erhalten_clearing') newOrders++;

          // Aktive Aufträge in Bearbeitung - erweiterte Status-Liste
          if (
            order.status === 'AKTIV' ||
            order.status === 'IN BEARBEITUNG' ||
            order.status === 'ANGENOMMEN' ||
            order.status === 'ACCEPTED' ||
            order.status === 'ACTIVE'
          ) {
            activeOrders++;
          }
        });

        // 2. Stripe-Guthaben abrufen
        let availableBalance = 0;
        let pendingBalance = 0;
        let hasActiveOrders = false;
        let pendingApprovals = 0;

        // Prüfe ob es aktive Aufträge gibt, die noch nicht vom Kunden abgeschlossen wurden
        querySnapshot.forEach(doc => {
          const order = doc.data();
          if (order.status === 'AKTIV' || order.status === 'IN BEARBEITUNG') {
            hasActiveOrders = true;
          }
          // Prüfe TimeTracking mit pending approvals
          if (order.timeTracking?.timeEntries) {
            const pendingEntries = order.timeTracking.timeEntries.filter(
              (entry: any) =>
                entry.status === 'submitted' ||
                entry.status === 'platform_held' ||
                entry.platformHoldStatus === 'held'
            );
            pendingApprovals += pendingEntries.length;
          }
        });

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
          hasActiveOrders,
          pendingApprovals,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          monthlyRevenue: 0,
          newOrders: 0,
          activeOrders: 0,
          availableBalance: 0,
          pendingBalance: 0,
          hasActiveOrders: false,
          pendingApprovals: 0,
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
    if (!currentUser) return;

    // Navigiere zur Payouts-Seite wo bereits der vollständige Auszahlungsbereich ist
    window.location.href = `/dashboard/company/${currentUser.uid}/payouts`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="h-[140px] animate-pulse bg-gray-200 dark:bg-gray-800"></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Guthaben Card */}
      <Card className="h-[140px] flex flex-col bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-1 flex-shrink-0">
          <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-300 text-xs font-medium">
            <IconWallet size={14} className="flex-shrink-0" />
            <span className="truncate">Guthaben</span>
          </CardDescription>
          <CardTitle className="text-lg font-bold tabular-nums text-green-800 dark:text-green-200 break-words leading-tight">
            {formatCurrency(stats.availableBalance)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 flex flex-col flex-grow justify-end">
          <div className="flex flex-col gap-0.5">
            <Badge
              variant="outline"
              className={`border-green-300 text-green-700 dark:border-green-700 dark:text-green-300 w-fit text-[9px] px-1 py-0 font-medium leading-tight ${stats.hasActiveOrders || (stats.pendingApprovals && stats.pendingApprovals > 0)
                  ? 'border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300'
                  : stats.pendingBalance > 0
                    ? 'border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300'
                    : ''
                }`}
            >
              {stats.hasActiveOrders
                ? '⏳ Aufträge aktiv'
                : stats.pendingApprovals && stats.pendingApprovals > 0
                  ? `⏳ ${stats.pendingApprovals} pending`
                  : stats.pendingBalance > 0
                    ? `+${formatCurrency(stats.pendingBalance)} pending`
                    : 'Verfügbar'}
            </Badge>
            <Button
              size="sm"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className={`w-full text-[9px] h-5 px-1 font-medium shadow-sm hover:shadow-md transition-all leading-tight bg-[#14ad9f] hover:bg-[#129488] text-white`}
              title="Zur Auszahlungsseite"
            >
              {isWithdrawing ? (
                <span>...</span>
              ) : (
                <>
                  <IconDownload size={8} className="mr-0.5 flex-shrink-0" />
                  <span>Verwalten</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monatlicher Umsatz Card */}
      <Card className="h-[140px] flex flex-col hover:shadow-md transition-all duration-200 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2 flex-grow">
          <CardDescription className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-medium">
            <IconCurrencyEuro size={14} className="flex-shrink-0" />
            <span className="truncate">Umsatz</span>
          </CardDescription>
          <CardTitle className="text-lg font-bold tabular-nums text-blue-800 dark:text-blue-200 break-words">
            {formatCurrency(stats.monthlyRevenue)}
          </CardTitle>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Gesamt</div>
        </CardHeader>
      </Card>

      {/* Neue Bestellungen Card */}
      <Link href={`/dashboard/company/${currentUser?.uid}/orders/overview`} className="block group">
        <Card className="h-[140px] flex flex-col hover:shadow-md transition-all duration-200 group-hover:scale-[1.01] border-orange-200 dark:border-orange-800 cursor-pointer">
          <CardHeader className="pb-2 flex-grow">
            <CardDescription className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs font-medium">
              <IconPackage size={14} className="flex-shrink-0" />
              <span className="truncate">Bestellungen</span>
            </CardDescription>
            <CardTitle className="text-lg font-bold tabular-nums text-orange-800 dark:text-orange-200">
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
        <Card className="h-[140px] flex flex-col hover:shadow-md transition-all duration-200 group-hover:scale-[1.01] border-purple-200 dark:border-purple-800 cursor-pointer">
          <CardHeader className="pb-2 flex-grow">
            <CardDescription className="flex items-center gap-1 text-purple-600 dark:text-purple-400 text-xs font-medium">
              <IconPackage size={14} className="flex-shrink-0" />
              <span className="truncate">Aufträge</span>
            </CardDescription>
            <CardTitle className="text-lg font-bold tabular-nums text-purple-800 dark:text-purple-200">
              {stats.activeOrders}
            </CardTitle>
            <CardAction className="mt-auto">
              <Badge
                variant="outline"
                className="text-xs font-medium border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300"
              >
                Aktiv
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>

      {/* Ungelesene Nachrichten Card */}
      <Link href={`/dashboard/company/${currentUser?.uid}/inbox`} className="block group">
        <Card className="h-[140px] flex flex-col hover:shadow-md transition-all duration-200 group-hover:scale-[1.01] border-red-200 dark:border-red-800 cursor-pointer">
          <CardHeader className="pb-2 flex-grow">
            <CardDescription className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium">
              <IconMail size={14} className="flex-shrink-0" />
              <span className="truncate">Nachrichten</span>
            </CardDescription>
            <CardTitle className="text-lg font-bold tabular-nums text-red-800 dark:text-red-200">
              {unreadMessagesCount}
            </CardTitle>
            <CardAction className="mt-auto">
              <Badge
                variant={unreadMessagesCount > 0 ? 'destructive' : 'outline'}
                className="text-xs font-medium"
              >
                {unreadMessagesCount > 0 ? 'Neu' : 'Leer'}
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
