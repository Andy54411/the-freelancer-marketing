'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
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
  unreadMessages: number;
}

export function SectionCards() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    newOrders: 0,
    activeOrders: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const uid = currentUser.uid;
    setLoading(true);

    // One-time fetch for order stats
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

      setStats(prev => ({ ...prev, monthlyRevenue: monthlyRevenue / 100, newOrders, activeOrders }));
    };

    // Real-time listener for unread messages
    const chatsRef = collection(db, 'chats');
    const unreadQuery = query(
      chatsRef,
      where('users', 'array-contains', uid),
      where('lastMessage.senderId', '!=', uid),
      where('lastMessage.isRead', '==', false)
    );

    const unsubscribeMessages = onSnapshot(unreadQuery, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (chatDoc) => {
        const orderDocRef = doc(db, 'auftraege', chatDoc.id);
        const orderDocSnap = await getDoc(orderDocRef);
        if (orderDocSnap.exists()) {
          const status = orderDocSnap.data().status;
          return status !== 'abgelehnt_vom_anbieter' && status !== 'STORNIERT';
        }
        return false;
      });

      const results = await Promise.all(chatPromises);
      const validUnreadCount = results.filter(Boolean).length;
      setStats(prev => ({ ...prev, unreadMessages: validUnreadCount }));
    });

    fetchOrderStats().finally(() => setLoading(false));

    return () => {
      unsubscribeMessages();
    };
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
              {stats.unreadMessages}
            </CardTitle>
            <CardAction>
              <Badge variant={stats.unreadMessages > 0 ? "destructive" : "outline"}>
                Zum Posteingang
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </Link>
    </div>
  )
}
