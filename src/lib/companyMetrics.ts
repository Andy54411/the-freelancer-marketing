import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Interfaces für die berechneten Metriken
export interface CompanyMetrics {
  responseTime: number; // in hours
  completionRate: number; // percentage
  totalOrders: number;
  averageRating: number;
  badges: string[];
  isOnline: boolean;
  recentActivity: Date;
}

export interface OrderMetrics {
  completed: number;
  inProgress: number;
  cancelled: number;
  totalRevenue: number;
}

// Automatische Berechnung der Company Metriken
export async function calculateCompanyMetrics(companyUid: string): Promise<CompanyMetrics> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Aufträge laden
    const ordersRef = collection(db, 'auftraege');
    const ordersQuery = query(ordersRef, where('selectedAnbieterId', '==', companyUid));
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Bewertungen laden
    const reviewsRef = collection(db, 'reviews');
    const reviewsQuery = query(reviewsRef, where('reviewedUid', '==', companyUid));
    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = reviewsSnapshot.docs.map(doc => doc.data());

    // 3. Chat-Daten für Response Time laden
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
      chatsRef,
      where('users', 'array-contains', companyUid),
      orderBy('lastUpdated', 'desc'),
      limit(50)
    );
    const chatsSnapshot = await getDocs(chatsQuery);
    const chats = chatsSnapshot.docs.map(doc => doc.data());

    // 4. Berechnungen
    const metrics = {
      totalOrders: orders.length,
      completionRate: calculateCompletionRate(orders),
      responseTime: calculateResponseTime(chats, companyUid),
      averageRating: calculateAverageRating(reviews),
      badges: calculateBadges(orders, reviews, thirtyDaysAgo),
      isOnline: calculateOnlineStatus(chats, companyUid),
      recentActivity: getRecentActivity(orders, chats),
    };

    return metrics;
  } catch (error) {
    console.error('Fehler beim Berechnen der Company Metriken:', error);
    return getDefaultMetrics();
  }
}

// Completion Rate berechnen
function calculateCompletionRate(orders: any[]): number {
  if (orders.length === 0) return 0;

  const completedOrders = orders.filter(
    order => order.status === 'completed' || order.status === 'delivered'
  ).length;

  return Math.round((completedOrders / orders.length) * 100);
}

// Response Time berechnen (Durchschnitt der letzten 30 Tage)
function calculateResponseTime(chats: any[], companyUid: string): number {
  if (chats.length === 0) return 24; // Default 24h

  const responseTimes: number[] = [];

  chats.forEach(chat => {
    const messages = chat.messages || [];
    for (let i = 1; i < messages.length; i++) {
      const prevMessage = messages[i - 1];
      const currentMessage = messages[i];

      // Wenn vorherige Nachricht vom Kunden und aktuelle vom Unternehmen
      if (prevMessage.senderId !== companyUid && currentMessage.senderId === companyUid) {
        const responseTime =
          (currentMessage.timestamp.seconds - prevMessage.timestamp.seconds) / 3600; // in Stunden
        if (responseTime < 48) {
          // Nur realistische Response Times
          responseTimes.push(responseTime);
        }
      }
    }
  });

  if (responseTimes.length === 0) return 24;

  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  return Math.round(avgResponseTime);
}

// Durchschnittliche Bewertung berechnen
function calculateAverageRating(reviews: any[]): number {
  if (reviews.length === 0) return 0;

  const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
  return Math.round((totalRating / reviews.length) * 10) / 10; // Auf 1 Dezimalstelle gerundet
}

// Badges automatisch vergeben
function calculateBadges(orders: any[], reviews: any[], thirtyDaysAgo: Date): string[] {
  const badges: string[] = [];

  // Top Rated (4.8+ Rating mit min. 10 Bewertungen)
  if (reviews.length >= 10) {
    const avgRating = calculateAverageRating(reviews);
    if (avgRating >= 4.8) {
      badges.push('Top Rated');
    }
  }

  // Fast Delivery (>90% der Aufträge pünktlich)
  const recentOrders = orders.filter(order => {
    const orderDate = order.orderDate?.seconds
      ? new Date(order.orderDate.seconds * 1000)
      : new Date(order.orderDate);
    return orderDate >= thirtyDaysAgo;
  });

  if (recentOrders.length >= 5) {
    const onTimeOrders = recentOrders.filter(
      order => order.status === 'completed' || order.status === 'delivered'
    ).length;

    if (onTimeOrders / recentOrders.length >= 0.9) {
      badges.push('Fast Delivery');
    }
  }

  // Verified Pro (>50 erfolgreich abgeschlossene Aufträge)
  const completedOrders = orders.filter(
    order => order.status === 'completed' || order.status === 'delivered'
  ).length;

  if (completedOrders >= 50) {
    badges.push('Verified Pro');
  }

  // New Rising (Neues Unternehmen mit guten Bewertungen)
  if (orders.length >= 5 && orders.length <= 20 && calculateAverageRating(reviews) >= 4.5) {
    badges.push('New Rising');
  }

  return badges;
}

// Online Status berechnen (letzte Aktivität in den letzten 15 Minuten)
function calculateOnlineStatus(chats: any[], companyUid: string): boolean {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  return chats.some(chat => {
    const lastMessage = chat.lastMessage;
    if (!lastMessage || lastMessage.senderId !== companyUid) return false;

    const messageTime = new Date(lastMessage.timestamp.seconds * 1000);
    return messageTime >= fifteenMinutesAgo;
  });
}

// Letzte Aktivität ermitteln
function getRecentActivity(orders: any[], chats: any[]): Date {
  const dates: Date[] = [];

  // Letzte Bestellung
  orders.forEach(order => {
    if (order.orderDate) {
      const date = order.orderDate?.seconds
        ? new Date(order.orderDate.seconds * 1000)
        : new Date(order.orderDate);
      dates.push(date);
    }
  });

  // Letzter Chat
  chats.forEach(chat => {
    if (chat.lastUpdated) {
      const date = new Date(chat.lastUpdated.seconds * 1000);
      dates.push(date);
    }
  });

  return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
}

// Default Metriken für neue Unternehmen
function getDefaultMetrics(): CompanyMetrics {
  return {
    responseTime: 24,
    completionRate: 0,
    totalOrders: 0,
    averageRating: 0,
    badges: ['New Member'],
    isOnline: false,
    recentActivity: new Date(),
  };
}

// Zusätzliche Funktion für Order-spezifische Metriken
export async function calculateOrderMetrics(companyUid: string): Promise<OrderMetrics> {
  try {
    const ordersRef = collection(db, 'auftraege');
    const ordersQuery = query(ordersRef, where('selectedAnbieterId', '==', companyUid));
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = ordersSnapshot.docs.map(doc => doc.data());

    const metrics: OrderMetrics = {
      completed: orders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
      inProgress: orders.filter(o => o.status === 'in_progress' || o.status === 'active').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders
        .filter(o => o.status === 'completed' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.totalAmountPaidByBuyer || 0), 0),
    };

    return metrics;
  } catch (error) {
    console.error('Fehler beim Berechnen der Order Metriken:', error);
    return { completed: 0, inProgress: 0, cancelled: 0, totalRevenue: 0 };
  }
}
