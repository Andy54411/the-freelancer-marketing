'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // useAuth importieren
import { collection, query, where, getDocs } from 'firebase/firestore'; // onSnapshot, doc, getDoc entfernt
import { db } from '@/firebase/clients';
import {
  IconTrendingUp,
  IconPackage,
  IconMail,
  IconCurrencyEuro,
} from "@tabler/icons-react"
import Link from 'next/link';
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardStats {
  monthlyRevenue: number;
  newOrders: number;
  activeOrders: number;
}

export function SectionCards() {
  // unreadMessagesCount direkt aus dem AuthContext holen
  const { user: currentUser, unreadMessagesCount } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    newOrders: 0,
    activeOrders: 0,
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

    // Einmalige Abfrage für die Auftragsstatistiken.
    const fetchOrderStats = async () => {
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

      // Setze nur die Statistiken, die hier berechnet werden.
      setStats({ monthlyRevenue: monthlyRevenue / 100, newOrders, activeOrders });
    };

    // Führe die Abfrage aus und setze den Ladezustand danach auf false.
    fetchOrderStats().finally(() => setLoading(false));

    // Da es keine Listener mehr gibt, ist keine Cleanup-Funktion nötig.
  }, [currentUser]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-32 animate-pulse bg-gray-200 dark:bg-gray-800"></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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
